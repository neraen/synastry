<?php

namespace App\Repository;

use App\Entity\BlindValidation;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<BlindValidation>
 *
 * @method BlindValidation|null find($id, $lockMode = null, $lockVersion = null)
 * @method BlindValidation|null findOneBy(array $criteria, array $orderBy = null)
 */
class BlindValidationRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, BlindValidation::class);
    }

    public function save(BlindValidation $validation, bool $flush = false): void
    {
        $this->getEntityManager()->persist($validation);

        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    /** @return list<BlindValidation> */
    public function findForUser(User $user): array
    {
        return $this->findBy(['user' => $user], ['createdAt' => 'DESC']);
    }

    /** @return list<BlindValidation> */
    public function findAllForMetrics(): array
    {
        return $this->createQueryBuilder('v')
            ->orderBy('v.createdAt', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * The accuracy numbers of spec §10.
     *
     * Two things this deliberately does *not* do.
     *
     * It does not average the error. Rectification errors are long-tailed — a
     * handful of runs land half a day out — and a mean would be dragged around
     * by them while saying nothing about the typical user. The median is the
     * number that answers "what will most people see".
     *
     * It does not fold inconclusive runs into the accuracy figures. They have
     * no estimate to be wrong about. They are counted separately, because an
     * engine that refuses half the time and is excellent otherwise is a
     * different product from one that always answers and is often wrong, and
     * the UI promises have to be calibrated on the right one.
     *
     * @param list<BlindValidation> $validations
     *
     * @return array{
     *     total: int, scored: int, inconclusive: int, inconclusive_rate: float|null,
     *     median_error: int|null, mean_error: int|null,
     *     within_15: float|null, within_30: float|null, within_60: float|null,
     *     calibration: float|null
     * }
     */
    public static function summarise(array $validations): array
    {
        $total  = count($validations);
        $scored = array_values(array_filter(
            $validations,
            static fn (BlindValidation $v): bool => $v->getErrorMinutes() !== null
        ));

        $inconclusive = $total - count($scored);

        if ($scored === []) {
            return [
                'total'             => $total,
                'scored'            => 0,
                'inconclusive'      => $inconclusive,
                'inconclusive_rate' => $total > 0 ? round($inconclusive / $total, 3) : null,
                'median_error'      => null,
                'mean_error'        => null,
                'within_15'         => null,
                'within_30'         => null,
                'within_60'         => null,
                'calibration'       => null,
            ];
        }

        $errors = array_map(static fn (BlindValidation $v): int => $v->getErrorMinutes(), $scored);
        sort($errors);

        $within = static fn (int $limit): float => round(
            count(array_filter($errors, static fn (int $e): bool => $e <= $limit)) / count($errors),
            3
        );

        // Is the announced margin honest? For a well-calibrated 80 % interval,
        // roughly 80 % of runs should land inside their own stated ±X. Far
        // below means the app is promising more precision than it delivers —
        // which is exactly the claim §10 says must be measured, not assumed.
        $covered = 0;
        $withInterval = 0;
        foreach ($scored as $validation) {
            if ($validation->getUncertaintyMinutes() === null) {
                continue;
            }
            ++$withInterval;
            if ($validation->getErrorMinutes() <= $validation->getUncertaintyMinutes()) {
                ++$covered;
            }
        }

        return [
            'total'             => $total,
            'scored'            => count($scored),
            'inconclusive'      => $inconclusive,
            'inconclusive_rate' => round($inconclusive / $total, 3),
            'median_error'      => self::median($errors),
            'mean_error'        => (int) round(array_sum($errors) / count($errors)),
            'within_15'         => $within(15),
            'within_30'         => $within(30),
            'within_60'         => $within(60),
            'calibration'       => $withInterval > 0 ? round($covered / $withInterval, 3) : null,
        ];
    }

    /**
     * The same numbers, split by how much and how good the input was — the
     * segmentation §10 asks for, because a single global figure would average a
     * three-event run with a twelve-event one and describe neither.
     *
     * @param list<BlindValidation> $validations
     *
     * @return array<string, array<string, mixed>>
     */
    public static function segment(array $validations): array
    {
        $buckets = [];

        foreach ($validations as $validation) {
            $key = self::bucketFor($validation);
            $buckets[$key][] = $validation;
        }

        ksort($buckets);

        return array_map(self::summarise(...), $buckets);
    }

    private static function bucketFor(BlindValidation $validation): string
    {
        $events = match (true) {
            $validation->getEventCount() >= 10 => '10+ évts',
            $validation->getEventCount() >= 7  => '7-9 évts',
            $validation->getEventCount() >= 5  => '5-6 évts',
            default                            => '<5 évts',
        };

        $precise = match (true) {
            $validation->getDayDatedCount() >= 5 => '5+ au jour',
            $validation->getDayDatedCount() >= 3 => '3-4 au jour',
            default                              => '0-2 au jour',
        };

        return "$events · $precise";
    }

    /** @param list<int> $sorted */
    private static function median(array $sorted): int
    {
        $count  = count($sorted);
        $middle = intdiv($count, 2);

        return $count % 2 === 0
            ? (int) round(($sorted[$middle - 1] + $sorted[$middle]) / 2)
            : $sorted[$middle];
    }
}
