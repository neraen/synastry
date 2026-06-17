<?php

namespace App\Repository;

use App\Entity\LlmCallLog;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<LlmCallLog>
 */
class LlmCallLogRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, LlmCallLog::class);
    }

    /**
     * Global totals over a date window.
     *
     * @return array{calls:int,inputTokens:int,outputTokens:int,cacheCreationTokens:int,cacheReadTokens:int,costUsd:float}
     */
    public function totals(\DateTimeImmutable $from, \DateTimeImmutable $to): array
    {
        $row = $this->createQueryBuilder('l')
            ->select(
                'COUNT(l.id) AS calls',
                'COALESCE(SUM(l.inputTokens), 0) AS inputTokens',
                'COALESCE(SUM(l.outputTokens), 0) AS outputTokens',
                'COALESCE(SUM(l.cacheCreationInputTokens), 0) AS cacheCreationTokens',
                'COALESCE(SUM(l.cacheReadInputTokens), 0) AS cacheReadTokens',
                'COALESCE(SUM(l.estimatedCostUsd), 0) AS costUsd',
            )
            ->where('l.createdAt >= :from')->andWhere('l.createdAt <= :to')
            ->setParameter('from', $from)->setParameter('to', $to)
            ->getQuery()->getSingleResult();

        return [
            'calls'               => (int) $row['calls'],
            'inputTokens'         => (int) $row['inputTokens'],
            'outputTokens'        => (int) $row['outputTokens'],
            'cacheCreationTokens' => (int) $row['cacheCreationTokens'],
            'cacheReadTokens'     => (int) $row['cacheReadTokens'],
            'costUsd'             => (float) $row['costUsd'],
        ];
    }

    /**
     * Cost + token totals grouped by a column ('generationType' or 'model').
     *
     * @return array<array{key:string,calls:int,inputTokens:int,outputTokens:int,costUsd:float}>
     */
    public function groupedBy(string $field, \DateTimeImmutable $from, \DateTimeImmutable $to): array
    {
        $field = in_array($field, ['generationType', 'model', 'provider'], true) ? $field : 'generationType';

        $rows = $this->createQueryBuilder('l')
            ->select(
                "l.$field AS k",
                'COUNT(l.id) AS calls',
                'COALESCE(SUM(l.inputTokens), 0) AS inputTokens',
                'COALESCE(SUM(l.outputTokens), 0) AS outputTokens',
                'COALESCE(SUM(l.estimatedCostUsd), 0) AS costUsd',
            )
            ->where('l.createdAt >= :from')->andWhere('l.createdAt <= :to')
            ->setParameter('from', $from)->setParameter('to', $to)
            ->groupBy('k')
            ->orderBy('costUsd', 'DESC')
            ->getQuery()->getResult();

        return array_map(fn(array $r) => [
            'key'          => (string) $r['k'],
            'calls'        => (int) $r['calls'],
            'inputTokens'  => (int) $r['inputTokens'],
            'outputTokens' => (int) $r['outputTokens'],
            'costUsd'      => (float) $r['costUsd'],
        ], $rows);
    }

    /**
     * Daily cost time-series (for charts).
     *
     * @return array<array{day:string,calls:int,costUsd:float}>
     */
    public function dailySeries(\DateTimeImmutable $from, \DateTimeImmutable $to): array
    {
        $rows = $this->createQueryBuilder('l')
            ->select(
                "SUBSTRING(l.createdAt, 1, 10) AS day",
                'COUNT(l.id) AS calls',
                'COALESCE(SUM(l.estimatedCostUsd), 0) AS costUsd',
            )
            ->where('l.createdAt >= :from')->andWhere('l.createdAt <= :to')
            ->setParameter('from', $from)->setParameter('to', $to)
            ->groupBy('day')
            ->orderBy('day', 'ASC')
            ->getQuery()->getResult();

        return array_map(fn(array $r) => [
            'day'     => (string) $r['day'],
            'calls'   => (int) $r['calls'],
            'costUsd' => (float) $r['costUsd'],
        ], $rows);
    }

    /**
     * Top users by cost.
     *
     * @return array<array{userId:int,email:string,calls:int,costUsd:float}>
     */
    public function topUsers(\DateTimeImmutable $from, \DateTimeImmutable $to, int $limit = 20): array
    {
        $rows = $this->createQueryBuilder('l')
            ->join('l.user', 'u')
            ->select(
                'u.id AS userId',
                'u.email AS email',
                'COUNT(l.id) AS calls',
                'COALESCE(SUM(l.estimatedCostUsd), 0) AS costUsd',
            )
            ->where('l.createdAt >= :from')->andWhere('l.createdAt <= :to')
            ->setParameter('from', $from)->setParameter('to', $to)
            ->groupBy('userId')->addGroupBy('email')
            ->orderBy('costUsd', 'DESC')
            ->setMaxResults($limit)
            ->getQuery()->getResult();

        return array_map(fn(array $r) => [
            'userId'  => (int) $r['userId'],
            'email'   => (string) $r['email'],
            'calls'   => (int) $r['calls'],
            'costUsd' => (float) $r['costUsd'],
        ], $rows);
    }
}
