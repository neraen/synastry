<?php

namespace App\Service;

use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Manages user premium status.
 *
 * Called by the RevenueCat webhook when a subscription event is received.
 * Can also be used manually (admin, promo codes, etc.).
 */
class PremiumService
{
    public function __construct(
        private UserRepository $userRepository,
        private EntityManagerInterface $entityManager,
    ) {}

    /**
     * Activate premium for a user.
     *
     * @param string $appUserId  The RevenueCat app_user_id (= user database ID as string)
     * @param \DateTimeInterface|null $expiresAt  Subscription expiry date (null = lifetime)
     */
    public function activate(string $appUserId, ?\DateTimeInterface $expiresAt = null): bool
    {
        $user = $this->findUser($appUserId);
        if (!$user) return false;

        $user->setIsPremium(true);
        $user->setPremiumUntil($expiresAt);
        $this->entityManager->flush();

        return true;
    }

    /**
     * Deactivate premium for a user (cancellation, expiration, billing issue).
     */
    public function deactivate(string $appUserId): bool
    {
        $user = $this->findUser($appUserId);
        if (!$user) return false;

        $user->setIsPremium(false);
        $user->setPremiumUntil(null);
        $this->entityManager->flush();

        return true;
    }

    /**
     * Renew premium (update expiry date on renewal event).
     */
    public function renew(string $appUserId, \DateTimeInterface $newExpiresAt): bool
    {
        $user = $this->findUser($appUserId);
        if (!$user) return false;

        $user->setIsPremium(true);
        $user->setPremiumUntil($newExpiresAt);
        $this->entityManager->flush();

        return true;
    }

    private function findUser(string $appUserId): ?User
    {
        if (!is_numeric($appUserId)) return null;
        return $this->userRepository->find((int) $appUserId);
    }
}
