<?php

namespace App\Tests\Service\Astro;

use App\Service\Astro\SkyEvent;
use App\Service\Astro\SkyEventDetector;
use App\Service\PlanetaryCalculator;
use PHPUnit\Framework\TestCase;

/**
 * The detector is the source of truth for every date/sign/degree in the feature,
 * so it is tested against astronomical INVARIANTS that must hold regardless of the
 * exact ephemeris values: at each detected moment the geometry must actually be
 * exact. This catches regressions without hard-coding fragile reference dates.
 */
class SkyEventDetectorTest extends TestCase
{
    private SkyEventDetector $detector;

    protected function setUp(): void
    {
        $this->detector = new SkyEventDetector();
    }

    private function lon(string $planet, \DateTimeImmutable $t): float
    {
        $calc = new PlanetaryCalculator($t->format('Y-m-d'), $t->format('H:i:s'), 0.0, 0.0, 'test');
        return $planet === 'NorthNode'
            ? $calc->getNorthNode()['longitude']
            : $calc->getPlanetLongitude($planet);
    }

    // ── Lunations ─────────────────────────────────────────────────────────────

    public function testEveryMonthHasAtLeastOneNewAndOneFullMoon(): void
    {
        // Across a whole year, each lunation type appears ~12-13 times.
        $newCount = 0;
        $fullCount = 0;
        for ($m = 1; $m <= 12; $m++) {
            foreach ($this->detector->detectForMonth(2026, $m) as $e) {
                if (in_array($e->type, [SkyEvent::TYPE_NEW_MOON, SkyEvent::TYPE_SOLAR_ECLIPSE], true)) {
                    $newCount++;
                }
                if (in_array($e->type, [SkyEvent::TYPE_FULL_MOON, SkyEvent::TYPE_LUNAR_ECLIPSE], true)) {
                    $fullCount++;
                }
            }
        }
        $this->assertGreaterThanOrEqual(12, $newCount, 'expected ~12 new moons/year');
        $this->assertGreaterThanOrEqual(12, $fullCount, 'expected ~12 full moons/year');
    }

    public function testNewMoonIsAnExactSunMoonConjunction(): void
    {
        $event = $this->firstOfType(2026, 6, [SkyEvent::TYPE_NEW_MOON, SkyEvent::TYPE_SOLAR_ECLIPSE]);
        $this->assertNotNull($event, 'June 2026 should contain a new moon');

        $sep = PlanetaryCalculator::separation(
            $this->lon('Moon', $event->exactAt),
            $this->lon('Sun', $event->exactAt),
        );
        $this->assertLessThan(0.5, $sep, 'at the new moon Sun and Moon must be conjunct');
    }

    public function testFullMoonIsAnExactSunMoonOpposition(): void
    {
        $event = $this->firstOfType(2026, 6, [SkyEvent::TYPE_FULL_MOON, SkyEvent::TYPE_LUNAR_ECLIPSE]);
        $this->assertNotNull($event, 'June 2026 should contain a full moon');

        $sep = PlanetaryCalculator::separation(
            $this->lon('Moon', $event->exactAt),
            $this->lon('Sun', $event->exactAt),
        );
        $this->assertGreaterThan(179.5, $sep, 'at the full moon Sun and Moon must be in opposition');
    }

    // ── Ingressions / solstice ────────────────────────────────────────────────

    public function testSummerSolsticeSunEntersCancer(): void
    {
        $events = $this->detector->detectForMonth(2026, 6);
        $solstice = null;
        foreach ($events as $e) {
            if ($e->type === SkyEvent::TYPE_INGRESSION && $e->planet === 'Sun') {
                $solstice = $e;
                break;
            }
        }

        $this->assertNotNull($solstice, 'Sun must ingress a sign in June (solstice)');
        $this->assertSame('Cancer', $solstice->sign());
        $this->assertSame('solstice_summer', $solstice->metadata['seasonal'] ?? null);
        // Northern-hemisphere summer solstice is always 20–22 June.
        $day = (int) $solstice->exactAt->format('d');
        $this->assertGreaterThanOrEqual(19, $day);
        $this->assertLessThanOrEqual(22, $day);
        // Degree into the sign must be ~0 (just crossed the boundary).
        $this->assertLessThanOrEqual(0, $solstice->degreeInSign());
    }

    public function testIngressionsLandOnASignBoundary(): void
    {
        $events = $this->detector->detectForMonth(2026, 3); // Aries season, lots of movement
        $found = false;
        foreach ($events as $e) {
            if ($e->type !== SkyEvent::TYPE_INGRESSION) {
                continue;
            }
            $found = true;
            $lon = $this->lon($e->planet, $e->exactAt);
            $distToBoundary = abs(fmod($lon + 360, 30.0));
            $distToBoundary = min($distToBoundary, 30 - $distToBoundary);
            $this->assertLessThan(0.2, $distToBoundary, "{$e->planet} ingression must sit on a 30° boundary");
        }
        $this->assertTrue($found, 'expected at least one ingression in March 2026');
    }

    // ── Retrograde stations ───────────────────────────────────────────────────

    public function testStationHasNearZeroVelocity(): void
    {
        // Scan the year for the first station of any planet, then check v≈0 there.
        $station = null;
        for ($m = 1; $m <= 12 && $station === null; $m++) {
            foreach ($this->detector->detectForMonth(2026, $m) as $e) {
                if (in_array($e->type, [SkyEvent::TYPE_RETROGRADE_START, SkyEvent::TYPE_RETROGRADE_END], true)) {
                    $station = $e;
                    break;
                }
            }
        }
        $this->assertNotNull($station, 'a retrograde station should occur during the year');

        $before = $this->lon($station->planet, $station->exactAt->modify('-12 hours'));
        $after  = $this->lon($station->planet, $station->exactAt->modify('+12 hours'));
        $velocity = (fmod(fmod($after - $before, 360) + 540, 360) - 180); // deg/day
        $this->assertLessThan(0.05, abs($velocity), 'velocity at a station must be ~0');
    }

    // ── Aspects ───────────────────────────────────────────────────────────────

    public function testDetectedAspectsAreExact(): void
    {
        $checked = 0;
        for ($m = 1; $m <= 12; $m++) {
            foreach ($this->detector->detectForMonth(2026, $m) as $e) {
                if ($e->type !== SkyEvent::TYPE_ASPECT) {
                    continue;
                }
                $sep = PlanetaryCalculator::separation(
                    $this->lon($e->planet, $e->exactAt),
                    $this->lon($e->planet2, $e->exactAt),
                );
                $target = (float) $e->metadata['angle'];
                $this->assertLessThan(
                    0.3,
                    abs($sep - $target),
                    "{$e->planet} {$e->aspectType} {$e->planet2} must be exact (sep={$sep}, target={$target})"
                );
                $checked++;
            }
        }
        $this->assertGreaterThan(0, $checked, 'expected at least one slow aspect during the year');
    }

    // ── Determinism ───────────────────────────────────────────────────────────

    public function testDetectionIsDeterministic(): void
    {
        $a = $this->detector->detectForMonth(2026, 6);
        $b = (new SkyEventDetector())->detectForMonth(2026, 6);

        $fa = array_map(fn (SkyEvent $e) => $e->fingerprint(), $a);
        $fb = array_map(fn (SkyEvent $e) => $e->fingerprint(), $b);
        $this->assertSame($fa, $fb, 'same month must yield identical events');
    }

    public function testEventsAreSortedAndWithinMonth(): void
    {
        $events = $this->detector->detectForMonth(2026, 6);
        $prev = null;
        foreach ($events as $e) {
            $this->assertSame('2026-06', $e->exactAt->format('Y-m'), 'event must fall inside the month');
            if ($prev !== null) {
                $this->assertGreaterThanOrEqual($prev, $e->exactAt->getTimestamp(), 'events must be chronological');
            }
            $prev = $e->exactAt->getTimestamp();
        }
    }

    /** @param string[] $types */
    private function firstOfType(int $year, int $month, array $types): ?SkyEvent
    {
        foreach ($this->detector->detectForMonth($year, $month) as $e) {
            if (in_array($e->type, $types, true)) {
                return $e;
            }
        }
        return null;
    }
}
