<?php

namespace App\Service\Astro;

use App\Service\PlanetaryCalculator;

/**
 * Deterministic Moon sign + phase for a given instant.
 *
 * Drives the "humeur du jour" lookup: the day's (signIndex, phase) is computed
 * here from the home ephemeris, then used as a pure key into the cached
 * {@see \App\Entity\MoodCorpus}. No LLM, no I/O.
 *
 * Phase taxonomy = 8 eighths of the synodic cycle, keyed on the Sun–Moon
 * elongation, matching {@see \App\Entity\MoodCorpus::PHASES}.
 */
final class MoonPhase
{
    /**
     * @return array{signIndex:int, signFr:string, phaseIndex:int, phase:string, elongation:float}
     */
    public static function at(\DateTimeInterface $when): array
    {
        $utc = (new \DateTimeImmutable('@' . $when->getTimestamp()))->setTimezone(new \DateTimeZone('UTC'));
        $calc = new PlanetaryCalculator($utc->format('Y-m-d'), $utc->format('H:i:s'), 0.0, 0.0, 'mood');

        $moonLon = $calc->getPlanetLongitude('Moon');
        $sunLon  = $calc->getPlanetLongitude('Sun');

        $elong = fmod(fmod($moonLon - $sunLon, 360.0) + 360.0, 360.0);
        $signIndex  = (int) floor(fmod($moonLon + 360.0, 360.0) / 30.0) % 12;
        $phaseIndex = self::phaseIndex($elong);

        return [
            'signIndex'  => $signIndex,
            'signFr'     => PlanetaryCalculator::SIGNS_FR[$signIndex],
            'phaseIndex' => $phaseIndex,
            'phase'      => \App\Entity\MoodCorpus::PHASES[$phaseIndex],
            'elongation' => round($elong, 2),
        ];
    }

    /** Map a Sun–Moon elongation (0..360) to a phase index 0..7. */
    public static function phaseIndex(float $elongation): int
    {
        $e = fmod(fmod($elongation, 360.0) + 360.0, 360.0);
        return (int) floor(fmod($e + 22.5, 360.0) / 45.0) % 8;
    }
}
