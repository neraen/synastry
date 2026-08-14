<?php

namespace App\Service\Rectification;

/**
 * The active loop (spec §8) — the module generating its own questions.
 *
 * When the posterior is multimodal, more events chosen at random are a poor
 * use of the user's patience: most of them will be explained equally well by
 * every surviving mode and change nothing. So instead of asking for more, the
 * system looks for the one stretch of the person's life where the candidate
 * times *disagree* — where one predicts something marking and the other
 * predicts nothing — and asks about that.
 *
 * Selection is by expected information gain: for each candidate window, model
 * how likely a "yes" is under each candidate birth time, work out what the
 * posterior would look like after either answer, and keep the window whose
 * expected posterior entropy is lowest. That makes "combien de questions" a
 * consequence rather than a setting — the loop stops when the best remaining
 * question is not worth asking.
 *
 * Two things about the answers matter as much as the selection:
 *
 *   - **"Rien de spécial" is a real answer.** It penalises the candidate that
 *     predicted a hit there. A loop that only learned from "yes" would ratchet
 *     towards whichever mode happened to predict the most events.
 *   - **"Je ne sais plus" is genuinely neutral.** It is recorded as asked and
 *     never asked again, but it updates nothing.
 */
final class ActiveLoop
{
    /** Answer keys, as the UI offers them. */
    public const ANSWER_NOTHING   = 'rien';
    public const ANSWER_DIFFICULT = 'difficile';
    public const ANSWER_HAPPY     = 'heureux';
    public const ANSWER_TURNING   = 'tournant';
    public const ANSWER_UNKNOWN   = 'sais_pas';

    private const MONTHS_FR = [
        1 => 'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
        'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
    ];

    public function __construct(private readonly RectificationEngine $engine)
    {
    }

    /**
     * The next question worth asking, or null when the loop should stop.
     *
     * @param list<string> $alreadyAsked window keys already put to the user
     *
     * @return array{key: string, question: string, from: string, to: string, midpoint: string, expected_gain: float}|null
     */
    public function nextQuestion(RectificationResult $result, array $alreadyAsked = []): ?array
    {
        if (!$this->shouldContinue($result, $alreadyAsked)) {
            return null;
        }

        $posterior  = $result->posterior;
        $window     = $result->window;
        $evaluator  = $this->engine->evaluator();
        $baseEntropy = $posterior->entropy();

        // Only the candidates carrying real mass can affect the answer, and
        // scoring 720 charts against a hundred windows is seconds of work.
        // The heaviest candidates dominate the expected gain, so the search
        // runs on those and picks the same window far faster.
        $region = $posterior->credibleRegion(0.98);

        if (count($region) > RectificationConfig::ACTIVE_LOOP_MAX_CANDIDATES) {
            usort(
                $region,
                static fn (int $a, int $b): int => $posterior->probabilities[$b] <=> $posterior->probabilities[$a]
            );
            $region = array_slice($region, 0, RectificationConfig::ACTIVE_LOOP_MAX_CANDIDATES);
        }

        $contexts  = [];
        $weights   = [];
        $baseRates = [];

        $referenceDates = $this->engine->referenceDatesFor($window, $result->events);

        foreach ($region as $index) {
            $candidate = $posterior->candidates[$index];
            $context   = new NatalContext(
                $candidate,
                $candidate->points($window->latitude, $window->longitude),
                $candidate->utc,
            );

            $contexts[$index]  = $context;
            $weights[$index]   = $posterior->probabilities[$index];
            $baseRates[$index] = $evaluator->baseRates($context, $referenceDates);
        }

        $windows = $this->candidateWindows($result, $alreadyAsked);

        // Two passes. Scoring every quarter of a life against every candidate
        // at full resolution is millions of kernel evaluations and took thirteen
        // seconds — unusable on a screen the user is waiting on.
        //
        // The coarse pass samples one date per quarter against the heaviest
        // candidates, which is plenty to tell an uninteresting quarter from a
        // promising one. Only the shortlist is then evaluated properly, so the
        // window that wins is chosen on the full measurement while the other
        // ninety are dismissed cheaply.
        $coarseContexts  = array_slice($contexts, 0, RectificationConfig::ACTIVE_LOOP_COARSE_CANDIDATES, true);
        $coarseWeights   = array_intersect_key($weights, $coarseContexts);
        $coarseEntropy   = $this->entropyOf($coarseWeights);

        $shortlist = [];
        foreach ($windows as $candidateWindow) {
            $gain = $coarseEntropy - $this->expectedEntropy(
                $coarseWeights,
                $this->probabilities($evaluator, $coarseContexts, $baseRates, [$candidateWindow['midpoint']->setTime(12, 0, 0)]),
            );

            $shortlist[] = $candidateWindow + ['coarse_gain' => $gain];
        }

        usort($shortlist, static fn (array $a, array $b): int => $b['coarse_gain'] <=> $a['coarse_gain']);
        $shortlist = array_slice($shortlist, 0, RectificationConfig::ACTIVE_LOOP_SHORTLIST);

        $best = null;
        foreach ($shortlist as $candidateWindow) {
            $dates = $this->datesIn($candidateWindow['from'], $candidateWindow['to']);

            $gain = $baseEntropy - $this->expectedEntropy(
                $weights,
                $this->probabilities($evaluator, $contexts, $baseRates, $dates),
            );

            if ($best === null || $gain > $best['expected_gain']) {
                $best = $candidateWindow + ['expected_gain' => $gain];
            }
        }

        if ($best === null || $best['expected_gain'] < RectificationConfig::ACTIVE_LOOP_MIN_INFORMATION_GAIN) {
            return null;
        }

        return [
            'key'           => $best['key'],
            'question'      => $this->phrase($best['from'], $best['to']),
            'from'          => $best['from']->format('Y-m-d'),
            'to'            => $best['to']->format('Y-m-d'),
            'midpoint'      => $best['midpoint']->format('Y-m-d'),
            'expected_gain' => round($best['expected_gain'], 4),
        ];
    }

    /**
     * P(the person would call this window marking | each candidate birth time).
     *
     * @param array<int, NatalContext>            $contexts
     * @param array<int, array<string, float>>    $baseRates
     * @param list<\DateTimeImmutable>            $dates
     *
     * @return array<int, float>
     */
    private function probabilities(
        EvidenceEvaluator $evaluator,
        array $contexts,
        array $baseRates,
        array $dates,
    ): array {
        $probabilities = [];

        foreach ($contexts as $index => $context) {
            $evidence = $evaluator->evidence($context, $dates, $baseRates[$index]);

            $probabilities[$index] = min(
                RectificationConfig::ACTIVE_LOOP_MAX_PROBABILITY,
                max(
                    RectificationConfig::ACTIVE_LOOP_MIN_PROBABILITY,
                    RectificationConfig::ACTIVE_LOOP_BASE_EVENT_RATE * $evidence,
                )
            );
        }

        return $probabilities;
    }

    /**
     * Turn an answer into the pseudo-event it represents.
     *
     * Returns null for "je ne sais plus" — recorded as asked by the caller, but
     * contributing nothing, which is the honest treatment of a non-answer.
     *
     * @param array{midpoint: string} $question
     *
     * @return array<string, mixed>|null
     */
    public function answerToPseudoEvent(array $question, string $answer): ?array
    {
        if ($answer === self::ANSWER_UNKNOWN) {
            return null;
        }

        [$expectation, $intensity, $valence] = match ($answer) {
            self::ANSWER_NOTHING   => [LifeEvent::EXPECTATION_ABSENT, LifeEvent::INTENSITY_MOMENT, null],
            self::ANSWER_DIFFICULT => [LifeEvent::EXPECTATION_OCCURRED, LifeEvent::INTENSITY_TURNING_POINT, 'difficile'],
            self::ANSWER_HAPPY     => [LifeEvent::EXPECTATION_OCCURRED, LifeEvent::INTENSITY_TURNING_POINT, 'heureux'],
            self::ANSWER_TURNING   => [LifeEvent::EXPECTATION_OCCURRED, LifeEvent::INTENSITY_LIFE_CHANGING, null],
            default                => throw new \InvalidArgumentException("Réponse inconnue : $answer"),
        };

        return [
            'date'        => $question['midpoint'],
            // The question spanned a quarter, so the answer is convolved over
            // exactly that quarter — no more precision is claimed than was asked.
            'precision'   => LifeEvent::PRECISION_QUARTER,
            'intensity'   => $intensity,
            'sudden'      => false,
            'valence'     => $valence,
            'category'    => 'boucle_active',
            'title'       => null,
            'expectation' => $expectation,
            'pseudo'      => true,
            'added_at'    => (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM),
        ];
    }

    /**
     * Stop conditions (spec §8): enough questions asked, tight enough already,
     * or nothing left to discriminate.
     *
     * @param list<string> $alreadyAsked
     */
    private function shouldContinue(RectificationResult $result, array $alreadyAsked): bool
    {
        if (count($alreadyAsked) >= RectificationConfig::ACTIVE_LOOP_MAX_QUESTIONS) {
            return false;
        }

        if ($result->posterior->uncertaintyMinutes() <= RectificationConfig::ACTIVE_LOOP_TARGET_UNCERTAINTY_MINUTES) {
            return false;
        }

        // The loop exists to separate competing modes. A single-peaked
        // posterior that is merely broad needs more events, not more questions.
        return $result->posterior->isMultimodal();
    }

    /**
     * Quarters of the subject's adult life that have not been asked about yet.
     *
     * @param list<string> $alreadyAsked
     *
     * @return list<array{key: string, from: \DateTimeImmutable, to: \DateTimeImmutable, midpoint: \DateTimeImmutable}>
     */
    private function candidateWindows(RectificationResult $result, array $alreadyAsked): array
    {
        $birth = $result->window->toUtc($result->window->startLocal);

        // Below about fifteen, people rarely date their own turning points, and
        // above the present there is nothing to remember.
        $from  = $birth->modify('+15 years');
        $until = min(new \DateTimeImmutable('now'), $birth->modify('+80 years'));

        $asked   = array_flip($alreadyAsked);
        $windows = [];

        for ($start = $from; $start < $until; $start = $start->modify('+3 months')) {
            $end = $start->modify('+3 months')->modify('-1 day');
            $key = $start->format('Y-m');

            if (isset($asked[$key])) {
                continue;
            }

            // Don't ask about a period the user already told us about.
            if ($this->overlapsKnownEvent($result->events, $start, $end)) {
                continue;
            }

            $windows[] = [
                'key'      => $key,
                'from'     => $start,
                'to'       => $end,
                'midpoint' => $start->modify('+45 days'),
            ];
        }

        return $windows;
    }

    /**
     * @param list<LifeEvent> $events
     */
    private function overlapsKnownEvent(array $events, \DateTimeImmutable $from, \DateTimeImmutable $to): bool
    {
        foreach ($events as $event) {
            if ($event->date >= $from && $event->date <= $to) {
                return true;
            }
        }

        return false;
    }

    /** Midpoints of each month in the window — enough to characterise a quarter. */
    private function datesIn(\DateTimeImmutable $from, \DateTimeImmutable $to): array
    {
        $dates = [];

        for ($date = $from; $date <= $to; $date = $date->modify('+15 days')) {
            $dates[] = $date->setTime(12, 0, 0);
        }

        return $dates;
    }

    /**
     * Expected posterior entropy after asking, averaged over the two possible
     * answers weighted by how likely each is.
     *
     * @param array<int, float> $weights       current posterior mass per candidate
     * @param array<int, float> $probabilities P(marked | candidate)
     */
    private function expectedEntropy(array $weights, array $probabilities): float
    {
        $probabilityOfYes = 0.0;
        foreach ($weights as $index => $weight) {
            $probabilityOfYes += $weight * $probabilities[$index];
        }

        // A question whose answer is a foregone conclusion teaches nothing.
        if ($probabilityOfYes <= 1e-9 || $probabilityOfYes >= 1 - 1e-9) {
            return $this->entropyOf($weights);
        }

        $ifYes = [];
        $ifNo  = [];
        foreach ($weights as $index => $weight) {
            $ifYes[$index] = $weight * $probabilities[$index];
            $ifNo[$index]  = $weight * (1.0 - $probabilities[$index]);
        }

        return $probabilityOfYes * $this->entropyOf($ifYes)
            + (1.0 - $probabilityOfYes) * $this->entropyOf($ifNo);
    }

    /** Shannon entropy in bits of an unnormalised weight vector. */
    private function entropyOf(array $weights): float
    {
        $total = array_sum($weights);
        if ($total <= 0.0) {
            return 0.0;
        }

        $entropy = 0.0;
        foreach ($weights as $weight) {
            $p = $weight / $total;
            if ($p > 0.0) {
                $entropy -= $p * log($p, 2);
            }
        }

        return $entropy;
    }

    /**
     * The question, in plain language.
     *
     * Never a word about the technique underneath: the user is being asked
     * about their life, not about Pluto. Mentioning the mechanism would also
     * bias the answer, which is the practical reason on top of the tonal one.
     */
    private function phrase(\DateTimeImmutable $from, \DateTimeImmutable $to): string
    {
        $fromMonth = self::MONTHS_FR[(int) $from->format('n')];
        $toMonth   = self::MONTHS_FR[(int) $to->format('n')];

        if ($from->format('Y') === $to->format('Y')) {
            return sprintf(
                'Entre %s et %s %s, tu as vécu quelque chose de marquant ?',
                $fromMonth,
                $toMonth,
                $from->format('Y'),
            );
        }

        return sprintf(
            'Entre %s %s et %s %s, tu as vécu quelque chose de marquant ?',
            $fromMonth,
            $from->format('Y'),
            $toMonth,
            $to->format('Y'),
        );
    }
}
