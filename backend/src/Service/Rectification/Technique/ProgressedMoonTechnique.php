<?php

namespace App\Service\Rectification\Technique;

use App\Service\Rectification\NatalContext;
use App\Service\Rectification\RectificationConfig;

/**
 * The secondary-progressed Moon on the natal angles (spec §7.3).
 *
 * The progressed Moon covers roughly a degree per month of life, so it touches
 * every natal degree once every twenty-seven years or so. That makes it far
 * denser than the slow transits and far coarser than solar arc — its role is to
 * fill in the gaps between the rare contacts, not to pin anything on its own,
 * which is why it carries a middling weight and a wider orb.
 *
 * Note it is the *progressed* Moon, not the transiting one: the transiting Moon
 * crosses every degree every month and would be pure noise.
 */
final class ProgressedMoonTechnique implements TechniqueInterface
{
    public function __construct(
        private readonly float $latitude,
        private readonly float $longitude,
    ) {
    }

    public function name(): string
    {
        return 'progressed_moon_angles';
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

        $progressedMoon = $chart->getMoon()['longitude'];

        $hits = [];

        foreach (['Ascendant', 'Midheaven'] as $angle) {
            $hit = AspectKernel::best($progressedMoon, $natal->point($angle), $orb);
            if ($hit !== null) {
                $hits[] = ['moving' => 'P:Moon', 'target' => $angle] + $hit;
            }
        }

        return $hits;
    }
}
