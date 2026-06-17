<?php

namespace App\Repository;

use App\Entity\EvalResult;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<EvalResult>
 */
class EvalResultRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, EvalResult::class);
    }

    /**
     * Average composite score + deterministic pass-rate grouped by generation type.
     *
     * @return array<array{type:string,count:int,avgComposite:float,avgJudge:float,passRate:float}>
     */
    public function statsByType(\DateTimeImmutable $from, \DateTimeImmutable $to): array
    {
        $rows = $this->createQueryBuilder('r')
            ->select(
                'r.generationType AS type',
                'COUNT(r.id) AS cnt',
                'AVG(r.compositeScore) AS avgComposite',
                'AVG(r.judgeScore) AS avgJudge',
                'AVG(CASE WHEN r.passed = true THEN 1.0 ELSE 0.0 END) AS passRate',
            )
            ->where('r.createdAt >= :from')->andWhere('r.createdAt <= :to')
            ->setParameter('from', $from)->setParameter('to', $to)
            ->groupBy('r.generationType')
            ->getQuery()->getResult();

        return array_map(fn(array $r) => [
            'type'         => (string) $r['type'],
            'count'        => (int) $r['cnt'],
            'avgComposite' => $r['avgComposite'] !== null ? round((float) $r['avgComposite'], 1) : 0.0,
            'avgJudge'     => $r['avgJudge'] !== null ? round((float) $r['avgJudge'], 1) : 0.0,
            'passRate'     => round((float) $r['passRate'] * 100, 1),
        ], $rows);
    }
}
