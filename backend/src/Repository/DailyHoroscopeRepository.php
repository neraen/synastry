<?php

namespace App\Repository;

use App\Entity\DailyHoroscope;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<DailyHoroscope>
 */
class DailyHoroscopeRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, DailyHoroscope::class);
    }

    /**
     * Find today's horoscope for a user
     */
    public function findTodayForUser(User $user): ?DailyHoroscope
    {
        $today = new \DateTime('today');

        return $this->createQueryBuilder('dh')
            ->where('dh.user = :user')
            ->andWhere('dh.date = :date')
            ->setParameter('user', $user)
            ->setParameter('date', $today)
            ->getQuery()
            ->getOneOrNullResult();
    }

    /**
     * Find horoscope for a user on a specific date
     */
    public function findByUserAndDate(User $user, \DateTimeInterface $date): ?DailyHoroscope
    {
        return $this->createQueryBuilder('dh')
            ->where('dh.user = :user')
            ->andWhere('dh.date = :date')
            ->setParameter('user', $user)
            ->setParameter('date', $date)
            ->getQuery()
            ->getOneOrNullResult();
    }

    /**
     * Get recent horoscopes for a user
     */
    public function findRecentByUser(User $user, int $limit = 7): array
    {
        return $this->createQueryBuilder('dh')
            ->where('dh.user = :user')
            ->setParameter('user', $user)
            ->orderBy('dh.date', 'DESC')
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();
    }
}
