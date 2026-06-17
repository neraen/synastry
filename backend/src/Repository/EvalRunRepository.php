<?php

namespace App\Repository;

use App\Entity\EvalResult;
use App\Entity\EvalRun;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<EvalRun>
 */
class EvalRunRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, EvalRun::class);
    }

    /**
     * Per-golden-case composite-score delta between two runs (regression diff).
     * Joins results of both runs by their golden case.
     *
     * @return array<array{caseId:int,caseName:string,type:string,scoreA:?float,scoreB:?float,delta:?float}>
     */
    public function diff(EvalRun $a, EvalRun $b): array
    {
        $em = $this->getEntityManager();

        $load = function (EvalRun $run): array {
            /** @var EvalResult[] $rows */
            $rows = $em->createQueryBuilder()
                ->select('r', 'c')
                ->from(EvalResult::class, 'r')
                ->join('r.goldenCase', 'c')
                ->where('r.evalRun = :run')->setParameter('run', $run)
                ->getQuery()->getResult();

            $byCase = [];
            foreach ($rows as $r) {
                $byCase[$r->getGoldenCase()->getId()] = $r;
            }
            return $byCase;
        };

        $aByCase = $load($a);
        $bByCase = $load($b);

        $caseIds = array_unique(array_merge(array_keys($aByCase), array_keys($bByCase)));
        $out = [];
        foreach ($caseIds as $cid) {
            $ra = $aByCase[$cid] ?? null;
            $rb = $bByCase[$cid] ?? null;
            $case = $ra?->getGoldenCase() ?? $rb?->getGoldenCase();
            $scoreA = $ra?->getCompositeScore();
            $scoreB = $rb?->getCompositeScore();
            $out[] = [
                'caseId'   => (int) $cid,
                'caseName' => $case?->getName() ?? ('#' . $cid),
                'type'     => $case?->getGenerationType() ?? '',
                'scoreA'   => $scoreA,
                'scoreB'   => $scoreB,
                'delta'    => ($scoreA !== null && $scoreB !== null) ? round($scoreB - $scoreA, 1) : null,
            ];
        }

        usort($out, fn($x, $y) => ($x['delta'] ?? 0) <=> ($y['delta'] ?? 0));
        return $out;
    }
}
