<?php

namespace App\Service;

use App\Entity\User;
use App\Repository\NatalTransitCacheRepository;
use App\Service\Webservice\OpenAiService;

/**
 * Business logic for the "Miroir Temporel" (Temporal Mirror) feature.
 */
class MirrorService
{
    /**
     * Slow (outer) transit planets that carry lasting impact.
     */
    private const SLOW_PLANETS = ['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];

    /**
     * Fast (personal) natal planets + Ascendant that respond to slow transits.
     */
    private const FAST_PLANETS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Ascendant'];
    public function __construct(
        private AspectsCalculator $aspectsCalculator,
        private AstrologyAnalysisService $analysisService,
        private OpenAiService $openAiService,
        private NatalTransitCacheRepository $cacheRepository,
    ) {}

    /**
     * Return current age of the user in full years.
     */
    public function getCurrentAge(User $user): int
    {
        $birthDate = $user->getBirthProfile()?->getBirthDate();
        if (!$birthDate) {
            return 30;
        }

        return (int)(new \DateTime())->diff($birthDate)->y;
    }

    /**
     * Compute the unlocked age ranges for a free user.
     * Free: ages 0–10 and [currentAge - 5, currentAge + 5].
     *
     * @return array{min: int, max: int}[]
     */
    public function getUnlockedRanges(User $user): array
    {
        $currentAge = $this->getCurrentAge($user);

        return [
            ['min' => 0,                          'max' => 10],
            ['min' => max(0, $currentAge - 5),    'max' => min(80, $currentAge + 5)],
        ];
    }

    /**
     * Returns true when a free user can access the given age.
     */
    public function isAgeUnlocked(User $user, int $age): bool
    {
        if ($user->isPremium()) {
            return true;
        }

        foreach ($this->getUnlockedRanges($user) as $range) {
            if ($age >= $range['min'] && $age <= $range['max']) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get transit data for a given age: positions + aspects + global intensity.
     */
    public function getTransits(User $user, int $age): array
    {
        $birthProfile = $user->getBirthProfile();
        $birthDate = $birthProfile->getBirthDate();
        $targetDate = (clone $birthDate)->modify(sprintf('+%d days', (int)($age * 365.25)));

        // Try the pre-calculated cache first
        $cached = $this->cacheRepository->findByUserAndAge($user, $age);

        if ($cached) {
            $transitPositions = $cached->getPlanetPositions();
        } else {
            $transitCalc = new PlanetaryCalculator(
                $targetDate->format('Y-m-d'),
                '12:00',
                0.0,
                0.0,
                'Transit'
            );
            $transitPositions = $transitCalc->getPlanetaryPositionsForApi();
        }

        // Natal positions
        $natalCalc = $this->analysisService->createCalculatorFromBirthProfile($birthProfile);
        $natalPositions = $natalCalc->getPlanetaryPositionsForApi();

        // Aspect detection — keep only high-impact aspects (slow transit → fast natal)
        $aspects = $this->filterImpactfulAspects(
            $this->aspectsCalculator->detectAspects($natalPositions, $transitPositions)
        );

        // Global intensity = average of top 5 most exact aspects
        $topAspects = array_slice($aspects, 0, 5);
        $globalIntensity = count($topAspects) > 0
            ? round(array_sum(array_column($topAspects, 'intensity')) / count($topAspects), 2)
            : 0.0;

        return [
            'success'           => true,
            'age'               => $age,
            'target_date'       => $targetDate->format('Y-m-d'),
            'target_year'       => (int)$targetDate->format('Y'),
            'natal_positions'   => $natalPositions,
            'transit_positions' => $transitPositions,
            'aspects'           => $aspects,
            'global_intensity'  => $globalIntensity,
        ];
    }

    /**
     * Generate an AI interpretation of the planetary energy at a given age.
     */
    public function getInterpretation(User $user, int $age, ?string $pinnedEvent = null): array
    {
        // Build natal summary
        try {
            $horoscopeData = $this->analysisService->prepareHoroscopeData($user);
        } catch (\RuntimeException $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }

        $natalSummary = sprintf(
            'Soleil en %s, Lune en %s, Ascendant %s',
            $horoscopeData['sun_sign'],
            $horoscopeData['moon_sign'],
            $horoscopeData['ascendant']
        );

        // Compute target date & year
        $birthDate = $user->getBirthProfile()->getBirthDate();
        $targetDate = (clone $birthDate)->modify(sprintf('+%d days', (int)($age * 365.25)));
        $targetYear = (int)$targetDate->format('Y');

        // Compute active aspects
        $transitCalc = new PlanetaryCalculator(
            $targetDate->format('Y-m-d'),
            '12:00',
            0.0,
            0.0,
            'Transit'
        );
        $natalCalc = $this->analysisService->createCalculatorFromBirthProfile($user->getBirthProfile());

        $aspects = $this->filterImpactfulAspects($this->aspectsCalculator->detectAspects(
            $natalCalc->getPlanetaryPositionsForApi(),
            $transitCalc->getPlanetaryPositionsForApi()
        ));

        // Format top 5 aspects as a readable string
        $topAspects = array_slice($aspects, 0, 5);
        $aspectTexts = array_map(
            fn($a) => sprintf('%s %s natal %s (%.1f°)', $a['transit_planet'], $a['aspect_type'], $a['natal_planet'], $a['orb_exact']),
            $topAspects
        );
        $activeAspects = $aspectTexts ? implode(', ', $aspectTexts) : 'aucun aspect majeur';

        return $this->openAiService->getMirrorInterpretation(
            $natalSummary,
            $age,
            $targetYear,
            $activeAspects,
            $pinnedEvent
        );
    }

    /**
     * Keep only high-impact aspects: slow transit planet aspecting a fast/personal natal planet (or ASC).
     */
    private function filterImpactfulAspects(array $aspects): array
    {
        return array_values(array_filter(
            $aspects,
            fn(array $a) =>
                in_array($a['transit_planet'], self::SLOW_PLANETS, true) &&
                in_array($a['natal_planet'], self::FAST_PLANETS, true)
        ));
    }
}