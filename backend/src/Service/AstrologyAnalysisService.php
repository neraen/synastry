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

        $formattedAspects = $this->formatMajorAspects($aspects);

        // Build a dedicated slow-planet aspects list (no top-10 cap) with real date windows.
        // This is used by the transits prompt to find significant slow-on-fast transits.
        $slowTransitPlanets = ['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
        $fastNatalPlanets   = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Ascendant'];
        $majorAspectTypes   = ['conjunction', 'opposition', 'trine', 'square'];

        $slowAspects = [];
        foreach ($aspects as $rawAspect) {
            $transitPlanet = $rawAspect['planet_b'];
            $natalPlanet   = $rawAspect['planet_a'];
            $aspectType    = $rawAspect['type'];

            if (!in_array($transitPlanet, $slowTransitPlanets, true)) continue;
            if (!in_array($natalPlanet, $fastNatalPlanets, true)) continue;
            if (!in_array($aspectType, $majorAspectTypes, true)) continue;
            if ($rawAspect['orb'] >= 8) continue;  // skip very loose aspects

            $range = $this->computeTransitDateRange(
                $natalCalculator, $transitPlanet, $natalPlanet, $aspectType
            );

            $slowAspects[] = [
                'natal_planet'   => $natalPlanet,
                'transit_planet' => $transitPlanet,
                'aspect'         => $rawAspect['name'],
                'aspect_type'    => $aspectType,
                'orb'            => $rawAspect['orb'],
                'start_date'     => $range['start'],
                'end_date'       => $range['end'],
            ];
        }

        return [
            'sun_sign'         => $sunSign,
            'moon_sign'        => $moonSign,
            'ascendant'        => $ascendant,
            'natal_planets'    => $natalPositions,
            'current_transits' => $transitPositions,
            'major_aspects'    => $formattedAspects,
            'slow_aspects'     => $slowAspects,
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
     * Scan backward and forward from today to find the real date window
     * during which a transit aspect stays within orb.
     *
     * @return array{start: string, end: string}  YYYY-MM-DD strings
     */
    private function computeTransitDateRange(
        PlanetaryCalculator $natalCalc,
        string $transitPlanet,
        string $natalPlanet,
        string $aspectType
    ): array {
        $aspectDef = PlanetaryCalculator::ASPECTS[$aspectType] ?? null;
        if ($aspectDef === null) {
            $today = (new \DateTime('now', new \DateTimeZone('UTC')))->format('Y-m-d');
            return ['start' => $today, 'end' => $today];
        }

        [$targetAngle, $maxOrb] = $aspectDef;

        // Natal planet longitude is fixed
        $natalLon = $natalCalc->getPlanetLongitude($natalPlanet);

        // Check whether a given date is still within orb
        $isInOrb = function (string $dateStr) use ($transitPlanet, $natalLon, $targetAngle, $maxOrb): bool {
            $calc = new PlanetaryCalculator($dateStr, '12:00', 0.0, 0.0, 'T');
            $transitLon = $calc->getPlanetLongitude($transitPlanet);
            $diff = abs($transitLon - $natalLon);
            if ($diff > 180) $diff = 360 - $diff;
            return abs($diff - $targetAngle) <= $maxOrb;
        };

        $today = new \DateTime('now', new \DateTimeZone('UTC'));
        $startDate = clone $today;
        $endDate   = clone $today;

        // Scan backward (max 400 days)
        for ($i = 1; $i <= 400; $i++) {
            $date = (clone $today)->modify("-{$i} days");
            if (!$isInOrb($date->format('Y-m-d'))) break;
            $startDate = $date;
        }

        // Scan forward (max 400 days)
        for ($i = 1; $i <= 400; $i++) {
            $date = (clone $today)->modify("+{$i} days");
            if (!$isInOrb($date->format('Y-m-d'))) break;
            $endDate = $date;
        }

        return [
            'start' => $startDate->format('Y-m-d'),
            'end'   => $endDate->format('Y-m-d'),
        ];
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
                'natal_planet'   => $aspect['planet_a'],
                'transit_planet' => $aspect['planet_b'],
                'aspect'         => $aspect['name'],
                'aspect_type'    => $aspect['type'],  // machine key: trine, square, etc.
                'orb'            => $aspect['orb'],
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
     * Compute major transit aspects for the next N months (snapshot on the 1st of each month).
     * Only slow-moving planets are included — these are the ones relevant for a 6–12 month forecast.
     * Fast planets (Moon, Mercury, Venus, Sun) create aspects lasting days; useless at this horizon.
     *
     * Returns a compact array suitable for caching and injecting into the chat prompt:
     * [
     *   ['month' => '2026-05', 'aspects' => [['transit' => 'Saturn', 'natal' => 'Moon', 'type' => 'square', 'orb' => 2.3], ...]],
     *   ...
     * ]
     */
    public function getUpcomingTransitSummary(User $user, int $months = 12): array
    {
        $birthProfile = $user->getBirthProfile();
        if (!$birthProfile) {
            return [];
        }

        // Only slow planets matter at a 6–12 month horizon
        $slowPlanets = ['Saturn', 'Jupiter', 'Uranus', 'Neptune', 'Pluto', 'Mars'];

        $natalCalculator = $this->createCalculatorFromProfile($birthProfile);
        $result = [];
        $now = new \DateTime('now', new \DateTimeZone('UTC'));

        for ($i = 1; $i <= $months; $i++) {
            $date = (clone $now)->modify("+{$i} months");
            $monthKey = $date->format('Y-m');
            $dateStr  = $date->format('Y-m-01'); // 1st of the month at noon UTC

            $transitCalculator = new PlanetaryCalculator($dateStr, '12:00', 0.0, 0.0, 'Transits');
            $aspects = $natalCalculator->getSynastryAspects($transitCalculator);

            // Keep only major aspects from slow transit planets with tight orb
            $filtered = array_values(array_filter($aspects, function (array $a) use ($slowPlanets): bool {
                return in_array($a['planet_b'], $slowPlanets, true)
                    && $a['type'] !== 'quincunx'
                    && $a['orb'] < 4.0;
            }));

            // Sort by orb (most exact first), cap at 5 per month to keep the prompt compact
            usort($filtered, fn($a, $b) => $a['orb'] <=> $b['orb']);
            $filtered = array_slice($filtered, 0, 5);

            if (!empty($filtered)) {
                $result[] = [
                    'month'   => $monthKey,
                    'aspects' => array_map(fn($a) => [
                        'transit' => $a['planet_b'],
                        'natal'   => $a['planet_a'],
                        'type'    => $a['name'],   // human-readable: "Trine", "Square", etc.
                        'orb'     => round($a['orb'], 1),
                    ], $filtered),
                ];
            }
        }

        return $result;
    }

    /**
     * Return raw planetary positions (sign + degree) for a given number of days from now.
     * Used by AI tool calls to answer questions like "where is the Moon tomorrow?".
     * Planet and sign names are French, matching Lyra's no-English rule.
     */
    public function getPlanetPositionsForDate(int $daysFromNow): array
    {
        $date = (new \DateTime('now', new \DateTimeZone('UTC')))->modify("{$daysFromNow} days");
        $calc = new PlanetaryCalculator($date->format('Y-m-d'), '12:00', 0.0, 0.0, 'Sky');
        $positions = $calc->getPlanetaryPositionsForApi();

        $result = [];
        foreach ($positions as $planet => $data) {
            if (in_array($planet, ['Ascendant', 'MC', 'Midheaven'], true)) continue;
            $sign = $data['Sign'] ?? '';
            $signIdx = array_search($sign, PlanetaryCalculator::SIGNS, true);
            $planetFr = PlanetaryCalculator::PLANETS_FR[$planet] ?? $planet;
            $result[$planetFr] = [
                'signe'      => $signIdx !== false ? PlanetaryCalculator::SIGNS_FR[$signIdx] : $sign,
                'degre'      => round((float) ($data['Position'] ?? 0) % 30, 1),
                'retrograde' => ($data['Retrograde'] ?? 'No') === 'Yes',
            ];
        }

        return [
            'date'      => $date->format('Y-m-d'),
            'positions' => $result,
        ];
    }

    /**
     * Compute major transit aspects for a specific month in the future (or past).
     * Used by AI tool calls to query specific time periods.
     */
    public function getTransitsForSpecificMonth(User $user, int $monthsFromNow): array
    {
        $birthProfile = $user->getBirthProfile();
        if (!$birthProfile) {
            return [];
        }

        $slowPlanets = ['Saturn', 'Jupiter', 'Uranus', 'Neptune', 'Pluto', 'Mars'];
        $natalCalculator = $this->createCalculatorFromProfile($birthProfile);
        $now = new \DateTime('now', new \DateTimeZone('UTC'));

        $modifier = $monthsFromNow >= 0 ? "+{$monthsFromNow} months" : "{$monthsFromNow} months";
        $date = (clone $now)->modify($modifier);
        $monthKey = $date->format('Y-m');
        $dateStr  = $date->format('Y-m-01'); // 1st of the month at noon UTC

        $transitCalculator = new PlanetaryCalculator($dateStr, '12:00', 0.0, 0.0, 'Transits');
        $aspects = $natalCalculator->getSynastryAspects($transitCalculator);

        $filtered = array_values(array_filter($aspects, function (array $a) use ($slowPlanets): bool {
            return in_array($a['planet_b'], $slowPlanets, true)
                && $a['type'] !== 'quincunx'
                && $a['orb'] < 4.0;
        }));

        usort($filtered, fn($a, $b) => $a['orb'] <=> $b['orb']);
        $filtered = array_slice($filtered, 0, 5);

        return [
            'month'   => $monthKey,
            'aspects' => array_map(fn($a) => [
                'transit' => $a['planet_b'],
                'natal'   => $a['planet_a'],
                'type'    => $a['name'],
                'orb'     => round($a['orb'], 1),
            ], $filtered),
        ];
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
