<?php

namespace App\Service\Rectification\Technique;

use App\Service\Rectification\Ephemeris;
use App\Service\Rectification\NatalContext;
use App\Service\Rectification\RectificationConfig;

/**
 * Transits of Pluto, Neptune, Uranus and Saturn to the natal angles (spec §7.3).
 *
 * These are the rare, slow contacts. Pluto crosses a given degree once in a
 * lifetime, so a match is strong evidence — but only once it has been divided
 * by its base rate, which is what the engine does. Raw, a slow planet sitting
 * within orb for eighteen months would otherwise score for every event in that
 * period regardless of the candidate.
 */
final class SlowTransitTechnique implements TechniqueInterface
{
    public function __construct(private readonly Ephemeris $ephemeris)
    {
    }

    public function name(): string
    {
        return 'slow_transit_angles';
    }

    public function score(NatalContext $natal, \DateTimeImmutable $date): float
    {
        $total = 0.0;
        foreach ($this->hits($natal, $date) as $hit) {
            $total += $hit['score'];
        }

        return $total;
    }

    public function hits(NatalContext $natal, \DateTimeImmutable $date): array
    {
        $orb  = RectificationConfig::technique($this->name())['orb'];
        $hits = [];

        foreach (RectificationConfig::SLOW_PLANETS as $planet) {
            $transiting = $this->ephemeris->longitude($planet, $date);

            foreach (['Ascendant', 'Midheaven'] as $angle) {
                $hit = AspectKernel::best($transiting, $natal->point($angle), $orb);
                if ($hit !== null) {
                    $hits[] = ['moving' => "T:$planet", 'target' => $angle] + $hit;
                }
            }
        }

        return $hits;
    }

    /**
     * Dates at which a transiting planet enters and leaves orb of a fixed natal
     * longitude, scanned daily over a window.
     *
     * Not used by the posterior — the engine only ever asks for a score at a
     * date — but it is what the level-2 fixtures assert on, because orb
     * boundaries are where a wrong ephemeris shows up as a clean, checkable
     * date rather than a vague numeric drift. Retrograde planets cross the same
     * degree up to three times, so every passage is returned.
     *
     * @return list<array{aspect: string, entry: string, exit: string}>
     */
    public function orbPassages(
        string $planet,
        float $natalLongitude,
        \DateTimeImmutable $from,
        \DateTimeImmutable $until,
    ): array {
        $orb      = RectificationConfig::technique($this->name())['orb'];
        $passages = [];
        $open     = [];

        for ($day = $from; $day <= $until; $day = $day->modify('+1 day')) {
            $noon       = $day->setTime(12, 0, 0);
            $transiting = $this->ephemeris->longitude($planet, $noon);
            $separation = \App\Service\PlanetaryCalculator::separation($transiting, $natalLongitude);

            foreach (RectificationConfig::HARD_ASPECTS as $aspect => $exact) {
                $inOrb = abs($separation - $exact) <= $orb;

                if ($inOrb && !isset($open[$aspect])) {
                    $open[$aspect] = $noon;
                } elseif (!$inOrb && isset($open[$aspect])) {
                    $passages[] = [
                        'aspect' => $aspect,
                        'entry'  => $open[$aspect]->format('Y-m-d'),
                        'exit'   => $day->modify('-1 day')->format('Y-m-d'),
                    ];
                    unset($open[$aspect]);
                }
            }
        }

        foreach ($open as $aspect => $entry) {
            $passages[] = [
                'aspect' => $aspect,
                'entry'  => $entry->format('Y-m-d'),
                'exit'   => $until->format('Y-m-d'),
            ];
        }

        return $passages;
    }
}
