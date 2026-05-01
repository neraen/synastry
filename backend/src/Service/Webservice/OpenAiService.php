<?php

namespace App\Service\Webservice;

use App\Service\PromptLocaleService;
use Symfony\Contracts\HttpClient\HttpClientInterface;
use Symfony\Contracts\HttpClient\Exception\ExceptionInterface;

class OpenAiService
{
    private HttpClientInterface $client;
    private string $apiKey;
    private string $apiUrl;
    private PromptLocaleService $localeService;
    private const MODEL_DEFAULT  = 'gpt-4.1-mini';
    private const ALLOWED_MODELS = ['gpt-4.1-mini', 'gpt-4o', 'chatgpt-5-mini'];

    private string $model = self::MODEL_DEFAULT;

    /**
     * Shared astrologer persona injected into every interpretation prompt.
     * Inspired by Liz Greene, Howard Sasportas, Robert Hand, Stephen Arroyo.
     */
    private const ASTROLOGER_PERSONA_FR = <<<'PERSONA'
Tu es un astrologue expérimenté qui parle à un client lors d'une consultation. Tu t'inspires de Liz Greene, Howard Sasportas, Robert Hand et Stephen Arroyo. Profondeur psychologique, pas de spiritualité de comptoir.
Ton : direct, sans condescendance, sans faux espoir. Utilise exclusivement « tu ». Reste dans les faits.

STRUCTURE DU TEXTE :
- Écris des paragraphes courts (2-3 phrases maximum chacun), séparés par une ligne vide.
- Une seule idée par paragraphe. Pas de phrases qui s'enchaînent en mêlant plusieurs concepts.
- Commence chaque paragraphe par la phrase la plus forte, pas par une mise en contexte.
- Phrases courtes, directes. Sujet + verbe + fait astrologique. Pas de subordonnées en cascade.

INTERDIT dans ta réponse :
- Toute formulation d'atténuation du type "peut être difficile mais..."
- "C'est une invitation à..."
- "Tu as le potentiel de..."
- Toute formule vague ou encourageante de coaching
- Les adverbes de modalité : "peut", "pourrait", "parfois"
- Les généralités New Age
PERSONA;

    private const ASTROLOGER_PERSONA_EN = <<<'PERSONA'
You are an experienced astrologer speaking to a client in a consultation. You draw from Liz Greene, Howard Sasportas, Robert Hand, and Stephen Arroyo. Psychological depth — no New Age platitudes.
Tone: direct, without condescension or false hope. Use "you" exclusively. Stay factual.

TEXT STRUCTURE:
- Write short paragraphs (2-3 sentences max each), separated by a blank line.
- One idea per paragraph. Don't chain multiple concepts in a single paragraph.
- Start each paragraph with the strongest statement, not with context-setting.
- Short, direct sentences. Subject + verb + astrological fact. No cascading subordinate clauses.

FORBIDDEN in your response:
- Any softening like "this can be difficult but..."
- "This is an invitation to..."
- "You have the potential to..."
- Any vague coaching language
- Modal adverbs: "can", "could", "might", "sometimes"
- New Age generalities
PERSONA;

    public function __construct(
        HttpClientInterface $client,
        string $apiUrl = 'https://api.openai.com/v1',
        string $apiKey = ''
    ) {
        $this->client = $client;
        $this->apiKey = $apiKey ?: ($_ENV['OPENAI_API_KEY'] ?? '');
        $this->apiUrl = $apiUrl ?: ($_ENV['OPENAI_API_URL'] ?? 'https://api.openai.com/v1');
        $this->localeService = new PromptLocaleService();
    }

    /**
     * Override the OpenAI model for this request.
     * Only accepted values from ALLOWED_MODELS are applied.
     */
    public function setModel(string $model): void
    {
        if (in_array($model, self::ALLOWED_MODELS, true)) {
            $this->model = $model;
        }
    }

    public function getModel(): string
    {
        return $this->model;
    }

    /**
     * Set the locale for prompts
     */
    public function setLocale(string $locale): self
    {
        $this->localeService->setLocale($locale);
        return $this;
    }

    /**
     * Get the current locale
     */
    public function getLocale(): string
    {
        return $this->localeService->getLocale();
    }

    /**
     * Call OpenAI Responses API (/v1/responses)
     */
    private function callResponsesApi(string $input, ?string $instructions = null): array
    {
        $payload = [
            'model' => $this->model,
            'input' => $input,
        ];

        if ($instructions) {
            $payload['instructions'] = $instructions;
        }

        try {
            $response = $this->client->request('POST', $this->apiUrl . '/responses', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->apiKey,
                    'Content-Type'  => 'application/json',
                ],
                'json' => $payload,
            ]);

            $data = $response->toArray();

            $outputText = null;
            foreach ($data['output'] ?? [] as $item) {
                if (($item['type'] ?? '') === 'message') {
                    foreach ($item['content'] ?? [] as $content) {
                        if (($content['type'] ?? '') === 'output_text') {
                            $outputText = $content['text'];
                            break 2;
                        }
                    }
                }
            }

            if (!$outputText) {
                return ['success' => false, 'error' => 'No response from AI', 'raw' => $data];
            }

            return [
                'success' => true,
                'content' => $outputText,
                'model'   => $data['model'] ?? $this->model,
                'usage'   => $data['usage'] ?? null,
            ];

        } catch (ExceptionInterface $e) {
            return ['success' => false, 'error' => 'AI service error: ' . $e->getMessage()];
        }
    }

    /**
     * Translate theme data using the locale service
     */
    private function translateTheme(array $theme): array
    {
        return $this->localeService->translateTheme($theme);
    }

    /**
     * Get astrological advice based on synastry analysis
     */
    public function getAstroAdvice(
        string $userName,
        string $partnerName,
        array $userTheme,
        array $partnerTheme,
        string $question
    ): array {
        // Translate themes using locale service
        $userThemeTranslated = $this->translateTheme($userTheme);
        $partnerThemeTranslated = $this->translateTheme($partnerTheme);

        $baseInstructions = $this->localeService->getBaseInstructions();

        $instructions = $this->localeService->getLocale() === 'en'
            ? self::ASTROLOGER_PERSONA_EN . "\n\nIMPORTANT RULES:\n{$baseInstructions}\n- Explain astrological terms when you use them\n- Give concrete, factual analysis — not advice disguised as observations"
            : self::ASTROLOGER_PERSONA_FR . "\n\nRÈGLES IMPORTANTES :\n{$baseInstructions}\n- Explique les termes astrologiques quand tu les utilises\n- Donne une analyse concrète et factuelle, pas des conseils déguisés en observations";

        $input = $this->localeService->getLocale() === 'en'
            ? "Analyze the love compatibility between {$userName} and {$partnerName}.

### Natal chart of {$userName}:
" . json_encode($userThemeTranslated, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "

### Natal chart of {$partnerName}:
" . json_encode($partnerThemeTranslated, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "

### Question:
{$question}

### What you need to do:
1. Analyze the connections between their planets (conjunctions, trines, squares, etc.)
2. Identify what brings them together and what may create friction
3. Give practical advice for their relationship
4. Assign a compatibility score out of 100

IMPORTANT: Do not ask questions, do not request additional information."
            : "Analyse la compatibilité amoureuse entre {$userName} et {$partnerName}.

### Thème natal de {$userName} :
" . json_encode($userThemeTranslated, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "

### Thème natal de {$partnerName} :
" . json_encode($partnerThemeTranslated, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "

### Question :
{$question}

### Ce que tu dois faire :
1. Analyse les connexions entre leurs planètes (conjonctions, trigones, carrés, etc.)
2. Identifie ce qui les rapproche et ce qui peut créer des frictions
3. Donne des conseils pratiques pour leur relation
4. Attribue une note de compatibilité sur 100

IMPORTANT : Ne pose pas de questions, ne demande pas d'informations supplémentaires.";

        $result = $this->callResponsesApi($input, $instructions);

        if (!$result['success']) {
            return $result;
        }

        $content = $result['content'];
        $score = $this->extractCompatibilityScore($content);

        return [
            'success' => true,
            'analysis' => $content,
            'compatibilityScore' => $score,
            'model' => $result['model'],
            'usage' => $result['usage'],
        ];
    }

    /**
     * Generate a short factual explanation for a single natal planet placement.
     * Non-conversational — reads like a reference card, not a consultation.
     */
    public function getPlanetInterpretation(string $planet, string $sign, float $degree): array
    {
        $isEnglish = $this->localeService->getLocale() === 'en';
        $degreeStr = number_format($degree, 1, '.', '');

        if ($isEnglish) {
            $instructions = <<<INST
You are an expert astrologer writing concise reference entries.
Write in plain text, no markdown. No greeting, no sign-off.
Third-person present tense: "The Sun in Aquarius...", "Mars here...".
4 to 5 sentences. One idea per sentence. Factual and precise — psychological astrology in the tradition of Liz Greene and Robert Hand.
Forbidden: "may", "might", "can sometimes", "potential", "invitation", "journey", New Age language.
INST;
            $input = "Natal placement: {$planet} in {$sign} at {$degreeStr}°\n\nWrite the reference explanation for this natal placement.";
        } else {
            $instructions = <<<INST
Tu es un astrologue expert qui rédige des fiches de référence concises.
Texte brut uniquement, pas de markdown. Pas de salutation, pas de formule de clôture.
Troisième personne du singulier au présent : « Le Soleil en Verseau... », « Mars ici... ».
4 à 5 phrases. Une seule idée par phrase. Factuel et précis — astrologie psychologique dans la tradition de Liz Greene et Robert Hand.
Interdit : « peut », « pourrait », « parfois », « potentiel », « invitation », « chemin », langage New Age.
INST;
            $input = "Position natale : {$planet} en {$sign} à {$degreeStr}°\n\nRédige la fiche d'explication de cette position natale.";
        }

        $result = $this->callResponsesApi($input, $instructions);

        if (!$result['success']) {
            return $result;
        }

        return [
            'success'        => true,
            'interpretation' => $result['content'],
        ];
    }

    /**
     * Get a short personality summary (Sun, Moon, Ascendant — 3-4 sentences)
     */
    public function getNatalChartSummary(string $name, array $theme): array
    {
        $themeTranslated = $this->translateTheme($theme);
        $prompt = $this->localeService->getNatalChartSummaryPrompt();
        $persona = $this->localeService->getLocale() === 'en' ? self::ASTROLOGER_PERSONA_EN : self::ASTROLOGER_PERSONA_FR;

        $instructions = $persona;

        $input = $prompt['label'] . " {$name} :\n\n"
            . json_encode($themeTranslated, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
            . "\n\n" . $prompt['instruction'];

        $result = $this->callResponsesApi($input, $instructions);

        if (!$result['success']) {
            return $result;
        }

        return [
            'success' => true,
            'summary' => $result['content'],
        ];
    }

    /**
     * Get a single natal chart interpretation
     */
    public function getNatalChartInterpretation(string $name, array $theme): array
    {
        // Translate theme using locale service
        $themeTranslated = $this->translateTheme($theme);
        $baseInstructions = $this->localeService->getBaseInstructions();

        $instructions = $this->localeService->getLocale() === 'en'
            ? self::ASTROLOGER_PERSONA_EN . "\n\nIMPORTANT RULES:\n{$baseInstructions}\n- Explain astrological terms when necessary but don't oversimplify — the person can handle the truth"
            : self::ASTROLOGER_PERSONA_FR . "\n\nRÈGLES IMPORTANTES :\n{$baseInstructions}\n- Explique les termes astrologiques quand nécessaire, sans infantiliser";

        $input = $this->localeService->getLocale() === 'en'
            ? "Interpret the natal chart of {$name}:

" . json_encode($themeTranslated, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "

Write a precise interpretation covering:
1. Their fundamental character structure (Sun, Moon, Ascendant) — what drives them at the core
2. How they think and communicate (Mercury) — their mental architecture
3. What they actually seek in love versus what they believe they seek (Venus)
4. Where their energy and desire go — and where they block (Mars)
5. The main psychological tensions in this chart and what they demand"
            : "Interprète le thème natal de {$name} :

" . json_encode($themeTranslated, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "

Rédige une interprétation précise qui couvre :
1. La structure de personnalité fondamentale (Soleil, Lune, Ascendant) — ce qui anime vraiment cette personne
2. Comment elle pense et communique (Mercure) — son architecture mentale
3. Ce qu'elle cherche réellement en amour par opposition à ce qu'elle croit chercher (Vénus)
4. Où vont son énergie et son désir — et où ça se bloque (Mars)
5. Les tensions psychologiques principales de ce thème et ce qu'elles exigent";

        $result = $this->callResponsesApi($input, $instructions);

        if (!$result['success']) {
            return $result;
        }

        return [
            'success' => true,
            'interpretation' => $result['content'],
        ];
    }

    /**
     * Get compatibility analysis from a pre-built prompt (with aspects)
     */
    public function getCompatibilityAnalysis(string $prompt): array
    {
        $baseInstructions = $this->localeService->getBaseInstructions();

        $instructions = $this->localeService->getLocale() === 'en'
            ? "You are an astrological scoring engine. Your role is to produce ACCURATE and CONTRASTED compatibility scores based strictly on astrological facts — not to be kind or balanced.\n\nIMPORTANT RULES:\n{$baseInstructions}\n- Follow the scoring method described in the prompt exactly\n- Respond ONLY with valid JSON, no text before or after"
            : "Tu es un moteur de scoring astrologique. Ton rôle est de produire des scores de compatibilité PRÉCIS et CONTRASTÉS basés strictement sur les faits astrologiques — pas d'être gentil ou équilibré.\n\nRÈGLES IMPORTANTES :\n{$baseInstructions}\n- Suis exactement la méthode de scoring décrite dans le prompt\n- Réponds UNIQUEMENT en JSON valide, sans texte avant ou après";

        $result = $this->callResponsesApi($prompt, $instructions);

        if (!$result['success']) {
            return $result;
        }

        $content = $result['content'];

        // Try to parse JSON response
        $jsonData = $this->parseJsonResponse($content);

        if ($jsonData) {
            // Build readable analysis from JSON
            $analysis = $this->buildReadableAnalysis($jsonData);

            // Calculate score from dimensions instead of trusting AI's score_global
            $calculatedScore = $this->calculateScoreFromDimensions($jsonData);

            return [
                'success' => true,
                'analysis' => $analysis,
                'compatibilityScore' => $calculatedScore,
                'details' => $jsonData,
            ];
        }

        // Fallback: use raw content
        $score = $this->extractCompatibilityScore($content);

        return [
            'success' => true,
            'analysis' => $content,
            'compatibilityScore' => $score,
        ];
    }

    /**
     * Parse JSON from AI response (handle markdown code blocks)
     */
    private function parseJsonResponse(string $content): ?array
    {
        // Remove markdown code blocks if present
        $content = preg_replace('/^```json?\s*/m', '', $content);
        $content = preg_replace('/```\s*$/m', '', $content);
        $content = trim($content);

        $data = json_decode($content, true);

        if (json_last_error() === JSON_ERROR_NONE && is_array($data)) {
            return $data;
        }

        return null;
    }

    /**
     * Build readable analysis from JSON data
     */
    private function buildReadableAnalysis(array $data): string
    {
        $parts = [];
        $isEnglish = $this->localeService->getLocale() === 'en';

        if (isset($data['headline'])) {
            $parts[] = "**" . $data['headline'] . "**\n";
        }

        if (isset($data['resume'])) {
            $parts[] = $data['resume'] . "\n";
        }

        if (!empty($data['forces'])) {
            $parts[] = $isEnglish ? "\n**Strengths:**" : "\n**Points forts :**";
            foreach ($data['forces'] as $force) {
                $parts[] = "• " . $force;
            }
        }

        if (!empty($data['tensions'])) {
            $parts[] = $isEnglish ? "\n**Challenges:**" : "\n**Points de vigilance :**";
            foreach ($data['tensions'] as $tension) {
                $parts[] = "• " . $tension;
            }
        }

        if (isset($data['aspect_cle'])) {
            $keyAspectLabel = $isEnglish ? "Key aspect" : "Aspect clé";
            $parts[] = "\n**{$keyAspectLabel} :** " . ($data['aspect_cle']['planetes'] ?? '');
            if (isset($data['aspect_cle']['impact'])) {
                $parts[] = $data['aspect_cle']['impact'];
            }
        }

        if (isset($data['conseil'])) {
            $adviceLabel = $isEnglish ? "Advice" : "Conseil";
            $parts[] = "\n**{$adviceLabel} :** " . $data['conseil'];
        }

        return implode("\n", $parts);
    }

    /**
     * Generate daily horoscope content
     */
    public function generateDailyHoroscope(string $prompt): array
    {
        $baseInstructions = $this->localeService->getBaseInstructions();

        $instructions = $this->localeService->getLocale() === 'en'
            ? "You are a practicing astrologer writing a personalized daily horoscope in the tradition of Robert Hand (Planets in Transit), Liz Greene, and Stephen Arroyo.\n\nCORE RULE: every sentence must be grounded in a specific astrological datum from the prompt — exact planetary position, sign, or computed aspect. Zero generalities.\n\nSLOW PLANETS (Saturn, Jupiter, Uranus, Neptune, Pluto) in transit = background themes of the period. Cite the natal planet they are activating.\nFAST PLANETS (Moon, Mercury, Venus, Mars, Sun) in transit = specific energy of the day.\n\nNEVER name the aspect type (trine, square, conjunction, etc.) — translate directly into plain human language.\n\nFORBIDDEN: \"a period of transformation\", \"the energies are favorable\", \"the universe\", \"potential\", \"invitation to\", modal hedging (\"may\", \"might\", \"could\").\n\nRespond ONLY in valid JSON, no text before or after."
            : "Tu es un astrologue praticien qui rédige un horoscope quotidien personnalisé dans la tradition de Robert Hand (Planets in Transit), Liz Greene et Stephen Arroyo.\n\nRÈGLE ABSOLUE : chaque phrase doit être justifiée par une donnée astrologique précise issue du prompt — position planétaire exacte, signe, aspect calculé. Zéro généralité.\n\nPLANÈTES LENTES (Saturne, Jupiter, Uranus, Neptune, Pluton) en transit = tendances de fond de la période. Cite la planète natale qu'elles activent.\nPLANÈTES RAPIDES (Lune, Mercure, Vénus, Mars, Soleil) en transit = énergie spécifique du jour.\n\nNE CITE JAMAIS le type d'aspect (trigone, carré, conjonction, etc.) — traduis directement en impact humain courant.\n\nINTERDIT : \"une période de transformation\", \"les énergies sont favorables\", \"l'univers\", \"potentiel\", \"invitation à\", modaux d'évitement (\"peut\", \"pourrait\").\n\nRéponds UNIQUEMENT en JSON valide, sans texte avant ou après.";

        $result = $this->callResponsesApi($prompt, $instructions);

        if (!$result['success']) {
            return $result;
        }

        $content = $result['content'];

        // Parse JSON response
        $jsonData = $this->parseJsonResponse($content);

        if ($jsonData) {
            return [
                'success' => true,
                'content' => $jsonData,
            ];
        }

        // Fallback: try to extract basic structure from text
        $defaultTitle = $this->localeService->getLocale() === 'en' ? 'Your daily horoscope' : 'Votre horoscope du jour';
        return [
            'success' => true,
            'content' => [
                'title' => $defaultTitle,
                'overview' => $content,
                'love' => '',
                'energy' => '',
                'advice' => '',
            ],
        ];
    }

    /**
     * Use the AI's score_global directly — it is computed per the scoring method in the prompt.
     * Fallback to simple average of dimension scores if score_global is missing.
     */
    private function calculateScoreFromDimensions(array $data): ?int
    {
        // Trust the AI's score_global (computed following our scoring instructions)
        if (isset($data['score_global']) && is_numeric($data['score_global'])) {
            return max(0, min(100, (int) $data['score_global']));
        }

        // Fallback: simple average of dimension scores
        $dimensions = $data['dimensions'] ?? [];
        $scores = [];
        foreach ($dimensions as $dimension) {
            if (isset($dimension['score']) && is_numeric($dimension['score'])) {
                $scores[] = (int) $dimension['score'];
            }
        }

        if (empty($scores)) {
            return null;
        }

        return max(0, min(100, (int) round(array_sum($scores) / count($scores))));
    }

    /**
     * Get upcoming transits prediction using natal chart and current transits
     */
    public function getUpcomingTransits(string $prompt): array
    {
        $isEnglish = $this->localeService->getLocale() === 'en';
        $baseInstructions = $this->localeService->getBaseInstructions();

        $instructions = $isEnglish
            ? "You are a precise astrologer. Identify the 3 most significant upcoming transits based on the natal chart and current planetary positions.\n\nIMPORTANT RULES:\n{$baseInstructions}\n- Respond ONLY with a valid JSON array, no text before or after\n- Each transit must be personally significant based on the natal chart positions\n- Write descriptions in clear, non-technical language"
            : "Tu es un astrologue précis. Identifie les 3 prochains transits les plus significatifs basés sur le thème natal et les positions planétaires actuelles.\n\nRÈGLES IMPORTANTES :\n{$baseInstructions}\n- Réponds UNIQUEMENT avec un tableau JSON valide, sans texte avant ou après\n- Chaque transit doit être personnellement significatif d'après les positions natales\n- Rédige les descriptions dans un langage clair et non technique";

        $result = $this->callResponsesApi($prompt, $instructions);

        if (!$result['success']) {
            return $result;
        }

        $jsonData = $this->parseJsonResponse($result['content']);

        if (!$jsonData || !is_array($jsonData)) {
            return ['success' => false, 'error' => 'Invalid JSON response from AI'];
        }

        return [
            'success' => true,
            'transits' => array_slice($jsonData, 0, 3),
        ];
    }

    /**
     * Generate the weekly cosmic headline (title + subtitle).
     * Global — not user-specific.
     */
    public function getCosmicHeadline(): array
    {
        $isEnglish = $this->localeService->getLocale() === 'en';
        $today = (new \DateTime())->format($isEnglish ? 'F j, Y' : 'd/m/Y');
        $weekStart = (new \DateTime('monday this week'))->format($isEnglish ? 'F j' : 'j F');
        $weekEnd   = (new \DateTime('sunday this week'))->format($isEnglish ? 'F j' : 'j F');

        if ($isEnglish) {
            $instructions = "You are a master astrologer writing the headline for a premium astrology app. Your tone is mystical, elegant, and grounded — never cheesy.";
            $prompt = <<<PROMPT
Today is {$today}. Week of {$weekStart} – {$weekEnd}.

Generate the weekly cosmic headline for this app. Consider real current planetary positions, major aspects, or significant transits happening this week.

Respond ONLY with valid JSON (no text before or after):
{"title": "...", "subtitle": "..."}

Rules:
- "title": 2–5 words max, poetic and striking. Examples: "Saturn Meets the Sun", "Eclipse Season Opens", "Venus Stations Direct"
- "subtitle": exactly 1 sentence (max 12 words), describes the energy or invitation of this week
- Do NOT use generic phrases like "cosmic energy" or "the universe"
- Be specific to actual planetary events of the week
PROMPT;
        } else {
            $instructions = "Tu es un astrologue maître qui rédige le titre hebdomadaire d'une application astrologique premium. Ton ton est mystique, élégant et ancré — jamais kitsch.";
            $prompt = <<<PROMPT
Aujourd'hui, le {$today}. Semaine du {$weekStart} au {$weekEnd}.

Génère le titre cosmique hebdomadaire de cette application. Tiens compte des positions planétaires actuelles, des aspects majeurs ou des transits significatifs de cette semaine.

Réponds UNIQUEMENT en JSON valide (sans texte avant ou après) :
{"title": "...", "subtitle": "..."}

Règles :
- "title" : 2 à 5 mots maximum, poétique et percutant. Exemples : "Saturne affronte le Soleil", "Saison des Éclipses", "Vénus en Station Directe"
- "subtitle" : exactement 1 phrase (12 mots max), décrit l'énergie ou l'invitation de cette semaine
- N'utilise PAS de formules génériques comme "énergie cosmique" ou "l'univers"
- Sois spécifique aux événements planétaires réels de la semaine
PROMPT;
        }

        $result = $this->callResponsesApi($prompt, $instructions);

        if (!$result['success']) {
            return $result;
        }

        $data = $this->parseJsonResponse($result['content']);

        if (!$data || empty($data['title']) || empty($data['subtitle'])) {
            return ['success' => false, 'error' => 'Invalid headline response from AI'];
        }

        return [
            'success'  => true,
            'title'    => $data['title'],
            'subtitle' => $data['subtitle'],
        ];
    }

    /**
     * Send a chat message to Lyra (AI astrologer) with full conversation history.
     * Stateless — caller sends the full messages array each time.
     *
     * @param array $messages    [['role' => 'user'|'assistant', 'content' => string], ...]
     * @param array $userContext {
     *   name?: string, birth_date?: string, birth_city?: string,
     *   positions?: array<string, array{Sign: string, Position: float}>,
     *   partner_name?: string,
     *   partner_positions?: array<string, array{Sign: string, Position: float}>,
     *   compatibility_score?: float
     * }
     * @param \Closure|null $toolHandler Callback to handle tool execution
     * @param array $tools Array of tool definitions
     */
    public function getChatResponse(array $messages, array $userContext, ?\Closure $toolHandler = null, array $tools = []): array
    {
        $isEnglish = $this->localeService->getLocale() === 'en';

        $developerPrompt = $isEnglish
            ? "You are Lyra, a straight-talking and warm astrologer in the AstroMatch app. You speak like a knowledgeable friend — direct, natural, no unnecessary flourish. Not a solemn oracle.\n\nStrict rules:\n- ALWAYS ground your answer in the exact natal positions provided below. Name the specific placement (e.g. \"your Moon in Scorpio\"). Never speak in generalities.\n- For questions about the future or upcoming periods, use the upcoming transit data provided below — real computed aspects for the next 12 months. Only reference transits that are actually listed there.\n- NEVER use technical astrological jargon: no \"trine\", \"square\", \"conjunction\", \"opposition\", \"sextile\", \"quincunx\", \"transit\", \"aspect\", \"orb\". Instead, translate the meaning into plain human impact — e.g. instead of \"Saturn squares your Moon\" say \"Saturn is putting pressure on your emotional world right now\".\n- Avoid vague spiritual filler like \"the universe is guiding you\" — be concrete.\n- Default to 2–4 sentences. Go longer only if the question genuinely calls for it.\n- Warm and direct. Skip the ceremonial tone."
            : "Tu es Lyra, une astrologue directe et chaleureuse dans l'app AstroMatch. Tu parles comme une amie qui maîtrise vraiment l'astrologie — naturelle, sans chichi, pas du tout solennelle.\n\nRègles strictes :\n- Appuie TOUJOURS tes propos sur les positions natales exactes fournies ci-dessous. Cite-les nommément (ex : \"ton Soleil en Taureau\", \"ta Lune en Scorpion\"). Pas de généralités.\n- Pour les questions sur l'avenir ou les prochaines périodes, utilise les données de transits à venir fournies ci-dessous — de vrais aspects calculés pour les 12 prochains mois. Ne cite que les transits qui y figurent réellement.\n- N'utilise JAMAIS de jargon astrologique technique : pas de \"trigone\", \"carré\", \"conjonction\", \"opposition\", \"sextile\", \"quinconce\", \"transit\", \"aspect\", \"orbe\". Traduis toujours en impact humain concret — ex : au lieu de \"Saturne en carré avec ta Lune\" dis \"Saturne met de la pression sur ta vie émotionnelle en ce moment\".\n- Évite les formulations creuses du style \"l'univers vous guide\" — sois concrète.\n- Par défaut 2 à 4 phrases. Plus long seulement si la question le justifie vraiment.\n- Ton chaleureux et direct. Pas de style oracle.";

        if (!empty($tools)) {
            $developerPrompt .= $isEnglish
                ? "\n- If the user asks about a specific future period not explicitly covered by the transits below, or wants a precise prediction for a given time (e.g., 'in 6 months'), ALWAYS use the `get_transits` tool to calculate the exact transits for that period."
                : "\n- Si l'utilisateur pose une question sur une période future spécifique non couverte par les transits ci-dessous, ou veut une prédiction précise (ex: 'dans 6 mois'), utilise TOUJOURS l'outil `get_transits` pour calculer les transits exacts de cette période.";
        }

        $systemContext = "";

        // ── User identity ────────────────────────────────────────────────────────
        $identityLines = [];
        if (!empty($userContext['name'])) {
            $identityLines[] = $isEnglish ? "Name: {$userContext['name']}" : "Prénom : {$userContext['name']}";
        }
        if (!empty($userContext['birth_date'])) {
            $identityLines[] = $isEnglish ? "Born: {$userContext['birth_date']}" : "Naissance : {$userContext['birth_date']}";
        }
        if (!empty($userContext['birth_city'])) {
            $identityLines[] = $isEnglish ? "City: {$userContext['birth_city']}" : "Ville : {$userContext['birth_city']}";
        }
        if (!empty($identityLines)) {
            $label = $isEnglish ? "— User —" : "— Utilisateur —";
            $systemContext .= $label . "\n" . implode("\n", $identityLines) . "\n\n";
        }

        // ── User natal chart positions ───────────────────────────────────────────
        if (!empty($userContext['positions'])) {
            $label = $isEnglish ? "User's natal chart:" : "Thème natal de l'utilisateur :";
            $systemContext .= $label . "\n" . $this->formatPositions($userContext['positions']) . "\n\n";
        }

        // ── Partner context (optional) ───────────────────────────────────────────
        if (!empty($userContext['partner_name'])) {
            $partnerName = $userContext['partner_name'];
            $score = isset($userContext['compatibility_score']) ? (int) $userContext['compatibility_score'] : null;
            $scoreStr = $score !== null ? ($isEnglish ? " (compatibility score: {$score}/100)" : " (score de compatibilité : {$score}/100)") : '';
            $label = $isEnglish
                ? "— Partner in context: {$partnerName}{$scoreStr} —"
                : "— Partenaire en contexte : {$partnerName}{$scoreStr} —";
            $systemContext .= $label . "\n";

            if (!empty($userContext['partner_positions'])) {
                $posLabel = $isEnglish ? "{$partnerName}'s natal chart:" : "Thème natal de {$partnerName} :";
                $systemContext .= $posLabel . "\n" . $this->formatPositions($userContext['partner_positions']) . "\n\n";
            }
        }

        // ── Upcoming transits (next 12 months) ──────────────────────────────────
        if (!empty($userContext['upcoming_transits'])) {
            $label = $isEnglish
                ? "— Upcoming transits (next 12 months, computed) —"
                : "— Transits à venir (12 prochains mois, calculés) —";
            $systemContext .= $label . "\n" . $this->formatUpcomingTransits($userContext['upcoming_transits'], $isEnglish) . "\n\n";
        }

        $systemContext = trim($systemContext);

        $chatMessages = [
            ['role' => 'developer', 'content' => $developerPrompt]
        ];

        if (!empty($systemContext)) {
            $chatMessages[] = ['role' => 'system', 'content' => $systemContext];
        }

        $inputMessages = array_values(array_map(fn($m) => [
            'role'    => $m['role'],
            'content' => trim((string) $m['content']),
        ], $messages));

        $chatMessages = array_merge($chatMessages, $inputMessages);

        $result = $this->callMultiTurnApi($chatMessages, $toolHandler, $tools);

        if (!$result['success']) {
            return $result;
        }

        return ['success' => true, 'message' => $result['content']];
    }

    /**
     * Generate a short, descriptive title for a chat based on its first messages.
     * Keeps it under 40 characters.
     */
    public function generateChatTitle(array $messages): string
    {
        $isEnglish = $this->localeService->getLocale() === 'en';
        
        // Take at most the first 3 messages to understand the context
        $contextMessages = array_slice($messages, 0, 3);
        $chatText = "";
        foreach ($contextMessages as $m) {
            $role = $m['role'] === 'user' ? 'User' : 'Lyra';
            $chatText .= "{$role}: {$m['content']}\n";
        }

        $instructions = $isEnglish
            ? "You are a summarization assistant. Your task is to generate a very short title (max 40 characters, 3-5 words) for an astrological chat conversation based on its first few messages. NEVER use quotes. Just return the raw title."
            : "Tu es un assistant de résumé. Ta tâche est de générer un titre très court (max 40 caractères, 3-5 mots) pour une conversation de chat astrologique basé sur ses premiers messages. N'utilise JAMAIS de guillemets. Retourne juste le titre brut.";

        $input = ($isEnglish ? "Chat messages:\n" : "Messages du chat :\n") . $chatText . ($isEnglish ? "\n\nGenerate title:" : "\n\nGénère le titre :");

        $result = $this->callResponsesApi($input, $instructions);

        if (!$result['success']) {
            return $isEnglish ? "New conversation" : "Nouvelle conversation";
        }

        // Clean up the output
        $title = trim($result['content'], " \t\n\r\0\x0B\"'");
        
        if (mb_strlen($title) > 50) {
            $title = mb_substr($title, 0, 47) . '...';
        }

        return $title;
    }

    /**
     * Format the upcoming transit summary into a compact, readable string for the prompt.
     * e.g. "2026-05: Saturn Square Moon (2.3°), Jupiter Trine Sun (1.1°)"
     */
    private function formatUpcomingTransits(array $upcomingTransits, bool $isEnglish): string
    {
        $lines = [];
        foreach ($upcomingTransits as $entry) {
            $month = $entry['month'] ?? '';
            $aspects = $entry['aspects'] ?? [];
            if (empty($aspects)) continue;

            $parts = array_map(function (array $a) {
                return sprintf('%s %s %s (%.1f°)', $a['transit'], $a['type'], $a['natal'], $a['orb']);
            }, $aspects);

            $lines[] = $month . ': ' . implode(', ', $parts);
        }
        return implode("\n", $lines);
    }

    /**
     * Format planetary positions array into a readable string for the prompt.
     * e.g. "Sun: Taurus 24° · Moon: Capricorn 27° · ..."
     */
    private function formatPositions(array $positions): string
    {
        $lines = [];
        foreach ($positions as $planet => $data) {
            if (empty($data['Sign'])) continue;
            $deg = isset($data['Position']) ? round((float) $data['Position']) . '°' : '';
            $lines[] = "{$planet}: {$data['Sign']} {$deg}";
        }
        return implode("\n", $lines);
    }

    /**
     * Call OpenAI Responses API (/v1/responses) for multi-turn conversation with optional tool use.
     */
    private function callMultiTurnApi(array $chatMessages, ?\Closure $toolHandler = null, array $tools = []): array
    {
        // Split developer/system messages (→ instructions) from conversation messages (→ input)
        $instructions = '';
        $inputMessages = [];

        foreach ($chatMessages as $msg) {
            if (in_array($msg['role'], ['developer', 'system'], true)) {
                $instructions .= ($instructions !== '' ? "\n\n" : '') . $msg['content'];
            } else {
                $inputMessages[] = ['role' => $msg['role'], 'content' => $msg['content']];
            }
        }

        $payload = ['model' => $this->model, 'input' => $inputMessages];
        if ($instructions !== '') {
            $payload['instructions'] = $instructions;
        }

        // Convert tools from Chat Completions format to Responses API format
        if (!empty($tools)) {
            $payload['tools'] = array_map(function (array $tool): array {
                if (isset($tool['function'])) {
                    return [
                        'type'        => 'function',
                        'name'        => $tool['function']['name'],
                        'description' => $tool['function']['description'] ?? '',
                        'parameters'  => $tool['function']['parameters'] ?? new \stdClass(),
                    ];
                }
                return $tool;
            }, $tools);
        }

        try {
            $response = $this->client->request('POST', $this->apiUrl . '/responses', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->apiKey,
                    'Content-Type'  => 'application/json',
                ],
                'json' => $payload,
            ]);

            $data = $response->toArray();

            $outputText = null;
            $toolCalls  = [];

            foreach ($data['output'] ?? [] as $item) {
                if (($item['type'] ?? '') === 'function_call') {
                    $toolCalls[] = $item;
                } elseif (($item['type'] ?? '') === 'message') {
                    foreach ($item['content'] ?? [] as $content) {
                        if (($content['type'] ?? '') === 'output_text') {
                            $outputText = $content['text'];
                        }
                    }
                }
            }

            // Handle tool calls
            if (!empty($toolCalls) && $toolHandler !== null) {
                // Append the assistant output items then the tool results
                foreach ($data['output'] as $item) {
                    $inputMessages[] = $item;
                }

                foreach ($toolCalls as $toolCall) {
                    $arguments = json_decode($toolCall['arguments'], true) ?? [];
                    $toolResult = $toolHandler($toolCall['name'], $arguments);

                    $inputMessages[] = [
                        'type'    => 'function_call_output',
                        'call_id' => $toolCall['call_id'],
                        'output'  => is_string($toolResult) ? $toolResult : json_encode($toolResult, JSON_UNESCAPED_UNICODE),
                    ];
                }

                $payload['input'] = $inputMessages;

                $response2 = $this->client->request('POST', $this->apiUrl . '/responses', [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $this->apiKey,
                        'Content-Type'  => 'application/json',
                    ],
                    'json' => $payload,
                ]);

                $data2 = $response2->toArray();
                foreach ($data2['output'] ?? [] as $item) {
                    if (($item['type'] ?? '') === 'message') {
                        foreach ($item['content'] ?? [] as $content) {
                            if (($content['type'] ?? '') === 'output_text') {
                                $outputText = $content['text'];
                            }
                        }
                    }
                }
            }

            if (!$outputText) {
                return ['success' => false, 'error' => 'No response from AI', 'raw' => $data];
            }

            return ['success' => true, 'content' => $outputText];

        } catch (ExceptionInterface $e) {
            return ['success' => false, 'error' => 'AI service error: ' . $e->getMessage()];
        }
    }

    /**
     * Extract compatibility score from AI response
     */
    private function extractCompatibilityScore(string $content): ?int
    {
        // Try to find patterns like "85/100", "85 sur 100", "85%", "note : 85"
        $patterns = [
            '/(\d{1,3})\s*[\/sur]+\s*100/i',
            '/(\d{1,3})\s*%/',
            '/note\s*:?\s*(\d{1,3})/i',
            '/compatibilit[ée]\s*:?\s*(\d{1,3})/i',
        ];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $content, $matches)) {
                $score = (int) $matches[1];
                if ($score >= 0 && $score <= 100) {
                    return $score;
                }
            }
        }

        return null;
    }

    /**
     * Generate a short interpretation for a single transit aspect
     */
    public function getTransitInterpretation(
        string $transitPlanet,
        string $natalPlanet,
        string $aspectType,
        string $aspectName,
        float $orb,
        string $sunSign,
        string $moonSign,
        string $ascendant
    ): array {
        $isEnglish = $this->localeService->getLocale() === 'en';
        $today = (new \DateTime())->format($isEnglish ? 'F j, Y' : 'd/m/Y');

        if ($isEnglish) {
            $instructions = self::ASTROLOGER_PERSONA_EN . "\n\nPlain text only, no markdown. 3–4 sentences maximum.";
            $input = <<<PROMPT
Today is {$today}.

Transit: {$transitPlanet} {$aspectName} natal {$natalPlanet} (orb {$orb}°)
Natal chart: Sun in {$sunSign}, Moon in {$moonSign}, Ascendant {$ascendant}

Analyze this transit following this structure in your paragraph:
1. The fundamental nature of {$transitPlanet} (what it represents as a principle)
2. The fundamental nature of natal {$natalPlanet} (what it represents in this person's chart)
3. What their {$aspectName} creates as a dynamic right now
4. How this manifests concretely in daily life today
5. What this transit actually demands from this person
PROMPT;
        } else {
            $instructions = self::ASTROLOGER_PERSONA_FR . "\n\nTexte brut uniquement, pas de markdown. 3 à 4 phrases maximum.";
            $input = <<<PROMPT
Aujourd'hui, le {$today}.

Transit : {$transitPlanet} {$aspectName} {$natalPlanet} natal (orbe {$orb}°)
Thème natal : Soleil en {$sunSign}, Lune en {$moonSign}, Ascendant {$ascendant}

Analyse ce transit en respectant cette structure dans le paragraphe :
1. La nature fondamentale de {$transitPlanet} (ce qu'il représente comme principe)
2. La nature fondamentale de {$natalPlanet} natal (ce qu'il représente dans ce thème)
3. Ce que leur {$aspectName} crée comme dynamique en ce moment
4. Comment cela se manifeste concrètement dans la vie aujourd'hui
5. Ce que ce transit exige réellement de cette personne
PROMPT;
        }

        $result = $this->callResponsesApi($input, $instructions);

        if (!$result['success']) {
            return $result;
        }

        return [
            'success' => true,
            'interpretation' => trim($result['content']),
        ];
    }

    /**
     * Generate a Miroir Temporel interpretation for a specific age.
     *
     * System prompt from spec: bienveillant, 120 mots max, première personne du pluriel,
     * paragraphe fluide, toujours en français.
     */
    public function getMirrorInterpretation(
        string $natalSummary,
        int $age,
        int $year,
        string $activeAspects,
        ?string $pinnedEvent = null
    ): array {
        $pinnedPart = $pinnedEvent !== null && $pinnedEvent !== ''
            ? "\nÉvénement vécu à cet âge : {$pinnedEvent}."
            : '';

        $instructions = self::ASTROLOGER_PERSONA_FR . "\n\nRéponds en français. Pas de listes, pas de titres. Chaque section est un court paragraphe séparé par une ligne vide (\\n\\n). 200 mots maximum au total.";

        $input = <<<INPUT
Thème natal : {$natalSummary}.
Transits actifs à {$age} ans ({$year}) : {$activeAspects}.{$pinnedPart}

Analyse l'énergie dominante de cette période de vie. Structure ta réponse en 4 paragraphes distincts, séparés par une ligne vide :

Paragraphe 1 — Les planètes en jeu : quelle planète transit active quoi dans le thème natal, et quelle est sa nature.
Paragraphe 2 — La dynamique créée : la tension ou harmonie concrète entre ces principes planétaires.
Paragraphe 3 — La manifestation réelle : comment ça se vit concrètement à {$age} ans.
Paragraphe 4 — Conclusion : en une ou deux phrases, ce que cette période marque dans la trajectoire de vie — sans encouragement, sans espoir artificiel.
INPUT;

        $result = $this->callResponsesApi($input, $instructions);

        if (!$result['success']) {
            return $result;
        }

        return [
            'success'        => true,
            'interpretation' => trim($result['content']),
        ];
    }
}