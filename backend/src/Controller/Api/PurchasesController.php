<?php

namespace App\Controller\Api;

use App\Entity\User;
use App\Service\PremiumService;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * Client-side purchase verification.
 *
 * Called by the app immediately after a successful RevenueCat purchase to
 * synchronise the backend premium status without waiting for the async webhook.
 *
 * Flow:
 *   1. User buys via RevenueCat SDK (iOS / Android)
 *   2. App calls POST /api/purchases/verify (authenticated)
 *   3. Backend calls RC REST API to confirm entitlement is active
 *   4. Backend updates User.isPremium + User.premiumUntil
 *   5. App calls refreshUser() → backend returns updated isPremium
 */
#[Route('/api/purchases')]
class PurchasesController extends AbstractController
{
    private const RC_SUBSCRIBER_URL = 'https://api.revenuecat.com/v1/subscribers/%s';

    public function __construct(
        private PremiumService $premiumService,
        private HttpClientInterface $httpClient,
        private LoggerInterface $purchasesLogger,
    ) {}

    /**
     * Verify current user's premium status against RevenueCat REST API
     * and immediately persist the result.
     */
    #[Route('/verify', name: 'api_purchases_verify', methods: ['POST'])]
    public function verify(): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        $rcSecret = $_ENV['REVENUECAT_SECRET_KEY'] ?? '';

        if (!$rcSecret) {
            // RC not configured — return current DB state (useful in dev/staging)
            return $this->json([
                'success' => true,
                'isPremium' => $user->isPremium(),
                'premiumUntil' => $user->getPremiumUntil()?->format('c'),
                'note' => 'REVENUECAT_SECRET_KEY not set — skipped verification',
            ]);
        }

        $appUserId = (string) $user->getId();
        $entitlementActive = false;

        try {
            $response = $this->httpClient->request(
                'GET',
                sprintf(self::RC_SUBSCRIBER_URL, urlencode($appUserId)),
                [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $rcSecret,
                        'Content-Type'  => 'application/json',
                    ],
                ]
            );

            $status       = $response->getStatusCode();
            $data         = $response->toArray(false);
            $entitlements = $data['subscriber']['entitlements'] ?? [];

            // The app sells a single premium entitlement, but its identifier in
            // the RC dashboard is "Lunestia premium" (not "premium" as this code
            // historically assumed) — so accept any active entitlement instead
            // of coupling to the dashboard name.
            $expiresAt = null;
            foreach ($entitlements as $entitlement) {
                $candidateExpiry = !empty($entitlement['expires_date'])
                    ? new \DateTime($entitlement['expires_date'])
                    : null;
                // An entitlement is only *active* if it has no expiry (lifetime)
                // or expires in the future. RC may still list a past entitlement.
                if ($candidateExpiry === null || $candidateExpiry > new \DateTime()) {
                    $entitlementActive = true;
                    // Keep the latest expiry (lifetime = null wins)
                    if ($candidateExpiry === null || $expiresAt === null || $candidateExpiry > $expiresAt) {
                        $expiresAt = $candidateExpiry;
                    }
                    if ($candidateExpiry === null) {
                        break;
                    }
                }
            }

            if ($entitlementActive) {
                $this->premiumService->activate($appUserId, $expiresAt);
                $this->purchasesLogger->info('[purchases.verify] entitlement active — premium activated', [
                    'appUserId'   => $appUserId,
                    'rcStatus'    => $status,
                    'expiresAt'   => $expiresAt?->format('c'),
                ]);
            } else {
                // No active entitlement at RC. Most common iOS cause: RevenueCat
                // could not validate the Apple receipt (App-Specific Shared Secret
                // not set in the RC dashboard). Keep current DB value (webhook
                // handles revocation) but log loudly so the cause is visible.
                $this->purchasesLogger->warning('[purchases.verify] no active entitlement at RevenueCat', [
                    'appUserId'        => $appUserId,
                    'rcStatus'         => $status,
                    'entitlementKeys'  => array_keys($data['subscriber']['entitlements'] ?? []),
                    'subscriptionKeys' => array_keys($data['subscriber']['subscriptions'] ?? []),
                ]);
            }

        } catch (\Throwable $e) {
            // RC call failed — do not change DB, just return current state
            $this->purchasesLogger->error('[purchases.verify] RC verification failed', [
                'appUserId' => $appUserId,
                'error'     => $e->getMessage(),
            ]);
            return $this->json([
                'success' => false,
                'isPremium' => $user->isPremium(),
                'entitlementActive' => false,
                'error' => 'RC verification failed: ' . $e->getMessage(),
            ], Response::HTTP_BAD_GATEWAY);
        }

        return $this->json([
            'success' => true,
            'isPremium' => $user->isPremium(),
            'entitlementActive' => $entitlementActive,
            'premiumUntil' => $user->getPremiumUntil()?->format('c'),
        ]);
    }
}