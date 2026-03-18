<?php

namespace App\Repository;

use App\Entity\NatalChart;
use App\Entity\User;
use App\Entity\BirthProfile;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<NatalChart>
 */
class NatalChartRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, NatalChart::class);
    }

    public function findByUser(User $user): ?NatalChart
    {
        return $this->findOneBy(['user' => $user]);
    }

    public function findByBirthProfile(BirthProfile $birthProfile): ?NatalChart
    {
        return $this->findOneBy(['birthProfile' => $birthProfile]);
    }
}