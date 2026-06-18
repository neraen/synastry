<?php

namespace App\Controller\Api;

use App\Entity\User;
use App\Service\Astro\ActuAstroService;
use App\Service\Astro\MoodService;
use App\Service\PromptLocaleService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

/**
 * Read-only API for the Actu astro feed + the humeur du jour.
 * NO LLM is ever called here: events and mood text are served from cache, and
 * the per-user overlay is computed deterministically.
 */
#[Route('/api')]
class ActuAstroController extends AbstractController
{
    public function __construct(
        private ActuAstroService $actuAstroService,
        private MoodService $moodService,
    ) {
    }

    private function locale(Request $request): string
    {
        return (new PromptLocaleService())->normalizeLocale($request->headers->get('Accept-Language', 'fr'));
    }

    /**
     * Collective monthly feed + deterministic per-user overlay.
     * ?month=YYYY-MM (defaults to the current month).
     */
    #[Route('/actu-astro', name: 'api_actu_astro', methods: ['GET'])]
    public function feed(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();
        $locale = $this->locale($request);

        $monthParam = $request->query->get('month');
        $now = new \DateTimeImmutable('now', new \DateTimeZone('UTC'));
        if (is_string($monthParam) && preg_match('/^(\d{4})-(\d{2})$/', $monthParam, $m)) {
            $year  = (int) $m[1];
            $month = (int) $m[2];
        } else {
            $year  = (int) $now->format('Y');
            $month = (int) $now->format('n');
        }
        if ($month < 1 || $month > 12) {
            return $this->json(['success' => false, 'error' => 'Invalid month'], 400);
        }

        $data = $this->actuAstroService->getMonth($user, $year, $month, $locale);

        return $this->json(['success' => true] + $data);
    }

    /**
     * Today's mood paragraph (pure lookup). Intentionally lightweight.
     */
    #[Route('/mood/today', name: 'api_mood_today', methods: ['GET'])]
    public function moodToday(Request $request): JsonResponse
    {
        $locale = $this->locale($request);
        $mood = $this->moodService->getToday($locale);

        if ($mood === null) {
            // Graceful, non-blocking: the home screen simply hides the block.
            return $this->json(['success' => true, 'mood' => null]);
        }

        return $this->json(['success' => true, 'mood' => $mood]);
    }
}
