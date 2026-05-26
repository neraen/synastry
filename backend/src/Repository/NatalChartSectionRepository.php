<?php

namespace App\Repository;

use App\Entity\NatalChartSection;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<NatalChartSection>
 */
class NatalChartSectionRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, NatalChartSection::class);
    }

    public function findByUserAndSection(User $user, string $section): ?NatalChartSection
    {
        return $this->findOneBy(['user' => $user, 'section' => $section]);
    }

    /** Delete all sections for a user (e.g. after birth profile update). */
    public function deleteAllForUser(User $user): void
    {
        $this->createQueryBuilder('s')
            ->delete()
            ->where('s.user = :user')
            ->setParameter('user', $user)
            ->getQuery()
            ->execute();
    }
}
