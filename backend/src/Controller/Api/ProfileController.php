<?php

namespace App\Controller\Api;

use App\Entity\User;
use App\Entity\RefreshToken;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api')]
class ProfileController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface $entityManager,
    ) {}

    #[Route('/me', name: 'api_me', methods: ['GET'])]
    public function me(): JsonResponse
    {
        /** @var User|null $user */
        $user = $this->getUser();

        if (!$user) {
            return $this->json([
                'error' => 'Not authenticated'
            ], 401);
        }

        $birthProfile = $user->getBirthProfile();

        return $this->json([
            'id' => $user->getId(),
            'email' => $user->getEmail(),
            'roles' => $user->getRoles(),
            'hasBirthProfile' => $user->hasBirthProfile(),
            'birthProfile' => $birthProfile?->toArray(),
            'isPremium' => $user->isPremium(),
            'premiumUntil' => $user->getPremiumUntil()?->format(\DateTime::ATOM),
        ]);
    }

    /**
     * Dev-only: force premium on the authenticated user.
     * Only works for the admin email.
     */
    #[Route('/dev/force-premium', name: 'api_dev_force_premium', methods: ['POST'])]
    public function forcePremium(): JsonResponse
    {
        /** @var User|null $user */
        $user = $this->getUser();

        if (!$user) {
            return $this->json(['error' => 'Not authenticated'], Response::HTTP_UNAUTHORIZED);
        }

        $adminEmail = $_ENV['ADMIN_EMAIL'] ?? 'clement.silvestre31@gmail.com';
        if ($user->getEmail() !== $adminEmail) {
            return $this->json(['error' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }

        $user->setIsPremium(true);
        $user->setPremiumUntil(null);
        $this->entityManager->flush();

        return $this->json(['success' => true, 'isPremium' => true]);
    }

    /**
     * Delete user account permanently
     * GDPR compliant - removes all user data
     */
    #[Route('/user/account', name: 'api_delete_account', methods: ['DELETE'])]
    public function deleteAccount(): JsonResponse
    {
        /** @var User|null $user */
        $user = $this->getUser();

        if (!$user) {
            return $this->json([
                'error' => 'Not authenticated'
            ], 401);
        }

        try {
            $userEmail = $user->getEmail();

            // Delete refresh tokens for this user
            $refreshTokenRepo = $this->entityManager->getRepository(RefreshToken::class);
            $refreshTokens = $refreshTokenRepo->findBy(['username' => $userEmail]);
            foreach ($refreshTokens as $token) {
                $this->entityManager->remove($token);
            }

            // Delete the user (cascade will handle BirthProfile, NatalChart, SynastryHistory)
            $this->entityManager->remove($user);
            $this->entityManager->flush();

            return $this->json([
                'success' => true,
                'message' => 'Account deleted successfully'
            ]);
        } catch (\Exception $e) {
            return $this->json([
                'error' => 'Failed to delete account',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}