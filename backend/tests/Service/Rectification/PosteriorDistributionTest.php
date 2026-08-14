<?php

namespace App\Tests\Service\Rectification;

use App\Service\Rectification\Candidate;
use App\Service\Rectification\PosteriorDistribution;
use App\Service\Rectification\RectificationConfig;
use PHPUnit\Framework\TestCase;

/**
 * The posterior's read-outs, tested on hand-built distributions.
 *
 * No ephemeris here on purpose: these are the numbers the UI shows — the
 * uncertainty on the dial, the number of candidate times, the entropy the
 * active loop tries to reduce — and they must be verifiable without any
 * astronomy in the way.
 */
class PosteriorDistributionTest extends TestCase
{
    public function testUniformDistributionHasMaximumEntropyAndNoContrast(): void
    {
        $posterior = $this->distribution(array_fill(0, 64, 0.0));

        $this->assertEqualsWithDelta(1.0, $posterior->normalisedEntropy(), 1e-9);
        $this->assertEqualsWithDelta(1.0, $posterior->contrast(), 1e-9);
        $this->assertFalse($posterior->passesContrastTest(), 'Une distribution plate ne doit jamais passer le test de contraste.');
    }

    public function testSharpPeakHasLowEntropyAndHighContrast(): void
    {
        $logs      = array_fill(0, 64, 0.0);
        $logs[20]  = 12.0;
        $posterior = $this->distribution($logs);

        $this->assertSame(20, $posterior->modeIndex());
        $this->assertLessThan(0.2, $posterior->normalisedEntropy());
        $this->assertTrue($posterior->passesContrastTest());
    }

    /**
     * Numerical safety: the engine routinely produces log-posteriors around
     * -40. Exponentiating those directly underflows every candidate to zero and
     * turns normalisation into a division by zero.
     */
    public function testExtremeLogValuesDoNotUnderflow(): void
    {
        $logs     = array_map(static fn (int $i): float => -800.0 - $i, range(0, 63));
        $logs[7]  = -700.0;

        $posterior = $this->distribution($logs);

        $this->assertSame(7, $posterior->modeIndex());
        $this->assertEqualsWithDelta(1.0, array_sum($posterior->probabilities), 1e-9);
        foreach ($posterior->probabilities as $p) {
            $this->assertIsFloat($p);
            $this->assertFalse(is_nan($p), 'NaN dans le postérieur : normalisation instable.');
        }
    }

    public function testCredibleIntervalCoversTheRequestedMass(): void
    {
        // A single broad hill.
        $logs = [];
        for ($i = 0; $i < 120; ++$i) {
            $logs[] = -0.5 * (($i - 60) / 8.0) ** 2;
        }

        $posterior = $this->distribution($logs);
        $region    = $posterior->credibleRegion(0.80);

        $mass = 0.0;
        foreach ($region as $index) {
            $mass += $posterior->probabilities[$index];
        }

        $this->assertGreaterThanOrEqual(0.80, $mass);
        $this->assertTrue($posterior->credibleInterval()['contiguous']);

        // Half-width is what the dial shows; it must be a real number of minutes.
        $this->assertGreaterThan(0, $posterior->uncertaintyMinutes());
    }

    /**
     * Spec §9.3: two plausible times must be reported as two, not averaged into
     * a single wrong one halfway between them.
     */
    public function testTwoSeparatedPeaksAreReportedAsTwoModes(): void
    {
        $logs = array_fill(0, 200, -20.0);
        foreach ([40, 140] as $centre) {
            for ($i = -6; $i <= 6; ++$i) {
                $logs[$centre + $i] = -0.5 * ($i / 3.0) ** 2;
            }
        }

        $posterior = $this->distribution($logs);

        $this->assertTrue($posterior->isMultimodal());
        $this->assertCount(2, $posterior->modes());

        // And the 80 % region is honestly reported as disjoint rather than as
        // one interval spanning the dead zone between the peaks.
        $this->assertFalse($posterior->credibleInterval()['contiguous']);
    }

    /**
     * One broad hill on a two-minute grid must not be reported as a crowd of
     * modes just because of numerical ripple.
     */
    public function testOneBroadHillIsASingleMode(): void
    {
        $logs = [];
        for ($i = 0; $i < 200; ++$i) {
            $logs[] = -0.5 * (($i - 100) / 12.0) ** 2;
        }

        $posterior = $this->distribution($logs);

        $this->assertCount(1, $posterior->modes());
        $this->assertFalse($posterior->isMultimodal());
    }

    /** A weak shoulder next to a strong peak is not a candidate time. */
    public function testWeakShoulderIsNotAMode(): void
    {
        $logs = array_fill(0, 200, -20.0);
        for ($i = -6; $i <= 6; ++$i) {
            $logs[50 + $i]  = -0.5 * ($i / 3.0) ** 2;
            $logs[150 + $i] = -0.5 * ($i / 3.0) ** 2 - 4.0; // e^-4 ~ 1.8 % du pic
        }

        $posterior = $this->distribution($logs);

        $this->assertCount(1, $posterior->modes());
    }

    public function testMassWithinTracksConcentration(): void
    {
        $logs = [];
        for ($i = 0; $i < 200; ++$i) {
            $logs[] = -0.5 * (($i - 100) / 4.0) ** 2;
        }

        $posterior = $this->distribution($logs);

        $this->assertLessThan(
            $posterior->massWithin(60),
            $posterior->massWithin(15),
            'La masse à ±15 min ne peut pas dépasser celle à ±60 min.'
        );
        $this->assertGreaterThan(0.9, $posterior->massWithin(60));
    }

    /**
     * @param list<float> $logPosterior
     */
    private function distribution(array $logPosterior): PosteriorDistribution
    {
        $start      = new \DateTimeImmutable('1990-05-05 00:00:00', new \DateTimeZone('UTC'));
        $candidates = [];

        foreach ($logPosterior as $i => $_) {
            $local = $start->modify(sprintf('+%d minutes', $i * RectificationConfig::GRID_STEP_MINUTES));
            $candidates[] = new Candidate($i, $local, $local);
        }

        return new PosteriorDistribution($candidates, $logPosterior);
    }
}
