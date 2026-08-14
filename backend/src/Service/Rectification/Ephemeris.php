<?php

namespace App\Service\Rectification;

use App\Service\PlanetaryCalculator;

/**
 * Cached planetary longitudes for the rectification engine.
 *
 * The engine evaluates every technique for every candidate birth time against
 * every event sample — hundreds of thousands of lookups. Instantiating a
 * {@see PlanetaryCalculator} that many times is not viable, and reimplementing
 * the ephemeris here would defeat the point of having one astronomical source
 * of truth.
 *
 * So this class keeps PlanetaryCalculator as the only ephemeris and caches its
 * output on a fixed time grid, interpolating between grid points. Transiting
 * positions are geocentric, so they depend on the instant alone and are shared
 * across all candidates — which is what makes the whole search affordable.
 *
 * Interpolation error is bounded by the curvature of the planet's motion over
 * one grid step. At a one-day step the Sun's is on the order of 1e-4 degrees
 * and the outer planets' is smaller still, i.e. three orders of magnitude
 * below the tightest orb in use. The Moon moves thirteen degrees a day, so it
 * gets a six-hour grid.
 */
final class Ephemeris
{
    /** Grid step per planet, in seconds. Defaults to one day. */
    private const GRID_STEP_SECONDS = [
        'Moon' => 21600, // 6 h — the Moon is far too fast for a daily grid.
    ];

    private const DEFAULT_STEP_SECONDS = 86400;

    /** @var array<string, array<int, float>> planet => (grid timestamp => longitude) */
    private array $cache = [];

    /** Number of PlanetaryCalculator instantiations, exposed for perf assertions. */
    private int $ephemerisHits = 0;

    /**
     * Ecliptic longitude of a planet at an instant, in degrees.
     */
    public function longitude(string $planet, \DateTimeImmutable $utc): float
    {
        $step      = self::GRID_STEP_SECONDS[$planet] ?? self::DEFAULT_STEP_SECONDS;
        $timestamp = $utc->getTimestamp();

        $before   = (int) (floor($timestamp / $step) * $step);
        $fraction = ($timestamp - $before) / $step;

        $a = $this->atGridPoint($planet, $before);

        if ($fraction === 0.0) {
            return $a;
        }

        $b = $this->atGridPoint($planet, $before + $step);

        // Interpolate along the shortest arc so a 359 -> 1 degree crossing does
        // not swing the result the long way round.
        return self::norm360($a + self::signedDelta($a, $b) * $fraction);
    }

    /**
     * Longitudes of several planets at one instant.
     *
     * @param list<string> $planets
     *
     * @return array<string, float>
     */
    public function longitudes(array $planets, \DateTimeImmutable $utc): array
    {
        $out = [];
        foreach ($planets as $planet) {
            $out[$planet] = $this->longitude($planet, $utc);
        }

        return $out;
    }

    public function ephemerisHits(): int
    {
        return $this->ephemerisHits;
    }

    private function atGridPoint(string $planet, int $timestamp): float
    {
        if (isset($this->cache[$planet][$timestamp])) {
            return $this->cache[$planet][$timestamp];
        }

        $utc = (new \DateTimeImmutable('@' . $timestamp))->setTimezone(new \DateTimeZone('UTC'));

        // Geocentric longitudes: the observer's coordinates are irrelevant, so
        // any location does. Angles are never read from this calculator.
        $calculator = new PlanetaryCalculator(
            $utc->format('Y-m-d'),
            $utc->format('H:i:s'),
            0.0,
            0.0
        );
        ++$this->ephemerisHits;

        $longitude = $calculator->getPlanetLongitude($planet);

        $this->cache[$planet][$timestamp] = $longitude;

        return $longitude;
    }

    /** Signed difference b - a, wrapped into (-180, 180]. */
    public static function signedDelta(float $a, float $b): float
    {
        $d = fmod($b - $a, 360.0);
        if ($d > 180.0) {
            $d -= 360.0;
        }
        if ($d <= -180.0) {
            $d += 360.0;
        }

        return $d;
    }

    public static function norm360(float $degrees): float
    {
        $d = fmod($degrees, 360.0);

        return $d < 0 ? $d + 360.0 : $d;
    }
}
