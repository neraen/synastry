<?php

namespace App\Service\Rectification;

/**
 * The outcome of a rectification run.
 *
 * Its job, beyond carrying numbers, is to make the spec's presentation rules
 * structurally hard to break:
 *
 *   - `status()` is the single place that decides conclusive / multimodal /
 *     inconclusive, so no caller invents its own threshold;
 *   - there is no accessor that returns an estimated time without its
 *     uncertainty — `estimate()` always carries both (spec §14: "aucun écran
 *     n'affiche une heure sans son intervalle d'incertitude").
 */
final class RectificationResult
{
    public const STATUS_CONCLUSIVE   = 'conclusive';
    public const STATUS_MULTIMODAL   = 'multimodal';
    public const STATUS_INCONCLUSIVE = 'inconclusive';

    /** @var array{score: int, held_out: list<array{event: int, mode_stable: bool, event_predicted: bool, passed: bool}>}|null */
    private ?array $coherence = null;

    /**
     * @param list<LifeEvent>                                                                                                                       $events
     * @param list<list<float>>                                                                                                                     $logLikelihoodMatrix
     * @param list<array{event: LifeEvent, technique: string, moving: string, target: string, aspect: string, orb: float, score: float, date: \DateTimeImmutable}> $contributions
     */
    public function __construct(
        public readonly BirthWindow $window,
        public readonly array $events,
        public readonly PosteriorDistribution $posterior,
        public readonly array $logLikelihoodMatrix,
        public readonly array $contributions,
    ) {
    }

    /** @internal called by the engine once the guard rails have run */
    public function attachCoherence(array $coherence): void
    {
        $this->coherence = $coherence;
    }

    /** Hold-out coherence on 100 (spec §7.4). */
    public function coherenceScore(): int
    {
        if ($this->coherence === null) {
            throw new \LogicException('Résultat lu avant l\'exécution des garde-fous.');
        }

        return $this->coherence['score'];
    }

    /** @return list<array{event: int, mode_stable: bool, event_predicted: bool, passed: bool}> */
    public function holdOutDetail(): array
    {
        return $this->coherence['held_out'] ?? [];
    }

    /**
     * Conclusive, multimodal or inconclusive.
     *
     * Order matters: the guard rails come first. A posterior with a single
     * sharp peak that fails the coherence or contrast test is inconclusive, not
     * conclusive-with-a-caveat — presenting it as an estimate is exactly the
     * overfitting-as-precision failure the spec forbids.
     */
    public function status(): string
    {
        if ($this->coherenceScore() < RectificationConfig::COHERENCE_THRESHOLD
            || !$this->posterior->passesContrastTest()) {
            return self::STATUS_INCONCLUSIVE;
        }

        // A single trustworthy peak that spans half a day is not an estimate.
        // The guard rails above say the peak is real; this says it is useful.
        if ($this->posterior->uncertaintyMinutes() > RectificationConfig::MAX_CONCLUSIVE_UNCERTAINTY_MINUTES) {
            return self::STATUS_INCONCLUSIVE;
        }

        return $this->posterior->isMultimodal()
            ? self::STATUS_MULTIMODAL
            : self::STATUS_CONCLUSIVE;
    }

    public function isConclusive(): bool
    {
        return $this->status() === self::STATUS_CONCLUSIVE;
    }

    /**
     * The estimate, always as a time *and* its uncertainty.
     *
     * @return array{time: string, uncertainty_minutes: int, coherence: int, from: string, to: string}
     */
    public function estimate(): array
    {
        $interval = $this->posterior->credibleInterval();

        return [
            'time'                => $this->posterior->mode()->local->format('H:i'),
            'uncertainty_minutes' => $interval['half_width_minutes'],
            'coherence'           => $this->coherenceScore(),
            'from'                => $interval['from']->format('H:i'),
            'to'                  => $interval['to']->format('H:i'),
        ];
    }

    /**
     * Candidate times when the posterior is multimodal (spec §9.3).
     *
     * @return list<array{time: string, probability: float}>
     */
    public function candidateTimes(): array
    {
        return array_map(
            static fn (array $mode): array => [
                'time'        => $mode['candidate']->local->format('H:i'),
                'probability' => $mode['probability'],
            ],
            $this->posterior->modes()
        );
    }

    /**
     * What would unblock an inconclusive run (spec §9.4) — never a bare failure.
     *
     * @return list<string>
     */
    public function whatWouldHelp(): array
    {
        $needed  = [];
        $total   = count($this->events);
        $dayDated = count(array_filter($this->events, static fn (LifeEvent $e): bool => $e->isDatedToTheDay()));

        if ($total < RectificationConfig::MIN_EVENTS) {
            $needed[] = sprintf(
                'Il te manque %d événement%s.',
                RectificationConfig::MIN_EVENTS - $total,
                RectificationConfig::MIN_EVENTS - $total > 1 ? 's' : ''
            );
        }

        if ($dayDated < RectificationConfig::MIN_DAY_DATED_EVENTS) {
            $needed[] = sprintf(
                '%d événement%s daté%s au jour près suffirai%s probablement.',
                RectificationConfig::MIN_DAY_DATED_EVENTS - $dayDated,
                RectificationConfig::MIN_DAY_DATED_EVENTS - $dayDated > 1 ? 's' : '',
                RectificationConfig::MIN_DAY_DATED_EVENTS - $dayDated > 1 ? 's' : '',
                RectificationConfig::MIN_DAY_DATED_EVENTS - $dayDated > 1 ? 'ent' : 't'
            );
        }

        if ($needed === [] && $this->status() === self::STATUS_INCONCLUSIVE) {
            $needed[] = 'Un ou deux événements soudains de plus, datés au jour, resserreraient l\'estimation.';
        }

        return $needed;
    }

    /** Whether the input clears the calculation threshold of spec §5.3. */
    public function meetsInputThreshold(): bool
    {
        $dayDated = count(array_filter($this->events, static fn (LifeEvent $e): bool => $e->isDatedToTheDay()));

        return count($this->events) >= RectificationConfig::MIN_EVENTS
            && $dayDated >= RectificationConfig::MIN_DAY_DATED_EVENTS;
    }
}
