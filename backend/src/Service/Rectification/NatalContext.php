<?php

namespace App\Service\Rectification;

/**
 * Everything a technique needs to know about one candidate birth time.
 *
 * Built once per candidate and passed to every technique, so the expensive
 * natal pass happens exactly once regardless of how many techniques and event
 * samples are evaluated against it.
 */
final class NatalContext
{
    /**
     * @param array<string, float> $points natal longitudes, planets + angles
     */
    public function __construct(
        public readonly Candidate $candidate,
        public readonly array $points,
        public readonly \DateTimeImmutable $natalUtc,
    ) {
    }

    public function point(string $name): float
    {
        if (!isset($this->points[$name])) {
            throw new \InvalidArgumentException("Point natal inconnu : $name");
        }

        return $this->points[$name];
    }

    public function ascendant(): float
    {
        return $this->point('Ascendant');
    }

    public function midheaven(): float
    {
        return $this->point('Midheaven');
    }
}
