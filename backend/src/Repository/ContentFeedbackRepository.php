<?php

namespace App\Repository;

use App\Entity\ContentFeedback;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class ContentFeedbackRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ContentFeedback::class);
    }

    public function findOneByUserContent(User $user, string $contentType, string $contentRef): ?ContentFeedback
    {
        return $this->findOneBy([
            'user' => $user,
            'contentType' => $contentType,
            'contentRef' => $contentRef,
        ]);
    }
}
