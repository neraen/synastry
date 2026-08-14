<?php

namespace App\Service\Rectification;

use App\Service\PlanetaryCalculator;

/**
 * One candidate birth time on the search grid, with its natal chart.
 *
 * The chart is built lazily and once: it is the expensive part of the search
 * (one full ephemeris pass per candidate) and every technique needs it.
 */
final class Candidate
{
    /** @var array<string, float>|null point name => ecliptic longitude */
    private ?array $points = null;

    public function __construct(
        public readonly int $index,
        public readonly \DateTimeImmutable $local,
        public readonly \DateTimeImmutable $utc,
    ) {
    }

    /**
     * Natal longitudes of the ten planets plus Ascendant and Midheaven.
     *
     * @return array<string, float>
     */
    public function points(float $latitude, float $longitude): array
    {
        if ($this->points === null) {
            $this->points = (new PlanetaryCalculator(
                $this->utc->format('Y-m-d'),
                $this->utc->format('H:i:s'),
                $latitude,
                $longitude
            ))->getAllPoints();
        }

        return $this->points;
    }

    /** Local birth time as the user reads it: "07 h 42". */
    public function label(): string
    {
        return $this->local->format('H\hi');
    }
}
