<?php

namespace App\Service\Rectification;

use App\Service\Rectification\Technique\ProgressedAnglesTechnique;
use App\Service\Rectification\Technique\ProgressedMoonTechnique;
use App\Service\Rectification\Technique\SlowTransitTechnique;
use App\Service\Rectification\Technique\SolarArcTechnique;
use App\Service\Rectification\Technique\TechniqueInterface;

/**
 * How strongly a candidate chart "expects" something on a set of dates,
 * expressed relative to chance.
 *
 * Extracted from {@see RectificationEngine} because the active loop needs
 * exactly the same measurement to decide which question to ask. Base-rate
 * normalisation is the subtle part of this module — a second, slightly
 * different copy of it in the question generator would silently make the
 * questions optimise for something other than what the posterior scores.
 *
 * The scale is deliberate: an evidence of 1.0 means "no better than a random
 * date for this chart". Everything downstream reads that as its zero.
 */
final class EvidenceEvaluator
{
    /** @var list<TechniqueInterface> */
    private array $techniques;

    /**
     * @param float|null $latitude  birth place, needed by the techniques that
     *                              recast the chart (secondary progressions);
     *                              those stay disabled when it is unknown
     */
    public function __construct(
        private readonly Ephemeris $ephemeris,
        private readonly ?float $latitude = null,
        private readonly ?float $longitude = null,
    ) {
        $available = [
            'solar_arc_angles'    => new SolarArcTechnique($this->ephemeris),
            'slow_transit_angles' => new SlowTransitTechnique($this->ephemeris),
        ];

        // Secondary progressions recast the whole chart at the birth place, so
        // they only exist once coordinates are known.
        if ($this->latitude !== null && $this->longitude !== null) {
            $available['progressed_angles']      = new ProgressedAnglesTechnique($this->latitude, $this->longitude);
            $available['progressed_moon_angles'] = new ProgressedMoonTechnique($this->latitude, $this->longitude);
        }

        $this->techniques = array_values(array_intersect_key(
            $available,
            array_flip(RectificationConfig::enabledTechniques())
        ));
    }

    /** @return list<TechniqueInterface> */
    public function techniques(): array
    {
        return $this->techniques;
    }

    /**
     * What each technique scores by chance for this particular chart.
     *
     * Per candidate, not global: a chart whose Ascendant sits on a degree Pluto
     * crawled over for two years genuinely has a higher Pluto base rate, and
     * ignoring that would hand it free evidence for every event in the period.
     *
     * @param list<\DateTimeImmutable> $referenceDates
     *
     * @return array<string, float>
     */
    public function baseRates(NatalContext $natal, array $referenceDates): array
    {
        $rates = [];

        foreach ($this->techniques as $technique) {
            $total = 0.0;
            foreach ($referenceDates as $date) {
                $total += $technique->score($natal, $date);
            }
            $rates[$technique->name()] = $total / count($referenceDates);
        }

        return $rates;
    }

    /**
     * Weighted, base-rate-normalised evidence, averaged over the dates.
     *
     * Averaging over several dates *is* the convolution of the date uncertainty
     * (spec §7.2): a month-precision event is handed a month of dates, and the
     * flattening that results is what makes an imprecise date mechanically less
     * informative instead of merely flagged as such.
     *
     * @param list<\DateTimeImmutable> $dates
     * @param array<string, float>     $baseRates
     */
    public function evidence(NatalContext $natal, array $dates, array $baseRates): float
    {
        $weighted    = 0.0;
        $totalWeight = 0.0;

        foreach ($this->techniques as $technique) {
            $configuration = RectificationConfig::technique($technique->name());

            $raw = 0.0;
            foreach ($dates as $date) {
                $raw += $technique->score($natal, $date);
            }
            $raw /= count($dates);

            $baseRate = max($baseRates[$technique->name()], RectificationConfig::BASE_RATE_FLOOR);

            $weighted    += $configuration['weight'] * ($raw / $baseRate);
            $totalWeight += $configuration['weight'];
        }

        return $totalWeight > 0.0 ? $weighted / $totalWeight : 1.0;
    }

    /**
     * Evidence as a log-ratio against chance: zero when the candidate explains
     * the dates no better than a random chart would.
     *
     * The floor keeps the logarithm finite when nothing fires at all, and makes
     * "no hit" a bounded penalty rather than an infinite one.
     */
    public function logRatio(float $evidence): float
    {
        $floor = 0.05;

        return log(($evidence + $floor) / (1.0 + $floor));
    }
}
