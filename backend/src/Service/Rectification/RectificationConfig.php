<?php

namespace App\Service\Rectification;

/**
 * Every tunable constant of the rectification engine, in one place.
 *
 * The weights below are first guesses. They are meant to be recalibrated
 * against the blind-validation corpus (spec §10), which is why nothing here is
 * inlined in the technique classes: a calibration run should only ever have to
 * touch this file.
 */
final class RectificationConfig
{
    // ─────────────────────────────────────────────────────────────────────────
    // Candidate grid
    // ─────────────────────────────────────────────────────────────────────────

    /** Spacing of the candidate birth times, in minutes (spec §7.1). */
    public const GRID_STEP_MINUTES = 2;

    /**
     * Length of the "day for a year" used by solar arc and secondary
     * progressions, in days.
     *
     * The tropical year. Using the calendar year (365.0) or the Julian year
     * (365.25) instead shifts the arc by roughly a quarter of a degree over a
     * forty-year life — a quarter of a degree is half the solar-arc orb, so
     * this constant alone can move an estimate by twenty minutes.
     */
    public const YEAR_LENGTH_DAYS = 365.2422;

    // ─────────────────────────────────────────────────────────────────────────
    // Techniques (spec §7.3)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Orb (degrees) and relative weight of each dating technique.
     *
     * Only the two `enabled` techniques are wired up in this version; the
     * others are declared so that the calibration surface is complete and
     * enabling them later is a one-line change (spec §13, step 7).
     *
     * @var array<string, array{orb: float, weight: float, enabled: bool}>
     */
    public const TECHNIQUES = [
        // Pilier principal : 1° = 1 an, un hit daté au jour contraint l'angle à la minute.
        'solar_arc_angles' => ['orb' => 0.5, 'weight' => 1.0, 'enabled' => true],
        // Très discriminants : Pluton / Neptune / Uranus / Saturne sur les angles.
        'slow_transit_angles' => ['orb' => 1.0, 'weight' => 1.0, 'enabled' => true],
        // Redondance croisée : indépendantes de l'arc solaire, elles mesurent
        // la même chose autrement — leur accord est donc une vraie confirmation.
        'progressed_angles' => ['orb' => 0.5, 'weight' => 0.7, 'enabled' => true],
        'progressed_moon_angles' => ['orb' => 1.0, 'weight' => 0.5, 'enabled' => true],
        'eclipses_on_angles' => ['orb' => 1.5, 'weight' => 0.5, 'enabled' => false],
        'jupiter_on_angles' => ['orb' => 1.5, 'weight' => 0.25, 'enabled' => false],
    ];

    /** Aspects considered "hits" on the angles, as exact separations in degrees. */
    public const HARD_ASPECTS = [
        'conjunction' => 0.0,
        'opposition'  => 180.0,
        'square'      => 90.0,
    ];

    /** Slow planets whose transits to the angles carry real signal. */
    public const SLOW_PLANETS = ['Pluto', 'Neptune', 'Uranus', 'Saturn'];

    /** Natal points a solar-arc directed angle can aspect. */
    public const SOLAR_ARC_TARGETS = [
        'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
        'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
    ];

    /**
     * Gaussian kernel width as a fraction of the orb.
     *
     * At sigma = orb/2, a hit exactly on the orb boundary scores ~0.14 of an
     * exact hit — a soft edge rather than a cliff, which keeps the posterior
     * differentiable and stops a candidate from winning by a hundredth of a
     * degree.
     */
    public const KERNEL_SIGMA_RATIO = 0.5;

    /**
     * Ceiling on the temperament-quiz contribution, as a share of the total
     * log-likelihood (spec §7.3: "plafonné à 10 % du score"). The quiz may
     * break a tie, never overturn the events.
     */
    public const TEMPERAMENT_QUIZ_MAX_SHARE = 0.10;

    // ─────────────────────────────────────────────────────────────────────────
    // Event weighting (spec §7.2)
    // ─────────────────────────────────────────────────────────────────────────

    /** Intensité — libellés produit : « un moment » / « un tournant » / « ça a tout changé ». */
    public const INTENSITY_WEIGHTS = [
        'moment'        => 0.6,
        'turning_point' => 1.0,
        'life_changing' => 1.4,
    ];

    /**
     * Date precision weight.
     *
     * This is the *declared* half of the precision effect. The other, larger
     * half is mechanical: a month-precision event is convolved over the whole
     * month, which flattens its likelihood on its own. Both are needed — the
     * convolution makes imprecise dates uninformative, this weight makes them
     * also less trusted.
     */
    public const PRECISION_WEIGHTS = [
        'day'     => 1.0,
        'week'    => 0.8,
        'month'   => 0.5,
        'quarter' => 0.35,
        'year'    => 0.25,
    ];

    /** Sudden events are datable to the day and unplanned — the best signal. */
    public const SUDDEN_WEIGHT   = 1.3;
    public const GRADUAL_WEIGHT  = 0.8;

    /** Weight of a pseudo-event produced by the active loop (spec §8). */
    public const PSEUDO_EVENT_WEIGHT = 0.6;

    /**
     * Ceiling on how much a single event may move the log-posterior.
     *
     * Without this, one event that happens to land on an exact aspect for one
     * candidate produces a spike that no other evidence can outvote — the
     * textbook overfit this module is most at risk of.
     */
    public const MAX_LOG_CONTRIBUTION = 2.5;

    // ─────────────────────────────────────────────────────────────────────────
    // Date-uncertainty convolution (spec §7.2)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * How a date of each precision is expanded into sample dates. `span_days`
     * is the total width centred on the stated date, `step_days` the spacing.
     *
     * @var array<string, array{span_days: int, step_days: int}>
     */
    public const PRECISION_SAMPLING = [
        'day'     => ['span_days' => 0,   'step_days' => 1],
        'week'    => ['span_days' => 6,   'step_days' => 1],
        'month'   => ['span_days' => 30,  'step_days' => 3],
        // The quarter is what the active loop's questions are framed on
        // ("entre septembre et décembre 2019"), so an answer is convolved over
        // exactly the span the question covered.
        'quarter' => ['span_days' => 90,  'step_days' => 6],
        'year'    => ['span_days' => 364, 'step_days' => 14],
    ];

    // ─────────────────────────────────────────────────────────────────────────
    // Active loop (spec §8)
    // ─────────────────────────────────────────────────────────────────────────

    /** Hard ceiling on generated questions — the spec expects 3 to 5 in practice. */
    public const ACTIVE_LOOP_MAX_QUESTIONS = 5;

    /**
     * Stop asking once the expected entropy reduction of the best remaining
     * question falls below this many bits. Past that point the questions cost
     * the user more attention than they buy in precision.
     */
    public const ACTIVE_LOOP_MIN_INFORMATION_GAIN = 0.02;

    /** Stop asking once the estimate is this tight; further questions are noise. */
    public const ACTIVE_LOOP_TARGET_UNCERTAINTY_MINUTES = 15;

    /**
     * Prior probability that any given quarter of an adult life contains
     * something the person would call marking, absent any astrological signal.
     *
     * This is the anchor that turns a technique score into a probability of a
     * "yes". It is a guess, and a consequential one — too high and every
     * question looks uninformative, too low and "rien de spécial" becomes
     * crushing evidence. Belongs in the set of constants to re-derive from the
     * blind-validation corpus.
     */
    public const ACTIVE_LOOP_BASE_EVENT_RATE = 0.30;

    /** Bounds on the modelled probability, so no single answer is ever decisive. */
    public const ACTIVE_LOOP_MIN_PROBABILITY = 0.05;
    public const ACTIVE_LOOP_MAX_PROBABILITY = 0.90;

    /**
     * How many candidates the question search scores.
     *
     * The search evaluates every candidate against every remaining quarter of
     * the subject's life, so its cost is the product of the two. Measured
     * against the full credible region it took nine seconds — far too slow for
     * a screen the user is waiting on.
     *
     * The candidates carrying the most mass dominate the expected information
     * gain, and the ranking between windows is what matters, not the absolute
     * number of bits. Scoring the heaviest candidates is enough to pick the
     * same window far faster.
     */
    public const ACTIVE_LOOP_MAX_CANDIDATES = 80;

    /** Candidates used by the cheap first pass that shortlists the windows. */
    public const ACTIVE_LOOP_COARSE_CANDIDATES = 32;

    /** Windows kept from the coarse pass and then measured properly. */
    public const ACTIVE_LOOP_SHORTLIST = 10;

    // ─────────────────────────────────────────────────────────────────────────
    // Base-rate normalisation (spec §7.2)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Number of reference dates used to measure what a technique scores "by
     * chance" for a given candidate. Spread deterministically over the
     * subject's life so runs are reproducible.
     */
    public const BASE_RATE_SAMPLES = 48;

    /** Floor on a base rate, so a technique that never fires cannot divide by zero. */
    public const BASE_RATE_FLOOR = 1e-4;

    // ─────────────────────────────────────────────────────────────────────────
    // Guard rails (spec §7.4) and thresholds
    // ─────────────────────────────────────────────────────────────────────────

    /** Minimum events, and how many of them must be dated to the day (spec §5.3). */
    public const MIN_EVENTS            = 5;
    public const MIN_DAY_DATED_EVENTS  = 2;

    /** Below this coherence score, the result is "non concluant" (spec §7.4). */
    public const COHERENCE_THRESHOLD = 60;

    /**
     * Posterior at the mode must beat the window mean by this factor (spec §7.4).
     *
     * CALIBRATION NOTE — this threshold is currently far too lax to do any
     * work. Measured on deliberately meaningless input (ten randomly dated
     * events on a 24 h window), the posterior still peaks at roughly 160 times
     * the window mean: with two techniques and a two-minute grid, *some*
     * candidate always fits, and it fits sharply. The contrast test as
     * specified therefore never fires, and the rolling hold-out is what
     * actually rejects those runs (coherence ~15/100 on the same input).
     *
     * Keep both mechanisms — they fail differently — but this number has to be
     * re-derived from the blind-validation corpus (spec §10) rather than taken
     * from the spec's placeholder. Until then, treat the hold-out score as the
     * operative guard rail.
     */
    public const CONTRAST_FACTOR = 3.0;

    /** Hold-out: the mode must stay within this many minutes when an event is removed. */
    public const HOLDOUT_MODE_TOLERANCE_MINUTES = 20;

    /**
     * Hold-out: how well the excluded event must be predicted at the mode the
     * other events point to, as a percentile of its own likelihood across the
     * window.
     *
     * A median bar (0.5) was measured to be far too lax — six mutually
     * incompatible events still scored 67/100 with it, because "better than
     * half the window" costs nothing when the likelihood is broad. Like
     * CONTRAST_FACTOR, this belongs to the set of constants to re-derive from
     * the blind-validation corpus.
     */
    public const PREDICTION_PERCENTILE = 0.75;

    /** Credible interval mass reported to the user (spec §7.1). */
    public const CREDIBLE_MASS = 0.80;

    /**
     * Widest uncertainty that may still be presented as an estimate.
     *
     * Not in the spec, added after measuring: five month-dated events produce a
     * single peak that passes both guard rails while spanning ±10 hours. That
     * is arithmetically a "conclusive unimodal result" and, shown to a user as
     * "03:20 ±617 min", it is nonsense wearing the costume of a measurement.
     *
     * The coherence and contrast tests ask "is this peak trustworthy"; neither
     * asks "is it narrow enough to be worth anything". This does.
     */
    public const MAX_CONCLUSIVE_UNCERTAINTY_MINUTES = 90;

    /** Two posterior peaks closer than this are the same mode. */
    public const MODE_SEPARATION_MINUTES = 20;

    /** A secondary peak below this share of the main peak is not a real mode. */
    public const MODE_PROMINENCE_RATIO = 0.35;

    /** Free tier stops at this many events (spec §12). */
    public const FREE_TIER_MAX_EVENTS = 3;

    public static function technique(string $name): array
    {
        if (!isset(self::TECHNIQUES[$name])) {
            throw new \InvalidArgumentException("Technique inconnue : $name");
        }

        return self::TECHNIQUES[$name];
    }

    /** @return list<string> */
    public static function enabledTechniques(): array
    {
        return array_keys(array_filter(
            self::TECHNIQUES,
            static fn (array $t): bool => $t['enabled']
        ));
    }
}
