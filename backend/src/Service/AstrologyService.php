<?php

namespace App\Service;

use App\Entity\BirthProfile;
use App\Entity\NatalChart;
use App\Entity\SynastryHistory;
use App\Entity\User;
use App\Repository\NatalChartRepository;
use App\Repository\SynastryHistoryRepository;
use App\Service\NatalChartPrompts;
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
        private AstrologyAnalysisService $astrologyAnalysisService,
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
                'houseCusps' => $this->computeHouseCusps($birthProfile),
                'cached' => true,
            ];
        }

        // Calculate planetary positions using PlanetaryCalculator
        try {
            $calculator = $this->astrologyAnalysisService->createCalculatorFromBirthProfile($birthProfile);
            $positions = $calculator->getWheelPositionsForApi();
            $houseCusps = $calculator->getHouseCusps();
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
            'houseCusps' => $houseCusps,
            'cached' => false,
        ];
    }

    /**
     * Cuspides Placidus pour un profil de naissance (pur calcul, jamais caché en BDD).
     * Retourne null si le calcul échoue — la roue côté app retombe sur des maisons égales.
     */
    private function computeHouseCusps($birthProfile): ?array
    {
        try {
            return $this->astrologyAnalysisService
                ->createCalculatorFromBirthProfile($birthProfile)
                ->getHouseCusps();
        } catch (\Exception) {
            return null;
        }
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
     * Get a short personality summary (Sun, Moon, Ascendant).
     * Free for all users, cached 90 days.
     */
    public function getNatalChartSummary(User $user): array
    {
        $chartResult = $this->calculateNatalChart($user);
        if (!$chartResult['success']) {
            return $chartResult;
        }

        $birthProfile = $user->getBirthProfile();
        $name = $birthProfile->getFirstName() ?? ($this->locale === 'en' ? 'the user' : 'l\'utilisateur');
        $positions = $chartResult['chart']['planetaryPositions'];

        $safeLocale = preg_replace('/[^a-z]/', '', $this->locale);
        $sun  = preg_replace('/[^a-zA-Z]/', '', $positions['Sun']['Sign'] ?? 'Unknown');
        $moon = preg_replace('/[^a-zA-Z]/', '', $positions['Moon']['Sign'] ?? 'Unknown');
        $asc  = preg_replace('/[^a-zA-Z]/', '', $positions['Ascendant']['Sign'] ?? 'Unknown');
        $cacheKey = sprintf('natal_summary_%d_%s_%s_%s_%s', $user->getId(), $sun, $moon, $asc, $safeLocale);

        $summary = $this->cache->get($cacheKey, function (ItemInterface $item) use ($name, $positions) {
            $item->expiresAfter(self::PLANET_INTERP_TTL);
            $result = $this->openAiService->getNatalChartSummary($name, $positions);
            if (!$result['success']) {
                throw new \RuntimeException($result['error'] ?? 'AI error');
            }
            return $result['summary'];
        });

        return [
            'success' => true,
            'summary' => $summary,
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
            $calc1 = $this->astrologyAnalysisService->createCalculatorFromBirthProfile($profile1);
            $calc2 = $this->astrologyAnalysisService->createCalculatorFromBirthProfile($profile2);

            // Calculate deterministic compatibility scores
            $calculatedScores = $calc1->calculateCompatibilityScore($calc2);

            // Build the compatibility prompt with aspects and locale
            $prompt = $calc1->buildCompatibilityPrompt($calc2, $question, $this->locale);

            // Get AI analysis (text only) and inject pre-calculated scores
            $aiResult = $this->openAiService->getCompatibilityAnalysis($prompt, $calculatedScores);

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
        ?string $question = null,
        ?string $partnerGender = null
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
            $userCalc = $this->astrologyAnalysisService->createCalculatorFromBirthProfile($userProfile);

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

            // Calculate deterministic compatibility scores
            $calculatedScores = $userCalc->calculateCompatibilityScore($partnerCalc);

            // Build the compatibility prompt with aspects and locale
            $prompt = $userCalc->buildCompatibilityPrompt($partnerCalc, $question, $this->locale);

            // Get AI analysis (text only) and inject pre-calculated scores
            $aiResult = $this->openAiService->getCompatibilityAnalysis($prompt, $calculatedScores);

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
            $history->setPartnerGender($partnerGender);
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
     * Calculate synastry v2 with external birth data — uses structured JSON prompt
     */
    public function calculateSynastryV2WithExternal(
        User $user,
        string $partnerName,
        array $partnerBirthData,
        ?string $question = null,
        ?string $partnerGender = null
    ): array {
        $userProfile = $user->getBirthProfile();

        if (!$userProfile) {
            return ['success' => false, 'error' => 'User must have a birth profile'];
        }

        try {
            $userCalc = $this->astrologyAnalysisService->createCalculatorFromBirthProfile($userProfile);

            $partnerDate = sprintf('%04d-%02d-%02d', $partnerBirthData['year'], $partnerBirthData['month'], $partnerBirthData['day']);
            $partnerTime = sprintf('%02d:%02d:00', $partnerBirthData['hours'] ?? 12, $partnerBirthData['minutes'] ?? 0);
            $partnerDateTime = new \DateTime("$partnerDate $partnerTime");

            $partnerTimezoneName = $partnerBirthData['timezoneName'] ?? null;
            $partnerBirthDateObj = $partnerBirthData['birthDate'] ?? null;

            if ($partnerTimezoneName && $partnerBirthDateObj instanceof \DateTimeInterface) {
                $tz = new \DateTimeZone($partnerTimezoneName);
                $tzRef = new \DateTime($partnerBirthDateObj->format('Y-m-d') . ' 12:00:00', $tz);
                $partnerTimezone = $tz->getOffset($tzRef) / 3600;
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

            $calculatedScores = $userCalc->calculateCompatibilityScore($partnerCalc);
            $prompt = $userCalc->buildCompatibilityPromptV2($partnerCalc, $question, $this->locale, $userProfile->getGender(), $partnerGender);
            $this->openAiService->setCallContext('synastry_v2', 'User', (string) $user->getId(), $user);
            try {
                $aiResult = $this->openAiService->getCompatibilityAnalysisV2($prompt, $calculatedScores);
            } finally {
                $this->openAiService->clearCallContext();
            }

            if (!$aiResult['success']) {
                return $aiResult;
            }

            $userName = $userProfile->getFirstName() ?? ($this->locale === 'en' ? 'You' : 'Vous');
            $userPositions = $userCalc->getPlanetaryPositionsForApi();
            $partnerPositions = $partnerCalc->getPlanetaryPositionsForApi();

            // Merge dimension scores into the analysis so they persist in history
            $analysisToStore = $aiResult['analysis'];
            $dimensionScores = $aiResult['compatibilityScore']['dimensions'] ?? [];
            foreach ($dimensionScores as $dimKey => $dimScore) {
                if (isset($analysisToStore['dimensions'][$dimKey]) && is_array($analysisToStore['dimensions'][$dimKey])) {
                    $analysisToStore['dimensions'][$dimKey]['value'] = (int) round($dimScore);
                }
            }

            // Store in history (analysis = v2 JSON as string, compatibilityDetails = parsed v2 with scores)
            $history = new SynastryHistory();
            $history->setUser($user);
            $history->setPartnerName($partnerName);
            $history->setPartnerGender($partnerGender);
            $history->setPartnerBirthData($partnerBirthData);
            $history->setAnalysis(json_encode($analysisToStore));
            $history->setCompatibilityScore($aiResult['compatibilityScore']['score_global'] ?? null);
            $history->setCompatibilityDetails($analysisToStore);
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
                    'initial' => mb_substr($userName, 0, 1, 'UTF-8'),
                    'gender' => $userProfile->getGender(),
                    'chart' => ['planetaryPositions' => $userPositions],
                ],
                'partner' => [
                    'name' => $partnerName,
                    'initial' => mb_substr($partnerName, 0, 1, 'UTF-8'),
                    'gender' => $partnerGender,
                    'positions' => $partnerPositions,
                ],
                'compatibilityScore' => $aiResult['compatibilityScore'],
                'analysis' => $aiResult['analysis'],
            ];
        } catch (\Exception $e) {
            return ['success' => false, 'error' => 'Calculation error: ' . $e->getMessage()];
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

        $data = $history->toArray();

        // For v2 records: inject dimension scores if any are missing
        $details = $data['compatibilityDetails'] ?? null;
        if (is_array($details) && isset($details['tagline'], $details['dimensions'])) {
            $needsScores = false;
            foreach ($details['dimensions'] as $dim) {
                if (!isset($dim['value'])) {
                    $needsScores = true;
                    break;
                }
            }

            if ($needsScores) {
                try {
                    $scores = $this->recalculateDimensionScores($user, $history);
                    if ($scores !== null) {
                        foreach ($scores['dimensions'] as $dimKey => $dimScore) {
                            if (isset($details['dimensions'][$dimKey]) && is_array($details['dimensions'][$dimKey])) {
                                $details['dimensions'][$dimKey]['value'] = (int) round($dimScore);
                            }
                        }
                        $data['compatibilityDetails'] = $details;
                        // Persist so next load is instant
                        $history->setCompatibilityDetails($details);
                        $this->entityManager->flush();
                    }
                } catch (\Exception $e) {
                    // Silently fail — return without scores rather than crash
                }
            }
        }

        return [
            'success' => true,
            'history' => $data,
        ];
    }

    /**
     * Recalculate deterministic dimension scores for a v2 history record
     * using the stored partner birth data and the user's birth profile.
     */
    private function recalculateDimensionScores(User $user, SynastryHistory $history): ?array
    {
        $userProfile = $user->getBirthProfile();
        if (!$userProfile) {
            return null;
        }

        $partnerBirthData = $history->getPartnerBirthData();
        if (empty($partnerBirthData)) {
            return null;
        }

        $userCalc = $this->astrologyAnalysisService->createCalculatorFromBirthProfile($userProfile);

        $partnerDate = sprintf('%04d-%02d-%02d',
            $partnerBirthData['year'],
            $partnerBirthData['month'],
            $partnerBirthData['day']
        );
        $partnerTime = sprintf('%02d:%02d:00',
            $partnerBirthData['hours'] ?? 12,
            $partnerBirthData['minutes'] ?? 0
        );
        $partnerDateTime = new \DateTime("$partnerDate $partnerTime");

        $timezone = $partnerBirthData['timezone'] ?? null;
        if ($timezone !== null) {
            $offsetMinutes = (int) ((float) $timezone * 60);
            $partnerDateTime->modify("-{$offsetMinutes} minutes");
        }

        $partnerCalc = new PlanetaryCalculator(
            $partnerDateTime->format('Y-m-d'),
            $partnerDateTime->format('H:i'),
            (float) $partnerBirthData['latitude'],
            (float) $partnerBirthData['longitude'],
            $history->getPartnerName()
        );

        return $userCalc->calculateCompatibilityScore($partnerCalc);
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
     * Get natal synthesis for a partner using their full chart payload (same quality as the user's own portrait).
     * Recreates PlanetaryCalculator from stored birth data to get ASC, houses, nodes and aspects.
     * Cached 90 days per historyId + locale.
     */
    public function getPartnerNatalSummary(string $partnerName, array $partnerBirthData, array $positions, int $historyId): array
    {
        $safeLocale = preg_replace('/[^a-z]/', '', $this->locale);
        $sun  = preg_replace('/[^a-zA-Z]/', '', $positions['Sun']['Sign'] ?? 'Unknown');
        $moon = preg_replace('/[^a-zA-Z]/', '', $positions['Moon']['Sign'] ?? 'Unknown');
        $cacheKey = sprintf('partner_synth_%d_%s_%s_%s', $historyId, $sun, $moon, $safeLocale);

        $synthesis = $this->cache->get($cacheKey, function (ItemInterface $item) use ($partnerName, $partnerBirthData, $positions) {
            $item->expiresAfter(self::PLANET_INTERP_TTL);

            // Rebuild full chart payload from birth data (ASC, houses, nodes, aspects)
            $chartPayload = $this->buildPartnerChartPayload($partnerName, $partnerBirthData, $positions);

            $systemPrompt = NatalChartPrompts::buildSystemPrompt(true);
            $prompt       = NatalChartPrompts::buildSynthesisPrompt($chartPayload, $partnerName, true);

            $result = $this->openAiService->generateNatalChartSection($prompt, $systemPrompt);
            if (!($result['success'] ?? false)) {
                throw new \RuntimeException($result['error'] ?? 'AI error');
            }

            $content = $result['content'] ?? '';
            $content = preg_replace('/^```json?\s*/m', '', $content);
            $content = preg_replace('/```\s*$/m', '', $content);
            $data    = json_decode(trim($content), true);

            if (!$data || !isset($data['portrait'])) {
                return ['portrait' => $content, 'axes' => [], 'notable_configs' => []];
            }

            return $data;
        });

        return [
            'success'   => true,
            'synthesis' => $synthesis,
        ];
    }

    /**
     * Rebuild a PlanetaryCalculator from stored birth data and return getFullChartPayload().
     * Falls back to positions-only payload if birth data is insufficient.
     */
    private function buildPartnerChartPayload(string $partnerName, array $partnerBirthData, array $positions): array
    {
        $lat = $partnerBirthData['latitude'] ?? null;
        $lon = $partnerBirthData['longitude'] ?? null;

        if ($lat === null || $lon === null
            || empty($partnerBirthData['year'])
            || empty($partnerBirthData['month'])
            || empty($partnerBirthData['day'])
        ) {
            return ['planets' => $positions];
        }

        $dateStr = sprintf('%04d-%02d-%02d',
            $partnerBirthData['year'],
            $partnerBirthData['month'],
            $partnerBirthData['day']
        );
        $timeStr = sprintf('%02d:%02d:00',
            $partnerBirthData['hours'] ?? 12,
            $partnerBirthData['minutes'] ?? 0
        );

        $dt = new \DateTime("$dateStr $timeStr");

        // Prefer IANA timezone name for DST-correct offset
        $timezoneName = $partnerBirthData['timezoneName'] ?? null;
        if ($timezoneName) {
            try {
                $tz     = new \DateTimeZone($timezoneName);
                $ref    = new \DateTime($dateStr . ' 12:00:00', $tz);
                $offset = $tz->getOffset($ref) / 3600;
            } catch (\Exception $e) {
                $offset = $partnerBirthData['timezone'] ?? 0;
            }
        } else {
            $offset = $partnerBirthData['timezone'] ?? 0;
        }

        $offsetMinutes = (int) ((float) $offset * 60);
        $dt->modify("-{$offsetMinutes} minutes");

        try {
            $calc = new PlanetaryCalculator(
                $dt->format('Y-m-d'),
                $dt->format('H:i'),
                (float) $lat,
                (float) $lon,
                $partnerName
            );
            return $calc->getFullChartPayload();
        } catch (\Exception $e) {
            return ['planets' => $positions];
        }
    }


}
