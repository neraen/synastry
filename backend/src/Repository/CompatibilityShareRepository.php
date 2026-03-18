<?php

namespace App\Repository;

use App\Entity\CompatibilityShare;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<CompatibilityShare>
 */
class CompatibilityShareRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, CompatibilityShare::class);
    }

    /**
     * Find share by shareId (public access)
     */
    public function findByShareId(string $shareId): ?CompatibilityShare
    {
        return $this->createQueryBuilder('cs')
            ->where('cs.shareId = :shareId')
            ->andWhere('cs.expiresAt > :now')
            ->setParameter('shareId', $shareId)
            ->setParameter('now', new \DateTime())
            ->getQuery()
            ->getOneOrNullResult();
    }

    /**
     * Find existing share for a synastry history
     */
    public function findBySynastryHistoryId(int $synastryHistoryId): ?CompatibilityShare
    {
        return $this->createQueryBuilder('cs')
            ->where('cs.synastryHistoryId = :historyId')
            ->andWhere('cs.expiresAt > :now')
            ->setParameter('historyId', $synastryHistoryId)
            ->setParameter('now', new \DateTime())
            ->getQuery()
            ->getOneOrNullResult();
    }

    /**
     * Find shares by user
     */
    public function findByUser(User $user, int $limit = 20): array
    {
        return $this->createQueryBuilder('cs')
            ->where('cs.user = :user')
            ->andWhere('cs.expiresAt > :now')
            ->setParameter('user', $user)
            ->setParameter('now', new \DateTime())
            ->orderBy('cs.createdAt', 'DESC')
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();
    }

    /**
     * Check if shareId exists
     */
    public function shareIdExists(string $shareId): bool
    {
        $count = $this->createQueryBuilder('cs')
            ->select('COUNT(cs.id)')
            ->where('cs.shareId = :shareId')
            ->setParameter('shareId', $shareId)
            ->getQuery()
            ->getSingleScalarResult();

        return $count > 0;
    }

    /**
     * Delete expired shares (for cleanup command)
     */
    public function deleteExpired(): int
    {
        return $this->createQueryBuilder('cs')
            ->delete()
            ->where('cs.expiresAt < :now')
            ->setParameter('now', new \DateTime())
            ->getQuery()
            ->execute();
    }
}
