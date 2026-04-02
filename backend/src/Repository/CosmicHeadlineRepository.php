<?php

namespace App\Repository;

use App\Entity\CosmicHeadline;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<CosmicHeadline>
 */
class CosmicHeadlineRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, CosmicHeadline::class);
    }

    /**
     * Find this week's headline for a given locale.
     */
    public function findCurrentWeek(string $locale): ?CosmicHeadline
    {
        $weekOf = $this->getCurrentWeekMonday();

        return $this->createQueryBuilder('ch')
            ->where('ch.locale = :locale')
            ->andWhere('ch.weekOf = :weekOf')
            ->setParameter('locale', $locale)
            ->setParameter('weekOf', $weekOf)
            ->getQuery()
            ->getOneOrNullResult();
    }

    /**
     * Returns the Monday of the current week as a DateTime.
     */
    public static function getCurrentWeekMonday(): \DateTimeInterface
    {
        $monday = new \DateTime();
        // If today is Sunday (0), go back 6 days; otherwise back to Monday
        $dayOfWeek = (int) $monday->format('N'); // 1=Mon … 7=Sun
        $monday->modify('-' . ($dayOfWeek - 1) . ' days');
        $monday->setTime(0, 0, 0);
        return $monday;
    }
}