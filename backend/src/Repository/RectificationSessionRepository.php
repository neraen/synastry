<?php

namespace App\Repository;

use App\Entity\RectificationSession;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<RectificationSession>
 *
 * @method RectificationSession|null find($id, $lockMode = null, $lockVersion = null)
 * @method RectificationSession|null findOneBy(array $criteria, array $orderBy = null)
 * @method RectificationSession[]    findAll()
 */
class RectificationSessionRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, RectificationSession::class);
    }

    public function findForUser(User $user): ?RectificationSession
    {
        return $this->findOneBy(['user' => $user]);
    }

    public function save(RectificationSession $session, bool $flush = false): void
    {
        $this->getEntityManager()->persist($session);

        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    /**
     * Sessions left unfinished long enough to deserve a nudge (spec §2).
     *
     * The nudge is only worth sending while the user can still act on it, so
     * sessions already past the collection step are excluded — and one that has
     * already been nudged is not nudged again.
     *
     * @return list<RectificationSession>
     */
    public function findStaleForNudge(\DateTimeImmutable $olderThan): array
    {
        return $this->createQueryBuilder('s')
            ->andWhere('s.step IN (:steps)')
            ->andWhere('s.updatedAt < :threshold')
            ->andWhere('s.lastNudgeAt IS NULL OR s.lastNudgeAt < s.updatedAt')
            ->setParameter('steps', [
                RectificationSession::STEP_WINDOW,
                RectificationSession::STEP_COLLECTION,
            ])
            ->setParameter('threshold', $olderThan)
            ->getQuery()
            ->getResult();
    }

    /**
     * Sessions whose "j'ai demandé mon acte de naissance" reminder is due.
     *
     * @return list<RectificationSession>
     */
    public function findDueDocumentReminders(\DateTimeImmutable $now): array
    {
        return $this->createQueryBuilder('s')
            ->andWhere('s.documentReminderAt IS NOT NULL')
            ->andWhere('s.documentReminderAt <= :now')
            ->setParameter('now', $now)
            ->getQuery()
            ->getResult();
    }
}
