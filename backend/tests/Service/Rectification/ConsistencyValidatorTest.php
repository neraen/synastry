<?php

namespace App\Tests\Service\Rectification;

use App\Service\Rectification\Candidate;
use App\Service\Rectification\ConsistencyValidator;
use App\Service\Rectification\LifeEvent;
use App\Service\Rectification\PosteriorDistribution;
use App\Service\Rectification\RectificationConfig;
use App\Service\Rectification\RectificationResult;
use PHPUnit\Framework\TestCase;

/**
 * The rolling hold-out, tested on synthetic likelihood matrices.
 *
 * Building the matrices by hand rather than through the ephemeris is the point:
 * the coherence score is what decides whether a user is shown an estimate at
 * all, so its behaviour has to be pinned on inputs whose right answer is
 * obvious by construction.
 */
class ConsistencyValidatorTest extends TestCase
{
    private const CANDIDATES = 120;
    private const TRUTH      = 60;

    /** Events that all point at the same time: every hold-out must pass. */
    public function testUnanimousEventsScoreFull(): void
    {
        $result = $this->resultFor($this->agreeingMatrix(6));

        $this->assertSame(100, $result->coherenceScore());
        $this->assertSame(RectificationResult::STATUS_CONCLUSIVE, $result->status());
    }

    /**
     * One event disagreeing with five others must be the one flagged, and must
     * not by itself sink the run.
     */
    public function testSingleDissenterIsIsolatedNotFatal(): void
    {
        $matrix = $this->agreeingMatrix(6);

        // Event 3 votes for a completely different time.
        foreach ($matrix as $candidateIndex => $row) {
            $matrix[$candidateIndex][3] = $this->peak($candidateIndex, at: 10);
        }

        $result = $this->resultFor($matrix);

        $detail = $result->holdOutDetail();
        $this->assertFalse($detail[3]['event_predicted'], 'L\'événement divergent doit être détecté comme mal prédit.');
        $this->assertTrue($detail[0]['passed']);

        // Five out of six still agree, so the run stays usable.
        $this->assertSame(83, $result->coherenceScore());
        $this->assertSame(RectificationResult::STATUS_CONCLUSIVE, $result->status());
    }

    /**
     * Events that each point somewhere different must collapse the score, even
     * though summing them still produces *some* peak. This is the overfitting
     * case the score exists to catch.
     */
    public function testMutuallyInconsistentEventsScoreLow(): void
    {
        $matrix = [];
        for ($candidate = 0; $candidate < self::CANDIDATES; ++$candidate) {
            $row = [];
            for ($event = 0; $event < 6; ++$event) {
                $row[] = $this->peak($candidate, at: 8 + $event * 17);
            }
            $matrix[] = $row;
        }

        $result = $this->resultFor($matrix);

        $this->assertLessThan(RectificationConfig::COHERENCE_THRESHOLD, $result->coherenceScore());
        $this->assertSame(RectificationResult::STATUS_INCONCLUSIVE, $result->status());
    }

    /**
     * An estimate whose mode moves when any single event is removed is an
     * estimate about that event, not about the birth time.
     */
    public function testModeInstabilityFailsTheHoldOut(): void
    {
        // Two events pulling hard in opposite directions: removing either one
        // hands the mode to the other.
        $matrix = [];
        for ($candidate = 0; $candidate < self::CANDIDATES; ++$candidate) {
            $matrix[] = [
                $this->peak($candidate, at: 30),
                $this->peak($candidate, at: 90),
            ];
        }

        $result = $this->resultFor($matrix);

        foreach ($result->holdOutDetail() as $entry) {
            $this->assertFalse($entry['mode_stable'], 'Le mode ne doit pas être jugé stable quand il bascule.');
        }
        $this->assertSame(0, $result->coherenceScore());
    }

    /**
     * A single event cannot be validated against anything, so it scores zero
     * rather than a vacuous 100 — the spec's threshold then keeps it out of the
     * UI, which is the desired behaviour for a one-event run.
     */
    public function testSingleEventCannotBeValidated(): void
    {
        $matrix = [];
        for ($candidate = 0; $candidate < self::CANDIDATES; ++$candidate) {
            $matrix[] = [$this->peak($candidate, at: self::TRUTH)];
        }

        $result = $this->resultFor($matrix);

        $this->assertSame(0, $result->coherenceScore());
        $this->assertSame(RectificationResult::STATUS_INCONCLUSIVE, $result->status());
        $this->assertSame([], $result->holdOutDetail());
    }

    /**
     * A result must not be readable before the guard rails have run — that is
     * the structural reason the engine attaches coherence inside `run()`.
     */
    public function testResultCannotBeReadBeforeValidation(): void
    {
        $matrix = $this->agreeingMatrix(3);

        $result = new RectificationResult(
            window: $this->window(),
            events: $this->events(3),
            posterior: $this->posterior($matrix),
            logLikelihoodMatrix: $matrix,
            contributions: [],
        );

        $this->expectException(\LogicException::class);
        $result->status();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    /** @return list<list<float>> */
    private function agreeingMatrix(int $events): array
    {
        $matrix = [];
        for ($candidate = 0; $candidate < self::CANDIDATES; ++$candidate) {
            $row = [];
            for ($event = 0; $event < $events; ++$event) {
                $row[] = $this->peak($candidate, at: self::TRUTH);
            }
            $matrix[] = $row;
        }

        return $matrix;
    }

    /** A log-likelihood shaped as a Gaussian bump centred on a candidate index. */
    private function peak(int $candidate, int $at): float
    {
        return -0.5 * (($candidate - $at) / 5.0) ** 2;
    }

    /** @param list<list<float>> $matrix */
    private function resultFor(array $matrix): RectificationResult
    {
        $result = new RectificationResult(
            window: $this->window(),
            events: $this->events(count($matrix[0])),
            posterior: $this->posterior($matrix),
            logLikelihoodMatrix: $matrix,
            contributions: [],
        );

        $result->attachCoherence((new ConsistencyValidator())->validate($result));

        return $result;
    }

    /** @param list<list<float>> $matrix */
    private function posterior(array $matrix): PosteriorDistribution
    {
        $start      = new \DateTimeImmutable('1990-05-05 00:00:00', new \DateTimeZone('UTC'));
        $candidates = [];
        $logs       = [];

        foreach ($matrix as $index => $row) {
            $local = $start->modify(sprintf('+%d minutes', $index * RectificationConfig::GRID_STEP_MINUTES));
            $candidates[] = new Candidate($index, $local, $local);
            $logs[]       = array_sum($row);
        }

        return new PosteriorDistribution($candidates, $logs);
    }

    private function window(): \App\Service\Rectification\BirthWindow
    {
        return \App\Service\Rectification\BirthWindow::fullDay('1990-05-05', 2.0, 48.85, 2.35);
    }

    /** @return list<LifeEvent> */
    private function events(int $count): array
    {
        $events = [];
        for ($i = 0; $i < $count; ++$i) {
            $events[] = new LifeEvent(
                date: new \DateTimeImmutable('2010-01-01', new \DateTimeZone('UTC')),
                precision: LifeEvent::PRECISION_DAY,
                category: 'test',
            );
        }

        return $events;
    }
}
