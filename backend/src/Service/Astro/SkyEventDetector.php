<?php

namespace App\Service\Astro;

use App\Service\PlanetaryCalculator;

/**
 * Deterministic detection & dating of astrological events for a given month.
 *
 * PRINCIPLE: precision comes from the ephemeris, never from an LLM. Everything
 * here is pure astronomy on top of the home {@see PlanetaryCalculator} (Meeus).
 * No new ephemeris dependency: positions are sampled daily and each event is
 * dated to the exact crossing by bisection (root-finding). Velocity is derived
 * numerically (central finite difference), since the calculator does not expose
 * it directly.
 *
 * Detected: ingressions (incl. solstices/equinoxes), retrograde stations,
 * new/full moons, eclipses (lunation near a lunar node), and exact major aspects
 * between social/slow planets (+ Mars as a fast trigger).
 */
class SkyEventDetector
{
    /** Planets whose sign ingressions we surface (Moon excluded: ~12/month). */
    private const INGRESSION_PLANETS = [
        'Sun', 'Mercury', 'Venus', 'Mars',
        'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
    ];

    /** Planets that can station (Sun & Moon never retrograde). */
    private const RETROGRADE_PLANETS = [
        'Mercury', 'Venus', 'Mars',
        'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
    ];

    /** Bodies considered for major aspects. At least one must be "slow". */
    private const ASPECT_BODIES = ['Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
    private const SLOW_BODIES    = ['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];

    /** angle => aspect name */
    private const ASPECTS = [
        0   => 'conjunction',
        60  => 'sextile',
        90  => 'square',
        120 => 'trine',
        180 => 'opposition',
    ];

    /** Ecliptic-latitude proxy limits for eclipse detection (lunation ↔ node). */
    private const SOLAR_ECLIPSE_LIMIT = 18.0; // generous: solar eclipses occur to ~18°
    private const LUNAR_ECLIPSE_LIMIT = 12.0;

    /** Sun-entry sign index => seasonal marker. */
    private const SEASONAL = [
        0 => 'equinox_spring',  // Aries
        3 => 'solstice_summer', // Cancer
        6 => 'equinox_autumn',  // Libra
        9 => 'solstice_winter', // Capricorn
    ];

    private const DAY_SECONDS = 86400;

    /** @var array<string,float> longitude cache: "$planet@$unixSeconds" => longitude */
    private array $lonCache = [];

    /**
     * Detect every event whose exact moment falls within the given month (UTC).
     *
     * @return SkyEvent[] sorted chronologically
     */
    public function detectForMonth(int $year, int $month): array
    {
        $tz         = new \DateTimeZone('UTC');
        $monthStart = new \DateTimeImmutable(sprintf('%04d-%02d-01 00:00:00', $year, $month), $tz);
        $nextMonth  = $monthStart->modify('+1 month');

        // Sample from one day before the month to the first day after, so events
        // in the very first/last hours are bracketed. Step = 1 day.
        $samples = [];
        for ($t = $monthStart->modify('-1 day'); $t <= $nextMonth; $t = $t->modify('+1 day')) {
            $samples[] = $t;
        }

        /** @var SkyEvent[] $events */
        $events = [];
        array_push($events, ...$this->detectIngressions($samples));
        array_push($events, ...$this->detectStations($samples));
        array_push($events, ...$this->detectLunations($samples));
        array_push($events, ...$this->detectAspects($samples));

        // Keep only events within [monthStart, nextMonth) and dedupe by fingerprint.
        $kept = [];
        foreach ($events as $e) {
            if ($e->exactAt < $monthStart || $e->exactAt >= $nextMonth) {
                continue;
            }
            $kept[$e->fingerprint()] = $e;
        }

        $kept = array_values($kept);
        usort($kept, fn (SkyEvent $a, SkyEvent $b) => $a->exactAt <=> $b->exactAt);

        return $kept;
    }

    // ── Ingressions ──────────────────────────────────────────────────────────

    /** @param \DateTimeImmutable[] $samples @return SkyEvent[] */
    private function detectIngressions(array $samples): array
    {
        $events = [];
        foreach (self::INGRESSION_PLANETS as $planet) {
            for ($i = 0; $i < count($samples) - 1; $i++) {
                $t0 = $samples[$i];
                $t1 = $samples[$i + 1];
                $lon0 = $this->longitudeAt($planet, $t0);
                $lon1 = $this->longitudeAt($planet, $t1);
                $idx0 = (int) floor($lon0 / 30);
                $idx1 = (int) floor($lon1 / 30);
                if ($idx0 === $idx1) {
                    continue;
                }

                $forward  = $this->signedDelta($lon1, $lon0) > 0;
                $boundary = (float) (($forward ? (($idx0 + 1) % 12) : $idx0) * 30);

                $exact = $this->bisect(
                    fn (\DateTimeImmutable $t) => $this->signedDelta($this->longitudeAt($planet, $t), $boundary),
                    $t0,
                    $t1
                );
                if ($exact === null) {
                    continue;
                }

                // Forward: arrives at boundary (0°). Backward (retrograde re-entry):
                // arrives just under the boundary, into the previous sign.
                $eventLon  = $forward ? $boundary : $this->normDeg($boundary - 1e-6);
                $arrivalIdx = (int) floor($eventLon / 30);

                $metadata = [
                    'direction'   => $forward ? 'direct' : 'retrograde',
                    'ingressFrom' => PlanetaryCalculator::SIGNS_FR[$idx0],
                ];
                if ($planet === 'Sun' && isset(self::SEASONAL[$arrivalIdx]) && $forward) {
                    $metadata['seasonal'] = self::SEASONAL[$arrivalIdx];
                }

                $events[] = new SkyEvent(
                    type: SkyEvent::TYPE_INGRESSION,
                    exactAt: $exact,
                    planet: $planet,
                    longitude: $eventLon,
                    metadata: $metadata,
                );
            }
        }
        return $events;
    }

    // ── Retrograde stations ──────────────────────────────────────────────────

    /** @param \DateTimeImmutable[] $samples @return SkyEvent[] */
    private function detectStations(array $samples): array
    {
        $events = [];
        foreach (self::RETROGRADE_PLANETS as $planet) {
            $v0 = $this->velocityAt($planet, $samples[0]);
            for ($i = 0; $i < count($samples) - 1; $i++) {
                $v1 = $this->velocityAt($planet, $samples[$i + 1]);
                if ($v0 == 0.0 || $v1 == 0.0 || ($v0 > 0) === ($v1 > 0)) {
                    $v0 = $v1;
                    continue;
                }

                $exact = $this->bisect(
                    fn (\DateTimeImmutable $t) => $this->velocityAt($planet, $t),
                    $samples[$i],
                    $samples[$i + 1]
                );
                if ($exact !== null) {
                    $lon = $this->longitudeAt($planet, $exact);
                    $events[] = new SkyEvent(
                        type: $v0 > 0 ? SkyEvent::TYPE_RETROGRADE_START : SkyEvent::TYPE_RETROGRADE_END,
                        exactAt: $exact,
                        planet: $planet,
                        longitude: $lon,
                    );
                }
                $v0 = $v1;
            }
        }
        return $events;
    }

    // ── Lunations & eclipses ─────────────────────────────────────────────────

    /** @param \DateTimeImmutable[] $samples @return SkyEvent[] */
    private function detectLunations(array $samples): array
    {
        $events = [];
        for ($i = 0; $i < count($samples) - 1; $i++) {
            $t0 = $samples[$i];
            $t1 = $samples[$i + 1];

            $e0 = $this->normDeg($this->longitudeAt('Moon', $t0) - $this->longitudeAt('Sun', $t0));
            $e1 = $this->normDeg($this->longitudeAt('Moon', $t1) - $this->longitudeAt('Sun', $t1));

            // New moon: signed elongation (Moon−Sun) crosses 0. Both functions are
            // discontinuous at the *opposite* phase, so gate by proximity to the
            // target (elongation moves ~13°/day, so the crossing sample is close).
            $f = fn (\DateTimeImmutable $t) => $this->signedDelta(
                $this->longitudeAt('Moon', $t) - $this->longitudeAt('Sun', $t),
                0.0
            );
            // Full moon: signed elongation crosses ±180.
            $g = fn (\DateTimeImmutable $t) => $this->signedDelta(
                $this->normDeg($this->longitudeAt('Moon', $t) - $this->longitudeAt('Sun', $t)),
                180.0
            );

            $nearNew  = $this->circularDistance($e0, 0.0) < 25 && $this->circularDistance($e1, 0.0) < 25;
            $nearFull = $this->circularDistance($e0, 180.0) < 25 && $this->circularDistance($e1, 180.0) < 25;

            if ($nearNew && $this->brackets($f($t0), $f($t1))) {
                $exact = $this->bisect($f, $t0, $t1);
                if ($exact !== null) {
                    $events[] = $this->buildLunation($exact, true);
                }
            }
            if ($nearFull && $this->brackets($g($t0), $g($t1))) {
                $exact = $this->bisect($g, $t0, $t1);
                if ($exact !== null) {
                    $events[] = $this->buildLunation($exact, false);
                }
            }
        }
        return $events;
    }

    private function buildLunation(\DateTimeImmutable $exact, bool $isNew): SkyEvent
    {
        $moonLon = $this->longitudeAt('Moon', $exact);
        $nodeLon = $this->longitudeAt('NorthNode', $exact);
        $distNode = min(
            PlanetaryCalculator::separation($moonLon, $nodeLon),
            PlanetaryCalculator::separation($moonLon, $this->normDeg($nodeLon + 180)),
        );

        if ($isNew) {
            $isEclipse = $distNode <= self::SOLAR_ECLIPSE_LIMIT;
            $type = $isEclipse ? SkyEvent::TYPE_SOLAR_ECLIPSE : SkyEvent::TYPE_NEW_MOON;
        } else {
            $isEclipse = $distNode <= self::LUNAR_ECLIPSE_LIMIT;
            $type = $isEclipse ? SkyEvent::TYPE_LUNAR_ECLIPSE : SkyEvent::TYPE_FULL_MOON;
        }

        return new SkyEvent(
            type: $type,
            exactAt: $exact,
            planet: 'Moon',
            longitude: $moonLon,
            metadata: [
                'phase'         => $isNew ? 'new' : 'full',
                'nodeDistance'  => round($distNode, 2),
                'isEclipse'     => $isEclipse,
            ],
        );
    }

    // ── Major aspects between slow bodies ────────────────────────────────────

    /** @param \DateTimeImmutable[] $samples @return SkyEvent[] */
    private function detectAspects(array $samples): array
    {
        $events = [];
        $bodies = self::ASPECT_BODIES;
        for ($a = 0; $a < count($bodies); $a++) {
            for ($b = $a + 1; $b < count($bodies); $b++) {
                $pA = $bodies[$a];
                $pB = $bodies[$b];
                if (!in_array($pA, self::SLOW_BODIES, true) && !in_array($pB, self::SLOW_BODIES, true)) {
                    continue; // need at least one slow body
                }

                for ($i = 0; $i < count($samples) - 1; $i++) {
                    $t0 = $samples[$i];
                    $t1 = $samples[$i + 1];
                    $d0 = $this->signedDelta($this->longitudeAt($pA, $t0) - $this->longitudeAt($pB, $t0), 0.0);
                    $d1 = $this->signedDelta($this->longitudeAt($pA, $t1) - $this->longitudeAt($pB, $t1), 0.0);

                    foreach (self::ASPECTS as $angle => $name) {
                        $exact = $this->bracketAspect($pA, $pB, $angle, $d0, $d1, $t0, $t1);
                        if ($exact === null) {
                            continue;
                        }
                        $lonA = $this->longitudeAt($pA, $exact);
                        $lonB = $this->longitudeAt($pB, $exact);
                        $events[] = new SkyEvent(
                            type: SkyEvent::TYPE_ASPECT,
                            exactAt: $exact,
                            planet: $pA,
                            planet2: $pB,
                            aspectType: $name,
                            longitude: $lonA,
                            longitude2: $lonB,
                            metadata: ['angle' => $angle],
                        );
                    }
                }
            }
        }
        return $events;
    }

    /**
     * Bracket & solve one aspect angle for a pair, given the signed separation
     * (d = signedDelta(lonA−lonB)) at the two daily samples.
     */
    private function bracketAspect(
        string $pA,
        string $pB,
        int $angle,
        float $d0,
        float $d1,
        \DateTimeImmutable $t0,
        \DateTimeImmutable $t1,
    ): ?\DateTimeImmutable {
        $delta = fn (\DateTimeImmutable $t) => $this->signedDelta(
            $this->longitudeAt($pA, $t) - $this->longitudeAt($pB, $t),
            0.0
        );

        if ($angle === 0) {
            // Conjunction: d crosses 0 (short way round).
            if ($d0 * $d1 < 0 && abs($d0) < 20 && abs($d1) < 20) {
                return $this->bisect($delta, $t0, $t1);
            }
            return null;
        }

        if ($angle === 180) {
            // Opposition: d crosses ±180.
            $m = fn (\DateTimeImmutable $t) => $this->signedDelta($delta($t), 180.0);
            $m0 = $this->signedDelta($d0, 180.0);
            $m1 = $this->signedDelta($d1, 180.0);
            if ($m0 * $m1 < 0 && abs($d0) > 150 && abs($d1) > 150) {
                return $this->bisect($m, $t0, $t1);
            }
            return null;
        }

        // Sextile / square / trine: |d| crosses the target angle.
        $h  = fn (\DateTimeImmutable $t) => abs($delta($t)) - $angle;
        $h0 = abs($d0) - $angle;
        $h1 = abs($d1) - $angle;
        if ($h0 * $h1 < 0) {
            return $this->bisect($h, $t0, $t1);
        }
        return null;
    }

    // ── Ephemeris helpers ────────────────────────────────────────────────────

    /** Absolute ecliptic longitude (deg) of a body at $t (UTC). Cached. */
    private function longitudeAt(string $planet, \DateTimeImmutable $t): float
    {
        $key = $planet . '@' . $t->getTimestamp();
        if (isset($this->lonCache[$key])) {
            return $this->lonCache[$key];
        }

        $calc = new PlanetaryCalculator(
            $t->format('Y-m-d'),
            $t->format('H:i:s'),
            0.0,
            0.0,
            'sky'
        );

        $lon = $planet === 'NorthNode'
            ? $calc->getNorthNode()['longitude']
            : $calc->getPlanetLongitude($planet);

        return $this->lonCache[$key] = $this->normDeg($lon);
    }

    /** Apparent longitudinal velocity (deg/day) via central finite difference. */
    private function velocityAt(string $planet, \DateTimeImmutable $t): float
    {
        $h = 0.5; // half-day step
        $before = $this->longitudeAt($planet, $t->modify('-12 hours'));
        $after  = $this->longitudeAt($planet, $t->modify('+12 hours'));
        return $this->signedDelta($after, $before) / (2 * $h);
    }

    /**
     * Bisection root-finder on a function of time. Requires f(t0)·f(t1) ≤ 0.
     * Returns the crossing time (second precision) or null if not bracketed.
     */
    private function bisect(callable $f, \DateTimeImmutable $t0, \DateTimeImmutable $t1, int $iter = 40): ?\DateTimeImmutable
    {
        $lo = $t0->getTimestamp();
        $hi = $t1->getTimestamp();
        $flo = $f($t0);
        $fhi = $f($t1);
        if (!$this->brackets($flo, $fhi)) {
            return null;
        }

        $mid = $t0;
        for ($k = 0; $k < $iter && ($hi - $lo) > 1; $k++) {
            $m   = intdiv($lo + $hi, 2);
            $mid = (new \DateTimeImmutable('@' . $m))->setTimezone(new \DateTimeZone('UTC'));
            $fm  = $f($mid);
            if ($fm == 0.0) {
                return $mid;
            }
            if ($this->brackets($flo, $fm)) {
                $hi  = $m;
                $fhi = $fm;
            } else {
                $lo  = $m;
                $flo = $fm;
            }
        }
        return $mid;
    }

    /** True when the two values straddle (or touch) zero. */
    private function brackets(float $a, float $b): bool
    {
        return ($a <= 0 && $b >= 0) || ($a >= 0 && $b <= 0);
    }

    /** Smallest signed angular difference a−b, in (−180, 180]. */
    private function signedDelta(float $a, float $b): float
    {
        return fmod(fmod($a - $b, 360.0) + 540.0, 360.0) - 180.0;
    }

    /** Unsigned angular distance between two angles, in [0, 180]. */
    private function circularDistance(float $a, float $b): float
    {
        return abs($this->signedDelta($a, $b));
    }

    private function normDeg(float $deg): float
    {
        return fmod(fmod($deg, 360.0) + 360.0, 360.0);
    }
}
