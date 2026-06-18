<?php

namespace App\Tests\Service\Astro;

use App\Entity\MoodCorpus;
use App\Service\Astro\MoonPhase;
use App\Service\Astro\SkyEvent;
use App\Service\Astro\SkyEventDetector;
use PHPUnit\Framework\TestCase;

class MoonPhaseTest extends TestCase
{
    public function testPhaseIndexBoundaries(): void
    {
        $this->assertSame(0, MoonPhase::phaseIndex(0));     // new
        $this->assertSame(0, MoonPhase::phaseIndex(350));   // still new (wraps)
        $this->assertSame(2, MoonPhase::phaseIndex(90));    // first quarter
        $this->assertSame(4, MoonPhase::phaseIndex(180));   // full
        $this->assertSame(6, MoonPhase::phaseIndex(270));   // last quarter
        $this->assertSame(7, MoonPhase::phaseIndex(315));   // balsamic
    }

    public function testAtReturnsValidStructure(): void
    {
        $info = MoonPhase::at(new \DateTimeImmutable('2026-06-18 12:00:00', new \DateTimeZone('UTC')));
        $this->assertArrayHasKey('signIndex', $info);
        $this->assertContains($info['phase'], MoodCorpus::PHASES);
        $this->assertGreaterThanOrEqual(0, $info['signIndex']);
        $this->assertLessThanOrEqual(11, $info['signIndex']);
    }

    /** At a detector-dated new moon the phase must be 'new'; at a full moon, 'full'. */
    public function testPhaseAgreesWithDetectedLunations(): void
    {
        $detector = new SkyEventDetector();
        $events = $detector->detectForMonth(2026, 6);

        foreach ($events as $e) {
            if (in_array($e->type, [SkyEvent::TYPE_NEW_MOON, SkyEvent::TYPE_SOLAR_ECLIPSE], true)) {
                $this->assertSame('new', MoonPhase::at($e->exactAt)['phase'], 'new moon must read as new');
            }
            if (in_array($e->type, [SkyEvent::TYPE_FULL_MOON, SkyEvent::TYPE_LUNAR_ECLIPSE], true)) {
                $this->assertSame('full', MoonPhase::at($e->exactAt)['phase'], 'full moon must read as full');
            }
            // Moon sign at a lunation must match the event's recorded sign.
            if (str_starts_with($e->type, 'lunation') || $e->isEclipse()) {
                $this->assertSame($e->signFr(), MoonPhase::at($e->exactAt)['signFr']);
            }
        }
    }
}
