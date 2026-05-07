<?php

namespace App\Service;

use App\Entity\User;
use App\Repository\NatalChartRepository;
use App\Service\Webservice\OpenAiService;
use Symfony\Contracts\Cache\CacheInterface;
use Symfony\Contracts\Cache\ItemInterface;

class HomeInsightsService
{
    public function __construct(
        private OpenAiService $openAiService,
        private AstrologyAnalysisService $astrologyAnalysisService,
        private NatalChartRepository $natalChartRepository,
        private CacheInterface $cache,
    ) {}

    /**
     * Get weekly energy insight (cached 7 days, key = userId + ISO week)
     */
    public function getWeeklyEnergy(User $user, string $locale = 'fr'): array
    {
        $now = new \DateTime('now', new \DateTimeZone('UTC'));
        $weekKey = $now->format('Y') . 'W' . $now->format('W');
        $cacheKey = sprintf('home_weekly_energy_%d_%s_%s', $user->getId(), $weekKey, $locale);

        return $this->cache->get($cacheKey, function (ItemInterface $item) use ($user, $locale) {
            $item->expiresAfter(7 * 24 * 3600);
            return $this->computeWeeklyEnergy($user, $locale);
        });
    }

    /**
     * Get current period insight (cached 3 days, key = userId + date truncated to 3-day block)
     */
    public function getCurrentPeriod(User $user, string $locale = 'fr'): array
    {
        $now = new \DateTime('now', new \DateTimeZone('UTC'));
        $dayBlock = (int) floor((int) $now->format('z') / 3);
        $cacheKey = sprintf('home_current_period_%d_%s_%d_%s', $user->getId(), $now->format('Y'), $dayBlock, $locale);

        return $this->cache->get($cacheKey, function (ItemInterface $item) use ($user, $locale) {
            $item->expiresAfter(3 * 24 * 3600);
            return $this->computeCurrentPeriod($user, $locale);
        });
    }

    private function computeWeeklyEnergy(User $user, string $locale): array
    {
        $transitsData = $this->getTransitsSummary($user);
        $natalSummary = $this->getNatalSummary($user);

        if ($locale === 'en') {
            $instructions = <<<'INST'
You are a sharp advisor who uses astrology as a lens — not a fortune teller. Your job is to translate planetary influences into concrete life themes: what the person will feel, what tensions will surface, what opportunities are real. No jargon, no planet names in the output, no "the universe". Write like a trusted friend who happens to read charts.
INST;
            $prompt = <<<PROMPT
Natal chart: {$natalSummary}
Current transits: {$transitsData}

Based on these influences, describe what this week will feel like for this person — in human terms, not astrological ones.

Respond ONLY with valid JSON:
{
  "titre": "3-5 words, a punchy theme for the week — like a headline, not an astro term. Examples: 'Time to hold your ground', 'A week for bold moves', 'Clarity arrives late'",
  "resume": "2-3 sentences. What will the person feel or face this week? What's the dominant dynamic? Be specific and concrete — no 'the stars say', no planet names",
  "intensite": <integer 1-10, reflects how charged or demanding the week is>,
  "domaines": ["2-4 life areas affected — e.g. 'Relationships', 'Work', 'Finances', 'Self-confidence', 'Communication'"],
  "conseil": "One sharp, actionable sentence. What's the one thing worth doing or avoiding this week?"
}
PROMPT;
        } else {
            $instructions = <<<'INST'
Tu es un conseiller avisé qui utilise l'astrologie comme prisme — pas un diseur de bonne aventure. Ton rôle est de traduire les influences planétaires en thèmes de vie concrets : ce que la personne va ressentir, les tensions qui vont surgir, les opportunités réelles. Pas de jargon, pas de noms de planètes dans le texte final, pas de "l'univers". Écris comme un ami de confiance qui sait lire les thèmes natals.
INST;
            $prompt = <<<PROMPT
Thème natal : {$natalSummary}
Transits actuels : {$transitsData}

En te basant sur ces influences, décris ce que cette semaine va faire ressentir à cette personne — en termes humains, pas astrologiques.

Retourne UNIQUEMENT du JSON valide :
{
  "titre": "3-5 mots, un thème percutant pour la semaine — comme un titre de presse, pas un terme astro. Exemples : 'Le moment de tenir bon', 'Une semaine pour oser', 'La clarté arrive tard'",
  "resume": "2-3 phrases. Qu'est-ce que la personne va ressentir ou affronter cette semaine ? Quelle est la dynamique dominante ? Sois concret — pas de 'les astres disent', pas de noms de planètes",
  "intensite": <entier de 1 à 10, reflète l'intensité ou la charge de la semaine>,
  "domaines": ["2-4 domaines de vie concernés — ex. 'Relations', 'Travail', 'Finances', 'Confiance en soi', 'Communication'"],
  "conseil": "Une phrase courte et actionnable. Quelle est la chose à faire ou éviter cette semaine ?"
}
PROMPT;
        }

        $this->openAiService->setLocale($locale);
        $result = $this->openAiService->callSimplePrompt($prompt, $instructions);

        if (!$result['success']) {
            return ['success' => false, 'error' => $result['error'] ?? 'AI error'];
        }

        $content = $this->extractJson($result['content']);
        if ($content === null) {
            return ['success' => false, 'error' => 'Invalid AI response'];
        }

        return ['success' => true, 'weeklyEnergy' => $content];
    }

    private function computeCurrentPeriod(User $user, string $locale): array
    {
        $transitsData = $this->getTransitsSummary($user);
        $natalSummary = $this->getNatalSummary($user);

        if ($locale === 'en') {
            $instructions = <<<'INST'
You are a sharp advisor who uses astrology as a lens — not a fortune teller. Translate planetary influences into what the person is actually living through right now: a theme, a challenge, a phase of life. No jargon, no planet names in the output, no "the cosmos". Be frank, human, specific.
INST;
            $prompt = <<<PROMPT
Natal chart: {$natalSummary}
Current transits: {$transitsData}

Based on these influences, describe the current life phase this person is in — what's happening under the surface, what pattern is at play.

Respond ONLY with valid JSON:
{
  "titre": "3-5 words that name the phase or theme. Like a chapter title. Examples: 'The weight of choices', 'A slow reconstruction', 'Where loyalty is tested'",
  "contenu": [
    "First paragraph: What is this person going through right now? What's the underlying tension or dynamic? 2-3 sentences, concrete and personal — no planet names, no astro terms",
    "Second paragraph: What does this phase ask of them, and what becomes possible if they lean into it? 2-3 sentences"
  ],
  "tonalite": "positive" | "neutre" | "tendu"
}
PROMPT;
        } else {
            $instructions = <<<'INST'
Tu es un conseiller avisé qui utilise l'astrologie comme prisme — pas un diseur de bonne aventure. Traduis les influences planétaires en ce que la personne vit réellement en ce moment : un thème, un défi, une phase de vie. Pas de jargon, pas de noms de planètes dans le texte final, pas de "le cosmos". Sois franc, humain, précis.
INST;
            $prompt = <<<PROMPT
Thème natal : {$natalSummary}
Transits actuels : {$transitsData}

En te basant sur ces influences, décris la phase de vie actuelle de cette personne — ce qui se passe en profondeur, quel schéma est à l'œuvre.

Retourne UNIQUEMENT du JSON valide :
{
  "titre": "3-5 mots qui nomment la phase ou le thème. Comme un titre de chapitre. Exemples : 'Le poids des choix', 'Une reconstruction lente', 'Là où la loyauté est testée'",
  "contenu": [
    "Premier paragraphe : Qu'est-ce que cette personne traverse en ce moment ? Quelle est la tension ou la dynamique sous-jacente ? 2-3 phrases, concrètes et personnelles — pas de noms de planètes, pas de termes astro",
    "Deuxième paragraphe : Qu'est-ce que cette phase lui demande, et qu'est-ce qui devient possible si elle l'accepte ? 2-3 phrases"
  ],
  "tonalite": "positive" | "neutre" | "tendu"
}
PROMPT;
        }

        $this->openAiService->setLocale($locale);
        $result = $this->openAiService->callSimplePrompt($prompt, $instructions);

        if (!$result['success']) {
            return ['success' => false, 'error' => $result['error'] ?? 'AI error'];
        }

        $content = $this->extractJson($result['content']);
        if ($content === null) {
            return ['success' => false, 'error' => 'Invalid AI response'];
        }

        return ['success' => true, 'currentPeriod' => $content];
    }

    private function getTransitsSummary(User $user): string
    {
        try {
            $transits = $this->astrologyAnalysisService->getTransitsForSpecificMonth($user, 0);
            if (empty($transits['aspects'])) {
                return 'No major transits this month';
            }
            $parts = array_map(fn($a) => sprintf('%s %s natal %s (orb %.1f°)', $a['transit'], $a['type'], $a['natal'], $a['orb']), $transits['aspects']);
            return implode(', ', $parts);
        } catch (\Throwable) {
            return 'Transit data unavailable';
        }
    }

    private function getNatalSummary(User $user): string
    {
        try {
            $chart = $this->natalChartRepository->findByUser($user);
            if (!$chart) {
                return 'Natal chart unavailable';
            }
            $positions = $chart->getPlanetaryPositions();
            $key = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Ascendant'];
            $parts = [];
            foreach ($key as $planet) {
                if (isset($positions[$planet])) {
                    $parts[] = sprintf('%s in %s', $planet, $positions[$planet]['Sign'] ?? '?');
                }
            }
            return implode(', ', $parts) ?: 'Natal chart unavailable';
        } catch (\Throwable) {
            return 'Natal chart unavailable';
        }
    }

    private function extractJson(string $text): ?array
    {
        // Strip markdown code block if present
        $text = preg_replace('/^```(?:json)?\s*/m', '', $text);
        $text = preg_replace('/```\s*$/m', '', $text);
        $text = trim($text);

        // Find first { ... }
        $start = strpos($text, '{');
        $end = strrpos($text, '}');
        if ($start === false || $end === false) {
            return null;
        }
        $jsonStr = substr($text, $start, $end - $start + 1);
        $decoded = json_decode($jsonStr, true);
        return is_array($decoded) ? $decoded : null;
    }
}
