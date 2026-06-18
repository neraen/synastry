<?php

namespace App\Repository;

use App\Entity\AstroEvent;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<AstroEvent>
 */
class AstroEventRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, AstroEvent::class);
    }

    /** @return AstroEvent[] all events for a month, chronological. */
    public function findByMonth(string $locale, string $monthKey): array
    {
        return $this->createQueryBuilder('e')
            ->where('e.locale = :locale')
            ->andWhere('e.monthKey = :monthKey')
            ->setParameter('locale', $locale)
            ->setParameter('monthKey', $monthKey)
            ->orderBy('e.exactAt', 'ASC')
            ->getQuery()
            ->getResult();
    }

    public function findOneByFingerprint(string $locale, string $fingerprint): ?AstroEvent
    {
        return $this->findOneBy(['locale' => $locale, 'fingerprint' => $fingerprint]);
    }

    /** @return AstroEvent[] events occurring in [$from, $to], any locale-filtered. */
    public function findBetween(string $locale, \DateTimeImmutable $from, \DateTimeImmutable $to): array
    {
        return $this->createQueryBuilder('e')
            ->where('e.locale = :locale')
            ->andWhere('e.exactAt >= :from')
            ->andWhere('e.exactAt <= :to')
            ->setParameter('locale', $locale)
            ->setParameter('from', $from)
            ->setParameter('to', $to)
            ->orderBy('e.exactAt', 'ASC')
            ->getQuery()
            ->getResult();
    }
}
