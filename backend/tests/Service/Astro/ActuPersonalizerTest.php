<?php

namespace App\Tests\Service\Astro;

use App\Service\Astro\ActuPersonalizer;
use App\Service\Astro\SkyEvent;
use App\Service\PlanetaryCalculator;
use PHPUnit\Framework\TestCase;

/**
 * The overlay is 100% deterministic, so it is tested against a fixed natal chart
 * with synthetic events placed exactly on (and far from) known natal points.
 */
class ActuPersonalizerTest extends TestCase
{
    private ActuPersonalizer $personalizer;
    private PlanetaryCalculator $natal;

    protected function setUp(): void
    {
        $this->personalizer = new ActuPersonalizer();
        // Fixed birth chart (Paris).
        $this->natal = new PlanetaryCalculator('1990-06-15', '14:30', 48.8566, 2.3522, 'Test');
    }

    private function eventAt(string $type, float $lon, ?string $planet = 'Sun'): SkyEvent
    {
        return new SkyEvent(
            type: $type,
            exactAt: new \DateTimeImmutable('2026-06-15 12:00:00', new \DateTimeZone('UTC')),
            planet: $planet,
            longitude: $lon,
        );
    }

    public function testEventOnNatalPlanetIsDetectedAsHit(): void
    {
        $natalSun = $this->natal->getPlanetLongitude('Sun');
        $event = $this->eventAt(SkyEvent::TYPE_FULL_MOON, $natalSun, 'Moon');

        $overlay = $this->personalizer->personalize($event, $this->natal);

        $this->assertNotNull($overlay['natalHit'], 'event exactly on natal Sun must hit');
        $this->assertSame('Sun', $overlay['natalHit']['planet']);
        $this->assertLessThan(0.5, $overlay['natalHit']['orb']);
        $this->assertTrue($overlay['isHighlight']);
        // A hit makes the hook personal but stays non-technical (no "ton X natal").
        $this->assertStringContainsString('Ça te concerne de près', $overlay['hook']);
        $this->assertStringNotContainsString('natal', $overlay['hook']);
    }

    public function testEventFarFromAnyPlanetHasNoHit(): void
    {
        // Sweep to find a longitude at least 8° from every natal point.
        $points = array_map(
            fn ($p) => $p['longitude'],
            $this->natal->getAllPlanets()
        );
        $points[] = $this->natal->getAscendant()['longitude'];
        $points[] = $this->natal->getMidheaven()['longitude'];

        $empty = null;
        for ($lon = 0.0; $lon < 360.0; $lon += 1.0) {
            $clear = true;
            foreach ($points as $p) {
                if (PlanetaryCalculator::separation($lon, $p) < 8.0) {
                    $clear = false;
                    break;
                }
            }
            if ($clear) {
                $empty = $lon;
                break;
            }
        }
        $this->assertNotNull($empty, 'should find an empty patch of zodiac');

        $overlay = $this->personalizer->personalize($this->eventAt(SkyEvent::TYPE_NEW_MOON, $empty, 'Moon'), $this->natal);
        $this->assertNull($overlay['natalHit']);
        $this->assertFalse($overlay['isHighlight']);
    }

    public function testHouseIsConsistentWithCalculator(): void
    {
        $lon = 123.4;
        $overlay = $this->personalizer->personalize($this->eventAt(SkyEvent::TYPE_INGRESSION, $lon, 'Mars'), $this->natal);
        $this->assertSame($this->natal->houseOfLongitude($lon), $overlay['house']);
        $this->assertArrayHasKey($overlay['house'], array_flip(range(1, 12)));
        $this->assertNotEmpty($overlay['hook']);
    }

    public function testHitBoostsRelevanceAboveNonHit(): void
    {
        $natalVenus = $this->natal->getPlanetLongitude('Venus');
        $hit = $this->personalizer->personalize($this->eventAt(SkyEvent::TYPE_ASPECT, $natalVenus, 'Mars'), $this->natal);

        // Same type, a longitude far from natal Venus and not in an angular house contact.
        $nonHit = $this->personalizer->personalize($this->eventAt(SkyEvent::TYPE_ASPECT, $natalVenus + 30, 'Mars'), $this->natal);

        $this->assertGreaterThan($nonHit['relevance'], $hit['relevance']);
    }

    public function testAspectUsesStrongerOfTwoBodiesForHit(): void
    {
        $natalMars = $this->natal->getPlanetLongitude('Mars');
        // Primary body far from natal; secondary body exactly on natal Mars.
        $event = new SkyEvent(
            type: SkyEvent::TYPE_ASPECT,
            exactAt: new \DateTimeImmutable('2026-06-15 12:00:00', new \DateTimeZone('UTC')),
            planet: 'Jupiter',
            planet2: 'Pluto',
            aspectType: 'square',
            longitude: $natalMars + 90,
            longitude2: $natalMars,
        );

        $overlay = $this->personalizer->personalize($event, $this->natal);
        $this->assertNotNull($overlay['natalHit'], 'should pick up the hit on the secondary body');
        $this->assertSame('Mars', $overlay['natalHit']['planet']);
    }

    public function testDeterministicOutput(): void
    {
        $event = $this->eventAt(SkyEvent::TYPE_FULL_MOON, 200.0, 'Moon');
        $a = $this->personalizer->personalize($event, $this->natal);
        $b = $this->personalizer->personalize($event, $this->natal);
        $this->assertSame($a, $b);
    }
}
