<?php

namespace App\Service\Rectification;

/**
 * The prior over birth times (spec §13, step 7: "prior informé par la
 * distribution statistique des heures de naissance").
 *
 * Birth times are not uniform. Spontaneous labour peaks in the small hours,
 * while scheduled inductions and caesareans pile up in the morning and early
 * afternoon — so recorded birth times cluster hard around 08:00–12:00 in
 * countries with high medical intervention, with a secondary bump overnight.
 *
 * The prior is kept deliberately shallow. Its job is to break ties between
 * candidates the events cannot separate, never to overrule them: a genuine
 * 03:00 birth must not be dragged to 09:00 because more people are born then.
 * {@see STRENGTH} bounds exactly how much it may say, and
 * {@see RectificationEngineTest} pins that the events still win.
 *
 * The shape below is a reasonable stand-in, not a measured distribution. Like
 * the technique weights, it belongs to the set of constants to re-derive from
 * real data — here, national natality statistics rather than the blind corpus.
 */
final class BirthTimePrior
{
    /**
     * Relative likelihood of being born in each hour, 0-23. Values are
     * unnormalised; only their ratios matter.
     */
    private const HOURLY_SHAPE = [
        0 => 1.05, 1 => 1.05, 2 => 1.10, 3 => 1.15,
        4 => 1.15, 5 => 1.10, 6 => 1.00, 7 => 1.05,
        8 => 1.30, 9 => 1.35, 10 => 1.30, 11 => 1.20,
        12 => 1.10, 13 => 1.05, 14 => 1.00, 15 => 0.95,
        16 => 0.95, 17 => 0.90, 18 => 0.90, 19 => 0.90,
        20 => 0.90, 21 => 0.95, 22 => 0.95, 23 => 1.00,
    ];

    /**
     * How far the prior is allowed to move the log-posterior, in nats.
     *
     * At 0.12 the most and least likely hours differ by well under a fifth of
     * one event's contribution, so the prior can settle a coin-flip and nothing
     * more. Raising this would let demographics overrule someone's own life.
     */
    public const STRENGTH = 0.12;

    /**
     * Log-prior for a candidate, centred on zero so that switching the prior on
     * cannot shift the overall scale of the posterior — only its shape.
     */
    public static function logPriorFor(Candidate $candidate): float
    {
        $hour = (int) $candidate->local->format('G');

        return self::STRENGTH * (log(self::HOURLY_SHAPE[$hour]) - self::logGeometricMean());
    }

    /**
     * The centring constant.
     *
     * Geometric, not arithmetic: the prior is applied in log space, and only
     * subtracting the mean of the *logarithms* makes the contributions sum to
     * exactly zero. Centring on the arithmetic mean leaves a small negative
     * bias (Jensen's inequality) — harmless in itself, but it would mean
     * enabling the prior quietly shifted the scale of every posterior rather
     * than only its shape.
     */
    private static function logGeometricMean(): float
    {
        static $value = null;

        return $value ??= array_sum(array_map('log', self::HOURLY_SHAPE)) / count(self::HOURLY_SHAPE);
    }

    /**
     * The prior as a probability per hour, for display and for tests.
     *
     * @return array<int, float>
     */
    public static function hourlyDistribution(): array
    {
        $total = array_sum(self::HOURLY_SHAPE);

        return array_map(static fn (float $v): float => $v / $total, self::HOURLY_SHAPE);
    }
}
