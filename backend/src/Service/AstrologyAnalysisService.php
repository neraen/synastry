<?php

namespace App\Service;

use App\Entity\BirthProfile;
use App\Entity\User;

/**
 * Service for preparing astrological data for AI analysis
 */
class AstrologyAnalysisService
{
    /**
     * Prepare horoscope data for OpenAI prompt
     *
     * @return array Contains sun_sign, moon_sign, ascendant, natal_planets, current_transits, major_aspects
     */
    public function prepareHoroscopeData(User $user): array
    {
        $birthProfile = $user->getBirthProfile();

        if (!$birthProfile) {
            throw new \RuntimeException('User has no birth profile');
        }

        // Calculate natal chart
        $natalCalculator = $this->createCalculatorFromProfile($birthProfile);
        $natalPositions = $natalCalculator->getPlanetaryPositionsForApi();

        // Calculate current transits (today's planetary positions)
        $transitsCalculator = $this->createTransitsCalculator();
        $transitPositions = $transitsCalculator->getPlanetaryPositionsForApi();

        // Calculate aspects between natal and transits
        $aspects = $natalCalculator->getSynastryAspects($transitsCalculator);

        // Extract key data
        $sunSign = $natalPositions['Sun']['Sign'] ?? 'Unknown';
        $moonSign = $natalPositions['Moon']['Sign'] ?? 'Unknown';
        $ascendant = $natalPositions['Ascendant']['Sign'] ?? 'Unknown';

        return [
            'sun_sign' => $sunSign,
            'moon_sign' => $moonSign,
            'ascendant' => $ascendant,
            'natal_planets' => $natalPositions,
            'current_transits' => $transitPositions,
            'major_aspects' => $this->formatMajorAspects($aspects),
        ];
    }

    /**
     * Public wrapper — allows other services (e.g. MirrorService) to build a
     * natal PlanetaryCalculator without duplicating the UTC-conversion logic.
     */
    public function createCalculatorFromBirthProfile(BirthProfile $profile): PlanetaryCalculator
    {
        return $this->createCalculatorFromProfile($profile);
    }

    /**
     * Create PlanetaryCalculator from BirthProfile
     * Converts local birth time to UTC using the timezone offset
     */
    private function createCalculatorFromProfile(BirthProfile $profile): PlanetaryCalculator
    {
        $birthDate = $profile->getBirthDate();
        $birthTime = $profile->getBirthTime();
        $timezone = $profile->getTimezone();

        // Combine date and time into a DateTime object
        $dateStr = $birthDate->format('Y-m-d');
        $timeStr = $birthTime ? $birthTime->format('H:i:s') : '12:00:00';

        // Create DateTime with local time
        $localDateTime = new \DateTime("$dateStr $timeStr");

        // Convert to UTC by subtracting the timezone offset
        // Timezone is stored as hours offset (e.g., 1.0 for UTC+1, 2.0 for UTC+2)
        if ($timezone !== null) {
            $offsetHours = (float) $timezone;
            // Convert offset to minutes (handles fractional hours like 5.5 for UTC+5:30)
            $offsetMinutes = (int) ($offsetHours * 60);
            // Subtract the offset to get UTC (local - offset = UTC)
            $localDateTime->modify("-{$offsetMinutes} minutes");
        }

        // Extract UTC date and time
        $utcDate = $localDateTime->format('Y-m-d');
        $utcTime = $localDateTime->format('H:i');

        return new PlanetaryCalculator(
            $utcDate,
            $utcTime,
            (float) $profile->getLatitude(),
            (float) $profile->getLongitude(),
            $profile->getFirstName() ?? 'Personne'
        );
    }

    /**
     * Create a PlanetaryCalculator for current transits (now, UTC)
     */
    private function createTransitsCalculator(): PlanetaryCalculator
    {
        $now = new \DateTime('now', new \DateTimeZone('UTC'));

        return new PlanetaryCalculator(
            $now->format('Y-m-d'),
            $now->format('H:i'),
            0.0, // Latitude doesn't matter for planetary positions
            0.0, // Longitude doesn't matter for planetary positions
            'Transits'
        );
    }

    /**
     * Format major aspects for the prompt
     * Only keep the most significant aspects (low orb)
     */
    private function formatMajorAspects(array $aspects): array
    {
        // Filter to aspects with orb < 5 degrees for more precision
        $significantAspects = array_filter($aspects, function ($aspect) {
            return $aspect['orb'] < 5;
        });

        // Take only top 10 most exact aspects
        $significantAspects = array_slice($significantAspects, 0, 10);

        return array_map(function ($aspect) {
            return [
                'natal_planet' => $aspect['planet_a'],
                'transit_planet' => $aspect['planet_b'],
                'aspect' => $aspect['name'],
                'orb' => $aspect['orb'],
            ];
        }, $significantAspects);
    }

    /**
     * Get transit aspects for each day of a given month
     *
     * @return array Map of 'YYYY-MM-DD' => aspect[]
     */
    public function getCalendarAspects(User $user, int $year, int $month): array
    {
        $birthProfile = $user->getBirthProfile();

        if (!$birthProfile) {
            throw new \RuntimeException('User has no birth profile');
        }

        // Slow planets transit weight (lower = shown first)
        $planetWeight = [
            'Saturn'  => 1, 'Neptune' => 1, 'Uranus'  => 1,
            'Pluto'   => 1, 'Jupiter' => 2,
            'Mars'    => 3, 'Sun'     => 4, 'Venus'   => 4,
            'Mercury' => 5, 'Moon'    => 6,
        ];

        $natalCalculator = $this->createCalculatorFromProfile($birthProfile);
        $daysInMonth = (int) (new \DateTime(sprintf('%04d-%02d-01', $year, $month)))->format('t');
        $days = [];

        for ($day = 1; $day <= $daysInMonth; $day++) {
            $date = sprintf('%04d-%02d-%02d', $year, $month, $day);
            $transitCalculator = new PlanetaryCalculator($date, '12:00', 0.0, 0.0, 'Transits');

            $aspects = $natalCalculator->getSynastryAspects($transitCalculator);

            // Filter: only major aspects with tight orb
            $filtered = array_values(array_filter($aspects, function ($a) {
                return $a['type'] !== 'quincunx' && $a['orb'] < 5.0;
            }));

            // Sort: slow transit planets first, then by orb (most exact)
            usort($filtered, function ($a, $b) use ($planetWeight) {
                $wa = $planetWeight[$a['planet_b']] ?? 7;
                $wb = $planetWeight[$b['planet_b']] ?? 7;
                if ($wa !== $wb) return $wa <=> $wb;
                return $a['orb'] <=> $b['orb'];
            });

            $days[$date] = array_values(array_map(function ($a) {
                return [
                    'transit_planet' => $a['planet_b'],
                    'natal_planet'   => $a['planet_a'],
                    'aspect_type'    => $a['type'],
                    'aspect_name'    => $a['name'],
                    'symbol'         => $a['symbol'],
                    'orb'            => $a['orb'],
                ];
            }, $filtered));
        }

        return $days;
    }

    /**
     * Build a compact JSON representation of natal data for storage
     */
    public function buildNatalDataJson(array $natalPositions): array
    {
        $compact = [];
        foreach ($natalPositions as $planet => $data) {
            $compact[$planet] = [
                'sign' => $data['Sign'],
                'position' => round($data['Position'], 2),
            ];
        }
        return $compact;
    }

    /**
     * Build a compact JSON representation of transits data for storage
     */
    public function buildTransitsDataJson(array $transitPositions): array
    {
        $compact = [];
        foreach ($transitPositions as $planet => $data) {
            $compact[$planet] = [
                'sign' => $data['Sign'],
                'position' => round($data['Position'], 2),
                'retrograde' => $data['Retrograde'] === 'Yes',
            ];
        }
        return $compact;
    }
}
