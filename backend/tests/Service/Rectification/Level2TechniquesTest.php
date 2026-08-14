<?php

namespace App\Tests\Service\Rectification;

use App\Service\Rectification\Ephemeris;
use App\Service\Rectification\RectificationConfig;
use App\Service\Rectification\Technique\SlowTransitTechnique;
use App\Service\Rectification\Technique\SolarArcTechnique;
use App\Tests\Service\Rectification\Fixtures\RectificationFixtures;
use PHPUnit\Framework\TestCase;

/**
 * Level 2 of the rectification test pyramid: the dating techniques.
 *
 * Level 1 proves the angles are right at the moment of birth. This level proves
 * they are moved correctly through time — which is a separate class of error,
 * invisible in level 1, and the one the spec calls out by name: confusing solar
 * arc with secondary progressions, or slipping a day in the day-for-a-year
 * correspondence.
 */
class Level2TechniquesTest extends TestCase
{
    private Ephemeris $ephemeris;
    private SolarArcTechnique $solarArc;
    private SlowTransitTechnique $transits;

    protected function setUp(): void
    {
        $this->ephemeris = new Ephemeris();
        $this->solarArc  = new SolarArcTechnique($this->ephemeris);
        $this->transits  = new SlowTransitTechnique($this->ephemeris);
    }

    /**
     * @dataProvider solarArcProvider
     */
    public function testSolarArcMatchesFixture(string $key, array $profile, array $case): void
    {
        $natalUtc = RectificationFixtures::toUtc($profile);
        $date     = new \DateTimeImmutable($case['date'] . ' 12:00:00', new \DateTimeZone('UTC'));

        $this->assertEqualsWithDelta(
            $case['expected_arc'],
            $this->solarArc->arc($natalUtc, $date),
            1e-6,
            "Arc solaire hors tolérance pour $key au {$case['date']}"
        );
    }

    public static function solarArcProvider(): array
    {
        $cases = [];
        foreach (RectificationFixtures::level2Techniques() as $key => $spec) {
            $profile = RectificationFixtures::level1Angles()[$spec['profile']];
            foreach ($spec['solar_arc'] as $i => $case) {
                $cases["$key #$i"] = [$key, $profile, $case];
            }
        }

        return $cases;
    }

    /**
     * The solar arc must track the Sun's actual, uneven motion, not a flat
     * degree per year.
     *
     * A July-born subject accumulates less than a degree per year (the Sun is
     * near aphelion and slow), a November-born subject more. If both came out
     * at exactly the age in years, the day-for-a-year mapping would have been
     * silently replaced by a constant — a bug that leaves the posterior looking
     * perfectly healthy while being wrong by a degree, i.e. four minutes of
     * birth time.
     */
    public function testSolarArcFollowsTheSunsUnevenMotion(): void
    {
        $summerBorn = RectificationFixtures::level1Angles()['paris_summer_time'];
        $winterBorn = RectificationFixtures::level1Angles()['sydney_southern'];

        $summerArc = $this->arcAfterYears($summerBorn, 30.0);
        $winterArc = $this->arcAfterYears($winterBorn, 30.0);

        $this->assertLessThan(30.0, $summerArc, 'Naissance estivale : le Soleil est lent, l\'arc doit rester sous l\'âge.');
        $this->assertGreaterThan(30.0, $winterArc, 'Naissance de novembre : le Soleil est rapide, l\'arc doit dépasser l\'âge.');

        // Both stay inside the physically possible band: the Sun's daily motion
        // never leaves [0.953, 1.020] deg/day.
        $this->assertGreaterThan(30.0 * 0.953, $summerArc);
        $this->assertLessThan(30.0 * 1.020, $winterArc);
    }

    /** The arc is zero at birth and strictly increasing afterwards. */
    public function testSolarArcIsZeroAtBirthAndMonotonic(): void
    {
        $profile  = RectificationFixtures::level1Angles()['paris_summer_time'];
        $natalUtc = RectificationFixtures::toUtc($profile);

        $this->assertEqualsWithDelta(0.0, $this->solarArc->arc($natalUtc, $natalUtc), 1e-9);

        $previous = 0.0;
        for ($years = 1; $years <= 60; ++$years) {
            $arc = $this->arcAfterYears($profile, (float) $years);
            $this->assertGreaterThan($previous, $arc, "L'arc solaire recule à $years ans");
            $previous = $arc;
        }
    }

    /**
     * Solar arc is not a secondary progression.
     *
     * Under solar arc every point advances by the *same* amount — the Sun's arc.
     * Under secondary progressions each point advances at its own progressed
     * rate, so the Moon would move about a degree per *month* of life. This test
     * pins the distinction: the directed Ascendant and the directed Moon must be
     * displaced by an identical arc.
     */
    public function testSolarArcDisplacesEveryPointByTheSameArc(): void
    {
        $profile  = RectificationFixtures::level1Angles()['paris_summer_time'];
        $natalUtc = RectificationFixtures::toUtc($profile);
        $date     = new \DateTimeImmutable('2015-06-01 12:00:00', new \DateTimeZone('UTC'));

        $arc = $this->solarArc->arc($natalUtc, $date);

        $natalMoon = $this->ephemeris->longitude('Moon', $natalUtc);
        $natalSun  = $this->ephemeris->longitude('Sun', $natalUtc);

        $this->assertEqualsWithDelta(
            $arc,
            Ephemeris::signedDelta($natalMoon, Ephemeris::norm360($natalMoon + $arc)),
            1e-9,
            'La Lune dirigée doit se déplacer du même arc que tout le reste.'
        );
        $this->assertEqualsWithDelta(
            $arc,
            Ephemeris::signedDelta($natalSun, Ephemeris::norm360($natalSun + $arc)),
            1e-9
        );

        // And that arc is around a degree per year — a progressed-Moon rate
        // (a degree per month) would be an order of magnitude larger.
        $years = ($date->getTimestamp() - $natalUtc->getTimestamp()) / 86400.0 / 365.2422;
        $this->assertEqualsWithDelta($years, $arc, 1.5, 'L\'arc solaire doit rester proche de 1°/an.');
    }

    /**
     * @dataProvider transitProvider
     */
    public function testSlowTransitOrbPassagesMatchFixture(string $key, array $profile, array $case): void
    {
        $passages = $this->transits->orbPassages(
            $case['planet'],
            $profile['expected_asc'],
            new \DateTimeImmutable($case['from'], new \DateTimeZone('UTC')),
            new \DateTimeImmutable($case['until'], new \DateTimeZone('UTC')),
        );

        $this->assertSame(
            $case['expected'],
            $passages,
            "Passages de {$case['planet']} sur l'ASC natal de $key incorrects"
        );
    }

    public static function transitProvider(): array
    {
        $cases = [];
        foreach (RectificationFixtures::level2Techniques() as $key => $spec) {
            $profile = RectificationFixtures::level1Angles()[$spec['profile']];
            foreach ($spec['transits'] as $case) {
                $cases["$key {$case['planet']}"] = [$key, $profile, $case];
            }
        }

        return $cases;
    }

    /**
     * A slow planet crossing a natal degree does so more than once, because it
     * retrogrades over it. Collapsing the passages into one would halve the
     * apparent rarity of the contact and skew every base rate.
     */
    public function testRetrogradeRecrossingsAreReportedSeparately(): void
    {
        $profile = RectificationFixtures::level1Angles()['paris_summer_time'];

        $passages = $this->transits->orbPassages(
            'Saturn',
            $profile['expected_asc'],
            new \DateTimeImmutable('1998-01-01', new \DateTimeZone('UTC')),
            new \DateTimeImmutable('2006-12-31', new \DateTimeZone('UTC')),
        );

        $this->assertGreaterThanOrEqual(
            2,
            count($passages),
            'Saturne rétrograde sur un degré natal : au moins deux passages attendus.'
        );
    }

    /**
     * The ephemeris cache must interpolate, not step. A planet's longitude
     * sampled every hour has to move smoothly, otherwise the likelihood becomes
     * a staircase and neighbouring candidates get identical scores.
     */
    public function testEphemerisInterpolatesBetweenGridPoints(): void
    {
        $base = new \DateTimeImmutable('2001-08-15 00:00:00', new \DateTimeZone('UTC'));

        $longitudes = [];
        for ($hour = 0; $hour <= 24; ++$hour) {
            $longitudes[] = $this->ephemeris->longitude('Sun', $base->modify("+$hour hours"));
        }

        $distinct = count(array_unique(array_map(static fn ($l) => round($l, 6), $longitudes)));
        $this->assertSame(25, $distinct, 'Les longitudes doivent varier à chaque heure, pas par palier journalier.');

        // The Sun advances just under a degree in a day.
        $daily = Ephemeris::signedDelta($longitudes[0], $longitudes[24]);
        $this->assertEqualsWithDelta(0.98, $daily, 0.05);
    }

    /**
     * The whole search is affordable only because transiting positions are
     * cached on a grid and shared across candidates. If this regresses, the
     * engine still returns the right answer — just far too slowly to run
     * inside a request.
     */
    public function testEphemerisCacheCollapsesRepeatedLookups(): void
    {
        $ephemeris = new Ephemeris();
        $date      = new \DateTimeImmutable('2001-08-15 12:00:00', new \DateTimeZone('UTC'));

        for ($i = 0; $i < 500; ++$i) {
            $ephemeris->longitude('Pluto', $date);
        }

        $this->assertLessThanOrEqual(
            2,
            $ephemeris->ephemerisHits(),
            'Une même date doit coûter au plus deux points de grille, quel que soit le nombre de lectures.'
        );
    }

    /** Sanity: every technique the config claims to enable is actually built. */
    public function testEnabledTechniquesAreImplemented(): void
    {
        $this->assertSame(
            ['solar_arc_angles', 'slow_transit_angles', 'progressed_angles', 'progressed_moon_angles'],
            RectificationConfig::enabledTechniques()
        );
    }

    private function arcAfterYears(array $profile, float $years): float
    {
        $natalUtc = RectificationFixtures::toUtc($profile);

        return $this->solarArc->arc(
            $natalUtc,
            $natalUtc->modify(sprintf('+%d days', (int) round($years * 365.2422)))
        );
    }
}
