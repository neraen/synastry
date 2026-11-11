<?php

namespace App\Tests\Service;

use App\Service\PlanetaryCalculator;
use PHPUnit\Framework\TestCase;

/**
 * Ciel de naissance : latitudes écliptiques et charge utile de « Ton Ciel ».
 * Valeurs de référence tirées de Jean Meeus, Astronomical Algorithms.
 */
class PlanetaryCalculatorSkyTest extends TestCase
{
    public function testMoonLatitudeMatchesMeeusExample(): void
    {
        // Meeus ex. 47.a — 12 avril 1992, 0h : λ = 133,163°, β = −3,229°
        $calc = new PlanetaryCalculator('1992-04-12', '00:00', 0.0, 0.0);

        $this->assertEqualsWithDelta(-3.229, $calc->getMoonLatitude(), 0.05);
        $this->assertEqualsWithDelta(133.163, $calc->getMoon()['longitude'], 0.05);
    }

    public function testVenusLatitudeMatchesMeeusExample(): void
    {
        // Meeus ex. 33.a — 20 décembre 1992, 0h : λ = 313,08°, β = −2,08°
        $calc = new PlanetaryCalculator('1992-12-20', '00:00', 0.0, 0.0);

        $this->assertEqualsWithDelta(-2.08, $calc->getEclipticLatitude('Venus'), 0.1);
        $this->assertEqualsWithDelta(313.08, $calc->getPlanet('Venus')['longitude'], 0.1);
    }

    public function testSunStaysOnTheEcliptic(): void
    {
        $calc = new PlanetaryCalculator('1994-03-14', '20:30', 43.6047, 1.4442);

        $this->assertSame(0.0, $calc->getEclipticLatitude('Sun'));
    }

    public function testLatitudesStayWithinOrbitalInclinations(): void
    {
        // Bornes larges : inclinaison de l'orbite + effet de parallaxe géocentrique.
        $bounds = [
            'Moon' => 5.4, 'Mercury' => 7.5, 'Venus' => 9.0, 'Mars' => 7.0, 'Jupiter' => 1.8,
            'Saturn' => 3.0, 'Uranus' => 1.0, 'Neptune' => 2.0, 'Pluto' => 18.0,
        ];

        foreach (['1961-07-02', '1987-11-23', '1994-03-14', '2003-08-27', '2019-01-06'] as $date) {
            $calc = new PlanetaryCalculator($date, '12:00', 48.8566, 2.3522);
            foreach ($bounds as $planet => $max) {
                $this->assertLessThanOrEqual(
                    $max,
                    abs($calc->getEclipticLatitude($planet)),
                    "$planet hors bornes le $date"
                );
            }
        }
    }

    public function testSkyPayloadShape(): void
    {
        $sky = (new PlanetaryCalculator('1994-03-14', '20:30', 43.6047, 1.4442))->getSkyForApi();

        $this->assertCount(10, $sky['planets']);
        foreach ($sky['planets'] as $position) {
            $this->assertArrayHasKey('lon', $position);
            $this->assertArrayHasKey('lat', $position);
        }
        $this->assertSame(43.6047, $sky['latitude']);
        $this->assertEqualsWithDelta(2449426.354167, $sky['julianDay'], 0.0001);
        $this->assertGreaterThanOrEqual(0.0, $sky['moonIllumination']);
        $this->assertLessThanOrEqual(1.0, $sky['moonIllumination']);
    }

    public function testLongitudesUnchangedByLatitudeRefactor(): void
    {
        // Garde-fou : l'extraction de la latitude ne doit pas déplacer les longitudes.
        $calc = new PlanetaryCalculator('1994-03-14', '20:30', 43.6047, 1.4442);

        $this->assertEqualsWithDelta(354.03, $calc->getSun()['longitude'], 0.01);
        $this->assertEqualsWithDelta(7.79, $calc->getPlanet('Venus')['longitude'], 0.01);
        $this->assertEqualsWithDelta(224.18, $calc->getPlanet('Jupiter')['longitude'], 0.01);
        $this->assertEqualsWithDelta(238.09, $calc->getPlanet('Pluto')['longitude'], 0.01);
    }
}
