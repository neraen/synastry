<?php

namespace App\Controller\Api;

use App\Entity\RectificationSession;
use App\Entity\User;
use App\Service\Rectification\BlindValidationService;
use App\Service\Rectification\RectificationConfig;
use App\Service\Rectification\RectificationSessionService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

/**
 * HTTP surface of the birth-time rectification wizard.
 *
 * Every endpoint returns the *whole* session state, not just the effect of the
 * call. The app therefore never has to reconstruct where the user is — it
 * renders whatever step the server reports, which is what makes the journey
 * resumable after the app is killed at any point (spec §14).
 */
#[Route('/api/rectification')]
class RectificationController extends AbstractController
{
    public function __construct(private readonly RectificationSessionService $service)
    {
    }

    #[Route('/session', name: 'api_rectification_session', methods: ['GET'])]
    public function session(): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        return $this->json($this->state($this->service->sessionFor($user), $user));
    }

    #[Route('/session/official-source', name: 'api_rectification_official_source', methods: ['POST'])]
    public function officialSource(Request $request): JsonResponse
    {
        /** @var User $user */
        $user    = $this->getUser();
        $payload = $request->toArray();

        try {
            $session = $this->service->recordOfficialSource(
                $this->service->sessionFor($user),
                (string) ($payload['choice'] ?? ''),
                $payload['time'] ?? null,
            );
        } catch (\InvalidArgumentException $e) {
            return $this->json(['success' => false, 'error' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        return $this->json($this->state($session, $user));
    }

    #[Route('/session/window', name: 'api_rectification_window', methods: ['POST'])]
    public function window(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        $session = $this->service->recordWindow($this->service->sessionFor($user), $request->toArray());

        return $this->json($this->state($session, $user));
    }

    #[Route('/session/events', name: 'api_rectification_add_event', methods: ['POST'])]
    public function addEvent(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        try {
            $session = $this->service->addEvent(
                $this->service->sessionFor($user),
                $request->toArray(),
                $user->isPremium(),
            );
        } catch (\DomainException $e) {
            // Spec §12: the free tier stops at three events.
            return $this->json([
                'success' => false,
                'error'   => $e->getMessage(),
                'limit'   => RectificationConfig::FREE_TIER_MAX_EVENTS,
            ], Response::HTTP_PAYMENT_REQUIRED);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['success' => false, 'error' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        return $this->json($this->state($session, $user));
    }

    #[Route('/session/events/{index}', name: 'api_rectification_remove_event', methods: ['DELETE'])]
    public function removeEvent(int $index): JsonResponse
    {
        /** @var User $user */
        $user    = $this->getUser();
        $session = $this->service->sessionFor($user);

        if (!array_key_exists($index, $session->getEvents())) {
            return $this->json(['success' => false, 'error' => 'not_found'], Response::HTTP_NOT_FOUND);
        }

        return $this->json($this->state($this->service->removeEvent($session, $index), $user));
    }

    #[Route('/session/calculate', name: 'api_rectification_calculate', methods: ['POST'])]
    public function calculate(): JsonResponse
    {
        /** @var User $user */
        $user    = $this->getUser();
        $session = $this->service->sessionFor($user);

        try {
            $this->service->calculate($session, $user->isPremium());
        } catch (\DomainException $e) {
            return $this->json(
                ['success' => false, 'error' => $e->getMessage()],
                $e->getMessage() === 'threshold_not_met' ? Response::HTTP_CONFLICT : Response::HTTP_BAD_REQUEST,
            );
        }

        return $this->json($this->state($session, $user));
    }

    /** Ask for the next discriminating question of the active loop (spec §8). */
    #[Route('/session/question', name: 'api_rectification_question', methods: ['GET'])]
    public function question(): JsonResponse
    {
        /** @var User $user */
        $user    = $this->getUser();
        $session = $this->service->sessionFor($user);

        try {
            $question = $this->service->nextQuestion($session, $user->isPremium());
        } catch (\DomainException $e) {
            return $this->json(['success' => false, 'error' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        return $this->json($this->state($session, $user) + ['question' => $question]);
    }

    #[Route('/session/question', name: 'api_rectification_answer', methods: ['POST'])]
    public function answer(Request $request): JsonResponse
    {
        /** @var User $user */
        $user    = $this->getUser();
        $session = $this->service->sessionFor($user);

        try {
            $this->service->answerQuestion(
                $session,
                (string) ($request->toArray()['answer'] ?? ''),
                $user->isPremium(),
            );
        } catch (\DomainException $e) {
            return $this->json(['success' => false, 'error' => $e->getMessage()], Response::HTTP_CONFLICT);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['success' => false, 'error' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        return $this->json($this->state($session, $user) + ['question' => $session->getPendingQuestion()]);
    }

    #[Route('/session/adopt', name: 'api_rectification_adopt', methods: ['POST'])]
    public function adopt(): JsonResponse
    {
        /** @var User $user */
        $user    = $this->getUser();
        $session = $this->service->sessionFor($user);

        try {
            $profile = $this->service->adopt($session);
        } catch (\DomainException $e) {
            return $this->json(['success' => false, 'error' => $e->getMessage()], Response::HTTP_CONFLICT);
        }

        return $this->json($this->state($session, $user) + ['birthProfile' => $profile->toArray()]);
    }

    /**
     * Blind validation (spec §10) — "donne-nous tes événements, on devine ton
     * heure", for users who already know it.
     *
     * The known time never reaches the inference: the engine is handed the same
     * window and events as any other run, and the gap is computed afterwards.
     */
    #[Route('/session/blind-test', name: 'api_rectification_blind_test', methods: ['POST'])]
    public function blindTest(BlindValidationService $blindValidation): JsonResponse
    {
        /** @var User $user */
        $user    = $this->getUser();
        $session = $this->service->sessionFor($user);

        try {
            $validation = $blindValidation->run($session);
        } catch (\DomainException $e) {
            return $this->json(['success' => false, 'error' => $e->getMessage()], Response::HTTP_CONFLICT);
        }

        return $this->json(['success' => true, 'validation' => $validation->toArray()]);
    }

    #[Route('/session/blind-test', name: 'api_rectification_blind_eligibility', methods: ['GET'])]
    public function blindEligibility(BlindValidationService $blindValidation): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        return $this->json([
            'success' => true,
        ] + $blindValidation->eligibility($user, $this->service->sessionFor($user)));
    }

    /** Back to a time the user types in (spec §9.5). */
    #[Route('/session/revert', name: 'api_rectification_revert', methods: ['POST'])]
    public function revert(Request $request): JsonResponse
    {
        /** @var User $user */
        $user    = $this->getUser();
        $payload = $request->toArray();

        $profile = $this->service->revertToDeclaredTime($user, $payload['time'] ?? null);

        if ($profile === null) {
            return $this->json(['success' => false, 'error' => 'no_birth_profile'], Response::HTTP_CONFLICT);
        }

        return $this->json(['success' => true, 'birthProfile' => $profile->toArray()]);
    }

    /**
     * The full state of the wizard, in one shape, on every response.
     *
     * @return array<string, mixed>
     */
    private function state(RectificationSession $session, User $user): array
    {
        $isPremium = $user->isPremium();

        return [
            'success' => true,
            'session' => [
                'step'            => $session->getStep(),
                'source_choice'   => $session->getOfficialSourceChoice(),
                'known_time'      => $session->getKnownTime()?->format('H:i'),
                'window_answers'  => $session->getWindowAnswers(),
                'window'          => $session->getWindowStartHour() === null ? null : [
                    'start' => $session->getWindowStartHour(),
                    'end'   => $session->getWindowEndHour(),
                ],
                'events'          => $session->getEvents(),
                'asked_questions' => $session->getAskedQuestions(),
                'pending_question' => $session->getPendingQuestion(),
                'result'          => $session->getLastResult(),
                'calculated_at'   => $session->getLastCalculatedAt()?->format(\DateTimeInterface::ATOM),
                'updated_at'      => $session->getUpdatedAt()->format(\DateTimeInterface::ATOM),
            ],
            // The dial's live uncertainty — recomputed on every mutation so it
            // visibly tightens as events are added (spec §6).
            'dial'    => $this->service->dialState($session),
            'limits'  => [
                'premium'          => $isPremium,
                'free_max_events'  => RectificationConfig::FREE_TIER_MAX_EVENTS,
                'min_events'       => RectificationConfig::MIN_EVENTS,
                'min_day_dated'    => RectificationConfig::MIN_DAY_DATED_EVENTS,
            ],
        ];
    }
}
