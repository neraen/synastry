<?php

namespace App\Repository;

use App\Entity\NotificationLog;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<NotificationLog>
 */
class NotificationLogRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, NotificationLog::class);
    }

    /**
     * Check if an identical notification was already sent (deduplication).
     * Uses type + triggerData fingerprint.
     */
    public function alreadySent(User $user, string $type, array $triggerData): bool
    {
        $fingerprint = $this->fingerprint($triggerData);

        $count = $this->createQueryBuilder('l')
            ->select('COUNT(l.id)')
            ->where('l.user = :user')
            ->andWhere('l.type = :type')
            ->andWhere("JSON_CONTAINS(l.triggerData, :fp, '$.fingerprint') = 1 OR l.triggerData LIKE :fpLike")
            ->setParameter('user', $user)
            ->setParameter('type', $type)
            ->setParameter('fp', json_encode($fingerprint))
            ->setParameter('fpLike', '%"fingerprint":"' . $fingerprint . '"%')
            ->getQuery()
            ->getSingleScalarResult();

        return $count > 0;
    }

    /**
     * Count how many notifications were sent to a user today (all types).
     */
    public function countTodayForUser(User $user, string $timezone = 'Europe/Paris'): int
    {
        $tz = new \DateTimeZone($timezone);
        $todayStart = new \DateTime('today', $tz);
        $todayStart->setTimezone(new \DateTimeZone('UTC'));

        return (int) $this->createQueryBuilder('l')
            ->select('COUNT(l.id)')
            ->where('l.user = :user')
            ->andWhere('l.sentAt >= :start')
            ->setParameter('user', $user)
            ->setParameter('start', $todayStart)
            ->getQuery()
            ->getSingleScalarResult();
    }

    /**
     * Count how many notifications were sent to a user this week.
     */
    public function countThisWeekForUser(User $user): int
    {
        $weekStart = new \DateTime('monday this week', new \DateTimeZone('UTC'));

        return (int) $this->createQueryBuilder('l')
            ->select('COUNT(l.id)')
            ->where('l.user = :user')
            ->andWhere('l.sentAt >= :start')
            ->setParameter('user', $user)
            ->setParameter('start', $weekStart)
            ->getQuery()
            ->getSingleScalarResult();
    }

    /** @return array{type: string, count: int}[] */
    public function getStatsByType(\DateTime $since): array
    {
        return $this->createQueryBuilder('l')
            ->select('l.type, COUNT(l.id) AS count')
            ->where('l.sentAt >= :since')
            ->setParameter('since', $since)
            ->groupBy('l.type')
            ->getQuery()
            ->getArrayResult();
    }

    private function fingerprint(array $data): string
    {
        ksort($data);
        return md5(json_encode($data));
    }
}
