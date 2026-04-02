<?php

namespace App\Controller\Api;

use App\Service\MirrorService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/mirror')]
#[IsGranted('ROLE_USER')]
class MirrorController extends AbstractController
{
    public function __construct(
        private MirrorService $mirrorService,
    ) {}

    /**
     * GET /api/mirror/transits?age=<int>
     *
     * Returns transit positions + active aspects + global intensity for the given age.
     * Free users are limited to ages 0–10 and [currentAge ± 5].
     */
    #[Route('/transits', methods: ['GET'])]
    public function getTransits(Request $request): JsonResponse
    {
        $user = $this->getUser();

        if (!$user->hasBirthProfile()) {
            return $this->json(['success' => false, 'error' => 'no_birth_profile'], 400);
        }

        $age = max(0, min(80, (int)$request->query->get('age', 30)));

        if (!$this->mirrorService->isAgeUnlocked($user, $age)) {
            return $this->json([
                'success'         => false,
                'error'           => 'premium_required',
                'unlocked_ranges' => $this->mirrorService->getUnlockedRanges($user),
            ], 403);
        }

        try {
            return $this->json($this->mirrorService->getTransits($user, $age));
        } catch (\Exception $e) {
            return $this->json(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * POST /api/mirror/interpret
     * Body: { age: int, pinned_event?: string }
     *
     * Generates a GPT-4 mini interpretation of the dominant energy at the given age.
     */
    #[Route('/interpret', methods: ['POST'])]
    public function interpret(Request $request): JsonResponse
    {
        $user = $this->getUser();

        if (!$user->hasBirthProfile()) {
            return $this->json(['success' => false, 'error' => 'no_birth_profile'], 400);
        }

        $body = json_decode($request->getContent(), true) ?? [];
        $age = max(0, min(80, (int)($body['age'] ?? 30)));
        $pinnedEvent = isset($body['pinned_event']) && $body['pinned_event'] !== ''
            ? (string)$body['pinned_event']
            : null;

        if (!$this->mirrorService->isAgeUnlocked($user, $age)) {
            return $this->json([
                'success'         => false,
                'error'           => 'premium_required',
                'unlocked_ranges' => $this->mirrorService->getUnlockedRanges($user),
            ], 403);
        }

        try {
            return $this->json($this->mirrorService->getInterpretation($user, $age, $pinnedEvent));
        } catch (\Exception $e) {
            return $this->json(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }
}