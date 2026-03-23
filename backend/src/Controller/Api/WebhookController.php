<?php

namespace App\Controller\Api;

use App\Service\PremiumService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
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
 *   CANCELLATION      → deactivate at period end (RC sends this on expiration too)
 *   EXPIRATION        → deactivate
 *   BILLING_ISSUE     → deactivate (grace period ended)
 */
#[Route('/api/webhooks')]
class WebhookController extends AbstractController
{
    // RevenueCat events that activate or renew premium
    private const ACTIVATE_EVENTS = [
        'INITIAL_PURCHASE',
        'RENEWAL',
        'UNCANCELLATION',
        'SUBSCRIBER_ALIAS',
    ];

    // RevenueCat events that deactivate premium
    private const DEACTIVATE_EVENTS = [
        'CANCELLATION',
        'EXPIRATION',
        'BILLING_ISSUE',
    ];

    public function __construct(
        private PremiumService $premiumService,
        private string $webhookSecret = '',
    ) {
        $this->webhookSecret = $_ENV['REVENUECAT_WEBHOOK_SECRET'] ?? '';
    }

    #[Route('/revenuecat', name: 'api_webhook_revenuecat', methods: ['POST'])]
    public function revenueCat(Request $request): JsonResponse
    {
        // ── 1. Verify signature ───────────────────────────────────────────────
        if ($this->webhookSecret) {
            $authHeader = $request->headers->get('Authorization', '');
            $expectedHeader = 'Bearer ' . $this->webhookSecret;

            if (!hash_equals($expectedHeader, $authHeader)) {
                return $this->json(['error' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
            }
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

        if (!$appUserId) {
            return $this->json(['error' => 'Missing app_user_id'], Response::HTTP_BAD_REQUEST);
        }

        // ── 3. Compute expiry date ─────────────────────────────────────────────
        $expiresAt = null;
        if ($expiryMs) {
            $expiresAt = (new \DateTime())->setTimestamp((int) ($expiryMs / 1000));
        }

        // ── 4. Apply business logic ────────────────────────────────────────────
        if (in_array($eventType, self::ACTIVATE_EVENTS, true)) {
            $this->premiumService->activate($appUserId, $expiresAt);
        } elseif ($eventType === 'RENEWAL') {
            $this->premiumService->renew($appUserId, $expiresAt ?? new \DateTime('+1 month'));
        } elseif (in_array($eventType, self::DEACTIVATE_EVENTS, true)) {
            $this->premiumService->deactivate($appUserId);
        }
        // Unknown events are silently accepted (RC expects a 2xx)

        return $this->json(['received' => true]);
    }
}