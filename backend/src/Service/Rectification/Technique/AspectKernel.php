<?php

namespace App\Service\Rectification\Technique;

use App\Service\PlanetaryCalculator;
use App\Service\Rectification\RectificationConfig;

/**
 * Turns an angular separation into a score, via a Gaussian centred on the exact
 * aspect.
 *
 * A hard cut-off at the orb would make the posterior a staircase and let a
 * candidate win by a hundredth of a degree over its neighbour. The Gaussian
 * keeps the likelihood smooth, so neighbouring candidates get neighbouring
 * scores and the peak of the posterior means something.
 */
final class AspectKernel
{
    /**
     * Score of a moving point at `$moving` degrees against a fixed point at
     * `$target`, for the hard aspects, with the given orb.
     *
     * @return array{aspect: string, orb: float, score: float}|null
     */
    public static function best(float $moving, float $target, float $orb): ?array
    {
        $separation = PlanetaryCalculator::separation($moving, $target);
        $sigma      = $orb * RectificationConfig::KERNEL_SIGMA_RATIO;

        $best = null;

        foreach (RectificationConfig::HARD_ASPECTS as $aspect => $exact) {
            $deviation = abs($separation - $exact);

            // Beyond twice the orb the Gaussian is below 3e-4: not a hit.
            if ($deviation > $orb * 2.0) {
                continue;
            }

            $score = exp(-0.5 * ($deviation / $sigma) ** 2);

            if ($best === null || $score > $best['score']) {
                $best = ['aspect' => $aspect, 'orb' => $deviation, 'score' => $score];
            }
        }

        return $best;
    }
}
