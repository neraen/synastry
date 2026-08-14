<?php

namespace App\Service\Rectification;

/**
 * The posterior over candidate birth times, and everything read off it.
 *
 * Deliberately a value object with no astrology in it: given a normalised
 * probability per candidate, this class knows how to find the modes, the
 * credible interval, the entropy and the contrast. That separation is what lets
 * the guard rails of §7.4 be tested on hand-built distributions, without
 * standing up an ephemeris.
 */
final class PosteriorDistribution
{
    /** @var list<float> normalised probabilities, aligned with $candidates */
    public readonly array $probabilities;

    /**
     * @param list<Candidate> $candidates
     * @param list<float>     $logPosterior unnormalised log probabilities
     */
    public function __construct(
        public readonly array $candidates,
        array $logPosterior,
    ) {
        $this->probabilities = self::normalise($logPosterior);
    }

    /**
     * Exponentiate and normalise in a numerically safe way.
     *
     * Subtracting the maximum before exponentiating is not a nicety: with a
     * dozen events the raw log-posterior easily reaches -40, and exp(-40)
     * underflows to zero for every candidate at once, producing a division by
     * zero instead of a distribution.
     *
     * @param list<float> $logPosterior
     *
     * @return list<float>
     */
    private static function normalise(array $logPosterior): array
    {
        if ($logPosterior === []) {
            throw new \InvalidArgumentException('Postérieur vide.');
        }

        $max    = max($logPosterior);
        $scaled = array_map(static fn (float $l): float => exp($l - $max), $logPosterior);
        $sum    = array_sum($scaled);

        return array_map(static fn (float $p): float => $p / $sum, $scaled);
    }

    public function size(): int
    {
        return count($this->probabilities);
    }

    /** Index of the single most probable candidate. */
    public function modeIndex(): int
    {
        return (int) array_search(max($this->probabilities), $this->probabilities, true);
    }

    public function mode(): Candidate
    {
        return $this->candidates[$this->modeIndex()];
    }

    /**
     * Contrast test of spec §7.4: the peak must stand well above the window
     * average, otherwise the "estimate" is a flat distribution with a rounding
     * error on top.
     *
     * For a uniform distribution this is exactly 1, so the ratio reads directly
     * as "how many times more likely than chance".
     */
    public function contrast(): float
    {
        return max($this->probabilities) * $this->size();
    }

    public function passesContrastTest(): bool
    {
        return $this->contrast() >= RectificationConfig::CONTRAST_FACTOR;
    }

    /** Shannon entropy in bits. */
    public function entropy(): float
    {
        $h = 0.0;
        foreach ($this->probabilities as $p) {
            if ($p > 0.0) {
                $h -= $p * log($p, 2);
            }
        }

        return $h;
    }

    /**
     * Entropy as a fraction of the uniform maximum: 1.0 means the events taught
     * us nothing, 0.0 means a single candidate carries all the probability.
     * This is the quantity the active loop (spec §8) is trying to reduce.
     */
    public function normalisedEntropy(): float
    {
        $maximum = log($this->size(), 2);

        return $maximum > 0.0 ? $this->entropy() / $maximum : 0.0;
    }

    /**
     * Highest-density credible region: the smallest set of candidates holding
     * `$mass` of the probability.
     *
     * Returned as indices rather than an interval because for a multimodal
     * posterior the region genuinely is disjoint, and flattening it to a single
     * span would quietly report an interval containing times the model
     * considers implausible.
     *
     * @return list<int>
     */
    public function credibleRegion(float $mass = RectificationConfig::CREDIBLE_MASS): array
    {
        $sorted = $this->probabilities;
        arsort($sorted);

        $region      = [];
        $accumulated = 0.0;

        foreach ($sorted as $index => $probability) {
            $region[]     = $index;
            $accumulated += $probability;
            if ($accumulated >= $mass) {
                break;
            }
        }

        sort($region);

        return $region;
    }

    /**
     * The credible region expressed as a span of clock time.
     *
     * `contiguous` says whether the region is a single stretch. When it is not,
     * the span is still reported — the UI needs something to draw — but callers
     * must present the result as multimodal rather than as one interval.
     *
     * @return array{from: \DateTimeImmutable, to: \DateTimeImmutable, minutes: int, half_width_minutes: int, contiguous: bool}
     */
    public function credibleInterval(float $mass = RectificationConfig::CREDIBLE_MASS): array
    {
        $region = $this->credibleRegion($mass);

        $first = $this->candidates[$region[0]];
        $last  = $this->candidates[$region[count($region) - 1]];

        $minutes = (int) round(($last->local->getTimestamp() - $first->local->getTimestamp()) / 60)
            + RectificationConfig::GRID_STEP_MINUTES;

        return [
            'from'               => $first->local,
            'to'                 => $last->local,
            'minutes'            => $minutes,
            'half_width_minutes' => (int) ceil($minutes / 2),
            'contiguous'         => count($region) === ($region[count($region) - 1] - $region[0] + 1),
        ];
    }

    /**
     * The uncertainty shown on the precision dial: half the width of the 80 %
     * interval. Spec §6 — this is the number that has to visibly shrink as
     * events are added, and no time is ever displayed without it.
     */
    public function uncertaintyMinutes(): int
    {
        return $this->credibleInterval()['half_width_minutes'];
    }

    /**
     * Distinct modes of the posterior.
     *
     * A candidate is a mode if it is a local maximum, carries at least
     * MODE_PROMINENCE_RATIO of the main peak, and is not within
     * MODE_SEPARATION_MINUTES of a stronger peak already accepted — otherwise
     * the two-minute grid would report a dozen "modes" along one broad hill.
     *
     * @return list<array{index: int, candidate: Candidate, probability: float}>
     */
    public function modes(): array
    {
        $peak      = max($this->probabilities);
        $threshold = $peak * RectificationConfig::MODE_PROMINENCE_RATIO;
        $minimumGap = (int) ceil(
            RectificationConfig::MODE_SEPARATION_MINUTES / RectificationConfig::GRID_STEP_MINUTES
        );

        $localMaxima = [];
        $n = $this->size();

        for ($i = 0; $i < $n; ++$i) {
            $p = $this->probabilities[$i];
            if ($p < $threshold) {
                continue;
            }

            $left  = $this->probabilities[$i - 1] ?? -INF;
            $right = $this->probabilities[$i + 1] ?? -INF;

            if ($p >= $left && $p >= $right) {
                $localMaxima[] = ['index' => $i, 'candidate' => $this->candidates[$i], 'probability' => $p];
            }
        }

        usort($localMaxima, static fn (array $a, array $b): int => $b['probability'] <=> $a['probability']);

        $accepted = [];
        foreach ($localMaxima as $maximum) {
            foreach ($accepted as $existing) {
                if (abs($maximum['index'] - $existing['index']) < $minimumGap) {
                    continue 2;
                }
            }
            $accepted[] = $maximum;
        }

        return $accepted;
    }

    public function isMultimodal(): bool
    {
        return count($this->modes()) > 1;
    }

    /** Probability mass within `$minutes` of the mode — used by the blind validation. */
    public function massWithin(int $minutes): float
    {
        $modeIndex = $this->modeIndex();
        $span      = (int) floor($minutes / RectificationConfig::GRID_STEP_MINUTES);

        $mass = 0.0;
        for ($i = max(0, $modeIndex - $span); $i <= min($this->size() - 1, $modeIndex + $span); ++$i) {
            $mass += $this->probabilities[$i];
        }

        return $mass;
    }
}
