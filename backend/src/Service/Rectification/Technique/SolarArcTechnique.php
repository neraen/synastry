<?php

namespace App\Service\Rectification\Technique;

use App\Service\Rectification\Ephemeris;
use App\Service\Rectification\NatalContext;
use App\Service\Rectification\RectificationConfig;

/**
 * Solar arc directions involving the angles — the main pillar (spec §7.3).
 *
 * The solar arc is how far the Sun has moved in as many *days* after birth as
 * the subject has lived *years*. That is close to one degree per year, which is
 * exactly why this technique is the backbone of rectification: with a
 * half-degree orb, an event dated to the day pins the Ascendant to within a few
 * arc-minutes, and the Ascendant moves roughly a degree every four minutes of
 * clock time.
 *
 * Both directions are scored, because both are "solar arc on the angles":
 *   - the directed angles arriving on natal planets;
 *   - directed planets arriving on the natal angles.
 *
 * The trap this class exists to avoid: solar arc is *not* a secondary
 * progression of the angles. Every point moves by the same arc — the Sun's —
 * not at its own progressed rate. Mixing the two produces a chart that looks
 * plausible and is wrong by degrees.
 */
final class SolarArcTechnique implements TechniqueInterface
{
    public function __construct(private readonly Ephemeris $ephemeris)
    {
    }

    public function name(): string
    {
        return 'solar_arc_angles';
    }

    /**
     * The arc itself, in degrees: progressed Sun minus natal Sun.
     *
     * Exposed publicly because it is what the level-2 fixtures assert on. An
     * off-by-one in the day-for-a-year mapping is invisible in the posterior
     * but shifts every hit by a degree.
     */
    public function arc(\DateTimeImmutable $natalUtc, \DateTimeImmutable $date): float
    {
        $elapsedDays = ($date->getTimestamp() - $natalUtc->getTimestamp()) / 86400.0;
        $ageYears    = $elapsedDays / RectificationConfig::YEAR_LENGTH_DAYS;

        // One day after birth per year lived — the progressed instant.
        $progressed = (new \DateTimeImmutable('@' . (int) round($natalUtc->getTimestamp() + $ageYears * 86400.0)))
            ->setTimezone(new \DateTimeZone('UTC'));

        $natalSun      = $this->ephemeris->longitude('Sun', $natalUtc);
        $progressedSun = $this->ephemeris->longitude('Sun', $progressed);

        $arc = Ephemeris::signedDelta($natalSun, $progressedSun);

        // The Sun always advances; a negative shortest-arc means the arc has
        // passed 180 deg, which only happens well beyond any human lifespan.
        return $arc < 0 ? $arc + 360.0 : $arc;
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
        $orb = RectificationConfig::technique($this->name())['orb'];
        $arc = $this->arc($natal->natalUtc, $date);

        $hits = [];

        // Directed angles onto natal planets.
        foreach (['Ascendant', 'Midheaven'] as $angle) {
            $directed = Ephemeris::norm360($natal->point($angle) + $arc);

            foreach (RectificationConfig::SOLAR_ARC_TARGETS as $target) {
                $hit = AspectKernel::best($directed, $natal->point($target), $orb);
                if ($hit !== null) {
                    $hits[] = ['moving' => "AS:$angle", 'target' => $target] + $hit;
                }
            }
        }

        // Directed planets onto the natal angles.
        foreach (RectificationConfig::SOLAR_ARC_TARGETS as $moving) {
            $directed = Ephemeris::norm360($natal->point($moving) + $arc);

            foreach (['Ascendant', 'Midheaven'] as $angle) {
                $hit = AspectKernel::best($directed, $natal->point($angle), $orb);
                if ($hit !== null) {
                    $hits[] = ['moving' => "AS:$moving", 'target' => $angle] + $hit;
                }
            }
        }

        return $hits;
    }
}
