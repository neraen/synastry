<?php

namespace App\Service\Rectification\Technique;

use App\Service\Rectification\NatalContext;
use App\Service\Rectification\RectificationConfig;

/**
 * Secondary-progressed Ascendant and Midheaven on the natal planets
 * (spec §7.3, "redondance croisée").
 *
 * Its value is that it is *independent* of solar arc while measuring the same
 * thing. Solar arc moves the angles by the Sun's arc; secondary progression
 * recasts the chart and lets the angles move at their own rate. When both point
 * at the same birth time, that agreement is real evidence rather than one
 * technique counted twice — which is exactly why the base-rate normalisation
 * matters here: without it, two correlated techniques would look like
 * corroboration whatever the answer.
 */
final class ProgressedAnglesTechnique implements TechniqueInterface
{
    public function __construct(
        private readonly float $latitude,
        private readonly float $longitude,
    ) {
    }

    public function name(): string
    {
        return 'progressed_angles';
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
        $orb   = RectificationConfig::technique($this->name())['orb'];
        $chart = SecondaryProgression::chartFor($natal->natalUtc, $date, $this->latitude, $this->longitude);

        $angles = [
            'Ascendant' => $chart->getAscendant()['longitude'],
            'Midheaven' => $chart->getMidheaven()['longitude'],
        ];

        $hits = [];

        foreach ($angles as $angle => $progressed) {
            foreach (RectificationConfig::SOLAR_ARC_TARGETS as $target) {
                $hit = AspectKernel::best($progressed, $natal->point($target), $orb);
                if ($hit !== null) {
                    $hits[] = ['moving' => "P:$angle", 'target' => $target] + $hit;
                }
            }
        }

        return $hits;
    }
}
