<?php

namespace App\Controller\Api;

use App\Entity\User;
use App\Service\PremiumService;
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
    private const ENTITLEMENT = 'premium';

    public function __construct(
        private PremiumService $premiumService,
        private HttpClientInterface $httpClient,
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

            $data        = $response->toArray();
            $entitlement = $data['subscriber']['entitlements'][self::ENTITLEMENT] ?? null;

            if ($entitlement) {
                $expiresAt = null;
                if (!empty($entitlement['expires_date'])) {
                    $expiresAt = new \DateTime($entitlement['expires_date']);
                }
                $this->premiumService->activate($appUserId, $expiresAt);
            }
            // If entitlement is absent, keep the current DB value (webhook handles revocation)

        } catch (\Throwable $e) {
            // RC call failed — do not change DB, just return current state
            return $this->json([
                'success' => false,
                'isPremium' => $user->isPremium(),
                'error' => 'RC verification failed: ' . $e->getMessage(),
            ], Response::HTTP_BAD_GATEWAY);
        }

        return $this->json([
            'success' => true,
            'isPremium' => $user->isPremium(),
            'premiumUntil' => $user->getPremiumUntil()?->format('c'),
        ]);
    }
}