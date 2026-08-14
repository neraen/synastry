<?php

namespace App\Service\Rectification\Technique;

use App\Service\PlanetaryCalculator;
use App\Service\Rectification\RectificationConfig;

/**
 * The "day for a year" instant shared by the secondary-progression techniques.
 *
 * Secondary progressions are not solar arc, and confusing the two is the error
 * spec §11 names first. Under solar arc every point advances by one single
 * amount — the Sun's arc. Under secondary progressions the whole chart is
 * simply *recast* for a moment shortly after birth: one day after birth per
 * year lived. Each point then moves at its own natural rate, which is why the
 * progressed Moon covers about a degree a month of life while the progressed
 * Sun covers about a degree a year.
 *
 * The progressed angles are the discriminating part for rectification: recast a
 * few days after birth at the same place, the Ascendant has gone round the
 * whole zodiac many times, so two candidate birth times minutes apart give
 * progressed angles degrees apart. That sensitivity is the point — and the
 * reason this technique costs a chart per candidate per date.
 */
final class SecondaryProgression
{
    /** @var array<string, PlanetaryCalculator> */
    private static array $cache = [];

    /**
     * The progressed instant: birth plus one day per year elapsed.
     */
    public static function instantFor(\DateTimeImmutable $natalUtc, \DateTimeImmutable $date): \DateTimeImmutable
    {
        $elapsedDays = ($date->getTimestamp() - $natalUtc->getTimestamp()) / 86400.0;
        $ageYears    = $elapsedDays / RectificationConfig::YEAR_LENGTH_DAYS;

        return (new \DateTimeImmutable('@' . (int) round($natalUtc->getTimestamp() + $ageYears * 86400.0)))
            ->setTimezone(new \DateTimeZone('UTC'));
    }

    /**
     * The progressed chart, cast at the birth place.
     *
     * Cached to the second: within one engine run the same (candidate, event)
     * pair is asked for repeatedly — once per technique — and recasting is the
     * expensive part.
     */
    public static function chartFor(
        \DateTimeImmutable $natalUtc,
        \DateTimeImmutable $date,
        float $latitude,
        float $longitude,
    ): PlanetaryCalculator {
        $instant = self::instantFor($natalUtc, $date);
        $key     = $instant->getTimestamp() . ':' . $latitude . ':' . $longitude;

        return self::$cache[$key] ??= new PlanetaryCalculator(
            $instant->format('Y-m-d'),
            $instant->format('H:i:s'),
            $latitude,
            $longitude,
        );
    }

    /**
     * The cache is keyed by instant and grows with every candidate examined.
     * A long-running process (the CLI preview, the test suite) must be able to
     * drop it between runs.
     */
    public static function clearCache(): void
    {
        self::$cache = [];
    }
}
