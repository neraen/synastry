<?php

namespace App\Controller\Admin;

use App\Entity\User;
use App\Repository\ChatSessionRepository;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/admin/stats')]
class AdminStatsController extends AbstractController
{
    private const PREMIUM_PRICE = 7.99;

    public function __construct(
        private EntityManagerInterface $em,
        private UserRepository $userRepo,
        private ChatSessionRepository $sessionRepo,
    ) {}

    #[Route('/dashboard', name: 'admin_stats_dashboard', methods: ['GET'])]
    public function dashboard(): JsonResponse
    {
        $conn = $this->em->getConnection();

        $totalUsers   = (int) $conn->fetchOne('SELECT COUNT(*) FROM user');
        $premiumUsers = (int) $conn->fetchOne("SELECT COUNT(*) FROM user WHERE is_premium = 1 AND (premium_until IS NULL OR premium_until > NOW())");
        $freeUsers    = $totalUsers - $premiumUsers;

        $today = (new \DateTime())->format('Y-m-d');
        $weekAgo  = (new \DateTime('-7 days'))->format('Y-m-d');
        $monthAgo = (new \DateTime('-30 days'))->format('Y-m-d');

        $signupsToday     = (int) $conn->fetchOne("SELECT COUNT(*) FROM user WHERE DATE(created_at) = ?", [$today]);
        $signupsThisWeek  = (int) $conn->fetchOne("SELECT COUNT(*) FROM user WHERE DATE(created_at) >= ?", [$weekAgo]);
        $signupsThisMonth = (int) $conn->fetchOne("SELECT COUNT(*) FROM user WHERE DATE(created_at) >= ?", [$monthAgo]);

        $totalMessages = (int) $conn->fetchOne('SELECT SUM(JSON_LENGTH(messages)) FROM chat_session');
        $avgMessages   = $totalUsers > 0 ? round($totalMessages / $totalUsers, 2) : 0;

        return $this->json([
            'totalUsers'            => $totalUsers,
            'premiumUsers'          => $premiumUsers,
            'freeUsers'             => $freeUsers,
            'conversionRate'        => $totalUsers > 0 ? round($premiumUsers / $totalUsers * 100, 2) : 0,
            'totalLyraMessages'     => $totalMessages,
            'averageMessagesPerUser' => $avgMessages,
            'signupsToday'          => $signupsToday,
            'signupsThisWeek'       => $signupsThisWeek,
            'signupsThisMonth'      => $signupsThisMonth,
            'mrr'                   => round($premiumUsers * self::PREMIUM_PRICE, 2),
        ]);
    }

    #[Route('/signups', name: 'admin_stats_signups', methods: ['GET'])]
    public function signups(Request $request): JsonResponse
    {
        $period = $request->query->get('period', '30d');
        $days   = $this->periodToDays($period);

        $conn = $this->em->getConnection();
        $rows = $conn->fetchAllAssociative(
            "SELECT DATE(created_at) as date, COUNT(*) as value
             FROM user
             WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
             GROUP BY DATE(created_at)
             ORDER BY date ASC",
            [$days]
        );

        return $this->json(['data' => $rows]);
    }

    #[Route('/revenue', name: 'admin_stats_revenue', methods: ['GET'])]
    public function revenue(Request $request): JsonResponse
    {
        $period = $request->query->get('period', '30d');
        $days   = $this->periodToDays($period);

        $conn = $this->em->getConnection();
        $rows = $conn->fetchAllAssociative(
            "SELECT DATE(created_at) as date,
                    COUNT(*) * ? as value
             FROM user
             WHERE is_premium = 1 AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
             GROUP BY DATE(created_at)
             ORDER BY date ASC",
            [self::PREMIUM_PRICE, $days]
        );

        return $this->json(['data' => $rows]);
    }

    #[Route('/lyra-usage', name: 'admin_stats_lyra_usage', methods: ['GET'])]
    public function lyraUsage(Request $request): JsonResponse
    {
        $period = $request->query->get('period', '30d');
        $days   = $this->periodToDays($period);

        $conn = $this->em->getConnection();
        $rows = $conn->fetchAllAssociative(
            "SELECT DATE(updated_at) as date, SUM(JSON_LENGTH(messages)) as value
             FROM chat_session
             WHERE updated_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
             GROUP BY DATE(updated_at)
             ORDER BY date ASC",
            [$days]
        );

        return $this->json(['data' => $rows]);
    }

    #[Route('/providers', name: 'admin_stats_providers', methods: ['GET'])]
    public function providers(): JsonResponse
    {
        $conn = $this->em->getConnection();

        $google = (int) $conn->fetchOne('SELECT COUNT(*) FROM user WHERE google_id IS NOT NULL');
        $apple  = (int) $conn->fetchOne('SELECT COUNT(*) FROM user WHERE apple_id IS NOT NULL');
        $email  = (int) $conn->fetchOne('SELECT COUNT(*) FROM user WHERE google_id IS NULL AND apple_id IS NULL');

        return $this->json([
            'data' => [
                ['name' => 'Google', 'value' => $google],
                ['name' => 'Apple',  'value' => $apple],
                ['name' => 'Email',  'value' => $email],
            ],
        ]);
    }

    private function periodToDays(string $period): int
    {
        return match ($period) {
            '7d'  => 7,
            '90d' => 90,
            'all' => 3650,
            default => 30,
        };
    }
}
