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
You are an experienced astrologer. Give a brief weekly energy reading. Be direct, factual, no platitudes.
INST;
            $prompt = <<<PROMPT
Natal chart: {$natalSummary}
Current transits: {$transitsData}

Give a weekly energy reading in JSON format with this exact structure:
{
  "titre": "short punchy title (max 6 words)",
  "resume": "2-3 sentences describing the week's energy",
  "intensite": <integer 1-10>,
  "domaines": ["domain1", "domain2", "domain3"],
  "conseil": "one concrete action sentence"
}

Only output valid JSON, nothing else.
PROMPT;
        } else {
            $instructions = <<<'INST'
Tu es un astrologue expérimenté. Donne une lecture énergétique de la semaine. Sois direct, factuel, sans platitudes.
INST;
            $prompt = <<<PROMPT
Thème natal : {$natalSummary}
Transits actuels : {$transitsData}

Donne une lecture de l'énergie de la semaine en JSON avec cette structure exacte :
{
  "titre": "titre court et percutant (6 mots max)",
  "resume": "2-3 phrases décrivant l'énergie de la semaine",
  "intensite": <entier de 1 à 10>,
  "domaines": ["domaine1", "domaine2", "domaine3"],
  "conseil": "une phrase d'action concrète"
}

Retourne uniquement du JSON valide, rien d'autre.
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
You are an experienced astrologer. Describe the current astrological period. Direct, factual, no clichés.
INST;
            $prompt = <<<PROMPT
Natal chart: {$natalSummary}
Current transits: {$transitsData}

Describe the current astrological period in JSON with this exact structure:
{
  "titre": "period name or theme (max 5 words)",
  "contenu": ["paragraph 1 (2-3 sentences)", "paragraph 2 (2-3 sentences)"],
  "tonalite": "positive" | "neutre" | "tendu"
}

Only output valid JSON, nothing else.
PROMPT;
        } else {
            $instructions = <<<'INST'
Tu es un astrologue expérimenté. Décris la période astrale actuelle. Direct, factuel, sans clichés.
INST;
            $prompt = <<<PROMPT
Thème natal : {$natalSummary}
Transits actuels : {$transitsData}

Décris la période astrale actuelle en JSON avec cette structure exacte :
{
  "titre": "nom ou thème de la période (5 mots max)",
  "contenu": ["paragraphe 1 (2-3 phrases)", "paragraphe 2 (2-3 phrases)"],
  "tonalite": "positive" | "neutre" | "tendu"
}

Retourne uniquement du JSON valide, rien d'autre.
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
