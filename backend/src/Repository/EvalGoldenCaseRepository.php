<?php

namespace App\Repository;

use App\Entity\EvalGoldenCase;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<EvalGoldenCase>
 */
class EvalGoldenCaseRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, EvalGoldenCase::class);
    }

    /** @return EvalGoldenCase[] */
    public function findActive(): array
    {
        return $this->findBy(['active' => true], ['id' => 'ASC']);
    }
}
