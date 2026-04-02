<?php

namespace App\Tests\Service;

use App\Service\AspectsCalculator;
use PHPUnit\Framework\TestCase;

class AspectsCalculatorTest extends TestCase
{
    private AspectsCalculator $calculator;

    protected function setUp(): void
    {
        $this->calculator = new AspectsCalculator();
    }

    // ─── Helpers ────────────────────────────────────────────────────────────────

    private function makePositions(float $position): array
    {
        return ['Position' => $position, 'Sign' => 'Aries', 'Retrograde' => 'No'];
    }

    private function detectSingle(float $natalLon, float $transitLon): ?array
    {
        $aspects = $this->calculator->detectAspects(
            ['NatalPlanet' => $this->makePositions($natalLon)],
            ['TransitPlanet' => $this->makePositions($transitLon)]
        );

        return $aspects[0] ?? null;
    }

    // ─── Conjunction (0° ± 6°) ──────────────────────────────────────────────────

    public function testExactConjunction(): void
    {
        $aspect = $this->detectSingle(30.0, 30.0);

        $this->assertNotNull($aspect);
        $this->assertSame('conjunction', $aspect['aspect_type']);
        $this->assertSame(0.0, $aspect['orb_exact']);
        $this->assertSame(1.0, $aspect['intensity']);
    }

    public function testConjunctionAtMaxOrb(): void
    {
        // Exactly at 6° orb — boundary case, should still be detected
        $aspect = $this->detectSingle(30.0, 36.0);

        $this->assertNotNull($aspect);
        $this->assertSame('conjunction', $aspect['aspect_type']);
        $this->assertEqualsWithDelta(6.0, $aspect['orb_exact'], 0.001);
        $this->assertEqualsWithDelta(0.0, $aspect['intensity'], 0.001);
    }

    public function testConjunctionJustOutsideOrb(): void
    {
        // 6.1° — outside the 6° orb, not detected
        $aspect = $this->detectSingle(30.0, 36.1);

        $this->assertNull($aspect);
    }

    // ─── 359°/1° wrap-around conjunction ────────────────────────────────────────

    public function testConjunctionAcrossZeroDegrees(): void
    {
        // 359° and 1° are only 2° apart (wraps through 0°)
        $aspect = $this->detectSingle(359.0, 1.0);

        $this->assertNotNull($aspect);
        $this->assertSame('conjunction', $aspect['aspect_type']);
        $this->assertEqualsWithDelta(2.0, $aspect['orb_exact'], 0.001);
        $this->assertEqualsWithDelta(1.0 - 2.0 / 6.0, $aspect['intensity'], 0.001);
    }

    public function testConjunctionReverse(): void
    {
        // Same but reversed — aspects are symmetric
        $aspect = $this->detectSingle(1.0, 359.0);

        $this->assertNotNull($aspect);
        $this->assertSame('conjunction', $aspect['aspect_type']);
        $this->assertEqualsWithDelta(2.0, $aspect['orb_exact'], 0.001);
    }

    // ─── Opposition (180° ± 6°) ─────────────────────────────────────────────────

    public function testExactOpposition(): void
    {
        $aspect = $this->detectSingle(0.0, 180.0);

        $this->assertNotNull($aspect);
        $this->assertSame('opposition', $aspect['aspect_type']);
        $this->assertSame(0.0, $aspect['orb_exact']);
        $this->assertSame(1.0, $aspect['intensity']);
    }

    public function testOppositionOutsideOrb(): void
    {
        // 187° difference → 7° from opposition → outside 6° orb
        $aspect = $this->detectSingle(0.0, 187.0);

        $this->assertNull($aspect);
    }

    // ─── Trine (120° ± 6°) ──────────────────────────────────────────────────────

    public function testExactTrine(): void
    {
        $aspect = $this->detectSingle(0.0, 120.0);

        $this->assertNotNull($aspect);
        $this->assertSame('trine', $aspect['aspect_type']);
        $this->assertSame(0.0, $aspect['orb_exact']);
        $this->assertSame(1.0, $aspect['intensity']);
    }

    // ─── Square (90° ± 4°) ──────────────────────────────────────────────────────

    public function testExactSquare(): void
    {
        $aspect = $this->detectSingle(0.0, 90.0);

        $this->assertNotNull($aspect);
        $this->assertSame('square', $aspect['aspect_type']);
        $this->assertSame(1.0, $aspect['intensity']);
    }

    public function testSquareAtMaxOrb(): void
    {
        // 94° → 4° from square → exactly at orb boundary
        $aspect = $this->detectSingle(0.0, 94.0);

        $this->assertNotNull($aspect);
        $this->assertSame('square', $aspect['aspect_type']);
        $this->assertEqualsWithDelta(4.0, $aspect['orb_exact'], 0.001);
        $this->assertEqualsWithDelta(0.0, $aspect['intensity'], 0.001);
    }

    public function testSquareOutsideOrb(): void
    {
        // 94.1° → 4.1° from square → outside 4° orb
        $aspect = $this->detectSingle(0.0, 94.1);

        $this->assertNull($aspect);
    }

    // ─── Sextile (60° ± 4°) ─────────────────────────────────────────────────────

    public function testExactSextile(): void
    {
        $aspect = $this->detectSingle(0.0, 60.0);

        $this->assertNotNull($aspect);
        $this->assertSame('sextile', $aspect['aspect_type']);
        $this->assertSame(1.0, $aspect['intensity']);
    }

    // ─── No aspect ──────────────────────────────────────────────────────────────

    public function testNoAspect(): void
    {
        // 45° — not close to any standard aspect
        $aspect = $this->detectSingle(0.0, 45.0);

        $this->assertNull($aspect);
    }

    // ─── Multiple aspects sorted by intensity ────────────────────────────────────

    public function testResultsSortedByIntensityDesc(): void
    {
        // Two conjunctions: one exact, one with 3° orb
        $aspects = $this->calculator->detectAspects(
            [
                'Planet1' => $this->makePositions(0.0),
                'Planet2' => $this->makePositions(100.0),
            ],
            [
                'TransitA' => $this->makePositions(0.0),   // exact conjunction with Planet1
                'TransitB' => $this->makePositions(103.0), // 3° from Planet2 (square? no, ~13° from square)
            ]
        );

        for ($i = 1; $i < count($aspects); $i++) {
            $this->assertGreaterThanOrEqual(
                $aspects[$i]['intensity'],
                $aspects[$i - 1]['intensity'],
                'Aspects should be sorted by intensity descending'
            );
        }
    }

    // ─── Missing Position key is ignored ─────────────────────────────────────────

    public function testMissingPositionIsSkipped(): void
    {
        $aspects = $this->calculator->detectAspects(
            ['Planet1' => ['Sign' => 'Aries', 'Retrograde' => 'No']], // no Position key
            ['Transit1' => $this->makePositions(0.0)]
        );

        $this->assertEmpty($aspects);
    }
}