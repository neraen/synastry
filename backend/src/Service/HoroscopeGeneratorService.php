<?php

namespace App\Service;

use App\DTO\DailyHoroscopeDTO;
use App\Entity\CosmicHeadline;
use App\Entity\DailyHoroscope;
use App\Entity\User;
use App\Enum\TopicLyra;
use App\Repository\CosmicHeadlineRepository;
use App\Repository\DailyHoroscopeRepository;
use App\Service\Webservice\OpenAiService;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;

class HoroscopeGeneratorService
{
    private const REFRESH_COOLDOWN_HOURS = 24;

    private const PLANET_TO_JSON_KEY = [
        'Sun' => 'Soleil', 'Moon' => 'Lune', 'Mercury' => 'Mercure',
        'Venus' => 'Venus', 'Mars' => 'Mars', 'Saturn' => 'Saturne',
        'Jupiter' => 'Jupiter', 'Uranus' => 'Uranus', 'Neptune' => 'Neptune', 'Pluto' => 'Pluton',
        'Ascendant' => 'ASC', 'Midheaven' => 'MC',
    ];
    private const LYRA_TRANSIT_PLANETS = [
        'Sun', 'Mercury', 'Venus', 'Mars',
        'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
    ];
    private const ORBE_TRANSIT = [
        'rapide' => 2.0,
        'social' => 2.5,
        'lente'  => 2.5,
    ];
    private const TRANSIT_PLANETS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars'];
    private const NATAL_TARGETS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Saturn', 'Ascendant', 'Midheaven'];
    private const LUMINAIRES_ET_ANGLES = ['Soleil', 'Lune', 'ASC', 'MC'];
    private const FACTEUR_CIBLE_FORTE = 1.30;

    // ── Lyra relevance (ajout 1 + 2) ─────────────────────────────────────────
    // Cibles/maisons par domaine — touche au scoring, donc reste une constante PHP
    // (le vocabulaire de classification, lui, vit dans data/lyra_domaines.json).
    private const DOMAINE_AFFINITE = [
        'argent'  => ['cibles' => ['Venus', 'Jupiter', 'Saturne'],     'maisons' => [2, 8]],
        'amour'   => ['cibles' => ['Venus', 'Mars', 'Lune'],           'maisons' => [5, 7, 8]],
        'travail' => ['cibles' => ['Saturne', 'Mars', 'Soleil', 'MC'], 'maisons' => [6, 10]],
        'sante'   => ['cibles' => ['Lune', 'Mars', 'Soleil'],          'maisons' => [1, 6]],
        'sens'    => ['cibles' => ['Soleil', 'Jupiter', 'Neptune'],    'maisons' => [9, 12]],
        'general' => ['cibles' => [],                                  'maisons' => []],
    ];
    private const SEUIL_PERTINENCE = 1.5;

    // ── Lyra topic affinities (explicit subject chosen by the user) ───────────
    // Keyed by TopicLyra->value. Drives the transit-scoring boost (×3) and bypasses
    // classifierDomaine(). 'cibles' use the JSON-key naming (Soleil/Lune/Venus/Mars/
    // Saturne/ASC/MC — the available natal targets); 'maisons' boost contacts whose
    // touched natal point sits in those houses. ASTROLOGIE = no filter (all transits).
    private const TOPIC_AFFINITE = [
        'amour'       => ['cibles' => ['Venus', 'Mars', 'Lune'],            'maisons' => [5, 7, 8]],
        'argent'      => ['cibles' => ['Venus', 'Saturne'],                 'maisons' => [2, 8, 11]],
        'travail'     => ['cibles' => ['Saturne', 'Mars', 'Soleil', 'MC'], 'maisons' => [6, 10]],
        'astrologie'  => ['cibles' => [],                                   'maisons' => []],
        'psychologie' => ['cibles' => ['Soleil', 'Lune', 'Saturne', 'ASC'], 'maisons' => []],
    ];
    private const BOOST_TOPIC_EXPLICITE = 3.0;
    private const BOOST_DOMAINE_CLASSIFIE = 2.0;

    // Angle de récit par domaine : quand un transit est pertinent via sa CIBLE
    // (Vénus pour l'amour, MC pour le travail…), l'histoire à raconter est le
    // domaine de la question, pas la maison où la cible se trouve par hasard.
    private const DOMAINE_RECIT = [
        'amour'       => 'le couple, les sentiments, la vie affective',
        'argent'      => "l'argent, les ressources, la sécurité matérielle",
        'travail'     => 'le travail, la carrière, la place professionnelle',
        'sante'       => "l'énergie, le corps, l'équilibre de vie",
        'sens'        => 'le sens, la direction de vie',
        'psychologie' => 'le fonctionnement intérieur, les patterns émotionnels',
    ];

    // Per-topic natal anchors to inject into the prompt, beyond the 3 base ancrages.
    // Each entry is [English planet key in the chart payload, French label].
    // Houses to surface (cusp sign + planets) are listed separately.
    private const TOPIC_NATAL_PLANETES = [
        'amour'       => [['Venus', 'Vénus'], ['Mars', 'Mars'], ['Moon', 'Lune']],
        'argent'      => [['Venus', 'Vénus'], ['Jupiter', 'Jupiter'], ['Saturn', 'Saturne']],
        'travail'     => [['Sun', 'Soleil'], ['Saturn', 'Saturne'], ['Mars', 'Mars']],
        'astrologie'  => [],
        'psychologie' => [['Sun', 'Soleil'], ['Moon', 'Lune'], ['Saturn', 'Saturne'], ['Pluto', 'Pluton']],
    ];
    private const TOPIC_NATAL_MAISONS = [
        'amour'       => [['7', 'relations'], ['5', 'plaisir et désir']],
        'argent'      => [['2', 'ressources et valeurs'], ['8', 'ressources partagées']],
        'travail'     => [['10', 'carrière'], ['6', 'travail quotidien']],
        'astrologie'  => [],
        'psychologie' => [['1', 'identité']],
    ];

    private PromptLocaleService $localeService;
    private ?array $transitsTable = null;
    private ?array $domainesLexique = null;
    /** @var array<string, array> Snapshots éphémérides par date (Y-m-d), mémoïsés pour la requête. */
    private array $transitsParDate = [];

    public function __construct(
        private AstrologyAnalysisService $astrologyAnalysisService,
        private OpenAiService $openAiService,
        private DailyHoroscopeRepository $dailyHoroscopeRepository,
        private CosmicHeadlineRepository $cosmicHeadlineRepository,
        private EntityManagerInterface $entityManager,
        private LoggerInterface $horoscopeLogger,
        private PsyProfileService $psyProfileService,
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
        $transitsDemain = $this->buildTransitsArray(1);
        $principalMaison = null;
        $brief = $this->genererBriefHoroscope($natal, $transits, $transitsDemain, $this->formatDateFr(), $principalMaison);

        // Anti-répétition : un aspect rapide reste en orbe 3-4 jours, deux jours
        // consécutifs partagent donc souvent le même brief. On envoie l'horoscope
        // d'hier pour que le LLM change d'angle (titre, images, tournures).
        $hier = $this->dailyHoroscopeRepository->findByUserAndDate($user, new \DateTime('yesterday'));
        if ($hier !== null) {
            $brief['hier'] = [
                'title'    => $hier->getTitle(),
                'overview' => $hier->getOverview(),
            ];
        }

        // Deepen the baseline with the persistent psy profile (noyau + the axis
        // matching the day's main angle). The digest colors the same day personally
        // without changing the angle (which still comes from the transits).
        $psy = $this->psyProfileService->getData($user);
        if ($psy !== null) {
            $domaine = $principalMaison !== null ? $this->domainePourMaison($principalMaison) : null;
            $brief['baseline']['profil_psy'] = $this->psyProfileService->profilPourContexte($psy, $domaine);
        }

        // Diagnostic: log the exact brief sent to the LLM + which angles are null
        // (distinguishes a selection bug from a genuinely quiet day).
        $this->horoscopeLogger->info('horoscope.brief', [
            'user_id'           => $user->getId(),
            'date'              => $brief['date'] ?? null,
            'angle_principal'   => $brief['angle_principal'],
            'angle_relationnel' => $brief['angle_relationnel'],
            'couleur_du_jour'   => $brief['couleur_du_jour'],
            'baseline'          => $brief['baseline'],
            'null_flags'        => [
                'angle_principal'   => $brief['angle_principal'] === null,
                'angle_relationnel' => $brief['angle_relationnel'] === null,
                'couleur_du_jour'   => $brief['couleur_du_jour'] === null,
            ],
        ]);

        // Call LLM with brief as user prompt
        $userPrompt = json_encode($brief, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        $response = $this->openAiService->generateDailyHoroscope($userPrompt);

        if (!$response['success']) {
            throw new \RuntimeException($response['error'] ?? 'AI service error');
        }

        $horoscopeContent = $response['content'];

        // Enforce banned-term lexicon on every generated field (reuses the Lyra
        // linter: lint -> rewrite 2 passes -> mechanical scrub). Same lyra_bannis.json.
        foreach (['title', 'overview', 'love', 'energy', 'advice'] as $field) {
            if (!empty($horoscopeContent[$field]) && is_string($horoscopeContent[$field])) {
                $horoscopeContent[$field] = $this->openAiService->corrigerViolations($horoscopeContent[$field]);
            }
        }

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

    private function loadDomainesLexique(): array
    {
        if ($this->domainesLexique === null) {
            $path = __DIR__ . '/../../data/lyra_domaines.json';
            $this->domainesLexique = file_exists($path)
                ? (json_decode(file_get_contents($path), true) ?: ['domaines' => []])
                : ['domaines' => []];
        }
        return $this->domainesLexique;
    }

    /**
     * Classify a free-text question into a life domain (ajout 1).
     * No LLM call — pure lexicon match against data/lyra_domaines.json.
     * Graceful degradation: no match -> 'general' (pure hierarchy ranking).
     */
    private function classifierDomaine(string $question): string
    {
        $q = PlanetaryCalculator::normaliser($question);
        if ($q === '') {
            return 'general';
        }

        $lex      = $this->loadDomainesLexique();
        $tokens   = preg_split('/\s+/', $q, -1, PREG_SPLIT_NO_EMPTY);
        $tokenSet = array_flip($tokens); // O(1) lookup for exact words

        $scores = [];
        foreach ($lex['domaines'] ?? [] as $domaine => $listes) {
            $s = 0;

            foreach ($listes['mots_exacts'] ?? [] as $mot) {
                if (isset($tokenSet[$mot])) $s += 1;
            }
            foreach ($listes['racines'] ?? [] as $racine) {
                foreach ($tokens as $t) {
                    if (str_starts_with($t, $racine)) { $s += 1; break; }
                }
            }
            foreach ($listes['expressions'] ?? [] as $exp) {
                if ($exp !== '' && str_contains($q, $exp)) $s += 2; // locution = signal fort
            }

            $scores[$domaine] = $s;
        }

        if (empty($scores)) {
            return 'general';
        }

        arsort($scores);
        $top = array_key_first($scores);
        return $scores[$top] > 0 ? $top : 'general';
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

    private function buildTransitsArray(int $joursOffset = 0): array
    {
        $now = new \DateTime('now', new \DateTimeZone('UTC'));
        if ($joursOffset !== 0) {
            $now->modify(sprintf('%+d days', $joursOffset));
        }
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
     * $transitsDemain (same shape, +1 day) feeds 'sens' : whether the contact
     * tightens (se_renforce) or releases (se_desserre) tomorrow — daily scale,
     * unlike Lyra's sensTransit() which compares to +30 days.
     */
    private function contactsScores(array $natal, array $transits, array $transitsDemain = []): array
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

                    $sens = null;
                    if (isset($transitsDemain[$tPlanete])) {
                        $sepDemain = PlanetaryCalculator::separation(
                            $transitsDemain[$tPlanete]['longitude'],
                            $nLon
                        );
                        $sens = self::sensTransit($orbeReel, abs($sepDemain - $asp['angle']));
                    }

                    $contacts[] = [
                        'transit' => $tPlanete,
                        'cible'   => $cible,
                        'aspect'  => $asp['nom'],
                        'orbe'    => $orbeReel,
                        'score'   => $score,
                        'maison'  => $nData['maison'],
                        'sens'    => $sens,
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
     * $seed (date du jour) rend le choix de variante stable sur la journée
     * mais différent d'un jour et d'un contact à l'autre.
     */
    private function composerBrief(?array $contact, array $table, string $seed = ''): ?array
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
            'situation' => $this->choisirVariante($cell[$flavorKey], $seed . $contact['transit'] . $contact['cible']),
            'domaine'   => $table['maisons'][(string) $contact['maison']] ?? null,
            'tonalite'  => $flavorKey,
            'intensite' => $this->intensiteContact($contact),
            'sens'      => $contact['sens'] ?? null,
        ];
    }

    /**
     * Volume indication for the LLM. Score = poids aspect × orbFactor × cible
     * (max 1.30) : ≥0.75 only for tight major aspects, <0.40 for wide or
     * minor contacts that should stay a nuance, not an event.
     */
    private function intensiteContact(array $contact): string
    {
        $score = $contact['score'] ?? 0.0;
        if ($score >= 0.75) return 'forte';
        if ($score >= 0.40) return 'moyenne';
        return 'legere';
    }

    /**
     * Deterministic pick among equivalent phrasings (the JSON table stores
     * flow/tension as variant arrays). String accepted for backward compat.
     */
    private function choisirVariante(string|array $variantes, string $seed): string
    {
        if (is_string($variantes)) {
            return $variantes;
        }
        return $variantes[crc32($seed) % count($variantes)];
    }

    /**
     * Orchestrate: natal + transits → deterministic brief for the LLM.
     */
    private function genererBriefHoroscope(array $natal, array $transits, array $transitsDemain, string $dateFr, ?int &$principalMaison = null): array
    {
        $table = $this->loadTransitsTable();
        $contacts = $this->contactsScores($natal, $transits, $transitsDemain);
        $angles = $this->selectionnerAngles($contacts, $natal);

        // House of the angle that actually drives the day (principal, else the
        // Moon "couleur" used as fallback) — used to pick the psy axis to inject.
        $principalMaison = $angles['principal']['maison'] ?? ($angles['couleur']['maison'] ?? null);

        $seed = (new \DateTime('today'))->format('Y-m-d');
        $briefPrincipal   = $this->composerBrief($angles['principal'], $table, $seed);
        $briefRelationnel = $this->composerBrief($angles['relationnel'], $table, $seed);
        $briefCouleur     = $this->composerBrief($angles['couleur'], $table, $seed);

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
                    'domaine'   => null,
                    'tonalite'  => 'flow',
                    'intensite' => 'legere',
                    'sens'      => null,
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

    /**
     * Map a natal house to a life domain key (inverse of DOMAINE_AFFINITE),
     * used to pick which psy axis colors the horoscope. Null if no domain owns it.
     */
    private function domainePourMaison(int $maison): ?string
    {
        foreach (self::DOMAINE_AFFINITE as $domaine => $aff) {
            if (in_array($maison, $aff['maisons'], true)) {
                return $domaine;
            }
        }
        return null;
    }

    // =========================================================================
    // Lyra Engine — structured context for chat
    // =========================================================================

    private function buildLyraTransitsArray(string $dateStr): array
    {
        if (isset($this->transitsParDate[$dateStr])) {
            return $this->transitsParDate[$dateStr];
        }

        $calc = new PlanetaryCalculator($dateStr, '12:00', 0.0, 0.0, 'Transits');
        $transits = [];
        foreach (self::LYRA_TRANSIT_PLANETS as $en) {
            $key = self::PLANET_TO_JSON_KEY[$en];
            $transits[$key] = ['longitude' => $calc->getPlanetLongitude($en)];
        }

        return $this->transitsParDate[$dateStr] = $transits;
    }

    private function vitesse(string $planeteFr): string
    {
        return match ($planeteFr) {
            'Soleil', 'Mercure', 'Venus', 'Mars' => 'rapide',
            'Jupiter', 'Saturne' => 'social',
            default => 'lente',
        };
    }

    private function poidsHierarchie(string $transit, string $cible): float
    {
        $estLuminaireOuAngle = in_array($cible, self::LUMINAIRES_ET_ANGLES, true);
        $estPersonnelle      = in_array($cible, ['Mercure', 'Venus', 'Mars'], true);

        return match (true) {
            in_array($transit, ['Pluton', 'Neptune', 'Uranus'], true) && $estLuminaireOuAngle => 5.0,
            $transit === 'Saturne' && $estLuminaireOuAngle => 4.0,
            $transit === 'Jupiter' && $estLuminaireOuAngle => 3.0,
            in_array($transit, ['Pluton', 'Neptune', 'Uranus', 'Saturne', 'Jupiter'], true) && $estPersonnelle => 2.0,
            default => 1.0,
        };
    }

    private static function sensTransit(float $orbeNow, float $orbeDans30j): string
    {
        return $orbeDans30j < $orbeNow ? 'se_renforce' : 'se_desserre';
    }

    private function natureAspect(string $aspectNom, string $cible): string
    {
        if ($aspectNom === 'conjonction') {
            return in_array($cible, ['Saturne', 'Mars'], true) ? 'tension' : 'soutien';
        }
        return in_array($aspectNom, ['carre', 'opposition'], true) ? 'tension' : 'soutien';
    }

    /**
     * Scored transit→natal contacts at a given date, enriched with the data
     * the LLM needs to be precise: aspect name, orb in degrees, the natal
     * target's house AND the house the transiting planet is currently passing
     * through. Entries also carry private keys (prefixed `_`) consumed by
     * estimerFenetreTransit() and stripped before reaching the LLM.
     *
     * @param array $natal    buildNatalArray() output
     * @param array $affinite ['cibles' => string[], 'maisons' => int[]]
     */
    private function detecterTransits(
        array $natal,
        PlanetaryCalculator $natalCalc,
        \DateTimeInterface $date,
        array $affinite,
        float $boost
    ): array {
        $table = $this->loadTransitsTable();

        $transitsNow = $this->buildLyraTransitsArray($date->format('Y-m-d'));
        $dans30 = \DateTime::createFromInterface($date)->modify('+30 days');
        $transitsDans30j = $this->buildLyraTransitsArray($dans30->format('Y-m-d'));

        $actifs = [];

        foreach (self::LYRA_TRANSIT_PLANETS as $en) {
            $tPlanete = self::PLANET_TO_JSON_KEY[$en];
            if (!isset($transitsNow[$tPlanete])) continue;
            $tLon = $transitsNow[$tPlanete]['longitude'];
            $orbeMax = self::ORBE_TRANSIT[$this->vitesse($tPlanete)];
            $maisonTransit = $natalCalc->houseOfLongitude($tLon);

            foreach ($natal as $cible => $nData) {
                $sep = PlanetaryCalculator::separation($tLon, $nData['longitude']);

                foreach (PlanetaryCalculator::TRANSIT_ASPECTS as $asp) {
                    $orbe = abs($sep - $asp['angle']);
                    if ($orbe > $orbeMax) continue;

                    $force = $this->poidsHierarchie($tPlanete, $cible) * (1.0 - $orbe / $orbeMax);

                    // Pertinence domaine : point natal visé ou sa maison. La maison
                    // que la planète traverse n'y participe PAS : un gros transit
                    // carrière qui passe en maison 7 deviendrait "pertinent amour"
                    // et le même dominant sortirait pour tous les sujets (le climat
                    // maisons_en_transit couvre déjà ce cas).
                    $viaCible  = in_array($cible, $affinite['cibles'], true);
                    $viaMaison = in_array($nData['maison'], $affinite['maisons'], true);
                    $pertinent = $viaCible || $viaMaison;
                    if ($pertinent) $force *= $boost;

                    $sep30 = PlanetaryCalculator::separation(
                        $transitsDans30j[$tPlanete]['longitude'],
                        $nData['longitude']
                    );
                    $orbe30 = abs($sep30 - $asp['angle']);

                    $actifs[] = [
                        'transit' => $tPlanete,
                        'cible'   => $cible,
                        'aspect'  => $asp['nom'],
                        'orbe'    => round($orbe, 1),
                        'nature'  => $this->natureAspect($asp['nom'], $cible),
                        'maison_cible'    => $nData['maison'],
                        'domaine_cible'   => $table['maisons'][(string) $nData['maison']] ?? null,
                        'maison_transit'  => $maisonTransit,
                        'domaine_transit' => $table['maisons'][(string) $maisonTransit] ?? null,
                        'sens'    => self::sensTransit($orbe, $orbe30),
                        'force'   => round($force, 2),
                        'pertinent_domaine' => $pertinent,
                        '_via'       => $viaCible ? 'cible' : ($viaMaison ? 'maison' : null),
                        '_angle'     => $asp['angle'],
                        '_orbe_max'  => $orbeMax,
                        '_natal_lon' => $nData['longitude'],
                    ];
                    break;
                }
            }
        }

        usort($actifs, fn($a, $b) => $b['force'] <=> $a['force']);

        return $actifs;
    }

    /**
     * Top transits to send to the LLM, with a deterministic topic guarantee:
     * for an explicit subject the 2 strongest domain-relevant contacts are
     * always present, and the DOMINANT (index 0) is the strongest transit DU
     * SUJET. Sans ça, le même transit lent majeur (Pluton/Neptune/Uranus sur
     * un angle, poids 5.0) écrase le boost ×3 et sort en tête de tous les
     * sujets : l'utilisateur reçoit la même histoire et la même date en
     * amour, argent et travail.
     */
    private function selectionnerTransitsLyra(array $actifs, bool $topicExplicite, int $limite = 5): array
    {
        $top = array_slice($actifs, 0, $limite);

        if ($topicExplicite) {
            $pertinents = array_values(array_filter($actifs, fn($c) => $c['pertinent_domaine']));
            foreach (array_slice($pertinents, 0, 2) as $voulu) {
                if (in_array($voulu, $top, true)) continue;
                for ($i = count($top) - 1; $i >= 0; $i--) {
                    if (!$top[$i]['pertinent_domaine']) {
                        $top[$i] = $voulu;
                        break;
                    }
                }
            }
            // Pertinent d'abord, force ensuite : le hors-sujet passe en contexte.
            usort($top, fn($a, $b) =>
                [$b['pertinent_domaine'], $b['force']] <=> [$a['pertinent_domaine'], $a['force']]);
        }

        return $top;
    }

    /**
     * Set the narrative angle of an on-topic transit entry for the LLM: always
     * the SUBJECT's domain (DOMAINE_RECIT), never the natal house's generic
     * text. Un même transit majeur (Pluton conjoint au Soleil en maison 8…)
     * est légitimement pertinent pour plusieurs sujets à la fois : si l'angle
     * venait de la maison, les conversations amour et argent recevraient
     * exactement la même histoire. L'angle suit le sujet, le transit non.
     */
    private function affecterDomaineARaconter(array &$contact, ?string $domaine): void
    {
        if ($domaine === null || $domaine === 'general' || empty($contact['_via'])) {
            return;
        }
        $contact['domaine_a_raconter'] = self::DOMAINE_RECIT[$domaine] ?? $contact['domaine_cible'];
    }

    /**
     * Estimate when a transit peaks (minimum orb) and when it releases (orb
     * leaves the allowed maximum), by sampling the orb forward and
     * interpolating. Pure computation, snapshots memoized per date.
     * Approximate by design (retrograde stations can shift it by a few days) —
     * the prompt mandates "vers / autour de" phrasing.
     *
     * @return array{exact_vers: ?string, se_libere_vers: ?string} ISO dates or null
     */
    private function estimerFenetreTransit(
        string $transitFr,
        float $natalLon,
        float $angleAspect,
        float $orbeMax,
        \DateTimeInterface $from
    ): array {
        $offsets = [0, 7, 14, 21, 30, 45, 60, 90];
        $orbes = [];

        foreach ($offsets as $o) {
            $d = \DateTime::createFromInterface($from)->modify("+{$o} days");
            $snapshot = $this->buildLyraTransitsArray($d->format('Y-m-d'));
            if (!isset($snapshot[$transitFr])) {
                return ['exact_vers' => null, 'se_libere_vers' => null];
            }
            $sep = PlanetaryCalculator::separation($snapshot[$transitFr]['longitude'], $natalLon);
            $orbes[$o] = abs($sep - $angleAspect);
        }

        $dateAt = fn(float $jours): string => \DateTime::createFromInterface($from)
            ->modify('+' . (int) round($jours) . ' days')
            ->format('Y-m-d');

        // ── exact_vers : offset du minimum, affiné par ajustement parabolique ──
        $oMin = array_keys($orbes, min($orbes))[0];
        $exactVers = null;
        $idxMin = array_search($oMin, $offsets, true);
        if ($idxMin > 0 && $idxMin < count($offsets) - 1) {
            $x1 = $offsets[$idxMin - 1]; $y1 = $orbes[$x1];
            $x2 = $oMin;                 $y2 = $orbes[$x2];
            $x3 = $offsets[$idxMin + 1]; $y3 = $orbes[$x3];
            $den = ($x2 - $x1) * ($y2 - $y3) - ($x2 - $x3) * ($y2 - $y1);
            $sommet = abs($den) > 1e-9
                ? $x2 - 0.5 * (($x2 - $x1) ** 2 * ($y2 - $y3) - ($x2 - $x3) ** 2 * ($y2 - $y1)) / $den
                : (float) $x2;
            $exactVers = $dateAt(max($x1, min($x3, $sommet)));
        }
        // minimum au premier échantillon = pic déjà passé ; au dernier = au-delà de 90 j : null.

        // ── se_libere_vers : première sortie d'orbe après le pic ──
        $seLibereVers = null;
        for ($i = max(1, $idxMin); $i < count($offsets); $i++) {
            $oPrev = $offsets[$i - 1];
            $oCur  = $offsets[$i];
            if ($orbes[$oCur] > $orbeMax && $orbes[$oPrev] <= $orbeMax && $oCur >= $oMin) {
                $ratio = ($orbeMax - $orbes[$oPrev]) / ($orbes[$oCur] - $orbes[$oPrev]);
                $seLibereVers = $dateAt($oPrev + $ratio * ($oCur - $oPrev));
                break;
            }
        }

        return ['exact_vers' => $exactVers, 'se_libere_vers' => $seLibereVers];
    }

    /**
     * Background climate: slow/social planets currently crossing the natal
     * houses tied to the topic, even without a tight aspect. Guarantees
     * on-topic material when transits_actifs has nothing relevant.
     *
     * @param int[] $maisonsTopic
     * @return array<array{planete: string, maison: int, domaine: ?string}>
     */
    private function maisonsEnTransit(
        PlanetaryCalculator $natalCalc,
        \DateTimeInterface $date,
        array $maisonsTopic
    ): array {
        if (empty($maisonsTopic)) {
            return [];
        }

        $table = $this->loadTransitsTable();
        $transits = $this->buildLyraTransitsArray($date->format('Y-m-d'));
        $resultat = [];

        foreach (['Jupiter', 'Saturne', 'Uranus', 'Neptune', 'Pluton'] as $fr) {
            if (!isset($transits[$fr])) continue;
            $maison = $natalCalc->houseOfLongitude($transits[$fr]['longitude']);
            if (!in_array($maison, $maisonsTopic, true)) continue;

            $resultat[] = [
                'planete' => $fr,
                'maison'  => $maison,
                'domaine' => $table['maisons'][(string) $maison] ?? null,
            ];
            if (count($resultat) >= 3) break;
        }

        return $resultat;
    }

    /**
     * Build structured Lyra chat context: grounded transits + 3 natal ancrages.
     */
    public function buildLyraContext(User $user, ?string $question = null, ?TopicLyra $topic = null): array
    {
        // An explicit subject (everything but LIBRE) drives a deterministic selection
        // and boost (×3). classifierDomaine() is kept ONLY for the LIBRE topic — the
        // other topics use the deterministic per-topic affinity below.
        $topicExplicite = $topic !== null && $topic !== TopicLyra::LIBRE;

        if ($topicExplicite) {
            $domaine  = $topic->value;
            $affinite = self::TOPIC_AFFINITE[$topic->value] ?? self::DOMAINE_AFFINITE['general'];
            $boost    = self::BOOST_TOPIC_EXPLICITE;
        } else {
            $domaine  = $this->classifierDomaine((string) $question);
            $affinite = self::DOMAINE_AFFINITE[$domaine] ?? self::DOMAINE_AFFINITE['general'];
            $boost    = self::BOOST_DOMAINE_CLASSIFIE;
        }

        // Astrologie = pedagogical mode: no thematic filter, jargon allowed.
        $pedagogique = $topic === TopicLyra::ASTROLOGIE;

        $birthProfile = $user->getBirthProfile();
        if (!$birthProfile) {
            return [
                'question_domaine' => $domaine,
                'topic'            => $topic?->value,
                'sujet_couvert'    => false,
                'profil_natal'     => [],
                'transit_dominant'     => null,
                'transits_secondaires' => [],
            ];
        }

        $natalCalc = $this->astrologyAnalysisService->createCalculatorFromBirthProfile($birthProfile);
        $natal = $this->buildNatalArray($natalCalc);

        $now = new \DateTime('now', new \DateTimeZone('UTC'));

        $actifs = $this->detecterTransits($natal, $natalCalc, $now, $affinite, $boost);

        // Carte muette (ajout 2) : after boost+sort, is the top domain-relevant transit strong enough?
        // For an open/general question (or astrologie, which surveys the whole sky) there is no
        // specific subject to be mute about -> stay on normal ranking.
        if ($domaine === 'general' || $pedagogique) {
            $sujetCouvert = true;
        } else {
            $transitsDuDomaine = array_filter($actifs, fn($c) => $c['pertinent_domaine']);
            $sujetCouvert = !empty($transitsDuDomaine)
                && reset($transitsDuDomaine)['force'] >= self::SEUIL_PERTINENCE;
        }

        // Sélection finale (garantie : les contacts du sujet sont présents),
        // fenêtres temporelles calculées uniquement sur les entrées retenues,
        // champs internes retirés du JSON envoyé au LLM.
        $selection = $this->selectionnerTransitsLyra($actifs, $topicExplicite);
        foreach ($selection as &$contact) {
            $fenetre = $this->estimerFenetreTransit(
                $contact['transit'],
                $contact['_natal_lon'],
                $contact['_angle'],
                $contact['_orbe_max'],
                $now
            );
            $contact['exact_vers']     = $fenetre['exact_vers'];
            $contact['se_libere_vers'] = $fenetre['se_libere_vers'];
            $this->affecterDomaineARaconter($contact, $domaine);
            unset(
                $contact['_via'], $contact['_angle'], $contact['_orbe_max'],
                $contact['_natal_lon'], $contact['force'], $contact['pertinent_domaine']
            );
        }
        unset($contact);

        // Climat de fond : planètes lentes dans les maisons du sujet (amour/argent/travail…).
        $maisonsEnTransit = $this->maisonsEnTransit($natalCalc, $now, $affinite['maisons']);

        $profilNatal = [
            'lune'   => ($natal['Lune']['signe'] ?? '') . ' (maison ' . ($natal['Lune']['maison'] ?? '?') . ')',
            'asc'    => $natal['ASC']['signe'] ?? '',
            'soleil' => ($natal['Soleil']['signe'] ?? '') . ' (maison ' . ($natal['Soleil']['maison'] ?? '?') . ')',
        ];

        // Topic-specific natal anchors (richer positions + house cusps) for explicit topics.
        if ($topicExplicite) {
            $ancrages = $this->buildTopicNatalAncrages($natalCalc, $topic->value);
            if (!empty($ancrages)) {
                $profilNatal['ancrages_sujet'] = $ancrages;
            }
        }

        // Dominant + secondaires : c'est le PHP qui choisit l'histoire à raconter.
        // Envoyer une liste plate de 5 transits aux natures mélangées pousse le
        // LLM à tout synthétiser, et la synthèse de signaux mixtes produit la
        // même réponse "période contrastée / deux mouvements / navigue" pour
        // tout le monde, tous les jours.
        $contexte = [
            'question_domaine' => $domaine,
            'topic'            => $topic?->value,
            'mode_pedagogique' => $pedagogique,
            'sujet_couvert'    => $sujetCouvert,
            'profil_natal'     => $profilNatal,
            'transit_dominant'     => $selection[0] ?? null,
            'transits_secondaires' => array_slice($selection, 1),
        ];

        if (!empty($maisonsEnTransit)) {
            $contexte['maisons_en_transit'] = $maisonsEnTransit;
        }

        // Lean psy profile: noyau + the axis relevant to the classified domain.
        $psy = $this->psyProfileService->getData($user);
        if ($psy !== null) {
            $contexte['profil_psy'] = $this->psyProfileService->profilPourContexte(
                $psy,
                $domaine === 'general' ? null : $domaine
            );
        }

        return $contexte;
    }

    /**
     * Topic-aware interpreted transits for a month window, past or future.
     * Backs the `get_transits` chat tool: same French output contract as
     * transits_actifs (aspect, orbe, nature, maisons, domaines) so the LLM
     * applies the same translation rules.
     *
     * Samples the 1st/11th/21st of each month in the window (a transit exact
     * on the 20th is no longer missed) and merges duplicates by
     * (transit, cible, aspect), keeping the tightest orb. `culmine_vers` is
     * the sample date of that minimum orb — month-level precision, which the
     * prompt's approximate phrasing ("vers", "autour de") absorbs.
     */
    public function getTransitsForPeriod(
        User $user,
        int $monthsFromNow,
        int $durationMonths = 1,
        ?TopicLyra $topic = null
    ): array {
        $birthProfile = $user->getBirthProfile();
        if (!$birthProfile) {
            return ['periode' => null, 'transit_dominant' => null, 'transits_secondaires' => []];
        }

        $durationMonths = max(1, min(3, $durationMonths));

        $topicExplicite = $topic !== null && $topic !== TopicLyra::LIBRE;
        if ($topicExplicite) {
            $affinite = self::TOPIC_AFFINITE[$topic->value] ?? self::DOMAINE_AFFINITE['general'];
            $boost    = self::BOOST_TOPIC_EXPLICITE;
        } else {
            $affinite = self::DOMAINE_AFFINITE['general'];
            $boost    = 1.0;
        }

        $natalCalc = $this->astrologyAnalysisService->createCalculatorFromBirthProfile($birthProfile);
        $natal = $this->buildNatalArray($natalCalc);

        $now = new \DateTime('now', new \DateTimeZone('UTC'));
        $modifier = ($monthsFromNow >= 0 ? '+' : '') . $monthsFromNow . ' months';
        $debut = (clone $now)->modify($modifier);
        $debut->setDate((int) $debut->format('Y'), (int) $debut->format('n'), 1);
        $fin = (clone $debut)->modify("+{$durationMonths} months -1 day");

        // Échantillonnage 3 fois par mois, fusion par contact (orbe la plus serrée).
        $parContact = [];
        for ($mois = 0; $mois < $durationMonths; $mois++) {
            foreach ([0, 10, 20] as $decalageJours) {
                $sample = (clone $debut)->modify("+{$mois} months +{$decalageJours} days");
                foreach ($this->detecterTransits($natal, $natalCalc, $sample, $affinite, $boost) as $c) {
                    $cle = $c['transit'] . '|' . $c['cible'] . '|' . $c['aspect'];
                    if (!isset($parContact[$cle]) || $c['orbe'] < $parContact[$cle]['orbe']) {
                        $c['culmine_vers'] = $sample->format('Y-m-d');
                        $parContact[$cle] = $c;
                    }
                }
            }
        }

        $transits = array_values($parContact);
        usort($transits, fn($a, $b) => $b['force'] <=> $a['force']);

        $selection = $this->selectionnerTransitsLyra(
            $transits,
            $topicExplicite && $topic !== TopicLyra::ASTROLOGIE,
            6
        );
        foreach ($selection as &$contact) {
            // 'sens' est calculé vs +30 j à la date d'échantillon : à l'échelle
            // d'une fenêtre de plusieurs mois il contredit culmine_vers (un transit
            // rapide échantillonné à son pic est toujours "se_desserre"). On le
            // retire, culmine_vers porte seul le signal temporel.
            $this->affecterDomaineARaconter($contact, $topicExplicite ? $topic->value : null);
            unset(
                $contact['_via'], $contact['_angle'], $contact['_orbe_max'],
                $contact['_natal_lon'], $contact['force'], $contact['pertinent_domaine'],
                $contact['sens']
            );
        }
        unset($contact);

        // Consigne embarquée dans le résultat : les tool_results arrivent en JSON
        // brut hors du flux persona et le modèle a tendance à les "rapporter"
        // littéralement (jargon, vocabulaire des champs). Une instruction
        // co-localisée avec les données est nettement mieux suivie.
        $pedagogique = $topic === TopicLyra::ASTROLOGIE;
        $consigne = $pedagogique
            ? 'Données calculées pour la période demandée. Si la période est à venir, parle au futur. Raconte le transit_dominant, un secondaire au plus.'
            : 'Données internes, déjà interprétées. Ta réponse raconte le transit_dominant, traduit en vécu concret, ancré dans domaine_a_raconter quand il est présent ; UN secondaire au plus, seulement s\'il éclaire directement la question, et jamais en "d\'un côté... de l\'autre". AUCUN jargon (pas de nom d\'aspect, pas de nom de planète imposé, jamais de numéro de maison), n\'emploie pas le vocabulaire de ces champs ("culmine" -> "au plus fort", "le pic"). Si la période est à venir, parle au futur. Arrête-toi quand c\'est dit.';

        $resultat = [
            '_consigne' => $consigne,
            'periode'   => ['debut' => $debut->format('Y-m-d'), 'fin' => $fin->format('Y-m-d')],
            'transit_dominant'     => $selection[0] ?? null,
            'transits_secondaires' => array_slice($selection, 1),
        ];

        // Climat de fond au milieu de la fenêtre.
        $milieu = (clone $debut)->modify('+' . (int) round($durationMonths * 15) . ' days');
        $maisonsEnTransit = $this->maisonsEnTransit($natalCalc, $milieu, $affinite['maisons']);
        if (!empty($maisonsEnTransit)) {
            $resultat['maisons_en_transit'] = $maisonsEnTransit;
        }

        return $resultat;
    }

    /**
     * Build extra natal anchors for an explicit topic: the topic-relevant planet
     * positions plus the key house cusps (sign + occupants). Read from the full
     * chart payload so houses and slow planets (Pluton…) are available even though
     * they are not part of the transit-scoring NATAL_TARGETS.
     *
     * @return string[] Human-readable French lines, ready to drop into the prompt.
     */
    private function buildTopicNatalAncrages(PlanetaryCalculator $calc, string $topic): array
    {
        $payload = $calc->getFullChartPayload();
        $lignes  = [];

        foreach (self::TOPIC_NATAL_PLANETES[$topic] ?? [] as [$en, $labelFr]) {
            $p = $payload['planets'][$en] ?? null;
            if ($p === null) {
                continue;
            }
            $signeFr = $this->signeEnToFr($p['sign'] ?? '');
            $maison  = $p['house'] ?? null;
            $lignes[] = $maison !== null
                ? "{$labelFr} : {$signeFr} (maison {$maison})"
                : "{$labelFr} : {$signeFr}";
        }

        foreach (self::TOPIC_NATAL_MAISONS[$topic] ?? [] as [$num, $themeFr]) {
            $h = $payload['houses'][$num] ?? null;
            if ($h === null) {
                continue;
            }
            $signeFr   = $this->signeEnToFr($h['sign'] ?? '');
            $occupants = array_map(
                fn($en) => self::PLANET_TO_JSON_KEY[$en] ?? $en,
                $h['planets'] ?? []
            );
            $ligne = "Maison {$num} ({$themeFr}) : {$signeFr}";
            if (!empty($occupants)) {
                $ligne .= ', planètes : ' . implode(', ', $occupants);
            }
            $lignes[] = $ligne;
        }

        return $lignes;
    }

    private function signeEnToFr(string $signEn): string
    {
        $idx = array_search($signEn, PlanetaryCalculator::SIGNS, true);
        return $idx !== false ? PlanetaryCalculator::SIGNS_FR[$idx] : $signEn;
    }
}
