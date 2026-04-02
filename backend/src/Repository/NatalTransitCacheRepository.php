<?php

namespace App\Repository;

use App\Entity\NatalTransitCache;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<NatalTransitCache>
 */
class NatalTransitCacheRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, NatalTransitCache::class);
    }

    public function findByUserAndAge(User $user, int $age): ?NatalTransitCache
    {
        return $this->findOneBy(['user' => $user, 'age' => $age]);
    }

    /**
     * Delete all cached entries for a user (e.g. when birth profile changes).
     */
    public function deleteByUser(User $user): int
    {
        return $this->createQueryBuilder('c')
            ->delete()
            ->where('c.user = :user')
            ->setParameter('user', $user)
            ->getQuery()
            ->execute();
    }
}