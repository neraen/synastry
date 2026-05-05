<?php

namespace App\Repository;

use App\Entity\User;
use App\Entity\UserNotificationPreferences;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<UserNotificationPreferences>
 */
class UserNotificationPreferencesRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, UserNotificationPreferences::class);
    }

    public function findByUser(User $user): ?UserNotificationPreferences
    {
        return $this->findOneBy(['user' => $user]);
    }

    public function findOrCreateForUser(User $user): UserNotificationPreferences
    {
        $prefs = $this->findByUser($user);
        if ($prefs === null) {
            $prefs = new UserNotificationPreferences();
            $prefs->setUser($user);
        }
        return $prefs;
    }
}
