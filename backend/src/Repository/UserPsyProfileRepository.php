<?php

namespace App\Repository;

use App\Entity\User;
use App\Entity\UserPsyProfile;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<UserPsyProfile>
 */
class UserPsyProfileRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, UserPsyProfile::class);
    }

    public function findByUser(User $user): ?UserPsyProfile
    {
        return $this->findOneBy(['user' => $user]);
    }
}
