<?php

namespace App\Repository;

use App\Entity\User;
use App\Entity\UserPushToken;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<UserPushToken>
 */
class UserPushTokenRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, UserPushToken::class);
    }

    /** @return UserPushToken[] */
    public function findActiveByUser(User $user): array
    {
        return $this->createQueryBuilder('t')
            ->where('t.user = :user')
            ->andWhere('t.isActive = true')
            ->setParameter('user', $user)
            ->getQuery()
            ->getResult();
    }

    public function findByToken(string $token): ?UserPushToken
    {
        return $this->findOneBy(['token' => $token]);
    }

    /**
     * Return all distinct active tokens for users who have a given notification type enabled.
     * $type: 'transits' | 'skyEvents' | 'dailyReminder'
     *
     * @return array{token: string, userId: int, timezone: string, preferredHour: int}[]
     */
    public function findActiveTokensWithPreferences(string $type): array
    {
        $column = match($type) {
            'transits'      => 'p.transitsEnabled',
            'skyEvents'     => 'p.skyEventsEnabled',
            'dailyReminder' => 'p.dailyReminderEnabled',
            default         => 'p.enabled',
        };

        return $this->createQueryBuilder('t')
            ->select(
                't.token',
                'IDENTITY(t.user) AS userId',
                'COALESCE(p.timezone, \'Europe/Paris\') AS timezone',
                'COALESCE(p.preferredHour, 8) AS preferredHour',
            )
            ->leftJoin(
                'App\Entity\UserNotificationPreferences',
                'p',
                'WITH',
                'p.user = t.user'
            )
            ->where('t.isActive = true')
            ->andWhere('(p.id IS NULL OR p.enabled = true)')
            ->andWhere("(p.id IS NULL OR {$column} = true)")
            ->getQuery()
            ->getArrayResult();
    }
}
