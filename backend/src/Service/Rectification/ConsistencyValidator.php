<?php

namespace App\Service\Rectification;

/**
 * Rolling hold-out — the anti-overfitting guard rail of spec §7.4.
 *
 * The problem it answers: with two techniques, a dozen aspects and ten events,
 * *some* candidate always lines up. A sharp posterior peak is therefore not
 * evidence that the birth time was found; it may just be evidence that the
 * model has enough freedom to fit anything.
 *
 * The test is the standard one. Drop each event in turn, recompute the
 * posterior from the remaining ones, and ask two questions:
 *
 *   1. Did the answer move? A conclusion that depends on one particular event
 *      is a conclusion about that event, not about the birth time.
 *   2. Does the reduced model still predict the dropped event? If the estimate
 *      only explains the events it was fitted on, it has memorised rather than
 *      inferred.
 *
 * The share of events passing both is the coherence score out of 100.
 *
 * This is cheap because the engine keeps the per-event log-likelihood matrix:
 * leaving an event out is subtracting one column, not re-running the ephemeris.
 */
final class ConsistencyValidator
{
    /**
     * @return array{score: int, held_out: list<array{event: int, mode_stable: bool, event_predicted: bool, passed: bool}>}
     */
    public function validate(RectificationResult $result): array
    {
        $matrix     = $result->logLikelihoodMatrix;
        $candidates = $result->posterior->candidates;
        $eventCount = count($result->events);

        // A single event cannot be held out against nothing.
        if ($eventCount < 2) {
            return ['score' => 0, 'held_out' => []];
        }

        $fullModeIndex = $result->posterior->modeIndex();
        $tolerance     = (int) ceil(
            RectificationConfig::HOLDOUT_MODE_TOLERANCE_MINUTES / RectificationConfig::GRID_STEP_MINUTES
        );

        $detail = [];
        $passed = 0;

        for ($held = 0; $held < $eventCount; ++$held) {
            $logPosterior = [];
            foreach ($matrix as $row) {
                $logPosterior[] = array_sum($row) - $row[$held];
            }

            $reduced          = new PosteriorDistribution($candidates, $logPosterior);
            $reducedModeIndex = $reduced->modeIndex();

            $modeStable = abs($reducedModeIndex - $fullModeIndex) <= $tolerance;

            // Is the held-out event well explained at the mode the *other*
            // events point to?
            //
            // Measured as a percentile of the event's own likelihood across the
            // window, so the bar adapts to how discriminating that event is at
            // all. A median bar proved far too lax: with broad likelihoods, six
            // mutually incompatible events still scored 67/100, because "better
            // than half the window" is nearly free. The top quartile is the
            // weakest bar that separates genuine agreement from arithmetic.
            $column = array_column($matrix, $held);
            $eventPredicted = $column[$reducedModeIndex]
                >= $this->percentile($column, RectificationConfig::PREDICTION_PERCENTILE);

            $eventPassed = $modeStable && $eventPredicted;
            $passed += $eventPassed ? 1 : 0;

            $detail[] = [
                'event'           => $held,
                'mode_stable'     => $modeStable,
                'event_predicted' => $eventPredicted,
                'passed'          => $eventPassed,
            ];
        }

        return [
            'score'    => (int) round(100 * $passed / $eventCount),
            'held_out' => $detail,
        ];
    }

    /**
     * Linear-interpolated percentile.
     *
     * @param list<float> $values
     */
    private function percentile(array $values, float $fraction): float
    {
        sort($values);

        $position = $fraction * (count($values) - 1);
        $lower    = (int) floor($position);
        $upper    = (int) ceil($position);

        if ($lower === $upper) {
            return $values[$lower];
        }

        return $values[$lower] + ($values[$upper] - $values[$lower]) * ($position - $lower);
    }
}
