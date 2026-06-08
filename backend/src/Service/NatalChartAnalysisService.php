<?php

namespace App\Service;

use App\Entity\NatalChartSection;
use App\Entity\User;
use App\Repository\NatalChartSectionRepository;
use App\Service\Webservice\OpenAiService;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Orchestrates the 7-section natal chart analysis.
 *
 * Generated content is persisted in `natal_chart_section` so it never changes
 * across deployments or cache clears. If a user updates their birth profile,
 * the chart hash changes and the content is regenerated automatically.
 */
class NatalChartAnalysisService
{
    // Sections that require premium access
    private const PREMIUM_SECTIONS = ['mission'];

    public function __construct(
        private OpenAiService $openAiService,
        private AstrologyAnalysisService $astrologyAnalysisService,
        private NatalChartSectionRepository $sectionRepository,
        private EntityManagerInterface $em,
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

        $chartHash = $this->computeCacheHash($chartPayload);

        try {
            $content = $this->getOrGenerateSection($user, $section, $chartPayload, $chartHash, $locale);

            if ($content === null) {
                return ['success' => false, 'error' => "Erreur lors de la génération de l'analyse"];
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
     * Return DB-persisted content if available and chart hash matches,
     * otherwise generate, persist, and return.
     */
    private function getOrGenerateSection(
        User $user,
        string $section,
        array $chartPayload,
        string $chartHash,
        string $locale
    ): mixed {
        $record = $this->sectionRepository->findByUserAndSection($user, $section);

        // Cache hit: hash matches → content is stable, return as-is
        if ($record !== null && $record->getChartHash() === $chartHash) {
            return $record->getContent();
        }

        // Generate fresh content (birth profile changed or first time)
        $content = $this->generateSection($user, $section, $chartPayload, $locale);
        if ($content === null) {
            return null;
        }

        // Re-fetch record to avoid race conditions with concurrent requests
        // (e.g. background pre-generation and user manual click)
        $record = $this->sectionRepository->findByUserAndSection($user, $section);

        // Persist (insert or update)
        if ($record === null) {
            $record = new NatalChartSection();
            $record->setUser($user);
            $record->setSection($section);
            $this->em->persist($record);
        }

        $record->setChartHash($chartHash);
        $record->setContent($content);
        $record->setGeneratedAt(new \DateTime());

        try {
            $this->em->flush();
        } catch (\Doctrine\DBAL\Exception\UniqueConstraintViolationException) {
            // If another request inserted the row in the tiny gap between our check and flush,
            // the database unique constraint user_section_unique will throw this exception.
            // Since the record is now successfully persisted by the other thread,
            // we can safely ignore the exception and return our generated content.
        }

        return $content;
    }

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
        $name = $birthProfile?->getFirstName() ?? "l'utilisateur";

        $this->openAiService->setLocale($locale);

        $systemPrompt = NatalChartPrompts::buildSystemPrompt();

        if ($section === 'synthesis') {
            return $this->generateSynthesis($chartPayload, $name, $systemPrompt);
        }

        if ($section === 'aspects') {
            return $this->generateAspects($user, $chartPayload, $name, $systemPrompt);
        }

        return $this->generateTextSection($user, $section, $chartPayload, $name, $systemPrompt, $locale);
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

        $data = $this->parseJsonResponse($result);
        if (!$data || !isset($data['portrait'])) {
            return ['portrait' => $result, 'axes' => [], 'notable_configs' => []];
        }

        return $data;
    }

    /**
     * Generate a text section (identity, emotions, mental, relationships, ambition, mission).
     * Reads synthesis from DB for context without generating it inline — avoids chaining two
     * slow AI calls in the same HTTP request (which causes timeouts on first load).
     * Synthesis will be available on next load once pre-generated via preGenerateAll.
     */
    private function generateTextSection(
        User $user,
        string $section,
        array $chartPayload,
        string $name,
        string $systemPrompt,
        string $locale
    ): ?string {
        $chartHash     = $this->computeCacheHash($chartPayload);
        $synthesisRecord = $this->sectionRepository->findByUserAndSection($user, 'synthesis');
        $synthesisContent = ($synthesisRecord && $synthesisRecord->getChartHash() === $chartHash)
            ? $synthesisRecord->getContent()
            : null;
        $synthesisResult = $synthesisContent ?? ['portrait' => '', 'axes' => [], 'notable_configs' => []];

        $prompt = NatalChartPrompts::buildSectionPrompt($section, $chartPayload, $synthesisResult, $name);

        return $this->callGpt($prompt, $systemPrompt);
    }

    /**
     * Generate the aspects section.
     * Fetches synthesis from DB for context (generates it first if needed).
     */
    private function generateAspects(
        User $user,
        array $chartPayload,
        string $name,
        string $systemPrompt
    ): ?array {
        $chartHash = $this->computeCacheHash($chartPayload);
        $synthesisRecord = $this->sectionRepository->findByUserAndSection($user, 'synthesis');
        $synthesisContent = ($synthesisRecord && $synthesisRecord->getChartHash() === $chartHash)
            ? $synthesisRecord->getContent()
            : null;
        $synthesisResult = $synthesisContent ?? ['portrait' => '', 'axes' => [], 'notable_configs' => []];

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
