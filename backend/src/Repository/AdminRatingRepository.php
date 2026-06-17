<?php

namespace App\Repository;

use App\Entity\AdminRating;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<AdminRating>
 */
class AdminRatingRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, AdminRating::class);
    }

    /**
     * Average human rating (1..5) per generation type.
     *
     * @return array<string,float>
     */
    public function avgByType(): array
    {
        $rows = $this->createQueryBuilder('a')
            ->select('a.generationType AS type', 'AVG(a.score) AS avg')
            ->groupBy('a.generationType')
            ->getQuery()->getResult();

        $out = [];
        foreach ($rows as $r) {
            $out[(string) $r['type']] = round((float) $r['avg'], 2);
        }
        return $out;
    }
}
