<?php

namespace App\Controller\Admin;

use App\Repository\LlmCallLogRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/admin/cost')]
class AdminCostController extends AbstractController
{
    public function __construct(
        private LlmCallLogRepository $callRepo,
    ) {}

    /**
     * Aggregated cost dashboard: totals + breakdowns by type/model + daily series.
     */
    #[Route('/summary', name: 'admin_cost_summary', methods: ['GET'])]
    public function summary(Request $request): JsonResponse
    {
        [$from, $to] = $this->window($request);

        return $this->json([
            'from'        => $from->format('Y-m-d'),
            'to'          => $to->format('Y-m-d'),
            'totals'      => $this->callRepo->totals($from, $to),
            'byType'      => $this->callRepo->groupedBy('generationType', $from, $to),
            'byModel'     => $this->callRepo->groupedBy('model', $from, $to),
            'byProvider'  => $this->callRepo->groupedBy('provider', $from, $to),
            'dailySeries' => $this->callRepo->dailySeries($from, $to),
        ]);
    }

    #[Route('/by-user', name: 'admin_cost_by_user', methods: ['GET'])]
    public function byUser(Request $request): JsonResponse
    {
        [$from, $to] = $this->window($request);
        $limit = max(1, min(100, (int) $request->query->get('limit', 20)));

        return $this->json([
            'data' => $this->callRepo->topUsers($from, $to, $limit),
        ]);
    }

    #[Route('/calls', name: 'admin_cost_calls', methods: ['GET'])]
    public function calls(Request $request): JsonResponse
    {
        $page  = max(1, (int) $request->query->get('page', 1));
        $limit = 30;
        $type  = $request->query->get('type');

        $qb = $this->callRepo->createQueryBuilder('l')
            ->leftJoin('l.user', 'u')->addSelect('u');

        if ($type) {
            $qb->andWhere('l.generationType = :type')->setParameter('type', $type);
        }

        $total = (int) (clone $qb)->select('COUNT(l.id)')->getQuery()->getSingleScalarResult();

        $rows = $qb->orderBy('l.createdAt', 'DESC')
            ->setFirstResult(($page - 1) * $limit)->setMaxResults($limit)->getQuery()->getResult();

        return $this->json([
            'data' => array_map(fn($l) => [
                'id'             => $l->getId(),
                'provider'       => $l->getProvider(),
                'model'          => $l->getModel(),
                'generationType' => $l->getGenerationType(),
                'referenceType'  => $l->getReferenceType(),
                'referenceId'    => $l->getReferenceId(),
                'userEmail'      => $l->getUser()?->getEmail(),
                'inputTokens'    => $l->getInputTokens(),
                'outputTokens'   => $l->getOutputTokens(),
                'cacheReadTokens'=> $l->getCacheReadInputTokens(),
                'costUsd'        => (float) $l->getEstimatedCostUsd(),
                'latencyMs'      => $l->getLatencyMs(),
                'success'        => $l->isSuccess(),
                'createdAt'      => $l->getCreatedAt()->format('c'),
            ], $rows),
            'total' => $total,
            'page'  => $page,
            'limit' => $limit,
        ]);
    }

    /**
     * Parse from/to query params (YYYY-MM-DD); defaults to the last 30 days.
     *
     * @return array{0:\DateTimeImmutable,1:\DateTimeImmutable}
     */
    private function window(Request $request): array
    {
        $toStr   = $request->query->get('to');
        $fromStr = $request->query->get('from');

        try {
            $to = $toStr ? new \DateTimeImmutable($toStr . ' 23:59:59') : new \DateTimeImmutable('today 23:59:59');
        } catch (\Exception) {
            $to = new \DateTimeImmutable('today 23:59:59');
        }
        try {
            $from = $fromStr ? new \DateTimeImmutable($fromStr . ' 00:00:00') : $to->modify('-30 days')->setTime(0, 0, 0);
        } catch (\Exception) {
            $from = $to->modify('-30 days')->setTime(0, 0, 0);
        }

        return [$from, $to];
    }
}
