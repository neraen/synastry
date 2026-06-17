<?php

namespace App\Controller\Admin;

use App\Entity\AdminRating;
use App\Entity\EvalResult;
use App\Entity\User;
use App\Repository\AdminRatingRepository;
use App\Repository\EvalResultRepository;
use App\Service\Eval\ProductionScorer;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/admin/eval')]
class AdminEvalController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface $em,
        private EvalResultRepository $resultRepo,
        private AdminRatingRepository $ratingRepo,
        private ProductionScorer $productionScorer,
    ) {}

    /**
     * Aggregated evaluation dashboard: per-type scores, pass-rate, feedback
     * ratios, and the judge↔human calibration gap.
     */
    #[Route('/dashboard', name: 'admin_eval_dashboard', methods: ['GET'])]
    public function dashboard(Request $request): JsonResponse
    {
        [$from, $to] = $this->window($request);

        $byType   = $this->resultRepo->statsByType($from, $to);
        $humanAvg = $this->ratingRepo->avgByType();
        $feedback = $this->feedbackRatios();

        // Judge↔human calibration: judge is 0..100, human is 1..5 → ×20.
        foreach ($byType as &$row) {
            $row['humanAvg5']  = $humanAvg[$row['type']] ?? null;
            $row['humanAvg100'] = isset($humanAvg[$row['type']]) ? round($humanAvg[$row['type']] * 20, 1) : null;
            $row['judgeHumanGap'] = ($row['avgJudge'] && $row['humanAvg100'] !== null)
                ? round($row['avgJudge'] - $row['humanAvg100'], 1)
                : null;
            $row['feedback'] = $feedback[$row['type']] ?? null;
        }
        unset($row);

        return $this->json([
            'from'   => $from->format('Y-m-d'),
            'to'     => $to->format('Y-m-d'),
            'byType' => $byType,
        ]);
    }

    #[Route('/results', name: 'admin_eval_results', methods: ['GET'])]
    public function results(Request $request): JsonResponse
    {
        $page   = max(1, (int) $request->query->get('page', 1));
        $limit  = 25;
        $type   = $request->query->get('type');
        $source = $request->query->get('source');

        $qb = $this->resultRepo->createQueryBuilder('r')
            ->leftJoin('r.user', 'u')->addSelect('u');

        if ($type)   { $qb->andWhere('r.generationType = :t')->setParameter('t', $type); }
        if ($source) { $qb->andWhere('r.source = :s')->setParameter('s', $source); }

        $total = (int) (clone $qb)->select('COUNT(r.id)')->getQuery()->getSingleScalarResult();
        $rows  = $qb->orderBy('r.createdAt', 'DESC')
            ->setFirstResult(($page - 1) * $limit)->setMaxResults($limit)->getQuery()->getResult();

        return $this->json([
            'data'  => array_map(fn(EvalResult $r) => $this->summarize($r), $rows),
            'total' => $total,
            'page'  => $page,
            'limit' => $limit,
        ]);
    }

    #[Route('/results/{id}', name: 'admin_eval_result_detail', methods: ['GET'], requirements: ['id' => '\d+'])]
    public function detail(int $id): JsonResponse
    {
        $r = $this->resultRepo->find($id);
        if (!$r) {
            return $this->json(['error' => 'Not found'], Response::HTTP_NOT_FOUND);
        }

        $scores = [];
        foreach ($r->getScores() as $s) {
            $scores[] = [
                'category'  => $s->getCategory(),
                'criterion' => $s->getCriterion(),
                'score'     => $s->getScore(),
                'maxScore'  => $s->getMaxScore(),
                'rationale' => $s->getRationale(),
            ];
        }

        $ratings = $this->ratingRepo->findBy(['evalResult' => $r], ['createdAt' => 'DESC']);

        return $this->json([
            ...$this->summarize($r),
            'inputData'  => $r->getInputData(),
            'outputData' => $r->getOutputData(),
            'scores'     => $scores,
            'ratings'    => array_map(fn(AdminRating $a) => [
                'id'        => $a->getId(),
                'score'     => $a->getScore(),
                'notes'     => $a->getNotes(),
                'admin'     => $a->getAdmin()?->getEmail(),
                'createdAt' => $a->getCreatedAt()->format('c'),
            ], $ratings),
            'feedback'   => $r->getReferenceId() ? $this->feedbackForRef($r->getGenerationType(), $r->getReferenceId()) : null,
        ]);
    }

    #[Route('/results/{id}/rate', name: 'admin_eval_rate', methods: ['POST'], requirements: ['id' => '\d+'])]
    public function rate(int $id, Request $request): JsonResponse
    {
        $r = $this->resultRepo->find($id);
        if (!$r) {
            return $this->json(['error' => 'Not found'], Response::HTTP_NOT_FOUND);
        }

        $admin = $this->getUser();
        if (!$admin instanceof User) {
            return $this->json(['error' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        }

        $data  = json_decode($request->getContent(), true) ?: [];
        $score = (int) ($data['score'] ?? 0);
        if ($score < 1 || $score > 5) {
            return $this->json(['error' => 'score must be 1..5'], Response::HTTP_BAD_REQUEST);
        }

        $rating = new AdminRating($admin, $r->getGenerationType(), $score);
        $rating->setEvalResult($r)
            ->setReferenceType($r->getReferenceType())
            ->setReferenceId($r->getReferenceId())
            ->setNotes($data['notes'] ?? null);

        $this->em->persist($rating);
        $this->em->flush();

        return $this->json(['success' => true, 'ratingId' => $rating->getId()]);
    }

    /**
     * Score a real production output on demand (runs the evaluation engine).
     * Body: { generationType, referenceId, runJudge? }
     */
    #[Route('/score-production', name: 'admin_eval_score_production', methods: ['POST'])]
    public function scoreProduction(Request $request): JsonResponse
    {
        $data     = json_decode($request->getContent(), true) ?: [];
        $type     = (string) ($data['generationType'] ?? '');
        $refId    = $data['referenceId'] ?? null;
        $runJudge = (bool) ($data['runJudge'] ?? true);

        if ($type === '' || $refId === null) {
            return $this->json(['error' => 'generationType and referenceId are required'], Response::HTTP_BAD_REQUEST);
        }

        try {
            $result = $this->productionScorer->score($type, $refId, $runJudge);
        } catch (\Throwable $e) {
            return $this->json(['error' => 'Scoring failed: ' . $e->getMessage()], Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        if (!$result) {
            return $this->json(['error' => 'Unsupported type or entity not found'], Response::HTTP_NOT_FOUND);
        }

        $this->em->flush();

        return $this->json(['success' => true, 'result' => $this->summarize($result)]);
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private function summarize(EvalResult $r): array
    {
        return [
            'id'                 => $r->getId(),
            'source'             => $r->getSource(),
            'generationType'     => $r->getGenerationType(),
            'referenceType'      => $r->getReferenceType(),
            'referenceId'        => $r->getReferenceId(),
            'userEmail'          => $r->getUser()?->getEmail(),
            'deterministicScore' => $r->getDeterministicScore(),
            'judgeScore'         => $r->getJudgeScore(),
            'compositeScore'     => $r->getCompositeScore(),
            'passed'             => $r->getPassed(),
            'judgeCostUsd'       => $r->getJudgeCostUsd() !== null ? (float) $r->getJudgeCostUsd() : null,
            'createdAt'          => $r->getCreatedAt()->format('c'),
        ];
    }

    /**
     * Map eval generation types to ContentFeedback.content_type and count
     * positive/negative thumbs grouped by type.
     *
     * @return array<string,array{positive:int,negative:int}>
     */
    private function feedbackRatios(): array
    {
        $conn = $this->em->getConnection();
        $rows = $conn->fetchAllAssociative(
            'SELECT content_type, is_positive, COUNT(*) AS c FROM content_feedback GROUP BY content_type, is_positive'
        );

        // ContentFeedback uses chat|horoscope|natal; map natal→natal_section.
        $map = ['chat' => 'chat', 'horoscope' => 'horoscope', 'natal' => 'natal_section'];
        $out = [];
        foreach ($rows as $row) {
            $type = $map[$row['content_type']] ?? $row['content_type'];
            $out[$type] ??= ['positive' => 0, 'negative' => 0];
            if ((int) $row['is_positive'] === 1) {
                $out[$type]['positive'] += (int) $row['c'];
            } else {
                $out[$type]['negative'] += (int) $row['c'];
            }
        }
        return $out;
    }

    /**
     * @return array{positive:int,negative:int}
     */
    private function feedbackForRef(string $generationType, string $refId): array
    {
        $map  = ['natal_section' => 'natal'];
        $ct   = $map[$generationType] ?? $generationType;
        $conn = $this->em->getConnection();
        $rows = $conn->fetchAllAssociative(
            'SELECT is_positive, COUNT(*) AS c FROM content_feedback WHERE content_type = ? AND content_ref = ? GROUP BY is_positive',
            [$ct, $refId]
        );
        $out = ['positive' => 0, 'negative' => 0];
        foreach ($rows as $row) {
            if ((int) $row['is_positive'] === 1) $out['positive'] += (int) $row['c'];
            else $out['negative'] += (int) $row['c'];
        }
        return $out;
    }

    /**
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
