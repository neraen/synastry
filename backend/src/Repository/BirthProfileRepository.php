<?php

namespace App\Repository;

use App\Entity\BirthProfile;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<BirthProfile>
 */
class BirthProfileRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, BirthProfile::class);
    }

    public function findByUser(User $user): ?BirthProfile
    {
        return $this->findOneBy(['user' => $user]);
    }
}