<?php

namespace App\Service;

use App\DTO\DailyHoroscopeDTO;
use App\Entity\CosmicHeadline;
use App\Entity\DailyHoroscope;
use App\Entity\User;
use App\Repository\CosmicHeadlineRepository;
use App\Repository\DailyHoroscopeRepository;
use App\Service\Webservice\OpenAiService;
use Doctrine\ORM\EntityManagerInterface;

class HoroscopeGeneratorService
{
    private const REFRESH_COOLDOWN_HOURS = 24;

    private const PLANET_TO_JSON_KEY = [
        'Sun' => 'Soleil', 'Moon' => 'Lune', 'Mercury' => 'Mercure',
        'Venus' => 'Venus', 'Mars' => 'Mars', 'Saturn' => 'Saturne',
        'Ascendant' => 'ASC', 'Midheaven' => 'MC',
    ];
    private const TRANSIT_PLANETS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars'];
    private const NATAL_TARGETS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Saturn', 'Ascendant', 'Midheaven'];
    private const LUMINAIRES_ET_ANGLES = ['Soleil', 'Lune', 'ASC', 'MC'];
    private const FACTEUR_CIBLE_FORTE = 1.30;

    private PromptLocaleService $localeService;
    private ?array $transitsTable = null;

    public function __construct(
        private AstrologyAnalysisService $astrologyAnalysisService,
        private OpenAiService $openAiService,
        private DailyHoroscopeRepository $dailyHoroscopeRepository,
        private CosmicHeadlineRepository $cosmicHeadlineRepository,
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
     * Helper to check if a user has a birth profile.
     */
    private function checkMissingProfileError(User $user, bool $isEnglish): ?array
    {
        if (!$user->getBirthProfile()) {
            return [
                'success' => false,
                'error' => $isEnglish
                    ? 'Please complete your birth profile first'
                    : 'Veuillez compléter votre profil de naissance',
            ];
        }
        return null;
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
        if ($error = $this->checkMissingProfileError($user, $isEnglish)) {
            return $error;
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
     * Get (or generate) the weekly cosmic headline for the current locale.
     * Shared by all users — cached per locale per week.
     */
    public function getCosmicHeadline(): array
    {
        $locale = $this->localeService->getLocale();

        // Return cached headline if it exists for this week
        $cached = $this->cosmicHeadlineRepository->findCurrentWeek($locale);
        if ($cached) {
            return ['success' => true, 'headline' => $cached->toArray(), 'cached' => true];
        }

        // Generate a new one
        try {
            $result = $this->openAiService->getCosmicHeadline();

            if (!$result['success']) {
                return $result;
            }

            $headline = new CosmicHeadline();
            $headline->setLocale($locale);
            $headline->setWeekOf(CosmicHeadlineRepository::getCurrentWeekMonday());
            $headline->setTitle($result['title']);
            $headline->setSubtitle($result['subtitle']);
            $headline->setGeneratedAt(new \DateTime());

            $this->entityManager->persist($headline);
            $this->entityManager->flush();

            return ['success' => true, 'headline' => $headline->toArray(), 'cached' => false];
        } catch (\Exception $e) {
            return ['success' => false, 'error' => 'Headline generation error: ' . $e->getMessage()];
        }
    }

    /**
     * Get 3 most significant upcoming transits for the user
     */
    public function getUpcomingTransits(User $user): array
    {
        $isEnglish = $this->localeService->getLocale() === 'en';

        if ($error = $this->checkMissingProfileError($user, $isEnglish)) {
            return $error;
        }

        try {
            $data = $this->astrologyAnalysisService->prepareHoroscopeData($user);
            $prompt = $this->buildTransitsPrompt($data);
            $result = $this->openAiService->getUpcomingTransits($prompt);
            return $result;
        } catch (\Throwable $e) {
            return [
                'success' => false,
                'error' => $isEnglish
                    ? 'Error generating transits: ' . $e->getMessage()
                    : 'Erreur lors de la génération des transits : ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Generate a short AI interpretation for a single transit aspect
     */
    public function getTransitInterpretation(User $user, array $aspectData): array
    {
        $isEnglish = $this->localeService->getLocale() === 'en';

        if ($error = $this->checkMissingProfileError($user, $isEnglish)) {
            return $error;
        }

        try {
            // Get user's key chart data for personalization
            $data = $this->astrologyAnalysisService->prepareHoroscopeData($user);

            return $this->openAiService->getTransitInterpretation(
                $aspectData['transit_planet'],
                $aspectData['natal_planet'],
                $aspectData['aspect_type'],
                $aspectData['aspect_name'],
                (float) $aspectData['orb'],
                $data['sun_sign'],
                $data['moon_sign'],
                $data['ascendant']
            );
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $isEnglish
                    ? 'Error generating interpretation: ' . $e->getMessage()
                    : 'Erreur lors de la génération : ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Get transit aspects calendar for a given month
     */
    public function getCalendarAspects(User $user, int $year, int $month): array
    {
        $isEnglish = $this->localeService->getLocale() === 'en';

        if ($error = $this->checkMissingProfileError($user, $isEnglish)) {
            return $error;
        }

        try {
            $days = $this->astrologyAnalysisService->getCalendarAspects($user, $year, $month);
            return ['success' => true, 'days' => $days];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $isEnglish
                    ? 'Error computing calendar: ' . $e->getMessage()
                    : 'Erreur lors du calcul du calendrier : ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Build the GPT prompt for upcoming transits
     */
    private function buildTransitsPrompt(array $data): string
    {
        $isEnglish = $this->localeService->getLocale() === 'en';
        $today = (new \DateTime())->format('F j, Y');

        $natalJson   = json_encode($data['natal_planets'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        // slow_aspects is already filtered (slow transit × fast natal × major type) with real date ranges
        $aspectsJson = json_encode($data['slow_aspects'] ?? [], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        $sunSign = $data['sun_sign'];
        $moonSign = $data['moon_sign'];
        $ascendant = $data['ascendant'];

        $exampleJson = json_encode([
            ['date' => 'Apr 2 – Apr 5', 'title' => 'Jupiter Trine Sun', 'description' => 'A window of expansion and optimism opens. Ideal for initiating ambitious projects.', 'intensity' => 'high'],
            ['date' => 'Apr 8', 'title' => 'New Moon in Aries', 'description' => 'Powerful new beginning energy. Set intentions around personal identity and courage.', 'intensity' => 'medium'],
            ['date' => 'Apr 12 – Apr 16', 'title' => 'Mercury Square Saturn', 'description' => 'Communications may feel restricted. Take extra care in important conversations.', 'intensity' => 'low'],
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        if ($isEnglish) {
            return <<<PROMPT
Today is {$today}. Sun in {$sunSign}, Moon in {$moonSign}, Ascendant {$ascendant}.

Each aspect below already includes its real astronomical date window (start_date / end_date computed from orbs).
Select up to 3 of the most impactful aspects and return them as a JSON array.

Return ONLY a JSON array (no text before or after):
{$exampleJson}

Rules:
- Use ONLY aspects from the list below
- "date" = format the provided start_date–end_date as "Mon D – Mon D" (e.g. "Apr 3 – Jun 18"); use "Mon D" only if start and end are the same day
- "title" = "Planet Aspect Planet" (e.g. "Jupiter Trine Sun")
- "description" = 1-2 sentences, personal impact based on the natal chart, no jargon
- "intensity" = "high", "medium", or "low"
- If fewer than 3 aspects are provided, return only the ones present

═══ NATAL CHART ═══
{$natalJson}

═══ ACTIVE ASPECTS (with real date windows) ═══
{$aspectsJson}
PROMPT;
        }

        return <<<PROMPT
Aujourd'hui, le {$today}. Soleil en {$sunSign}, Lune en {$moonSign}, Ascendant {$ascendant}.

Chaque aspect ci-dessous inclut sa fenêtre astronomique réelle (start_date / end_date calculée à partir des orbes).
Sélectionne jusqu'à 3 aspects les plus marquants et renvoie-les sous forme de tableau JSON.

Renvoie UNIQUEMENT un tableau JSON (pas de texte avant ou après) :
{$exampleJson}

Règles :
- Utilise UNIQUEMENT les aspects de la liste ci-dessous
- "date" = formate les start_date–end_date fournis en "D Mois – D Mois" (ex. "3 avr. – 18 juin") ; utilise "D Mois" seulement si début et fin sont le même jour
- "title" = "Planète Aspect Planète" (ex. "Jupiter Trigone Soleil")
- "description" = 1-2 phrases, impact personnel basé sur le thème natal, sans jargon technique
- "intensity" = "high", "medium" ou "low"
- Si moins de 3 aspects sont fournis, renvoie uniquement ceux présents

═══ THÈME NATAL ═══
{$natalJson}

═══ ASPECTS ACTIFS (avec fenêtres de dates réelles) ═══
{$aspectsJson}
PROMPT;
    }

    /**
     * Generate a new horoscope using OpenAI
     */
    private function generateHoroscope(User $user, ?DailyHoroscope $existing): DailyHoroscope
    {
        $birthProfile = $user->getBirthProfile();
        $horoscopeData = $this->astrologyAnalysisService->prepareHoroscopeData($user);

        // Build deterministic brief (horoscope engine)
        $natalCalc = $this->astrologyAnalysisService->createCalculatorFromBirthProfile($birthProfile);
        $natal = $this->buildNatalArray($natalCalc);
        $transits = $this->buildTransitsArray();
        $brief = $this->genererBriefHoroscope($natal, $transits, $this->formatDateFr());

        // Call LLM with brief as user prompt
        $userPrompt = json_encode($brief, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        $response = $this->openAiService->generateDailyHoroscope($userPrompt);

        if (!$response['success']) {
            throw new \RuntimeException($response['error'] ?? 'AI service error');
        }

        $horoscopeContent = $response['content'];
        $isEnglish = $this->localeService->getLocale() === 'en';
        $defaultTitle = $isEnglish ? 'Your daily horoscope' : 'Votre horoscope du jour';

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

    // =========================================================================
    // Horoscope Engine — deterministic brief generation
    // =========================================================================

    private function loadTransitsTable(): array
    {
        if ($this->transitsTable === null) {
            $path = __DIR__ . '/../../data/lunestia_transits_natal.json';
            $this->transitsTable = json_decode(file_get_contents($path), true);
        }
        return $this->transitsTable;
    }

    private function buildNatalArray(PlanetaryCalculator $calc): array
    {
        $payload = $calc->getFullChartPayload();
        $points = $calc->getAllPoints();
        $natal = [];

        foreach (self::NATAL_TARGETS as $en) {
            $key = self::PLANET_TO_JSON_KEY[$en];
            $lon = $points[$en] ?? 0.0;

            if ($en === 'Ascendant') {
                $sign = $payload['angles']['ascendant']['sign'];
                $house = 1;
            } elseif ($en === 'Midheaven') {
                $sign = $payload['angles']['midheaven']['sign'];
                $house = 10;
            } else {
                $p = $payload['planets'][$en] ?? [];
                $sign = $p['sign'] ?? 'Aries';
                $house = $p['house'] ?? 1;
            }

            $idx = array_search($sign, PlanetaryCalculator::SIGNS);
            $signFr = $idx !== false ? PlanetaryCalculator::SIGNS_FR[$idx] : $sign;

            $natal[$key] = ['longitude' => $lon, 'signe' => $signFr, 'maison' => $house];
        }

        return $natal;
    }

    private function buildTransitsArray(): array
    {
        $now = new \DateTime('now', new \DateTimeZone('UTC'));
        $calc = new PlanetaryCalculator($now->format('Y-m-d'), '12:00', 0.0, 0.0, 'Transits');

        $transits = [];
        foreach (self::TRANSIT_PLANETS as $en) {
            $key = self::PLANET_TO_JSON_KEY[$en];
            $transits[$key] = ['longitude' => $calc->getPlanetLongitude($en)];
        }
        return $transits;
    }

    private function formatDateFr(): string
    {
        $now = new \DateTime();
        $jours = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
        $mois = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
        return sprintf('%s %d %s', $jours[(int) $now->format('w')], (int) $now->format('j'), $mois[(int) $now->format('n')]);
    }

    /**
     * Detect all transit→natal contacts within orb, scored.
     */
    private function contactsScores(array $natal, array $transits): array
    {
        $contacts = [];

        foreach (self::TRANSIT_PLANETS as $en) {
            $tPlanete = self::PLANET_TO_JSON_KEY[$en];
            if (!isset($transits[$tPlanete])) continue;
            $tLon = $transits[$tPlanete]['longitude'];

            foreach ($natal as $cible => $nData) {
                $nLon = $nData['longitude'];
                $sep = PlanetaryCalculator::separation($tLon, $nLon);

                foreach (PlanetaryCalculator::TRANSIT_ASPECTS as $asp) {
                    $orbeReel = abs($sep - $asp['angle']);
                    if ($orbeReel > $asp['orbe']) continue;

                    $orbFactor = 1.0 - ($orbeReel / $asp['orbe']);
                    $cibleFactor = in_array($cible, self::LUMINAIRES_ET_ANGLES, true)
                        ? self::FACTEUR_CIBLE_FORTE : 1.0;
                    $score = $asp['poids'] * $orbFactor * $cibleFactor;

                    $contacts[] = [
                        'transit' => $tPlanete,
                        'cible'   => $cible,
                        'aspect'  => $asp['nom'],
                        'orbe'    => $orbeReel,
                        'score'   => $score,
                        'maison'  => $nData['maison'],
                    ];
                    break; // one aspect per transit-cible pair
                }
            }
        }

        usort($contacts, fn($a, $b) => $b['score'] <=> $a['score']);
        return $contacts;
    }

    /**
     * Pick 3 distinct angles + baseline from scored contacts.
     */
    private function selectionnerAngles(array $contacts, array $natal): array
    {
        // angle_principal: best non-Moon transit (lasts 2-4 days)
        $principal = null;
        foreach ($contacts as $c) {
            if ($c['transit'] !== 'Lune') { $principal = $c; break; }
        }

        // angle_relationnel: best affective contact, distinct from principal
        $relationnel = null;
        foreach ($contacts as $c) {
            $estAffectif = in_array($c['transit'], ['Venus', 'Mars'], true)
                || in_array($c['cible'], ['Venus', 'Mars'], true)
                || in_array($c['maison'], [5, 7, 8], true);
            $isSameAsPrincipal = $principal !== null
                && $c['transit'] === $principal['transit']
                && $c['cible'] === $principal['cible'];
            if ($estAffectif && !$isSameAsPrincipal) { $relationnel = $c; break; }
        }

        // couleur_du_jour: best Moon transit (changes daily)
        $couleur = null;
        foreach ($contacts as $c) {
            if ($c['transit'] === 'Lune') { $couleur = $c; break; }
        }

        return [
            'principal'   => $principal,
            'relationnel' => $relationnel,
            'couleur'     => $couleur,
            'baseline'    => [
                'lune_signe' => $natal['Lune']['signe'] ?? null,
                'asc_signe'  => $natal['ASC']['signe'] ?? null,
            ],
        ];
    }

    /**
     * Compose a brief section from a contact + the JSON table.
     */
    private function composerBrief(?array $contact, array $table): ?array
    {
        if ($contact === null) return null;

        $cell = $table['contacts'][$contact['transit']][$contact['cible']] ?? null;
        if ($cell === null) return null;

        if ($contact['aspect'] === 'conjonction') {
            $flavorKey = in_array($contact['cible'], ['Saturne', 'Mars'], true) ? 'tension' : 'flow';
        } else {
            $regle = $table['regle_aspect'][$contact['aspect']] ?? 'flow';
            $flavorKey = str_contains($regle, 'tension') ? 'tension' : 'flow';
        }

        return [
            'theme'     => $cell['theme'],
            'situation' => $cell[$flavorKey],
            'domaine'   => $table['maisons'][(string) $contact['maison']] ?? null,
        ];
    }

    /**
     * Orchestrate: natal + transits → deterministic brief for the LLM.
     */
    private function genererBriefHoroscope(array $natal, array $transits, string $dateFr): array
    {
        $table = $this->loadTransitsTable();
        $contacts = $this->contactsScores($natal, $transits);
        $angles = $this->selectionnerAngles($contacts, $natal);

        $briefPrincipal   = $this->composerBrief($angles['principal'], $table);
        $briefRelationnel = $this->composerBrief($angles['relationnel'], $table);
        $briefCouleur     = $this->composerBrief($angles['couleur'], $table);

        // Fallbacks (§6): never send an empty brief
        if ($briefPrincipal === null) {
            $briefPrincipal = $briefCouleur;
            if ($briefPrincipal === null) {
                $briefPrincipal = [
                    'theme'     => 'coloration de fond',
                    'situation' => sprintf(
                        'journée calme, la tonalité vient de sa sensibilité %s et de son apparence %s',
                        $angles['baseline']['lune_signe'] ?? 'naturelle',
                        $angles['baseline']['asc_signe'] ?? 'naturelle'
                    ),
                    'domaine' => null,
                ];
            }
        }

        return [
            'angle_principal'   => $briefPrincipal,
            'angle_relationnel' => $briefRelationnel,
            'couleur_du_jour'   => $briefCouleur,
            'baseline'          => $angles['baseline'],
            'date'              => $dateFr,
        ];
    }
}
