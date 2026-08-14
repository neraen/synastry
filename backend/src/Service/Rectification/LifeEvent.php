<?php

namespace App\Service\Rectification;

/**
 * A dated life event, as the engine consumes it.
 *
 * Note what is *not* here: valence. "Difficile / heureux / neutre" is captured
 * in the UI because it drives how the explanation texts are worded, but it must
 * never reach the likelihood — astrologically, a hard transit is a hard transit
 * whether the user experienced it as a catastrophe or a liberation, and letting
 * valence into the maths would just add a free parameter to overfit with. It is
 * carried as metadata and ignored by every technique.
 */
final class LifeEvent
{
    public const PRECISION_DAY     = 'day';
    public const PRECISION_WEEK    = 'week';
    public const PRECISION_MONTH   = 'month';
    /** Used by the active loop, whose questions are framed on a quarter. */
    public const PRECISION_QUARTER = 'quarter';
    public const PRECISION_YEAR    = 'year';

    public const INTENSITY_MOMENT        = 'moment';
    public const INTENSITY_TURNING_POINT = 'turning_point';
    public const INTENSITY_LIFE_CHANGING = 'life_changing';

    /** The user reports something happened in this window. */
    public const EXPECTATION_OCCURRED = 'occurred';

    /**
     * The user reports nothing happened in this window.
     *
     * Spec §8: "Rien de spécial" is information in its own right — it penalises
     * the candidate that predicted a hit there. Carried here so the data model
     * is complete; the active loop that generates such answers is a later step.
     */
    public const EXPECTATION_ABSENT = 'absent';

    public function __construct(
        public readonly \DateTimeImmutable $date,
        public readonly string $precision = self::PRECISION_DAY,
        public readonly string $intensity = self::INTENSITY_TURNING_POINT,
        public readonly bool $sudden = true,
        public readonly ?string $valence = null,
        public readonly ?string $category = null,
        public readonly ?string $title = null,
        public readonly string $expectation = self::EXPECTATION_OCCURRED,
        public readonly bool $pseudo = false,
    ) {
        if (!isset(RectificationConfig::PRECISION_SAMPLING[$precision])) {
            throw new \InvalidArgumentException("Précision de date inconnue : $precision");
        }
        if (!isset(RectificationConfig::INTENSITY_WEIGHTS[$intensity])) {
            throw new \InvalidArgumentException("Intensité inconnue : $intensity");
        }
    }

    /**
     * Weight of this event in the posterior: intensity x date precision x
     * suddenness (spec §7.2).
     */
    public function weight(): float
    {
        if ($this->pseudo) {
            return RectificationConfig::PSEUDO_EVENT_WEIGHT
                * RectificationConfig::PRECISION_WEIGHTS[$this->precision];
        }

        return RectificationConfig::INTENSITY_WEIGHTS[$this->intensity]
            * RectificationConfig::PRECISION_WEIGHTS[$this->precision]
            * ($this->sudden ? RectificationConfig::SUDDEN_WEIGHT : RectificationConfig::GRADUAL_WEIGHT);
    }

    public function isDatedToTheDay(): bool
    {
        return $this->precision === self::PRECISION_DAY;
    }

    /**
     * The dates this event is evaluated over — the convolution of §7.2.
     *
     * A day-precise event is one date. A month-precise event is the whole
     * month, and its score is the average across it, which is what makes an
     * imprecise date mechanically less informative instead of merely
     * declared so.
     *
     * @return list<\DateTimeImmutable>
     */
    public function sampleDates(): array
    {
        $sampling = RectificationConfig::PRECISION_SAMPLING[$this->precision];

        if ($sampling['span_days'] === 0) {
            return [$this->noon($this->date)];
        }

        $half  = intdiv($sampling['span_days'], 2);
        $dates = [];

        for ($offset = -$half; $offset <= $sampling['span_days'] - $half; $offset += $sampling['step_days']) {
            $dates[] = $this->noon($this->date->modify(sprintf('%+d days', $offset)));
        }

        return $dates;
    }

    /**
     * Events are dated to the day at best, so every sample is evaluated at
     * midday UTC — the middle of the plausible instants, and a stable
     * convention the fixtures can rely on.
     */
    private function noon(\DateTimeImmutable $date): \DateTimeImmutable
    {
        return $date->setTime(12, 0, 0);
    }

    /** Human label used by the explanation texts (spec §9.2). */
    public function label(): string
    {
        return $this->title ?: ($this->category ?: 'Événement') . ' de ' . $this->date->format('Y');
    }
}
