<?php

namespace App\Tests\Service\Rectification;

/**
 * Independent reference implementation of the natal angles (Ascendant, Midheaven).
 *
 * This exists ONLY for the level-1 fixtures of the birth-time rectification module.
 * Its whole point is to NOT share code — or method — with
 * {@see \App\Service\PlanetaryCalculator}. Where the production code uses the
 * classic closed-form trigonometric identities, this class solves the *geometric
 * definition* of the angles numerically:
 *
 *   - Midheaven = the ecliptic longitude whose right ascension equals the local
 *     sidereal time (hour angle zero, upper meridian).
 *   - Ascendant = the ecliptic longitude that is on the horizon (altitude zero)
 *     on the eastern side of the sky.
 *
 * Both are found by bisection on ecliptic longitude, going through a full
 * ecliptic -> equatorial -> horizontal coordinate chain. A sign error, a
 * latitude/longitude swap or a hemisphere mistake in the production formulas
 * cannot survive agreement with this class, because there is no shared algebra
 * for the error to hide in.
 *
 * The only externally anchored constant is the sidereal-time series, which is
 * verified against Meeus, "Astronomical Algorithms", example 12.a in
 * {@see Level1AnglesTest::testSiderealTimeMatchesMeeusWorkedExample()}.
 */
final class ReferenceAngleCalculator
{
    /** Julian day of the instant, computed from a UTC date/time. */
    private float $julianDay;

    public function __construct(
        private readonly float $latitude,
        private readonly float $longitude,
        \DateTimeImmutable $utc,
    ) {
        $this->julianDay = self::julianDay($utc);
    }

    /**
     * Julian Day from a UTC instant.
     *
     * Deliberately written differently from the production version: the day
     * fraction is added at the end from the second-of-day, rather than folded
     * into the day number before the calendar correction.
     */
    public static function julianDay(\DateTimeImmutable $utc): float
    {
        $year  = (int) $utc->format('Y');
        $month = (int) $utc->format('n');
        $day   = (int) $utc->format('j');

        if ($month <= 2) {
            --$year;
            $month += 12;
        }

        $a = intdiv($year, 100);
        $b = 2 - $a + intdiv($a, 4);

        $jdMidnight = floor(365.25 * ($year + 4716))
            + floor(30.6001 * ($month + 1))
            + $day + $b - 1524.5;

        $secondsOfDay = (int) $utc->format('H') * 3600
            + (int) $utc->format('i') * 60
            + (int) $utc->format('s');

        return $jdMidnight + $secondsOfDay / 86400.0;
    }

    /** Greenwich mean sidereal time in degrees (Meeus 12.4). */
    public static function greenwichSiderealTime(float $julianDay): float
    {
        $d = $julianDay - 2451545.0;
        $t = $d / 36525.0;

        $theta = 280.46061837
            + 360.98564736629 * $d
            + 0.000387933 * $t ** 2
            - $t ** 3 / 38710000.0;

        return self::norm360($theta);
    }

    /**
     * Mean obliquity of the ecliptic in degrees.
     *
     * IAU 1980 series expressed in arcseconds then converted, rather than the
     * pre-reduced decimal-degree coefficients used in production. Same model,
     * independent arithmetic path.
     */
    public static function obliquity(float $julianDay): float
    {
        $t = ($julianDay - 2451545.0) / 36525.0;

        $arcseconds = 21.448 - 46.8150 * $t - 0.00059 * $t ** 2 + 0.001813 * $t ** 3;

        return 23.0 + 26.0 / 60.0 + $arcseconds / 3600.0;
    }

    /** Local sidereal time in degrees (east longitude positive). */
    public function localSiderealTime(): float
    {
        return self::norm360(self::greenwichSiderealTime($this->julianDay) + $this->longitude);
    }

    /**
     * Ascendant, found as the ecliptic longitude sitting on the eastern horizon.
     *
     * Altitude crosses zero twice along the ecliptic; the rising point is the
     * crossing whose azimuth is in the eastern half of the sky. Bisection on a
     * one-degree scan keeps this free of any closed-form Ascendant identity.
     */
    public function ascendant(): float
    {
        $eastern = function (float $lambda): bool {
            [, $azimuth] = $this->horizontal($lambda);

            return $azimuth < 180.0;
        };

        $altitude = fn (float $lambda): float => $this->horizontal($lambda)[0];

        foreach ($this->scanForSignChanges($altitude) as [$lo, $hi]) {
            $root = $this->bisect($altitude, $lo, $hi);
            if ($eastern($root)) {
                return self::norm360($root);
            }
        }

        throw new \RuntimeException('No rising ecliptic point found — degenerate geometry.');
    }

    /**
     * Midheaven, found as the ecliptic longitude culminating on the upper meridian.
     *
     * The upper meridian is where the hour angle is zero, i.e. where the right
     * ascension of the ecliptic point equals the local sidereal time. The
     * anti-culminating point (IC) also satisfies |hour angle| = 180 deg and is
     * excluded by checking the hour angle itself rather than its tangent.
     */
    public function midheaven(): float
    {
        $hourAngle = function (float $lambda): float {
            $rightAscension = $this->equatorial($lambda)[0];

            return self::norm180($this->localSiderealTime() - $rightAscension);
        };

        foreach ($this->scanForSignChanges($hourAngle) as [$lo, $hi]) {
            // Reject the wrap from +180 to -180, which is the IC, not the MC.
            if (abs($hourAngle($lo)) > 90.0) {
                continue;
            }

            return self::norm360($this->bisect($hourAngle, $lo, $hi));
        }

        throw new \RuntimeException('No culminating ecliptic point found.');
    }

    /**
     * Equatorial coordinates [right ascension, declination] in degrees of a
     * point on the ecliptic (latitude zero).
     */
    private function equatorial(float $lambda): array
    {
        $eps = deg2rad(self::obliquity($this->julianDay));
        $l   = deg2rad($lambda);

        $rightAscension = atan2(sin($l) * cos($eps), cos($l));
        $declination    = asin(sin($l) * sin($eps));

        return [self::norm360(rad2deg($rightAscension)), rad2deg($declination)];
    }

    /**
     * Horizontal coordinates [altitude, azimuth] in degrees, azimuth measured
     * from north through east.
     */
    private function horizontal(float $lambda): array
    {
        [$rightAscension, $declination] = $this->equatorial($lambda);

        $h   = deg2rad(self::norm180($this->localSiderealTime() - $rightAscension));
        $dec = deg2rad($declination);
        $phi = deg2rad($this->latitude);

        $altitude = asin(sin($dec) * sin($phi) + cos($dec) * cos($phi) * cos($h));

        $azimuth = atan2(
            sin($h),
            cos($h) * sin($phi) - tan($dec) * cos($phi)
        );

        // atan2 above is measured from south; shift to north-through-east.
        return [rad2deg($altitude), self::norm360(rad2deg($azimuth) + 180.0)];
    }

    /**
     * Scan the ecliptic in one-degree steps and yield every bracket where the
     * function changes sign.
     *
     * @param callable(float): float $f
     *
     * @return list<array{float, float}>
     */
    private function scanForSignChanges(callable $f): array
    {
        $brackets = [];
        $previous = $f(0.0);

        for ($lambda = 1.0; $lambda <= 360.0; ++$lambda) {
            $current = $f($lambda);
            if ($previous == 0.0 || ($previous < 0) !== ($current < 0)) {
                $brackets[] = [$lambda - 1.0, $lambda];
            }
            $previous = $current;
        }

        return $brackets;
    }

    /**
     * Bisection to 1e-9 degrees — four orders of magnitude finer than the
     * arc-minute tolerance the fixtures assert on.
     *
     * @param callable(float): float $f
     */
    private function bisect(callable $f, float $lo, float $hi): float
    {
        for ($i = 0; $i < 200 && ($hi - $lo) > 1e-9; ++$i) {
            $mid = ($lo + $hi) / 2.0;
            if (($f($lo) < 0) === ($f($mid) < 0)) {
                $lo = $mid;
            } else {
                $hi = $mid;
            }
        }

        return ($lo + $hi) / 2.0;
    }

    public static function norm360(float $degrees): float
    {
        $d = fmod($degrees, 360.0);

        return $d < 0 ? $d + 360.0 : $d;
    }

    public static function norm180(float $degrees): float
    {
        $d = self::norm360($degrees);

        return $d > 180.0 ? $d - 360.0 : $d;
    }
}
