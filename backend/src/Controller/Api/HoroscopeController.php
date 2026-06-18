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

    // Removed in the Actu astro pivot: the per-user/day LLM horoscope endpoint
    // (`GET /api/horoscope/daily`). Replaced by the cached Actu astro feed
    // (ActuAstroController) + the deterministic "humeur du jour". The service
    // method is retained for the eval engine and the admin sandbox.

    /**
     * Get the weekly cosmic headline (global, cached per locale per week)
     */
    #[Route('/headline', name: 'api_horoscope_headline', methods: ['GET'])]
    public function getCosmicHeadline(Request $request): JsonResponse
    {
        $locale = $this->getLocaleFromRequest($request);
        $this->horoscopeGeneratorService->setLocale($locale);

        $result = $this->horoscopeGeneratorService->getCosmicHeadline();

        if (!$result['success']) {
            return $this->json($result, Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        return $this->json($result);
    }

    /**
     * Get 3 upcoming significant transits for the authenticated user
     */
    #[Route('/transits', name: 'api_horoscope_transits', methods: ['GET'])]
    public function getUpcomingTransits(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

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

        $this->horoscopeGeneratorService->setLocale($locale);

        $result = $this->horoscopeGeneratorService->getUpcomingTransits($user);

        if (!$result['success']) {
            return $this->json($result, Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        return $this->json($result);
    }

    /**
     * Get AI interpretation for a single transit aspect
     */
    #[Route('/transit-interpretation', name: 'api_horoscope_transit_interpretation', methods: ['POST'])]
    public function getTransitInterpretation(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        $locale = $this->getLocaleFromRequest($request);

        if (!$user->hasBirthProfile()) {
            return $this->json([
                'success' => false,
                'error' => $locale === 'en' ? 'Please complete your birth profile first' : 'Veuillez compléter votre profil de naissance',
            ], Response::HTTP_BAD_REQUEST);
        }

        $data = json_decode($request->getContent(), true);
        $required = ['transit_planet', 'natal_planet', 'aspect_type', 'aspect_name', 'orb'];
        foreach ($required as $field) {
            if (empty($data[$field]) && $data[$field] !== 0) {
                return $this->json(['success' => false, 'error' => "Missing field: $field"], Response::HTTP_BAD_REQUEST);
            }
        }

        $this->horoscopeGeneratorService->setLocale($locale);
        $result = $this->horoscopeGeneratorService->getTransitInterpretation($user, $data);

        if (!$result['success']) {
            return $this->json($result, Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        return $this->json($result);
    }

    /**
     * Get monthly transit aspects calendar (no AI — pure astronomical calculation)
     */
    #[Route('/calendar', name: 'api_horoscope_calendar', methods: ['GET'])]
    public function getCalendarTransits(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

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

        $monthParam = $request->query->get('month', (new \DateTime())->format('Y-m'));

        if (!preg_match('/^(\d{4})-(\d{2})$/', $monthParam, $matches)) {
            return $this->json(['success' => false, 'error' => 'Invalid month format. Use YYYY-MM.'], Response::HTTP_BAD_REQUEST);
        }

        $year  = (int) $matches[1];
        $month = (int) $matches[2];

        $this->horoscopeGeneratorService->setLocale($locale);
        $result = $this->horoscopeGeneratorService->getCalendarAspects($user, $year, $month);

        if (!$result['success']) {
            return $this->json($result, Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        return $this->json($result);
    }
}
