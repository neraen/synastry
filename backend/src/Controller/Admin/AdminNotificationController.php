<?php

namespace App\Controller\Admin;

use App\Entity\User;
use App\Repository\NotificationLogRepository;
use App\Repository\UserPushTokenRepository;
use App\Repository\UserRepository;
use App\Service\AstroNotificationEngine;
use App\Service\ExpoPushService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/admin/notifications')]
class AdminNotificationController extends AbstractController
{
    public function __construct(
        private AstroNotificationEngine $engine,
        private ExpoPushService $expoPushService,
        private NotificationLogRepository $logRepository,
        private UserPushTokenRepository $tokenRepository,
        private UserRepository $userRepository,
        private EntityManagerInterface $em,
    ) {}

    // ─── Stats ────────────────────────────────────────────────────────────────

    #[Route('/stats', name: 'admin_notification_stats', methods: ['GET'])]
    public function stats(): JsonResponse
    {
        $todayStart = new \DateTime('today', new \DateTimeZone('UTC'));
        $weekStart  = new \DateTime('monday this week', new \DateTimeZone('UTC'));

        return $this->json([
            'today' => $this->logRepository->getStatsByType($todayStart),
            'week'  => $this->logRepository->getStatsByType($weekStart),
        ]);
    }

    // ─── History ──────────────────────────────────────────────────────────────

    #[Route('/logs', name: 'admin_notification_logs', methods: ['GET'])]
    public function logs(Request $request): JsonResponse
    {
        $type  = $request->query->get('type') ?: null;
        $page  = max(1, (int) $request->query->get('page', 1));
        $limit = min(100, max(1, (int) $request->query->get('limit', 25)));
        $offset = ($page - 1) * $limit;

        $total = $this->logRepository->countRecent($type);
        $rows  = $this->logRepository->findRecent($type, $limit, $offset);

        $items = array_map(static fn ($log) => [
            'id'          => $log->getId(),
            'type'        => $log->getType(),
            'title'       => $log->getTitle(),
            'body'        => $log->getBody(),
            'userEmail'   => $log->getUser()?->getEmail(),
            'triggerData' => $log->getTriggerData(),
            'sentAt'      => $log->getSentAt()?->format('c'),
        ], $rows);

        return $this->json([
            'items' => $items,
            'page'  => $page,
            'limit' => $limit,
            'total' => $total,
        ]);
    }

    // ─── Preview (dry-run, no send / no log) ───────────────────────────────────

    #[Route('/preview', name: 'admin_notification_preview', methods: ['POST'])]
    public function preview(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];
        $type = $data['type'] ?? null;

        switch ($type) {
            case 'transit':
                $email = trim((string) ($data['userEmail'] ?? ''));
                if ($email === '') {
                    return $this->json(['error' => 'userEmail requis pour un preview de transit'], 400);
                }
                /** @var User|null $user */
                $user = $this->userRepository->findOneBy(['email' => $email]);
                if (!$user) {
                    return $this->json(['error' => "Aucun utilisateur avec l'email {$email}"], 404);
                }
                return $this->json(['type' => 'transit'] + $this->engine->previewTransitForUser($user));

            case 'sky_event':
                return $this->json(['type' => 'sky_event'] + $this->engine->previewSkyEvent());

            case 'daily_reminder':
                return $this->json(['type' => 'daily_reminder'] + $this->engine->previewDailyReminder());

            default:
                return $this->json(['error' => 'type invalide (transit|sky_event|daily_reminder)'], 400);
        }
    }

    // ─── Test push ─────────────────────────────────────────────────────────────

    #[Route('/test-push', name: 'admin_notification_test_push', methods: ['POST'])]
    public function testPush(Request $request): JsonResponse
    {
        $data  = json_decode($request->getContent(), true) ?? [];
        $title = trim((string) ($data['title'] ?? '')) ?: 'Test depuis Lunestia 🌙';
        $body  = trim((string) ($data['body'] ?? '')) ?: 'Ceci est une notification de test.';
        $token = trim((string) ($data['token'] ?? ''));

        if ($token !== '') {
            $tokens = [$token];
        } else {
            /** @var User $admin */
            $admin = $this->getUser();
            $tokens = array_map(
                static fn ($t) => $t->getToken(),
                $this->tokenRepository->findActiveByUser($admin)
            );
        }

        if (empty($tokens)) {
            return $this->json([
                'error' => 'Aucun token cible : saisis un token Expo ou enregistre un appareil sur ton compte admin.',
            ], 400);
        }

        $this->expoPushService->send($tokens, $title, $body, ['type' => 'admin_test', 'screen' => 'horoscope']);

        return $this->json(['success' => true, 'tokensTargeted' => count($tokens)]);
    }

    // ─── Trigger real processing (equivalent to app:notifications:* commands) ───

    #[Route('/trigger', name: 'admin_notification_trigger', methods: ['POST'])]
    public function trigger(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];
        $type = $data['type'] ?? null;

        $sent = match ($type) {
            'transits'         => $this->engine->processPersonalTransits(),
            'sky_events'       => $this->engine->processSkyEvents(),
            'daily_reminders'  => $this->engine->processDailyReminders(),
            default            => null,
        };

        if ($sent === null) {
            return $this->json(['error' => 'type invalide (transits|sky_events|daily_reminders)'], 400);
        }

        return $this->json(['success' => true, 'type' => $type, 'sent' => $sent]);
    }

    // ─── Scheduler & Messenger queue ──────────────────────────────────────────

    #[Route('/schedule', name: 'admin_notification_schedule', methods: ['GET'])]
    public function schedule(): JsonResponse
    {
        $now = new \DateTime('now', new \DateTimeZone('UTC'));

        $jobs = [
            [
                'label'    => 'Transits personnels',
                'type'     => 'transits',
                'cadence'  => 'Toutes les heures',
                'nextRun'  => $this->nextTopOfHour($now)->format('c'),
            ],
            [
                'label'    => 'Événements du ciel',
                'type'     => 'sky_events',
                'cadence'  => 'Chaque jour à 07:00 UTC',
                'nextRun'  => $this->nextDailyAt($now, 7)->format('c'),
            ],
            [
                'label'    => 'Rappels quotidiens',
                'type'     => 'daily_reminders',
                'cadence'  => 'Chaque jour à 06:00 UTC',
                'nextRun'  => $this->nextDailyAt($now, 6)->format('c'),
            ],
        ];

        return $this->json([
            'now'   => $now->format('c'),
            'jobs'  => $jobs,
            'queue' => $this->queueStatus(),
        ]);
    }

    private function nextTopOfHour(\DateTime $now): \DateTime
    {
        return (clone $now)->modify('+1 hour')->setTime((int) $now->format('H') + 1, 0, 0);
    }

    private function nextDailyAt(\DateTime $now, int $hourUtc): \DateTime
    {
        $next = (clone $now)->setTime($hourUtc, 0, 0);
        if ($next <= $now) {
            $next->modify('+1 day');
        }
        return $next;
    }

    /**
     * Counts of Messenger messages per queue (pending) plus the failed queue.
     *
     * @return array{pending: array<string, int>, failed: int}
     */
    private function queueStatus(): array
    {
        $conn = $this->em->getConnection();
        $pending = [];
        $failed  = 0;

        try {
            $rows = $conn->fetchAllAssociative(
                'SELECT queue_name, COUNT(*) AS c FROM messenger_messages WHERE delivered_at IS NULL GROUP BY queue_name'
            );
            foreach ($rows as $row) {
                $queue = (string) $row['queue_name'];
                $count = (int) $row['c'];
                if ($queue === 'failed') {
                    $failed = $count;
                } else {
                    $pending[$queue] = $count;
                }
            }
        } catch (\Throwable $e) {
            // Table may not exist yet (no messages ever queued) — treat as empty.
        }

        return ['pending' => $pending, 'failed' => $failed];
    }
}
