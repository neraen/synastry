<?php

namespace App\Tests\Service\Rectification;

use App\Service\PlanetaryCalculator;
use App\Tests\Service\Rectification\Fixtures\RectificationFixtures;
use PHPUnit\Framework\TestCase;

/**
 * Level 1 of the rectification test pyramid: the natal angles themselves.
 *
 * Nothing in the rectification engine can be trusted before this passes. Every
 * technique it uses is a function of the Ascendant and Midheaven, so a
 * half-degree error here becomes a two-minute error in the estimated birth
 * time, silently, with a perfectly plausible-looking posterior on top of it.
 *
 * Three independent lines of defence:
 *   1. The sidereal-time series is checked against a published worked example.
 *   2. The angles are checked against a geometric solver that shares no algebra
 *      with production (see {@see ReferenceAngleCalculator}).
 *   3. The values are frozen in the fixtures, so a future refactor that changes
 *      both implementations at once still fails.
 */
class Level1AnglesTest extends TestCase
{
    /** One arc-minute, in degrees. The tolerance mandated by the spec. */
    private const ARCMINUTE = 1.0 / 60.0;

    /**
     * External ground truth: Meeus, "Astronomical Algorithms", example 12.a.
     *
     * The apparent sidereal time at Greenwich for 1987 April 10 at 0h UT is
     * 13h10m46.3668s, and at 19h21m UT it is 8h34m57.0896s. This is the only
     * value in the whole suite that comes from outside the codebase, and it is
     * what makes the rest of the chain meaningful rather than self-referential.
     *
     * @dataProvider meeusSiderealTimeProvider
     */
    public function testSiderealTimeMatchesMeeusWorkedExample(string $utc, float $expectedHours): void
    {
        $julianDay = ReferenceAngleCalculator::julianDay(
            new \DateTimeImmutable($utc, new \DateTimeZone('UTC'))
        );

        $degrees = ReferenceAngleCalculator::greenwichSiderealTime($julianDay);

        // A thousandth of a second of time — far tighter than anything the
        // rectification engine needs, but this is the anchor, so it is exact.
        $this->assertEqualsWithDelta(
            $expectedHours,
            $degrees / 15.0,
            1.0 / 3600000.0,
            "Temps sidéral de Greenwich incorrect pour $utc"
        );
    }

    public static function meeusSiderealTimeProvider(): array
    {
        return [
            '1987-04-10 0h UT'      => ['1987-04-10 00:00:00', 13 + 10 / 60 + 46.3668 / 3600],
            '1987-04-10 19h21m UT'  => ['1987-04-10 19:21:00', 8 + 34 / 60 + 57.0896 / 3600],
        ];
    }

    /** The Julian Day epoch itself: 2000 January 1 at 12h UT is JD 2451545.0. */
    public function testJulianDayEpoch(): void
    {
        $this->assertSame(
            2451545.0,
            ReferenceAngleCalculator::julianDay(
                new \DateTimeImmutable('2000-01-01 12:00:00', new \DateTimeZone('UTC'))
            )
        );
    }

    /** Mean obliquity at J2000.0 is 23.4392911 deg by definition of the series. */
    public function testObliquityAtJ2000(): void
    {
        $this->assertEqualsWithDelta(
            23.4392911,
            ReferenceAngleCalculator::obliquity(2451545.0),
            1e-7
        );
    }

    /**
     * The production calculator must reproduce the frozen fixture angles to the
     * arc-minute.
     *
     * @dataProvider level1Provider
     */
    public function testProductionAnglesMatchFixtures(string $key, array $fixture): void
    {
        $utc  = RectificationFixtures::toUtc($fixture);
        $calc = new PlanetaryCalculator(
            $utc->format('Y-m-d'),
            $utc->format('H:i'),
            $fixture['latitude'],
            $fixture['longitude']
        );

        $this->assertAngleEquals(
            $fixture['expected_asc'],
            $calc->getAscendant()['longitude'],
            "Ascendant hors tolérance pour $key ({$fixture['label']})"
        );

        $this->assertAngleEquals(
            $fixture['expected_mc'],
            $calc->getMidheaven()['longitude'],
            "Milieu du Ciel hors tolérance pour $key ({$fixture['label']})"
        );
    }

    /**
     * The same angles, derived from the geometric definition instead of the
     * closed-form identities. This is the test that would actually catch a
     * hemisphere or sign error.
     *
     * @dataProvider level1Provider
     */
    public function testProductionAnglesMatchIndependentGeometry(string $key, array $fixture): void
    {
        $utc = RectificationFixtures::toUtc($fixture);

        $production = new PlanetaryCalculator(
            $utc->format('Y-m-d'),
            $utc->format('H:i'),
            $fixture['latitude'],
            $fixture['longitude']
        );

        $reference = new ReferenceAngleCalculator(
            $fixture['latitude'],
            $fixture['longitude'],
            $utc
        );

        $this->assertAngleEquals(
            $reference->ascendant(),
            $production->getAscendant()['longitude'],
            "L'ASC de production diverge du solveur géométrique pour $key"
        );

        $this->assertAngleEquals(
            $reference->midheaven(),
            $production->getMidheaven()['longitude'],
            "Le MC de production diverge du solveur géométrique pour $key"
        );
    }

    /**
     * Guards the local -> UTC conversion, which is where historical
     * daylight-saving bugs land. Feeding the local time straight in, without
     * subtracting the fixture's offset, must move the Ascendant far outside
     * tolerance — otherwise the fixture is not actually exercising the
     * conversion and gives false confidence.
     *
     * @dataProvider level1Provider
     */
    public function testOffsetIsActuallyApplied(string $key, array $fixture): void
    {
        if ($fixture['utc_offset'] == 0.0) {
            $this->markTestSkipped('Profil déjà en UTC : rien à convertir.');
        }

        $naive = new PlanetaryCalculator(
            $fixture['local_date'],
            $fixture['local_time'],
            $fixture['latitude'],
            $fixture['longitude']
        );

        $delta = $this->angularDistance(
            $fixture['expected_asc'],
            $naive->getAscendant()['longitude']
        );

        $this->assertGreaterThan(
            1.0,
            $delta,
            "Ignorer l'offset UTC de $key ne déplace pas l'ASC : la fixture ne teste pas la conversion horaire."
        );
    }

    /**
     * Sanity check on the geometry itself: the Ascendant must sit on the
     * eastern horizon, and the Midheaven on the upper meridian. Independent of
     * any expected value, so it holds for any profile added later.
     *
     * @dataProvider level1Provider
     */
    public function testAnglesSatisfyTheirGeometricDefinition(string $key, array $fixture): void
    {
        $utc = RectificationFixtures::toUtc($fixture);

        $reference = new ReferenceAngleCalculator(
            $fixture['latitude'],
            $fixture['longitude'],
            $utc
        );

        // The MC's right ascension is the local sidereal time, by definition.
        $mc  = $reference->midheaven();
        $eps = deg2rad(ReferenceAngleCalculator::obliquity(
            ReferenceAngleCalculator::julianDay($utc)
        ));
        $rightAscension = ReferenceAngleCalculator::norm360(
            rad2deg(atan2(sin(deg2rad($mc)) * cos($eps), cos(deg2rad($mc))))
        );

        $this->assertEqualsWithDelta(
            0.0,
            ReferenceAngleCalculator::norm180($rightAscension - $reference->localSiderealTime()),
            1e-6,
            "Le MC de $key n'est pas sur le méridien supérieur"
        );

        // The Ascendant is always east of the Midheaven by less than 180 deg,
        // in the direction of increasing zodiacal longitude.
        $separation = ReferenceAngleCalculator::norm360($reference->ascendant() - $mc);
        $this->assertGreaterThan(0.0, $separation, "ASC/MC dans le mauvais ordre pour $key");
        $this->assertLessThan(180.0, $separation, "ASC/MC dans le mauvais ordre pour $key");
    }

    public static function level1Provider(): array
    {
        $cases = [];
        foreach (RectificationFixtures::level1Angles() as $key => $fixture) {
            $cases[$key] = [$key, $fixture];
        }

        return $cases;
    }

    private function assertAngleEquals(float $expected, float $actual, string $message): void
    {
        $this->assertLessThan(
            self::ARCMINUTE,
            $this->angularDistance($expected, $actual),
            sprintf('%s — attendu %.6f°, obtenu %.6f°', $message, $expected, $actual)
        );
    }

    private function angularDistance(float $a, float $b): float
    {
        return abs(ReferenceAngleCalculator::norm180($a - $b));
    }
}
