<?php

namespace App\Service;

use App\Entity\BirthProfile;
use App\Entity\NatalChart;
use App\Entity\SynastryHistory;
use App\Entity\User;
use App\Repository\NatalChartRepository;
use App\Repository\SynastryHistoryRepository;
use App\Service\Webservice\OpenAiService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Contracts\Cache\CacheInterface;
use Symfony\Contracts\Cache\ItemInterface;

class AstrologyService
{
    private string $locale = 'fr';

    /** 90 days — natal positions never change unless birth profile is updated */
    private const PLANET_INTERP_TTL = 7776000;

    public function __construct(
        private OpenAiService $openAiService,
        private NatalChartRepository $natalChartRepository,
        private SynastryHistoryRepository $synastryHistoryRepository,
        private EntityManagerInterface $entityManager,
        private CacheInterface $cache,
    ) {}

    /**
     * Set the locale for AI prompts
     */
    public function setLocale(string $locale): self
    {
        $localeService = new PromptLocaleService();
        $this->locale = $localeService->normalizeLocale($locale);
        $this->openAiService->setLocale($this->locale);
        return $this;
    }

    /**
     * Get the current locale
     */
    public function getLocale(): string
    {
        return $this->locale;
    }

    /**
     * Calculate and store natal chart for a user
     */
    public function calculateNatalChart(User $user, bool $forceRecalculate = false): array
    {
        $birthProfile = $user->getBirthProfile();

        if (!$birthProfile) {
            return [
                'success' => false,
                'error' => 'No birth profile found for this user',
            ];
        }

        // Check if we already have a chart
        $existingChart = $this->natalChartRepository->findByBirthProfile($birthProfile);

        if ($existingChart && !$forceRecalculate) {
            return [
                'success' => true,
                'chart' => $existingChart->toArray(),
                'cached' => true,
            ];
        }

        // Calculate planetary positions using PlanetaryCalculator
        try {
            $calculator = $this->createCalculatorFromProfile($birthProfile);
            $positions = $calculator->getPlanetaryPositionsForApi();
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => 'Calculation error: ' . $e->getMessage(),
            ];
        }

        // Create or update natal chart
        $chart = $existingChart ?? new NatalChart();
        $chart->setUser($user);
        $chart->setBirthProfile($birthProfile);
        $chart->setPlanetaryPositions($positions);
        $chart->setCalculatedAt(new \DateTime());

        $this->entityManager->persist($chart);
        $this->entityManager->flush();

        return [
            'success' => true,
            'chart' => $chart->toArray(),
            'cached' => false,
        ];
    }

    /**
     * Get natal chart interpretation using AI
     */
    public function getNatalChartInterpretation(User $user): array
    {
        $chartResult = $this->calculateNatalChart($user);

        if (!$chartResult['success']) {
            return $chartResult;
        }

        $chart = $this->natalChartRepository->findByUser($user);

        // If we already have an interpretation, return it
        if ($chart && $chart->getInterpretation()) {
            return [
                'success' => true,
                'interpretation' => $chart->getInterpretation(),
                'chart' => $chart->toArray(),
                'cached' => true,
            ];
        }

        // Get AI interpretation
        $birthProfile = $user->getBirthProfile();
        $name = $birthProfile->getFirstName() ?? 'l\'utilisateur';

        $aiResult = $this->openAiService->getNatalChartInterpretation(
            $name,
            $chartResult['chart']['planetaryPositions']
        );

        if (!$aiResult['success']) {
            return $aiResult;
        }

        // Store interpretation
        if ($chart) {
            $chart->setInterpretation($aiResult['interpretation']);
            $this->entityManager->flush();
        }

        return [
            'success' => true,
            'interpretation' => $aiResult['interpretation'],
            'chart' => $chart?->toArray(),
            'cached' => false,
        ];
    }

    /**
     * Get AI explanation for a single natal planet placement.
     * Cached 90 days — natal positions don't change.
     * Cache key includes sign so it auto-invalidates if birth data changes.
     */
    public function getPlanetInterpretation(User $user, string $planet): array
    {
        $chart = $this->natalChartRepository->findByUser($user);

        if (!$chart) {
            return ['success' => false, 'error' => 'Natal chart not calculated yet'];
        }

        $positions = $chart->getPlanetaryPositions();

        if (!isset($positions[$planet])) {
            return ['success' => false, 'error' => "Planet '{$planet}' not found in chart"];
        }

        $sign   = $positions[$planet]['Sign'] ?? 'Unknown';
        $degree = (float) ($positions[$planet]['Position'] ?? 0.0);
        // Degree within sign (0–30)
        $degreeInSign = fmod($degree, 30);

        $safeLocale = preg_replace('/[^a-z]/', '', $this->locale);
        $safePlanet = preg_replace('/[^a-zA-Z]/', '', $planet);
        $safeSign   = preg_replace('/[^a-zA-Z]/', '', $sign);
        $cacheKey   = sprintf('planet_interp_%d_%s_%s_%s', $user->getId(), $safePlanet, $safeSign, $safeLocale);

        $interpretation = $this->cache->get($cacheKey, function (ItemInterface $item) use ($planet, $sign, $degreeInSign) {
            $item->expiresAfter(self::PLANET_INTERP_TTL);
            $result = $this->openAiService->getPlanetInterpretation($planet, $sign, $degreeInSign);
            if (!$result['success']) {
                $item->expiresAfter(0); // don't cache failures
                return null;
            }
            return $result['interpretation'];
        });

        if ($interpretation === null) {
            return ['success' => false, 'error' => 'AI interpretation failed'];
        }

        return [
            'success'        => true,
            'planet'         => $planet,
            'sign'           => $sign,
            'degree'         => round($degreeInSign, 1),
            'interpretation' => $interpretation,
        ];
    }

    /**
     * Calculate synastry between two users
     */
    public function calculateSynastry(User $user1, User $user2, ?string $question = null): array
    {
        $profile1 = $user1->getBirthProfile();
        $profile2 = $user2->getBirthProfile();

        if (!$profile1 || !$profile2) {
            return [
                'success' => false,
                'error' => 'Both users must have birth profiles',
            ];
        }

        try {
            $calc1 = $this->createCalculatorFromProfile($profile1);
            $calc2 = $this->createCalculatorFromProfile($profile2);

            // Build the compatibility prompt with aspects and locale
            $prompt = $calc1->buildCompatibilityPrompt($calc2, $question, $this->locale);

            // Get AI analysis
            $aiResult = $this->openAiService->getCompatibilityAnalysis($prompt);

            if (!$aiResult['success']) {
                return $aiResult;
            }

            return [
                'success' => true,
                'user1' => [
                    'name' => $calc1->getName(),
                    'chart' => ['planetaryPositions' => $calc1->getPlanetaryPositionsForApi()],
                ],
                'user2' => [
                    'name' => $calc2->getName(),
                    'chart' => ['planetaryPositions' => $calc2->getPlanetaryPositionsForApi()],
                ],
                'analysis' => $aiResult['analysis'],
                'compatibilityScore' => $aiResult['compatibilityScore'] ?? null,
                'details' => $aiResult['details'] ?? null,
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => 'Calculation error: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Calculate synastry with external birth data (for non-registered partner)
     */
    public function calculateSynastryWithExternal(
        User $user,
        string $partnerName,
        array $partnerBirthData,
        ?string $question = null
    ): array {
        $userProfile = $user->getBirthProfile();

        if (!$userProfile) {
            return [
                'success' => false,
                'error' => 'User must have a birth profile',
            ];
        }

        try {
            // Create calculator for user
            $userCalc = $this->createCalculatorFromProfile($userProfile);

            // Create calculator for partner (with timezone conversion to UTC)
            $partnerDate = sprintf(
                '%04d-%02d-%02d',
                $partnerBirthData['year'],
                $partnerBirthData['month'],
                $partnerBirthData['day']
            );
            $partnerTime = sprintf(
                '%02d:%02d:00',
                $partnerBirthData['hours'] ?? 12,
                $partnerBirthData['minutes'] ?? 0
            );

            // Create DateTime with local time and convert to UTC
            $partnerDateTime = new \DateTime("$partnerDate $partnerTime");

            // If timezoneName is provided, recalculate DST-correct offset on the server
            // (same approach as BirthProfileController for the user's own natal chart)
            $partnerTimezoneName = $partnerBirthData['timezoneName'] ?? null;
            $partnerBirthDateObj = $partnerBirthData['birthDate'] ?? null; // \DateTime

            if ($partnerTimezoneName && $partnerBirthDateObj instanceof \DateTimeInterface) {
                $tz = new \DateTimeZone($partnerTimezoneName);
                $tzRef = new \DateTime($partnerBirthDateObj->format('Y-m-d') . ' 12:00:00', $tz);
                $offsetSeconds = $tz->getOffset($tzRef);
                $partnerTimezone = $offsetSeconds / 3600;
            } else {
                $partnerTimezone = $partnerBirthData['timezone'] ?? null;
            }

            if ($partnerTimezone !== null) {
                $offsetMinutes = (int) ((float) $partnerTimezone * 60);
                $partnerDateTime->modify("-{$offsetMinutes} minutes");
            }

            $partnerCalc = new PlanetaryCalculator(
                $partnerDateTime->format('Y-m-d'),
                $partnerDateTime->format('H:i'),
                (float) $partnerBirthData['latitude'],
                (float) $partnerBirthData['longitude'],
                $partnerName
            );

            // Build the compatibility prompt with aspects and locale
            $prompt = $userCalc->buildCompatibilityPrompt($partnerCalc, $question, $this->locale);

            // Get AI analysis
            $aiResult = $this->openAiService->getCompatibilityAnalysis($prompt);

            if (!$aiResult['success']) {
                return $aiResult;
            }

            $userName = $userProfile->getFirstName() ?? ($this->locale === 'en' ? 'You' : 'Vous');
            $userPositions = $userCalc->getPlanetaryPositionsForApi();
            $partnerPositions = $partnerCalc->getPlanetaryPositionsForApi();

            // Save to history
            $history = new SynastryHistory();
            $history->setUser($user);
            $history->setPartnerName($partnerName);
            $history->setPartnerBirthData($partnerBirthData);
            $history->setAnalysis($aiResult['analysis']);
            $history->setCompatibilityScore($aiResult['compatibilityScore'] ?? null);
            $history->setCompatibilityDetails($aiResult['details'] ?? null);
            $history->setUserPositions($userPositions);
            $history->setPartnerPositions($partnerPositions);
            $history->setQuestion($question);

            $this->entityManager->persist($history);
            $this->entityManager->flush();

            return [
                'success' => true,
                'historyId' => $history->getId(),
                'user' => [
                    'name' => $userName,
                    'chart' => ['planetaryPositions' => $userPositions],
                ],
                'partner' => [
                    'name' => $partnerName,
                    'positions' => $partnerPositions,
                ],
                'analysis' => $aiResult['analysis'],
                'compatibilityScore' => $aiResult['compatibilityScore'] ?? null,
                'compatibilityDetails' => $aiResult['details'] ?? null,
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => 'Calculation error: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Get synastry history for a user
     */
    public function getSynastryHistory(User $user, int $limit = 50): array
    {
        $histories = $this->synastryHistoryRepository->findByUser($user, $limit);

        return [
            'success' => true,
            'histories' => array_map(fn($h) => $h->toSummary(), $histories),
            'count' => count($histories),
        ];
    }

    /**
     * Get a specific synastry history entry
     */
    public function getSynastryHistoryDetail(User $user, int $historyId): array
    {
        $history = $this->synastryHistoryRepository->findOneByUserAndId($user, $historyId);

        if (!$history) {
            return [
                'success' => false,
                'error' => 'History entry not found',
            ];
        }

        return [
            'success' => true,
            'history' => $history->toArray(),
        ];
    }

    /**
     * Delete a synastry history entry
     */
    public function deleteSynastryHistory(User $user, int $historyId): array
    {
        $history = $this->synastryHistoryRepository->findOneByUserAndId($user, $historyId);

        if (!$history) {
            return [
                'success' => false,
                'error' => 'History entry not found',
            ];
        }

        $this->entityManager->remove($history);
        $this->entityManager->flush();

        return [
            'success' => true,
            'message' => 'History entry deleted',
        ];
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
}
