<?php

namespace App\Repository;

use App\Entity\MoodCorpus;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<MoodCorpus>
 */
class MoodCorpusRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, MoodCorpus::class);
    }

    public function findEntry(string $locale, int $moonSignIndex, string $moonPhase): ?MoodCorpus
    {
        return $this->findOneBy([
            'locale'        => $locale,
            'moonSignIndex' => $moonSignIndex,
            'moonPhase'     => $moonPhase,
        ]);
    }

    /**
     * @return array<string,bool> set of "signIndex:phase" keys already present,
     *                            used to generate only the missing combinations.
     */
    public function existingKeys(string $locale): array
    {
        $rows = $this->createQueryBuilder('m')
            ->select('m.moonSignIndex AS s', 'm.moonPhase AS p')
            ->where('m.locale = :locale')
            ->setParameter('locale', $locale)
            ->getQuery()
            ->getArrayResult();

        $set = [];
        foreach ($rows as $r) {
            $set[$r['s'] . ':' . $r['p']] = true;
        }
        return $set;
    }
}
