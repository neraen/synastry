<?php

namespace App\Controller\Api;

use App\Entity\User;
use App\Service\NatalChartAnalysisService;
use App\Service\PromptLocaleService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/natal-chart')]
class NatalChartAnalysisController extends AbstractController
{
    public function __construct(
        private NatalChartAnalysisService $analysisService,
    ) {}

    /**
     * Get locale from request Accept-Language header
     */
    private function getLocaleFromRequest(Request $request): string
    {
        $acceptLanguage = $request->headers->get('Accept-Language', 'fr');
        $localeService = new PromptLocaleService();
        return $localeService->normalizeLocale($acceptLanguage);
    }

    /**
     * Get a single section of the natal chart analysis.
     *
     * GET /api/natal-chart/section/{section}
     *
     * Returns:
     * - 200 with content on success
     * - 400 for invalid section name
     * - 402 for premium-gated sections when user is not premium
     */
    #[Route('/section/{section}', name: 'api_natal_chart_section', methods: ['GET'])]
    public function getSection(Request $request, string $section): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        if (!$user->hasBirthProfile()) {
            return $this->json([
                'success' => false,
                'error'   => 'Profil de naissance requis',
            ], Response::HTTP_BAD_REQUEST);
        }

        $locale = $this->getLocaleFromRequest($request);
        $isPremium = $user->isPremium();

        $result = $this->analysisService->getSection($user, $section, $isPremium, $locale);

        if (!$result['success']) {
            $code = $result['code'] ?? Response::HTTP_BAD_REQUEST;
            unset($result['code']);
            return $this->json($result, $code);
        }

        return $this->json($result);
    }

    /**
     * Pre-generate all accessible sections of the natal chart analysis.
     *
     * POST /api/natal-chart/pregenerate
     *
     * Generates synthesis first, then all other sections sequentially.
     * Returns a summary of what was generated.
     */
    #[Route('/pregenerate', name: 'api_natal_chart_pregenerate', methods: ['POST'])]
    public function pregenerate(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        if (!$user->hasBirthProfile()) {
            return $this->json([
                'success' => false,
                'error'   => 'Profil de naissance requis',
            ], Response::HTTP_BAD_REQUEST);
        }

        $locale = $this->getLocaleFromRequest($request);
        $isPremium = $user->isPremium();

        $result = $this->analysisService->preGenerateAll($user, $isPremium, $locale);

        return $this->json($result);
    }
}
