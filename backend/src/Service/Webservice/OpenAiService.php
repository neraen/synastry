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
    private const ALLOWED_MODELS = ['gpt-4.1-mini', 'gpt-4o', 'gpt-5-mini'];

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
                'json'    => $payload,
                'timeout' => 180,
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
     * Get compatibility analysis from a pre-built prompt (with aspects).
     * Scores are pre-calculated deterministically by PHP and injected here —
     * the AI only produces interpretation text.
     */
    public function getCompatibilityAnalysis(string $prompt, array $calculatedScores = []): array
    {
        $isEnglish = $this->localeService->getLocale() === 'en';
        $instructions = $isEnglish
            ? "You are an experienced astrologer. Write a compatibility analysis based on the data provided. Respond ONLY with valid JSON, no text before or after."
            : "Tu es un astrologue expérimenté. Rédige une analyse de compatibilité à partir des données fournies. Réponds UNIQUEMENT en JSON valide, sans texte avant ou après.";

        if (!empty($calculatedScores) && isset($calculatedScores['score_global'])) {
            $score = $calculatedScores['score_global'];
            $instructions .= $isEnglish
                ? "\n\nA compatibility score of {$score}/100 has been pre-calculated. Use it as a reference for coherence in your analysis, but do not base your entire interpretation on it. Always nuance with the qualitative aspects of the charts."
                : "\n\nUn score de compatibilité de {$score}/100 a été pré-calculé. Utilise-le comme point de repère pour la cohérence de ton analyse, mais ne base pas toute ton interprétation dessus. Nuance toujours avec les aspects qualitatifs du thème.";
        }

        $result = $this->callResponsesApi($prompt, $instructions);

        if (!$result['success']) {
            return $result;
        }

        $content = $result['content'];

        // Try to parse JSON response
        $jsonData = $this->parseJsonResponse($content);

        if ($jsonData) {
            // Inject deterministic scores (AI does not produce scores anymore)
            if (!empty($calculatedScores)) {
                $jsonData['score_global'] = $calculatedScores['score_global'];
                foreach ($calculatedScores['dimensions'] as $dim => $score) {
                    if (isset($jsonData['dimensions'][$dim])) {
                        $jsonData['dimensions'][$dim]['score'] = $score;
                    }
                }
            }

            $analysis = $this->buildReadableAnalysis($jsonData);
            $compatibilityScore = $calculatedScores['score_global'] ?? $this->calculateScoreFromDimensions($jsonData);

            return [
                'success' => true,
                'analysis' => $analysis,
                'compatibilityScore' => $compatibilityScore,
                'details' => $jsonData,
            ];
        }

        // Fallback: use raw content
        return [
            'success' => true,
            'analysis' => $content,
            'compatibilityScore' => $calculatedScores['score_global'] ?? null,
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
            // Support both new 'description' field and legacy 'planetes' field
            $aspectDesc = $data['aspect_cle']['description'] ?? $data['aspect_cle']['planetes'] ?? '';
            $parts[] = "\n**{$keyAspectLabel} :** " . $aspectDesc;
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
     * Generate a push notification message (title + body) via AI.
     * Returns ['success' => true, 'message' => ['title' => '...', 'body' => '...']]
     */
    public function generateNotificationMessage(string $prompt): array
    {
        $instructions = "Tu génères des notifications push courtes et engageantes pour une app d'astrologie. Réponds UNIQUEMENT en JSON valide.";
        $result = $this->callResponsesApi($prompt, $instructions);

        if (!$result['success']) {
            return $result;
        }

        $jsonData = $this->parseJsonResponse($result['content']);
        if ($jsonData && isset($jsonData['title'], $jsonData['body'])) {
            return ['success' => true, 'message' => ['title' => $jsonData['title'], 'body' => $jsonData['body']]];
        }

        return ['success' => false, 'error' => 'Failed to parse notification message'];
    }

    /**
     * Generate daily horoscope content
     */
    public function generateDailyHoroscope(string $prompt): array
    {
        $baseInstructions = $this->localeService->getBaseInstructions();

        $instructions = $this->localeService->getLocale() === 'en'
            ? "You are a practicing astrologer writing a personalized daily horoscope in the tradition of Robert Hand (Planets in Transit), Liz Greene, and Stephen Arroyo.\n\nCORE RULE: every sentence must be grounded in a specific planet + sign combination from the data. Zero generalities.\n\nSLOW PLANETS (Saturn, Jupiter, Uranus, Neptune, Pluto) in transit = background themes of the period. Cite the natal planet they are activating.\nFAST PLANETS (Moon, Mercury, Venus, Mars, Sun) in transit = specific energy of the day.\n\nNEVER name the aspect type (trine, square, conjunction, etc.) — translate directly into plain human language.\nNEVER output degree numbers, orb values, or any numeric position (no \"12°\", no \"2.3°\", no \"at 15 degrees\"). Sign names only.\n\nFORBIDDEN: \"a period of transformation\", \"the energies are favorable\", \"the universe\", \"potential\", \"invitation to\", modal hedging (\"may\", \"might\", \"could\").\n\nRespond ONLY in valid JSON, no text before or after."
            : "Tu es un astrologue praticien. Ton registre : la profondeur psychologique de Liz Greene, la précision technique de Robert Hand (Planets in Transit), le pragmatisme d'Arroyo.
                ## ENTRÉES
                Tu reçois deux objets JSON :
                - `natal` : positions natales (planète, signe, maison)
                - `transits` : positions du jour (planète, signe, maison, aspect_à, orbe)
                
                ## RÈGLES DE RÉDACTION
                - Chaque phrase cite explicitement la planète en transit ET la planète natale activée en vulgarisant les termes.
                - Nomme les signes, jamais les degrés ni les orbes.
                - Ne nomme jamais le type d'aspect technique (trigone, carré…). Traduis directement en vécu concret.
                - Maximum 5 transits retenus par jour : priorise orbe serré, puis aspects aux luminaires (Soleil, Lune), puis angles.
                - Planètes lentes (Jupiter → Pluton) = contexte de fond. Planètes rapides (Lune → Mars) = énergie du jour.
                
                ## STYLE INTERDIT
                - Généralités sans ancrage planétaire (\"une période de transformation\", \"les énergies circulent\")
                - Vocabulaire New Age : \"univers\", \"potentiel\", \"invitation à\", \"vibration\"
                - Modaux d'évitement : \"peut\", \"pourrait\", \"il est possible\"
                - Injonctions creuses : \"restez ouvert\", \"faites confiance\"
                
                ## EXEMPLE DE SORTIE ATTENDUE
                (Ici tu colles un exemple JSON complet avec le schéma exact que tu veux)
                
                ## FORMAT DE RÉPONSE
                Réponds uniquement en JSON valide conforme au schéma ci-dessus. Aucun texte avant ou après.";

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
    public function getChatResponse(array $messages, array $userContext, ?\Closure $toolHandler = null, array $tools = [], ?string $previousResponseId = null): array
    {
        $isEnglish = $this->localeService->getLocale() === 'en';

        // ══════════════════════════════════════════════════════════════════
        // DEVELOPER PROMPT — structured with markdown headers for clarity
        // Everything goes in "developer" role (no separate "system" role)
        // ══════════════════════════════════════════════════════════════════

        if ($isEnglish) {
            $developerPrompt = <<<'PROMPT'
## WHO YOU ARE
You are Lyra, a straight-talking and warm astrologer in the Aelys app. You speak like a knowledgeable friend — direct, natural, no unnecessary flourish. Not a solemn oracle, not a life coach, not a therapist.

## HOW TO USE THE DATA BELOW
- The natal chart positions and upcoming transits are injected after this prompt.
- Natal positions follow the format: Planet — Sign — House.
- Upcoming transits follow the format: [transiting planet] → [aspect] → [natal planet] (exact date, end date).
- When citing a transit, NEVER name the aspect type — translate it into felt human impact.
- If a partner is in context, only compare charts when the question is about the relationship. Don't bring the partner into every answer.

## WRITING RULES
- ALWAYS ground your answer in the exact natal positions provided. Name the specific placement (e.g. "your Moon in Scorpio"). Never speak in generalities.
- For questions about the future, use the upcoming transit data provided — real computed aspects for the next 12 months. Only reference transits that are actually listed.
- NEVER use technical astrological jargon: no "trine", "square", "conjunction", "opposition", "sextile", "quincunx", "transit", "aspect", "orb". Translate the meaning into plain human impact.
- Default to 2–4 sentences. Go longer only if the question genuinely calls for it.
- Warm and direct. Skip the ceremonial tone.
- Cite no more than 2–3 natal positions per answer. Pick the most relevant ones for the question asked, skip the rest. You don't need to mention every planet in the chart — a focused answer beats an inventory.
- Build an argument, not a list. Each placement you cite should serve your point, not pile up. If you're chaining more than two "and your X in Y" in the same sentence, restructure.
- Write natural, polished English. Every sentence should be complete, smooth, and sound like something a real person would say out loud. No syntactic shortcuts, no fragments tacked on at the end of a paragraph.

## WHAT YOU NEVER DO
- No vague spiritual filler: "the universe is guiding you", "the energies are aligned", "an invitation to transform".
- No medical, legal or financial predictions. If asked, say kindly that it's outside your scope.
- No absolute yes/no predictions ("you will get the job", "they will come back"). Astrology reads trends, not certainties — frame it that way.
- Never invent transits or positions that are not in the data below.

## TONE EXAMPLE
User: "Is this a good time to change jobs?"
Lyra: "With your Sun in Gemini and your 10th house in Capricorn, you need structure in your career — you're not someone who jumps ship on a whim. Right now, Saturn is weighing on your professional life through March, pushing you to consolidate rather than blow things up. If you want to move, lay the groundwork now — the momentum will come naturally after."

## LANGUAGE
ALWAYS respond in English, regardless of the language used in the user's message.
PROMPT;
        } else {
            $developerPrompt = <<<'PROMPT'
## QUI TU ES
Tu es Lyra, une astrologue directe et chaleureuse dans l'app Aelys. Tu parles comme une amie qui maîtrise vraiment l'astrologie — naturelle, sans chichi, pas du tout solennelle. Tu n'es ni coach de vie, ni thérapeute, ni oracle.

## COMMENT UTILISER LES DONNÉES CI-DESSOUS
- Les positions natales et les transits à venir sont injectés après ce prompt.
- Les positions natales suivent le format : Planète — Signe — Maison.
- Les transits suivent le format : [planète en transit] → [aspect] → [planète natale] (date exacte, date de fin).
- Quand tu cites un transit, ne nomme JAMAIS le type d'aspect technique — traduis en impact ressenti concret.
- Si un partenaire est en contexte, ne compare les thèmes que si la question porte sur la relation. Ne ramène pas tout au couple.

## RÈGLES DE RÉDACTION
- Appuie TOUJOURS tes propos sur les positions natales exactes fournies. Cite-les nommément (ex : "ton Soleil en Taureau", "ta Lune en Scorpion"). Pas de généralités.
- Pour les questions sur l'avenir, utilise les données de transits à venir fournies — de vrais aspects calculés pour les 12 prochains mois. Ne cite que les transits qui y figurent réellement.
- N'utilise JAMAIS de jargon astrologique technique : pas de "trigone", "carré", "conjonction", "opposition", "sextile", "quinconce", "transit", "aspect", "orbe". Traduis toujours en impact humain concret.
- Par défaut 2 à 4 phrases. Plus long seulement si la question le justifie vraiment.
- Ton chaleureux et direct. Pas de style oracle.
- Cite au maximum 2 à 3 positions natales par réponse. Choisis les plus pertinentes pour la question posée, ignore les autres. Tu n'es pas obligée de mentionner chaque planète du thème — une réponse ciblée vaut mieux qu'un inventaire.
- Construis un raisonnement, pas une énumération. Chaque position citée doit servir ton propos, pas s'empiler. Si tu enchaînes plus de deux "et ton X en Y" dans la même phrase, reformule.
- Écris un français naturel et soigné. Chaque phrase doit être complète, fluide, et sonner comme quelqu'un qui parle vraiment. Relis-toi mentalement : si une phrase serait bizarre dite à voix haute, reformule-la. Pas de raccourcis syntaxiques, pas de bouts de phrase jetés en fin de paragraphe.

## CE QUE TU NE FAIS JAMAIS
- Pas de remplissage spirituel vague : "l'univers te guide", "les énergies sont alignées", "une invitation à te transformer".
- Pas de prédiction médicale, juridique ou financière. Si on te le demande, dis gentiment que ce n'est pas ton domaine.
- Pas de prédiction absolue en oui/non ("tu vas avoir le poste", "il va revenir"). L'astrologie lit des tendances, pas des certitudes — formule-le ainsi.
- N'invente jamais de transits ou de positions qui ne figurent pas dans les données ci-dessous.

## EXEMPLE DE TON ATTENDU
User : "C'est un bon moment pour changer de travail ?"
Lyra : "Avec ton Soleil en Gémeaux et ta Maison X en Capricorne, tu as besoin de structure dans ta carrière — t'es pas quelqu'un qui saute dans le vide sur un coup de tête. Là, Saturne pèse sur ta vie pro jusqu'en mars, ça pousse à consolider plutôt qu'à tout casser. Si tu veux bouger, prépare le terrain maintenant, l'impulsion viendra naturellement après."

## LANGUE
Réponds TOUJOURS en français, quelle que soit la langue du message de l'utilisateur.
PROMPT;
        }

        // ── Tools instructions (appended only when tools are available) ──
        if (!empty($tools)) {
            $developerPrompt .= $isEnglish
                ? <<<'TOOLS'


## TOOL USAGE
- Use the transits already provided in context FIRST. Only call a tool if the requested period is NOT covered by the data below.
- If the user asks about a specific future period not covered by the transits below, or wants a precise prediction for a given time (e.g. "in 6 months"), use the `get_transits` tool to calculate the exact transits for that period.
- If the user asks where a specific planet (especially Moon, Venus, Mercury, Sun) is TODAY, TOMORROW, or any specific day (e.g. "is the Moon in Scorpio tomorrow?"), use the `get_sky` tool with the appropriate `days_from_now` value. NEVER say you don't know a planet's current or near-future position.
TOOLS
                : <<<'TOOLS'


## UTILISATION DES OUTILS
- Utilise d'abord les transits déjà fournis dans le contexte. N'appelle un outil que si la période demandée N'EST PAS couverte par les données ci-dessous.
- Si l'utilisateur pose une question sur une période future non couverte par les transits ci-dessous, ou veut une prédiction précise (ex : "dans 6 mois"), utilise l'outil `get_transits` pour calculer les transits exacts de cette période.
- Si l'utilisateur demande dans quel signe se trouve une planète (surtout Lune, Vénus, Mercure, Soleil) AUJOURD'HUI, DEMAIN ou un jour précis (ex : "la Lune est en Scorpion demain ?"), utilise l'outil `get_sky` avec la valeur `days_from_now` appropriée. Ne dis JAMAIS que tu ne connais pas la position actuelle ou proche d'une planète.
TOOLS;
        }

        // ══════════════════════════════════════════════════════════════════
        // CONTEXTUAL DATA — injected into the developer prompt directly
        // (avoids ambiguous developer/system role split)
        // ══════════════════════════════════════════════════════════════════

        $contextParts = [];

        // ── User identity ────────────────────────────────────────────────
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
            $contextParts[] = $label . "\n" . implode("\n", $identityLines);
        }

        // ── User natal chart positions ───────────────────────────────────
        if (!empty($userContext['positions'])) {
            $label = $isEnglish ? "User's natal chart:" : "Thème natal de l'utilisateur :";
            $contextParts[] = $label . "\n" . $this->formatPositions($userContext['positions']);
        }

        // ── Partner context (optional) ───────────────────────────────────
        if (!empty($userContext['partner_name'])) {
            $partnerName = $userContext['partner_name'];
            $score = isset($userContext['compatibility_score']) ? (int) $userContext['compatibility_score'] : null;
            $scoreStr = $score !== null
                ? ($isEnglish ? " (compatibility score: {$score}/100)" : " (score de compatibilité : {$score}/100)")
                : '';
            $label = $isEnglish
                ? "— Partner in context: {$partnerName}{$scoreStr} —"
                : "— Partenaire en contexte : {$partnerName}{$scoreStr} —";
            $partnerBlock = $label;

            if (!empty($userContext['partner_positions'])) {
                $posLabel = $isEnglish ? "{$partnerName}'s natal chart:" : "Thème natal de {$partnerName} :";
                $partnerBlock .= "\n" . $posLabel . "\n" . $this->formatPositions($userContext['partner_positions']);
            }
            $contextParts[] = $partnerBlock;
        }

        // ── Upcoming transits (next 12 months) ──────────────────────────
        if (!empty($userContext['upcoming_transits'])) {
            $label = $isEnglish
                ? "— Upcoming transits (next 12 months, computed) —"
                : "— Transits à venir (12 prochains mois, calculés) —";
            $contextParts[] = $label . "\n" . $this->formatUpcomingTransits($userContext['upcoming_transits'], $isEnglish);
        }

        // ── Merge context into developer prompt ─────────────────────────
        if (!empty($contextParts)) {
            $separator = $isEnglish ? "\n\n---\n## REFERENCE DATA\n" : "\n\n---\n## DONNÉES DE RÉFÉRENCE\n";
            $developerPrompt .= $separator . implode("\n\n", $contextParts);
        }

        // ══════════════════════════════════════════════════════════════════
        // MESSAGE ASSEMBLY — single developer message + user messages
        // ══════════════════════════════════════════════════════════════════

        $chatMessages = [
            ['role' => 'developer', 'content' => $developerPrompt],
        ];

        $inputMessages = array_values(array_map(fn($m) => [
            'role'    => $m['role'],
            'content' => trim((string) $m['content']),
        ], $messages));

        $chatMessages = array_merge($chatMessages, $inputMessages);

        $result = $this->callMultiTurnApi($chatMessages, $toolHandler, $tools, $previousResponseId);

        if (!$result['success']) {
            return $result;
        }

        return [
            'success'     => true,
            'message'     => $result['content'],
            'response_id' => $result['response_id'] ?? null,
        ];
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
     *
     * When $previousResponseId is provided, only the last user message is sent as input —
     * OpenAI chains the conversation server-side. This avoids resending the full history
     * and sidesteps the "lost in the middle" problem for ongoing conversations.
     */
    private function callMultiTurnApi(array $chatMessages, ?\Closure $toolHandler = null, array $tools = [], ?string $previousResponseId = null): array
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

        // Convert tools to Responses API format
        $formattedTools = [];
        if (!empty($tools)) {
            $formattedTools = array_map(function (array $tool): array {
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

        // Build payload — when chaining, only send the latest user message
        $payload = ['model' => $this->model];
        if ($instructions !== '') {
            $payload['instructions'] = $instructions;
        }
        if (!empty($formattedTools)) {
            $payload['tools'] = $formattedTools;
        }

        if ($previousResponseId !== null) {
            $payload['previous_response_id'] = $previousResponseId;
            // Only send the most recent user message — history is held server-side
            $lastUser = null;
            foreach (array_reverse($inputMessages) as $msg) {
                if ($msg['role'] === 'user') { $lastUser = $msg; break; }
            }
            $payload['input'] = $lastUser ? [$lastUser] : $inputMessages;
        } else {
            $payload['input'] = $inputMessages;
        }

        $headers = [
            'Authorization' => 'Bearer ' . $this->apiKey,
            'Content-Type'  => 'application/json',
        ];

        try {
            $response = $this->client->request('POST', $this->apiUrl . '/responses', [
                'headers' => $headers,
                'json'    => $payload,
                'timeout' => 180,
            ]);

            $data          = $response->toArray();
            $responseId    = $data['id'] ?? null;
            $outputText    = null;
            $toolCalls     = [];

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

            // Handle tool calls — chain from the current response via previous_response_id
            if (!empty($toolCalls) && $toolHandler !== null) {
                $toolResultItems = [];
                foreach ($toolCalls as $toolCall) {
                    $arguments  = json_decode($toolCall['arguments'], true) ?? [];
                    $toolResult = $toolHandler($toolCall['name'], $arguments);
                    $toolResultItems[] = [
                        'type'    => 'function_call_output',
                        'call_id' => $toolCall['call_id'],
                        'output'  => is_string($toolResult) ? $toolResult : json_encode($toolResult, JSON_UNESCAPED_UNICODE),
                    ];
                }

                $payload2 = [
                    'model'                => $this->model,
                    'previous_response_id' => $responseId,
                    'input'                => $toolResultItems,
                ];
                if ($instructions !== '') {
                    $payload2['instructions'] = $instructions;
                }
                if (!empty($formattedTools)) {
                    $payload2['tools'] = $formattedTools;
                }

                $response2  = $this->client->request('POST', $this->apiUrl . '/responses', [
                    'headers' => $headers,
                    'json'    => $payload2,
                    'timeout' => 180,
                ]);
                $data2      = $response2->toArray();
                $responseId = $data2['id'] ?? $responseId;

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

            return ['success' => true, 'content' => $outputText, 'response_id' => $responseId];

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

    /**
     * Generic section generation for natal chart analysis.
     * Public wrapper around callResponsesApi for NatalChartAnalysisService.
     *
     * @param string $input        The section prompt
     * @param string $instructions System/persona instructions
     * @return array {success: bool, content?: string, error?: string}
     */
    public function generateNatalChartSection(string $input, string $instructions): array
    {
        $result = $this->callResponsesApi($input, $instructions);

        if (!$result['success']) {
            return $result;
        }

        return [
            'success' => true,
            'content' => $result['content'],
        ];
    }
}