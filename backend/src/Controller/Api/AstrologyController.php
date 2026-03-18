<?php

namespace App\Controller\Api;

use App\Entity\User;
use App\Service\AstrologyService;
use App\Service\PromptLocaleService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/astrology')]
class AstrologyController extends AbstractController
{
    public function __construct(
        private AstrologyService $astrologyService,
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
     * Calculate user's natal chart
     */
    #[Route('/natal-chart', name: 'api_natal_chart', methods: ['GET'])]
    public function getNatalChart(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        if (!$user->hasBirthProfile()) {
            return $this->json([
                'error' => 'Please complete your birth profile first'
            ], Response::HTTP_BAD_REQUEST);
        }

        $forceRecalculate = $request->query->getBoolean('refresh', false);
        $result = $this->astrologyService->calculateNatalChart($user, $forceRecalculate);

        if (!$result['success']) {
            return $this->json([
                'error' => $result['error']
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        return $this->json($result);
    }

    /**
     * Get AI interpretation of natal chart
     */
    #[Route('/natal-chart/interpretation', name: 'api_natal_chart_interpretation', methods: ['GET'])]
    public function getNatalChartInterpretation(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        // Get locale from request
        $locale = $this->getLocaleFromRequest($request);
        $this->astrologyService->setLocale($locale);

        if (!$user->hasBirthProfile()) {
            $errorMessage = $locale === 'en'
                ? 'Please complete your birth profile first'
                : 'Veuillez compléter votre profil de naissance';
            return $this->json([
                'error' => $errorMessage
            ], Response::HTTP_BAD_REQUEST);
        }

        $result = $this->astrologyService->getNatalChartInterpretation($user);

        if (!$result['success']) {
            return $this->json([
                'error' => $result['error']
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        return $this->json($result);
    }

    /**
     * Calculate synastry with partner's birth data
     */
    #[Route('/synastry', name: 'api_synastry', methods: ['POST'])]
    public function calculateSynastry(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        // Get locale from request
        $locale = $this->getLocaleFromRequest($request);
        $this->astrologyService->setLocale($locale);

        if (!$user->hasBirthProfile()) {
            $errorMessage = $locale === 'en'
                ? 'Please complete your birth profile first'
                : 'Veuillez compléter votre profil de naissance';
            return $this->json([
                'error' => $errorMessage
            ], Response::HTTP_BAD_REQUEST);
        }

        $data = json_decode($request->getContent(), true);

        if (!$data) {
            $errorMessage = $locale === 'en' ? 'Invalid JSON payload' : 'Données JSON invalides';
            return $this->json([
                'error' => $errorMessage
            ], Response::HTTP_BAD_REQUEST);
        }

        // Validate required partner data
        $requiredFields = ['partnerName', 'birthDate', 'birthCity', 'latitude', 'longitude'];
        foreach ($requiredFields as $field) {
            if (empty($data[$field])) {
                return $this->json([
                    'error' => "Field '$field' is required"
                ], Response::HTTP_BAD_REQUEST);
            }
        }

        // Parse partner birth date
        try {
            $birthDate = new \DateTime($data['birthDate']);
        } catch (\Exception $e) {
            return $this->json([
                'error' => 'Invalid birth date format'
            ], Response::HTTP_BAD_REQUEST);
        }

        // Parse optional birth time
        $hours = 12;
        $minutes = 0;
        $seconds = 0;

        if (!empty($data['birthTime'])) {
            $timeParts = explode(':', $data['birthTime']);
            $hours = (int) ($timeParts[0] ?? 12);
            $minutes = (int) ($timeParts[1] ?? 0);
            $seconds = (int) ($timeParts[2] ?? 0);
        }

        $partnerBirthData = [
            'year' => (int) $birthDate->format('Y'),
            'month' => (int) $birthDate->format('m'),
            'day' => (int) $birthDate->format('d'),
            'hours' => $hours,
            'minutes' => $minutes,
            'seconds' => $seconds,
            'latitude' => (float) $data['latitude'],
            'longitude' => (float) $data['longitude'],
            'timezone' => (float) ($data['timezone'] ?? 0),
        ];

        $question = $data['question'] ?? null;

        $result = $this->astrologyService->calculateSynastryWithExternal(
            $user,
            $data['partnerName'],
            $partnerBirthData,
            $question
        );

        if (!$result['success']) {
            return $this->json([
                'error' => $result['error']
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        return $this->json($result);
    }

    /**
     * Get synastry history list
     */
    #[Route('/synastry/history', name: 'api_synastry_history', methods: ['GET'])]
    public function getSynastryHistory(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        $limit = $request->query->getInt('limit', 50);
        $result = $this->astrologyService->getSynastryHistory($user, $limit);

        return $this->json($result);
    }

    /**
     * Get a specific synastry history entry
     */
    #[Route('/synastry/history/{id}', name: 'api_synastry_history_detail', methods: ['GET'])]
    public function getSynastryHistoryDetail(int $id): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        $result = $this->astrologyService->getSynastryHistoryDetail($user, $id);

        if (!$result['success']) {
            return $this->json([
                'error' => $result['error']
            ], Response::HTTP_NOT_FOUND);
        }

        return $this->json($result);
    }

    /**
     * Delete a synastry history entry
     */
    #[Route('/synastry/history/{id}', name: 'api_synastry_history_delete', methods: ['DELETE'])]
    public function deleteSynastryHistory(int $id): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        $result = $this->astrologyService->deleteSynastryHistory($user, $id);

        if (!$result['success']) {
            return $this->json([
                'error' => $result['error']
            ], Response::HTTP_NOT_FOUND);
        }

        return $this->json($result);
    }
}