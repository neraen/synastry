<?php

namespace App\Controller\Api;

use App\Entity\User;
use App\Service\HoroscopeGeneratorService;
use App\Service\PromptLocaleService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/horoscope')]
class HoroscopeController extends AbstractController
{
    public function __construct(
        private HoroscopeGeneratorService $horoscopeGeneratorService,
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
     * Get daily horoscope for the authenticated user
     */
    #[Route('/daily', name: 'api_horoscope_daily', methods: ['GET'])]
    public function getDailyHoroscope(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        // Get locale from request
        $locale = $this->getLocaleFromRequest($request);

        if (!$user->hasBirthProfile()) {
            $errorMessage = $locale === 'en'
                ? 'Please complete your birth profile first'
                : 'Veuillez compléter votre profil de naissance';

            return $this->json([
                'success' => false,
                'error' => $errorMessage,
            ], Response::HTTP_BAD_REQUEST);
        }

        $forceRefresh = $request->query->getBoolean('refresh', false);

        // Set locale on the service
        $this->horoscopeGeneratorService->setLocale($locale);

        $result = $this->horoscopeGeneratorService->getDailyHoroscope($user, $forceRefresh);

        if (!$result['success']) {
            return $this->json($result, Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        return $this->json($result);
    }
}
