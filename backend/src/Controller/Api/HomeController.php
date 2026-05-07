<?php

namespace App\Controller\Api;

use App\Entity\User;
use App\Service\HomeInsightsService;
use App\Service\PromptLocaleService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/home')]
class HomeController extends AbstractController
{
    public function __construct(
        private HomeInsightsService $homeInsightsService,
    ) {}

    #[Route('/insights', name: 'api_home_insights', methods: ['GET'])]
    public function getInsights(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        $localeService = new PromptLocaleService();
        $locale = $localeService->normalizeLocale($request->headers->get('Accept-Language', 'fr'));

        if (!$user->hasBirthProfile()) {
            return $this->json([
                'success' => false,
                'error' => $locale === 'en' ? 'Birth profile required' : 'Profil de naissance requis',
            ], 400);
        }

        $weeklyResult = $this->homeInsightsService->getWeeklyEnergy($user, $locale);
        $periodResult = $this->homeInsightsService->getCurrentPeriod($user, $locale);

        return $this->json([
            'success' => true,
            'weeklyEnergy' => $weeklyResult['weeklyEnergy'] ?? null,
            'currentPeriod' => $periodResult['currentPeriod'] ?? null,
        ]);
    }
}
