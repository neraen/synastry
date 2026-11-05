<?php

namespace App\Controller\Api;

use App\Service\PremiumService;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

/**
 * Receives webhook events from RevenueCat.
 *
 * Setup in RevenueCat dashboard:
 *   Project → Integrations → Webhooks → Add endpoint
 *   URL: https://your-api.com/api/webhooks/revenuecat
 *   Authorization header: Bearer {REVENUECAT_WEBHOOK_SECRET}
 *
 * Set REVENUECAT_WEBHOOK_SECRET in your .env.local
 *
 * Handled events:
 *   INITIAL_PURCHASE  → activate premium
 *   RENEWAL           → renew (update expiry date)
 *   UNCANCELLATION    → reactivate after cancellation reversal
 *   CANCELLATION      → keep access until the period ends; refunds revoke at once
 *   EXPIRATION        → deactivate (the only event that marks the end of access)
 *   BILLING_ISSUE     → ignored: a failed charge doesn't mean the subscription
 *                       expired, EXPIRATION follows if payment is never recovered
 */
#[Route('/api/webhooks')]
class WebhookController extends AbstractController
{
    // RevenueCat events that activate premium (first purchase / reactivation)
    private const ACTIVATE_EVENTS = [
        'INITIAL_PURCHASE',
        'UNCANCELLATION',
    ];

    // RevenueCat events that renew premium (update expiry date)
    private const RENEWAL_EVENTS = [
        'RENEWAL',
    ];

    // CANCELLATION reason meaning a refund: access is revoked immediately.
    // Every other reason keeps access until the paid period ends.
    private const REFUND_CANCEL_REASON = 'CUSTOMER_SUPPORT';

    public function __construct(
        private PremiumService $premiumService,
        private LoggerInterface $purchasesLogger,
        #[Autowire('%env(default::REVENUECAT_WEBHOOK_SECRET)%')]
        private ?string $webhookSecret = null,
    ) {}

    #[Route('/revenuecat', name: 'api_webhook_revenuecat', methods: ['POST'])]
    public function revenueCat(Request $request): JsonResponse
    {
        // ── 1. Verify signature ───────────────────────────────────────────────
        // Fail closed: without a secret anyone could forge a purchase. RC retries
        // non-2xx deliveries, so a misconfiguration doesn't lose events right away.
        if (!$this->webhookSecret) {
            $this->purchasesLogger->critical('[webhook.revenuecat] REVENUECAT_WEBHOOK_SECRET is not set — event rejected');
            return $this->json(['error' => 'Webhook not configured'], Response::HTTP_SERVICE_UNAVAILABLE);
        }

        $authHeader = $request->headers->get('Authorization', '');
        $expectedHeader = 'Bearer ' . $this->webhookSecret;

        if (!hash_equals($expectedHeader, $authHeader)) {
            return $this->json(['error' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        }

        // ── 2. Parse payload ──────────────────────────────────────────────────
        $payload = json_decode($request->getContent(), true);

        if (!$payload || !isset($payload['event'])) {
            return $this->json(['error' => 'Invalid payload'], Response::HTTP_BAD_REQUEST);
        }

        $event      = $payload['event'];
        $eventType  = $event['type'] ?? '';
        $appUserId  = $event['app_user_id'] ?? '';
        $expiryMs   = $event['expiration_at_ms'] ?? null;
        $store      = $event['store'] ?? null; // APP_STORE / PLAY_STORE

        $this->purchasesLogger->info('[webhook.revenuecat] event received', [
            'type'      => $eventType,
            'store'     => $store,
            'appUserId' => $appUserId,
        ]);

        if (!$appUserId) {
            return $this->json(['error' => 'Missing app_user_id'], Response::HTTP_BAD_REQUEST);
        }

        // A non-numeric app_user_id means the purchase was made while the SDK
        // was anonymous ($RCAnonymousID:…). RC sends every known id of the
        // subscriber in "aliases" (+ original_app_user_id) — if the anonymous
        // profile was ever merged with a logged-in session, the backend user id
        // is in there. Fall back to it instead of dropping the event.
        if (!is_numeric($appUserId)) {
            $candidates = array_merge(
                $event['aliases'] ?? [],
                [$event['original_app_user_id'] ?? ''],
            );
            $numericAlias = null;
            foreach ($candidates as $candidate) {
                if (is_numeric($candidate)) {
                    $numericAlias = (string) $candidate;
                    break;
                }
            }

            if ($numericAlias !== null) {
                $this->purchasesLogger->info('[webhook.revenuecat] anonymous app_user_id mapped via aliases', [
                    'type'      => $eventType,
                    'store'     => $store,
                    'appUserId' => $appUserId,
                    'alias'     => $numericAlias,
                ]);
                $appUserId = $numericAlias;
            } else {
                $this->purchasesLogger->warning('[webhook.revenuecat] non-numeric app_user_id — purchase not linked to a backend user', [
                    'type'      => $eventType,
                    'store'     => $store,
                    'appUserId' => $appUserId,
                    'aliases'   => $event['aliases'] ?? [],
                ]);
            }
        }

        // ── 3. Compute expiry date ─────────────────────────────────────────────
        $expiresAt = null;
        if ($expiryMs) {
            $expiresAt = (new \DateTime())->setTimestamp((int) ($expiryMs / 1000));
        }

        // ── 4. Apply business logic ────────────────────────────────────────────
        if (in_array($eventType, self::ACTIVATE_EVENTS, true)) {
            $this->premiumService->activate($appUserId, $expiresAt);
        } elseif (in_array($eventType, self::RENEWAL_EVENTS, true)) {
            $this->premiumService->renew($appUserId, $expiresAt ?? new \DateTime('+1 month'));
        } elseif ($eventType === 'EXPIRATION') {
            $this->premiumService->deactivate($appUserId);
        } elseif ($eventType === 'CANCELLATION') {
            if (($event['cancel_reason'] ?? '') === self::REFUND_CANCEL_REASON) {
                $this->premiumService->deactivate($appUserId);
            } elseif ($expiresAt) {
                $this->premiumService->renew($appUserId, $expiresAt);
            }
        }
        // Unknown events are silently accepted (RC expects a 2xx)

        return $this->json(['received' => true]);
    }
}