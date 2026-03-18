<?php

namespace App\Service;

use App\DTO\DailyHoroscopeDTO;
use App\Entity\DailyHoroscope;
use App\Entity\User;
use App\Repository\DailyHoroscopeRepository;
use App\Service\Webservice\OpenAiService;
use Doctrine\ORM\EntityManagerInterface;

class HoroscopeGeneratorService
{
    private const REFRESH_COOLDOWN_HOURS = 24;

    private PromptLocaleService $localeService;

    public function __construct(
        private AstrologyAnalysisService $astrologyAnalysisService,
        private OpenAiService $openAiService,
        private DailyHoroscopeRepository $dailyHoroscopeRepository,
        private EntityManagerInterface $entityManager,
    ) {
        $this->localeService = new PromptLocaleService();
    }

    /**
     * Set the locale for horoscope generation
     */
    public function setLocale(string $locale): self
    {
        $this->localeService->setLocale($locale);
        $this->openAiService->setLocale($locale);
        return $this;
    }

    /**
     * Get daily horoscope for a user
     *
     * @param User $user The user
     * @param bool $forceRefresh Force regeneration (max 1x/day)
     * @return array Response with horoscope data
     */
    public function getDailyHoroscope(User $user, bool $forceRefresh = false): array
    {
        $isEnglish = $this->localeService->getLocale() === 'en';

        // Check if user has birth profile
        if (!$user->getBirthProfile()) {
            return [
                'success' => false,
                'error' => $isEnglish
                    ? 'Please complete your birth profile first'
                    : 'Vous devez compléter votre profil de naissance',
            ];
        }

        // Check for existing horoscope today
        $existingHoroscope = $this->dailyHoroscopeRepository->findTodayForUser($user);

        if ($existingHoroscope && !$forceRefresh) {
            return [
                'success' => true,
                'horoscope' => $this->createDTO($existingHoroscope, true)->toArray(),
            ];
        }

        // Check refresh cooldown
        if ($existingHoroscope && $forceRefresh) {
            $generatedAt = $existingHoroscope->getGeneratedAt();
            $now = new \DateTime();
            $hoursSinceGeneration = ($now->getTimestamp() - $generatedAt->getTimestamp()) / 3600;

            if ($hoursSinceGeneration < self::REFRESH_COOLDOWN_HOURS) {
                // Return existing horoscope (cooldown not passed)
                return [
                    'success' => true,
                    'horoscope' => $this->createDTO($existingHoroscope, true)->toArray(),
                    'message' => $isEnglish
                        ? 'Horoscope already generated today'
                        : 'Horoscope déjà généré aujourd\'hui',
                ];
            }
        }

        // Generate new horoscope
        try {
            $horoscope = $this->generateHoroscope($user, $existingHoroscope);

            return [
                'success' => true,
                'horoscope' => $this->createDTO($horoscope, false)->toArray(),
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $isEnglish
                    ? 'Generation error: ' . $e->getMessage()
                    : 'Erreur lors de la génération: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Generate a new horoscope using OpenAI
     */
    private function generateHoroscope(User $user, ?DailyHoroscope $existing): DailyHoroscope
    {
        // Prepare astrological data
        $horoscopeData = $this->astrologyAnalysisService->prepareHoroscopeData($user);

        // Build the prompt
        $prompt = $this->buildPrompt($horoscopeData);

        // Call OpenAI
        $response = $this->openAiService->generateDailyHoroscope($prompt);

        if (!$response['success']) {
            throw new \RuntimeException($response['error'] ?? 'AI service error');
        }

        // Parse the response
        $horoscopeContent = $response['content'];
        $isEnglish = $this->localeService->getLocale() === 'en';
        $defaultTitle = $isEnglish ? 'Your daily horoscope' : 'Votre horoscope du jour';

        // Create or update entity
        $horoscope = $existing ?? new DailyHoroscope();
        $horoscope->setUser($user);
        $horoscope->setDate(new \DateTime('today'));
        $horoscope->setTitle($horoscopeContent['title'] ?? $defaultTitle);
        $horoscope->setOverview($horoscopeContent['overview'] ?? '');
        $horoscope->setLove($horoscopeContent['love'] ?? '');
        $horoscope->setEnergy($horoscopeContent['energy'] ?? '');
        $horoscope->setAdvice($horoscopeContent['advice'] ?? '');
        $horoscope->setNatalData($this->astrologyAnalysisService->buildNatalDataJson($horoscopeData['natal_planets']));
        $horoscope->setTransitsData($this->astrologyAnalysisService->buildTransitsDataJson($horoscopeData['current_transits']));
        $horoscope->setGeneratedAt(new \DateTime());

        $this->entityManager->persist($horoscope);
        $this->entityManager->flush();

        return $horoscope;
    }

    /**
     * Translate a sign name using the locale service
     */
    private function translateSign(string $sign): string
    {
        return $this->localeService->translateSign($sign);
    }

    /**
     * Translate planetary positions data using the locale service
     */
    private function translatePlanets(array $planets): array
    {
        $signLabel = $this->localeService->getInstruction('sign_label');
        $retroLabel = $this->localeService->getInstruction('retrograde_label');
        $retroYes = $this->localeService->getInstruction('retrograde_yes');
        $retroNo = $this->localeService->getInstruction('retrograde_no');

        $translated = [];
        foreach ($planets as $planet => $data) {
            $planetTranslated = $this->localeService->translatePlanet($planet);
            $translated[$planetTranslated] = [
                $signLabel => $this->localeService->translateSign($data['Sign'] ?? ''),
                'Position' => $data['Position'] ?? 0,
                $retroLabel => ($data['Retrograde'] ?? 'No') === 'Yes' ? $retroYes : $retroNo,
            ];
        }
        return $translated;
    }

    /**
     * Translate aspects data using the locale service
     */
    private function translateAspects(array $aspects): array
    {
        $isEnglish = $this->localeService->getLocale() === 'en';

        return array_map(function ($aspect) use ($isEnglish) {
            $natalKey = $isEnglish ? 'natal_planet' : 'planète_natale';
            $transitKey = $isEnglish ? 'transit_planet' : 'planète_transit';
            $orbKey = $isEnglish ? 'orb' : 'orbe';

            return [
                $natalKey => $this->localeService->translatePlanet($aspect['natal_planet'] ?? ''),
                $transitKey => $this->localeService->translatePlanet($aspect['transit_planet'] ?? ''),
                'aspect' => $aspect['aspect'] ?? '',
                $orbKey => $aspect['orb'] ?? 0,
            ];
        }, $aspects);
    }

    /**
     * Build the OpenAI prompt
     */
    private function buildPrompt(array $data): string
    {
        // Get the horoscope template for current locale
        $template = $this->localeService->getHoroscopePromptTemplate();
        $labels = $template['labels'];

        // Translate all data using locale service
        $sunSign = $this->translateSign($data['sun_sign']);
        $moonSign = $this->translateSign($data['moon_sign']);
        $ascendant = $this->translateSign($data['ascendant']);

        $natalPlanets = $this->translatePlanets($data['natal_planets']);
        $transits = $this->translatePlanets($data['current_transits']);
        $aspects = $this->translateAspects($data['major_aspects']);

        $natalChartJson = json_encode($natalPlanets, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        $transitsJson = json_encode($transits, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        $aspectsJson = json_encode($aspects, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        // Build rules string
        $rules = implode("\n- ", $template['rules']);

        // Build format description
        $format = $template['format'];
        $formatJson = json_encode([
            'title' => $format['title'],
            'overview' => $format['overview'],
            'love' => $format['love'],
            'energy' => $format['energy'],
            'advice' => $format['advice'],
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        $intro = $template['intro'];
        $natalChartLabel = $labels['natal_chart'];
        $transitsLabel = $labels['daily_transits'];
        $aspectsLabel = $labels['important_aspects'];
        $sunInLabel = $labels['sun_in'];
        $moonInLabel = $labels['moon_in'];
        $ascendantLabel = $labels['ascendant'];

        $isEnglish = $this->localeService->getLocale() === 'en';
        $jsonInstructions = $isEnglish
            ? "Structure your response in strict JSON (no text before or after):"
            : "Structure ta réponse en JSON strict (sans texte avant ou après) :";
        $detailedPositions = $isEnglish ? "Detailed positions:" : "Positions détaillées :";

        return <<<PROMPT
{$intro}

- {$rules}

{$jsonInstructions}
{$formatJson}

═══════════ {$natalChartLabel} ═══════════
{$sunInLabel} {$sunSign}
{$moonInLabel} {$moonSign}
{$ascendantLabel} {$ascendant}

{$detailedPositions}
{$natalChartJson}

═══════════ {$transitsLabel} ═══════════
{$transitsJson}

═══════════ {$aspectsLabel} ═══════════
{$aspectsJson}
PROMPT;
    }

    /**
     * Create DTO from entity
     */
    private function createDTO(DailyHoroscope $horoscope, bool $cached): DailyHoroscopeDTO
    {
        return new DailyHoroscopeDTO(
            $horoscope->getTitle(),
            $horoscope->getOverview(),
            $horoscope->getLove(),
            $horoscope->getEnergy(),
            $horoscope->getAdvice(),
            $horoscope->getDate()->format('Y-m-d'),
            $cached
        );
    }
}
