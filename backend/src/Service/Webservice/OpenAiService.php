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
    private const MODEL = 'gpt-4.1-mini';

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
     * Call OpenAI Responses API
     */
    private function callResponsesApi(string $input, ?string $instructions = null): array
    {
        $payload = [
            'model' => self::MODEL,
            'input' => $input,
        ];

        if ($instructions) {
            $payload['instructions'] = $instructions;
        }

        try {
            $response = $this->client->request('POST', $this->apiUrl . '/responses', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->apiKey,
                    'Content-Type' => 'application/json',
                ],
                'json' => $payload,
            ]);

            $data = $response->toArray();

            // Extract output text from the response
            $outputText = $data['output_text'] ?? $data['output'][0]['content'][0]['text'] ?? null;

            if (!$outputText) {
                return [
                    'success' => false,
                    'error' => 'No response from AI',
                    'raw' => $data,
                ];
            }

            return [
                'success' => true,
                'content' => $outputText,
                'model' => $data['model'] ?? self::MODEL,
                'usage' => $data['usage'] ?? null,
            ];

        } catch (ExceptionInterface $e) {
            return [
                'success' => false,
                'error' => 'AI service error: ' . $e->getMessage(),
            ];
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
            ? "You are a astrologer.\n\nIMPORTANT RULES:\n{$baseInstructions}\n- Explain astrological terms simply when you use them\n- Give practical and concrete advice"
            : "Tu es un astrologue.\n\nRÈGLES IMPORTANTES :\n{$baseInstructions}\n- Explique les termes astrologiques simplement quand tu les utilises\n- Donne des conseils pratiques et concrets";

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
     * Get a single natal chart interpretation
     */
    public function getNatalChartInterpretation(string $name, array $theme): array
    {
        // Translate theme using locale service
        $themeTranslated = $this->translateTheme($theme);
        $baseInstructions = $this->localeService->getBaseInstructions();

        $instructions = $this->localeService->getLocale() === 'en'
            ? "You are a warm and educational astrologer.\n\nIMPORTANT RULES:\n{$baseInstructions}\n- Avoid technical jargon, explain simply\n- Speak directly to the person (use \"you\" consistently)"
            : "Tu es un astrologue bienveillant et pédagogue.\n\nRÈGLES IMPORTANTES :\n{$baseInstructions}\n- Évite le jargon technique, explique simplement\n- Parle directement à la personne (utilise \"vous\" ou \"tu\" de façon cohérente)";

        $input = $this->localeService->getLocale() === 'en'
            ? "Interpret the natal chart of {$name}:

" . json_encode($themeTranslated, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "

Write an accessible interpretation covering:
1. Their deep personality (based on their Sun, Moon and Ascendant)
2. Their way of communicating and thinking (Mercury)
3. Their way of loving and what they seek in love (Venus)
4. Their energy and motivation (Mars)
5. Their strengths and areas where they can grow

IMPORTANT: Be encouraging and kind. Present challenges as opportunities for growth."
            : "Interprète le thème natal de {$name} :

" . json_encode($themeTranslated, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "

Rédige une interprétation accessible qui couvre :
1. Sa personnalité profonde (d'après son Soleil, sa Lune et son Ascendant)
2. Sa façon de communiquer et de réfléchir (Mercure)
3. Sa manière d'aimer et ce qu'il/elle recherche en amour (Vénus)
4. Son énergie et sa motivation (Mars)
5. Ses forces et les domaines où il/elle peut progresser

IMPORTANT : Sois encourageant et bienveillant. Présente les défis comme des opportunités de croissance.";

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
            ? "You are a warm astrologer specializing in love relationships.\n\nIMPORTANT RULES:\n{$baseInstructions}\n- When you mention an aspect (trine, square, etc.), briefly explain its effect\n- Respond only in valid JSON"
            : "Tu es un astrologue bienveillant spécialisé dans les relations amoureuses.\n\nRÈGLES IMPORTANTES :\n{$baseInstructions}\n- Quand tu mentionnes un aspect (trigone, carré, etc.), explique brièvement son effet\n- Réponds uniquement en JSON valide";

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
            ? "You are a warm astrologer writing personalized horoscopes.\n\nIMPORTANT RULES:\n{$baseInstructions}\n- Adopt a positive and encouraging tone\n- Avoid technical jargon, stay accessible\n- Give concrete and actionable advice\n- Respond only in valid JSON, no text before or after"
            : "Tu es un astrologue chaleureux qui rédige des horoscopes personnalisés.\n\nRÈGLES IMPORTANTES :\n{$baseInstructions}\n- Adopte un ton positif et encourageant\n- Évite le jargon technique, reste accessible\n- Donne des conseils concrets et applicables\n- Réponds uniquement en JSON valide, sans texte avant ou après";

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
     * Calculate compatibility score from dimension scores
     * This is more reliable than trusting the AI's score_global
     */
    private function calculateScoreFromDimensions(array $data): ?int
    {
        $dimensions = $data['dimensions'] ?? [];

        if (empty($dimensions)) {
            // Fallback to AI's score if no dimensions
            return isset($data['score_global']) ? (int) $data['score_global'] : null;
        }

        $scores = [];
        foreach ($dimensions as $dimension) {
            if (isset($dimension['score']) && is_numeric($dimension['score'])) {
                $scores[] = (int) $dimension['score'];
            }
        }

        if (empty($scores)) {
            return isset($data['score_global']) ? (int) $data['score_global'] : null;
        }

        // Calculate weighted average
        // Weight: love and attraction count more for romantic compatibility
        $weights = [
            0 => 1.3,  // amour/love - higher weight
            1 => 1.0,  // communication
            2 => 0.9,  // conflits/conflicts - slightly lower (high conflict score = good)
            3 => 1.1,  // long_terme/long_term
            4 => 1.2,  // attirance/attraction - higher weight
        ];

        $weightedSum = 0;
        $totalWeight = 0;

        foreach ($scores as $index => $score) {
            $weight = $weights[$index] ?? 1.0;
            $weightedSum += $score * $weight;
            $totalWeight += $weight;
        }

        $average = $totalWeight > 0 ? $weightedSum / $totalWeight : 0;

        // Clamp to 0-100
        return max(0, min(100, (int) round($average)));
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
}