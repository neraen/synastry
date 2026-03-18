<?php

namespace App\Controller\Api;

use App\Entity\User;
use App\Entity\RefreshToken;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
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
        ]);
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