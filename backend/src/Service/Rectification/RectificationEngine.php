<?php

namespace App\Service\Rectification;

use App\Service\Rectification\Technique\SlowTransitTechnique;
use App\Service\Rectification\Technique\SolarArcTechnique;
use App\Service\Rectification\Technique\TechniqueInterface;

/**
 * Bayesian birth-time rectification (spec §7).
 *
 *   grille de candidats -> vraisemblance par événement -> postérieur -> garde-fous
 *
 * Two design decisions carry most of the correctness of this class.
 *
 * **Base-rate normalisation.** A technique's raw score is meaningless on its
 * own: Saturn is within a degree of *something* rather often, Pluto almost
 * never. Dividing each technique's score by what it scores at random dates for
 * the *same candidate chart* is what makes a rare contact count as evidence and
 * a common one count as noise. Without it the frequent techniques drown the
 * discriminating ones and the posterior tracks nothing.
 *
 * **The guard rails are not optional.** With several techniques and a dozen
 * events, some candidate always fits. So {@see ConsistencyValidator} runs
 * inside `run()`, not beside it — a caller cannot obtain a result without also
 * obtaining the coherence score that says whether to believe it.
 */
final class RectificationEngine
{
    private EvidenceEvaluator $evaluator;

    /** @var list<TechniqueInterface> */
    private array $techniques;

    public function __construct(
        private readonly Ephemeris $ephemeris = new Ephemeris(),
        private readonly ConsistencyValidator $validator = new ConsistencyValidator(),
    ) {
        // Rebuilt per run once the birth place is known — the progression
        // techniques recast the chart and need coordinates.
        $this->evaluator  = new EvidenceEvaluator($this->ephemeris);
        $this->techniques = $this->evaluator->techniques();
    }

    /**
     * Shared with the active loop, which must measure evidence exactly the way
     * the posterior does or its questions would optimise for something else.
     */
    public function evaluator(): EvidenceEvaluator
    {
        return $this->evaluator;
    }

    /**
     * @param list<LifeEvent>            $events
     * @param array<string, string>|null $quizAnswers optional temperament quiz
     */
    public function run(BirthWindow $window, array $events, ?array $quizAnswers = null): RectificationResult
    {
        if ($events === []) {
            throw new \InvalidArgumentException('Aucun événement : rien à inférer.');
        }

        $this->evaluator  = new EvidenceEvaluator($this->ephemeris, $window->latitude, $window->longitude);
        $this->techniques = $this->evaluator->techniques();

        // Secondary progressions cache one recast chart per candidate per date;
        // that cache is only valid for this birth place and this run.
        Technique\SecondaryProgression::clearCache();

        $quizScores = $quizAnswers === null ? [] : TemperamentQuiz::signScores($quizAnswers);

        $candidates = $window->candidates();
        $referenceDates = $this->referenceDates($window, $events);

        // Per-event sample dates, computed once — this is the convolution of the
        // date uncertainty (§7.2), and it is what makes an imprecise date
        // mechanically less informative rather than merely flagged as such.
        $sampleDates = array_map(static fn (LifeEvent $e): array => $e->sampleDates(), $events);

        /** @var list<list<float>> $matrix candidate index => event index => log-likelihood */
        $matrix = [];

        foreach ($candidates as $candidate) {
            $natal = new NatalContext(
                $candidate,
                $candidate->points($window->latitude, $window->longitude),
                $candidate->utc,
            );

            $baseRates = $this->baseRates($natal, $referenceDates);

            $row = [];
            foreach ($events as $eventIndex => $event) {
                $row[] = $this->logLikelihood($natal, $event, $sampleDates[$eventIndex], $baseRates);
            }

            $matrix[] = $row;
        }

        // Prior + evidence. Both extras are bounded far below one event's
        // contribution, so demographics and a self-reported quiz can settle a
        // tie and never overrule someone's own dated life (spec §7.3, §7.5).
        $logPosterior = [];
        foreach ($matrix as $index => $row) {
            $candidate = $candidates[$index];

            $logPosterior[] = array_sum($row)
                + BirthTimePrior::logPriorFor($candidate)
                + ($quizScores === []
                    ? 0.0
                    : TemperamentQuiz::logContributionFor($candidate, $quizScores, $window->latitude, $window->longitude));
        }

        $posterior = new PosteriorDistribution($candidates, $logPosterior);

        $result = new RectificationResult(
            window: $window,
            events: $events,
            posterior: $posterior,
            logLikelihoodMatrix: $matrix,
            contributions: $this->contributions($window, $posterior->mode(), $events),
        );

        $result->attachCoherence($this->validator->validate($result));

        return $result;
    }

    /**
     * Log-likelihood of one event under one candidate, relative to chance.
     *
     * The score is expressed as a ratio to the base rate, so a candidate that
     * explains the event no better than a random chart contributes exactly
     * zero. Positive means "this birth time explains that event"; negative
     * means the opposite, which is what makes an "il ne s'est rien passé"
     * answer (spec §8) informative rather than merely ignorable.
     *
     * @param list<\DateTimeImmutable> $sampleDates
     * @param array<string, float>     $baseRates
     */
    private function logLikelihood(
        NatalContext $natal,
        LifeEvent $event,
        array $sampleDates,
        array $baseRates,
    ): float {
        // Evidence of 1.0 == exactly what chance would produce for this chart.
        // The averaging over sample dates inside is the convolution of §7.2.
        $evidence = $this->evaluator->evidence($natal, $sampleDates, $baseRates);
        $logRatio = $this->evaluator->logRatio($evidence);

        if ($event->expectation === LifeEvent::EXPECTATION_ABSENT) {
            $logRatio = -$logRatio;
        }

        $contribution = $event->weight() * $logRatio;

        // Cap the influence of any single event (§7.4, anti-overfitting).
        return max(
            -RectificationConfig::MAX_LOG_CONTRIBUTION,
            min(RectificationConfig::MAX_LOG_CONTRIBUTION, $contribution)
        );
    }

    /**
     * What each technique scores "by chance" for this particular chart.
     *
     * Per candidate, not global: a chart whose Ascendant sits on a degree Pluto
     * crawled over for two years has a genuinely higher Pluto base rate, and
     * failing to account for that would hand it free evidence for every event
     * in that period.
     *
     * @param list<\DateTimeImmutable> $referenceDates
     *
     * @return array<string, float>
     */
    private function baseRates(NatalContext $natal, array $referenceDates): array
    {
        return $this->evaluator->baseRates($natal, $referenceDates);
    }

    /**
     * Dates spanning the subject's adult life, used both to measure base rates
     * and — by the active loop — to hunt for discriminating windows.
     *
     * @return list<\DateTimeImmutable>
     */
    public function referenceDatesFor(BirthWindow $window, array $events): array
    {
        return $this->referenceDates($window, $events);
    }

    /**
     * Dates at which the base rates are measured: evenly spread over the span
     * the events actually cover, extended a little either side.
     *
     * Even spacing rather than random sampling, so two runs on the same input
     * produce the same number — a user who reopens their result must not see it
     * move.
     *
     * @param list<LifeEvent> $events
     *
     * @return list<\DateTimeImmutable>
     */
    private function referenceDates(BirthWindow $window, array $events): array
    {
        $timestamps = array_map(static fn (LifeEvent $e): int => $e->date->getTimestamp(), $events);

        $from  = min($timestamps) - 2 * 365 * 86400;
        $until = max($timestamps) + 2 * 365 * 86400;

        // Never sample before birth: directions and transits are undefined there.
        $birth = $window->toUtc($window->startLocal)->getTimestamp();
        $from  = max($from, $birth + 365 * 86400);

        if ($until <= $from) {
            $until = $from + 10 * 365 * 86400;
        }

        $samples = RectificationConfig::BASE_RATE_SAMPLES;
        $step    = ($until - $from) / ($samples - 1);

        $dates = [];
        for ($i = 0; $i < $samples; ++$i) {
            $dates[] = (new \DateTimeImmutable('@' . (int) round($from + $i * $step)))
                ->setTimezone(new \DateTimeZone('UTC'))
                ->setTime(12, 0, 0);
        }

        return $dates;
    }

    /**
     * The strongest hits at the winning time, for the "pourquoi cette heure"
     * section of spec §9.2.
     *
     * Only computed for the mode — this is explanatory material, not part of
     * the inference.
     *
     * @param list<LifeEvent> $events
     *
     * @return list<array{event: LifeEvent, technique: string, moving: string, target: string, aspect: string, orb: float, score: float, date: \DateTimeImmutable}>
     */
    private function contributions(BirthWindow $window, Candidate $mode, array $events): array
    {
        $natal = new NatalContext(
            $mode,
            $mode->points($window->latitude, $window->longitude),
            $mode->utc,
        );

        $contributions = [];

        foreach ($events as $event) {
            $best = null;

            foreach ($event->sampleDates() as $date) {
                foreach ($this->techniques as $technique) {
                    foreach ($technique->hits($natal, $date) as $hit) {
                        if ($best === null || $hit['score'] > $best['score']) {
                            $best = $hit + [
                                'event'     => $event,
                                'technique' => $technique->name(),
                                'date'      => $date,
                            ];
                        }
                    }
                }
            }

            if ($best !== null) {
                $contributions[] = $best;
            }
        }

        usort($contributions, static fn (array $a, array $b): int => $b['score'] <=> $a['score']);

        return $contributions;
    }
}
