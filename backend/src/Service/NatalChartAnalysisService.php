<?php

namespace App\Service;

use App\Entity\User;
use App\Service\Webservice\OpenAiService;
use Symfony\Contracts\Cache\CacheInterface;
use Symfony\Contracts\Cache\ItemInterface;

/**
 * Orchestrates the 7-section natal chart analysis.
 * Handles caching, GPT calls, and premium gating.
 */
class NatalChartAnalysisService
{
    // Sections that require premium access
    private const PREMIUM_SECTIONS = ['mission'];

    // GPT model to use for natal chart analysis
    private const MODEL = 'gpt-4.1-mini';

    public function __construct(
        private OpenAiService $openAiService,
        private AstrologyAnalysisService $astrologyAnalysisService,
        private CacheInterface $cache,
    ) {}

    /**
     * Get a single section of the natal chart analysis.
     *
     * @param User   $user      The authenticated user
     * @param string $section   One of: synthesis, identity, emotions, mental, relationships, ambition, mission, aspects
     * @param bool   $isPremium Whether the user has premium access
     * @param string $locale    Locale for the response
     * @return array {success: bool, section?: string, content?: mixed, error?: string}
     */
    public function getSection(User $user, string $section, bool $isPremium, string $locale = 'fr'): array
    {
        // Validate section
        if (!NatalChartPrompts::isValidSection($section)) {
            return ['success' => false, 'error' => "Section inconnue : {$section}"];
        }

        // Premium gate
        if (in_array($section, self::PREMIUM_SECTIONS, true) && !$isPremium) {
            return ['success' => false, 'error' => 'premium_required', 'code' => 402];
        }

        // Get chart payload
        $chartPayload = $this->getChartPayload($user);
        if ($chartPayload === null) {
            return ['success' => false, 'error' => 'Profil de naissance requis'];
        }

        // Compute stable cache key from chart data
        $cacheHash = $this->computeCacheHash($chartPayload);
        $cacheKey  = "natal_analysis_{$cacheHash}_{$section}";

        try {
            $content = $this->cache->get($cacheKey, function (ItemInterface $item) use (
                $user, $section, $chartPayload, $locale
            ) {
                // Permanent cache — natal data never changes
                $item->expiresAfter(null);

                return $this->generateSection($user, $section, $chartPayload, $locale);
            });

            if ($content === null) {
                return ['success' => false, 'error' => 'Erreur lors de la génération de l\'analyse'];
            }

            return [
                'success' => true,
                'section' => $section,
                'content' => $content,
            ];
        } catch (\Throwable $e) {
            return ['success' => false, 'error' => 'Erreur : ' . $e->getMessage()];
        }
    }

    /**
     * Pre-generate all accessible sections for a user.
     * Synchronous — generates each section sequentially.
     */
    public function preGenerateAll(User $user, bool $isPremium, string $locale = 'fr'): array
    {
        $chartPayload = $this->getChartPayload($user);
        if ($chartPayload === null) {
            return ['success' => false, 'error' => 'Profil de naissance requis'];
        }

        $sections = ['synthesis', 'identity', 'emotions', 'mental', 'relationships', 'ambition', 'aspects'];
        if ($isPremium) {
            $sections[] = 'mission';
        }

        $generated = [];
        $errors = [];

        foreach ($sections as $section) {
            $result = $this->getSection($user, $section, $isPremium, $locale);
            if ($result['success']) {
                $generated[] = $section;
            } else {
                $errors[] = $section . ': ' . ($result['error'] ?? 'unknown');
            }
        }

        return [
            'success'   => true,
            'generated' => $generated,
            'errors'    => $errors,
        ];
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    /**
     * Get or compute the full chart payload for a user.
     */
    private function getChartPayload(User $user): ?array
    {
        $birthProfile = $user->getBirthProfile();
        if (!$birthProfile) {
            return null;
        }

        try {
            $calculator = $this->astrologyAnalysisService->createCalculatorFromBirthProfile($birthProfile);
            return $calculator->getFullChartPayload();
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Compute a stable SHA-256 hash from the chart data.
     * Only includes planets + angles + nodes (not aspects, which depend on the same data).
     */
    private function computeCacheHash(array $chartPayload): string
    {
        $stableData = [
            'planets' => $chartPayload['planets'] ?? [],
            'angles'  => $chartPayload['angles'] ?? [],
            'nodes'   => $chartPayload['nodes'] ?? [],
        ];

        return substr(hash('sha256', json_encode($stableData)), 0, 16);
    }

    /**
     * Generate a section's content via GPT.
     */
    private function generateSection(
        User $user,
        string $section,
        array $chartPayload,
        string $locale
    ): mixed {
        $birthProfile = $user->getBirthProfile();
        $name = $birthProfile?->getFirstName() ?? 'l\'utilisateur';

        // Set model and locale
        $this->openAiService->setModel(self::MODEL);
        $this->openAiService->setLocale($locale);

        $systemPrompt = NatalChartPrompts::buildSystemPrompt();

        if ($section === 'synthesis') {
            return $this->generateSynthesis($chartPayload, $name, $systemPrompt);
        }

        if ($section === 'aspects') {
            return $this->generateAspects($chartPayload, $name, $systemPrompt, $user);
        }

        // All other sections need the synthesis first
        return $this->generateTextSection($section, $chartPayload, $name, $systemPrompt, $user);
    }

    /**
     * Generate the synthesis section.
     */
    private function generateSynthesis(array $chartPayload, string $name, string $systemPrompt): ?array
    {
        $prompt = NatalChartPrompts::buildSynthesisPrompt($chartPayload, $name);

        $result = $this->callGpt($prompt, $systemPrompt);
        if (!$result) {
            return null;
        }

        // Parse JSON response
        $data = $this->parseJsonResponse($result);
        if (!$data || !isset($data['portrait'])) {
            // If JSON parsing fails, return as raw text
            return ['portrait' => $result, 'axes' => [], 'notable_configs' => []];
        }

        return $data;
    }

    /**
     * Generate a text section (identity, emotions, mental, relationships, ambition, mission).
     */
    private function generateTextSection(
        string $section,
        array $chartPayload,
        string $name,
        string $systemPrompt,
        User $user
    ): ?string {
        // Get synthesis from cache (it should already be generated)
        $cacheHash = $this->computeCacheHash($chartPayload);
        $synthesisKey = "natal_analysis_{$cacheHash}_synthesis";

        $synthesis = null;
        try {
            // Try to get cached synthesis, generate if not available
            $synthesis = $this->cache->get($synthesisKey, function (ItemInterface $item) use (
                $chartPayload, $name, $systemPrompt
            ) {
                $item->expiresAfter(null);
                return $this->generateSynthesis($chartPayload, $name, $systemPrompt);
            });
        } catch (\Throwable) {
            // Continue without synthesis context
        }

        $synthesisResult = $synthesis ?? ['portrait' => '', 'axes' => [], 'notable_configs' => []];
        $prompt = NatalChartPrompts::buildSectionPrompt($section, $chartPayload, $synthesisResult, $name);

        return $this->callGpt($prompt, $systemPrompt);
    }

    /**
     * Generate the aspects section.
     */
    private function generateAspects(
        array $chartPayload,
        string $name,
        string $systemPrompt,
        User $user
    ): ?array {
        // Get synthesis from cache
        $cacheHash = $this->computeCacheHash($chartPayload);
        $synthesisKey = "natal_analysis_{$cacheHash}_synthesis";

        $synthesis = null;
        try {
            $synthesis = $this->cache->get($synthesisKey, function (ItemInterface $item) use (
                $chartPayload, $name, $systemPrompt
            ) {
                $item->expiresAfter(null);
                return $this->generateSynthesis($chartPayload, $name, $systemPrompt);
            });
        } catch (\Throwable) {}

        $synthesisResult = $synthesis ?? ['portrait' => '', 'axes' => [], 'notable_configs' => []];
        $prompt = NatalChartPrompts::buildAspectsPrompt($chartPayload, $synthesisResult, $name);

        $result = $this->callGpt($prompt, $systemPrompt);
        if (!$result) {
            return null;
        }

        $data = $this->parseJsonResponse($result);
        if (!$data || !isset($data['aspects'])) {
            return ['aspects' => []];
        }

        return $data;
    }

    /**
     * Call GPT via OpenAiService's Responses API.
     */
    private function callGpt(string $input, string $instructions): ?string
    {
        // Use the private callResponsesApi via a wrapper approach
        // We need to use an existing public method or create a generic one
        // Using the existing pattern from OpenAiService
        $result = $this->openAiService->generateNatalChartSection($input, $instructions);

        if (!($result['success'] ?? false)) {
            return null;
        }

        return $result['content'] ?? null;
    }

    /**
     * Parse JSON from AI response (handle markdown code blocks).
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
}
