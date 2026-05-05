<?php

namespace App\Controller\Api;

use App\Entity\User;
use App\Entity\UserNotificationPreferences;
use App\Entity\UserPushToken;
use App\Repository\UserNotificationPreferencesRepository;
use App\Repository\UserPushTokenRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

#[Route('/api/push')]
class PushTokenController extends AbstractController
{
    public function __construct(
        private UserPushTokenRepository $tokenRepository,
        private UserNotificationPreferencesRepository $prefsRepository,
        private EntityManagerInterface $entityManager,
    ) {}

    /**
     * Register or refresh an Expo push token for the authenticated user.
     *
     * POST /api/push/token
     * Body: { "token": "ExponentPushToken[xxx]", "platform": "ios" | "android" }
     */
    #[Route('/token', name: 'push_token_register', methods: ['POST'])]
    public function registerToken(#[CurrentUser] ?User $user, Request $request): JsonResponse
    {
        if (!$user) {
            return $this->json(['error' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        }

        $data     = json_decode($request->getContent(), true) ?? [];
        $token    = trim($data['token'] ?? '');
        $platform = $data['platform'] ?? 'ios';

        if (!$token || !str_starts_with($token, 'ExponentPushToken[')) {
            return $this->json(['error' => 'Invalid push token format'], Response::HTTP_BAD_REQUEST);
        }

        // Upsert: update if token already exists, create otherwise
        $entity = $this->tokenRepository->findByToken($token);
        if (!$entity) {
            $entity = new UserPushToken();
            $entity->setToken($token);
        }

        $entity->setUser($user);
        $entity->setPlatform($platform);
        $entity->setIsActive(true);

        $this->entityManager->persist($entity);
        $this->entityManager->flush();

        return $this->json(['success' => true]);
    }

    /**
     * Deactivate a push token (logout / app uninstall).
     *
     * DELETE /api/push/token/{token}
     */
    #[Route('/token/{token}', name: 'push_token_delete', methods: ['DELETE'])]
    public function deactivateToken(#[CurrentUser] ?User $user, string $token): JsonResponse
    {
        if (!$user) {
            return $this->json(['error' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        }

        $entity = $this->tokenRepository->findByToken($token);
        if ($entity && $entity->getUser()?->getId() === $user->getId()) {
            $entity->setIsActive(false);
            $this->entityManager->flush();
        }

        return $this->json(['success' => true]);
    }

    /**
     * Get notification preferences for the authenticated user.
     *
     * GET /api/push/preferences
     */
    #[Route('/preferences', name: 'push_prefs_get', methods: ['GET'])]
    public function getPreferences(#[CurrentUser] ?User $user): JsonResponse
    {
        if (!$user) {
            return $this->json(['error' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        }

        $prefs = $this->prefsRepository->findOrCreateForUser($user);
        return $this->json(['success' => true, 'preferences' => $prefs->toArray()]);
    }

    /**
     * Update notification preferences for the authenticated user.
     *
     * PUT /api/push/preferences
     * Body: { "enabled": bool, "transitsEnabled": bool, "skyEventsEnabled": bool,
     *         "dailyReminderEnabled": bool, "preferredHour": int, "timezone": string }
     */
    #[Route('/preferences', name: 'push_prefs_update', methods: ['PUT', 'PATCH'])]
    public function updatePreferences(#[CurrentUser] ?User $user, Request $request): JsonResponse
    {
        if (!$user) {
            return $this->json(['error' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        }

        $data  = json_decode($request->getContent(), true) ?? [];
        $prefs = $this->prefsRepository->findOrCreateForUser($user);

        if (array_key_exists('enabled', $data)) {
            $prefs->setEnabled((bool) $data['enabled']);
        }
        if (array_key_exists('transitsEnabled', $data)) {
            $prefs->setTransitsEnabled((bool) $data['transitsEnabled']);
        }
        if (array_key_exists('skyEventsEnabled', $data)) {
            $prefs->setSkyEventsEnabled((bool) $data['skyEventsEnabled']);
        }
        if (array_key_exists('dailyReminderEnabled', $data)) {
            $prefs->setDailyReminderEnabled((bool) $data['dailyReminderEnabled']);
        }
        if (array_key_exists('preferredHour', $data)) {
            $prefs->setPreferredHour((int) $data['preferredHour']);
        }
        if (array_key_exists('timezone', $data)) {
            $tz = $data['timezone'];
            try {
                new \DateTimeZone($tz); // validate
                $prefs->setTimezone($tz);
            } catch (\Exception) {}
        }

        $this->entityManager->persist($prefs);
        $this->entityManager->flush();

        return $this->json(['success' => true, 'preferences' => $prefs->toArray()]);
    }
}
