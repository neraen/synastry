<?php

namespace App\Service;

use App\Entity\RefreshToken;
use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;

class OAuthUserManager
{
    public function __construct(
        private readonly UserRepository $userRepository,
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    /**
     * Find or create a user based on OAuth provider data
     */
    public function findOrCreateUser(string $provider, string $providerId, ?string $email): User
    {
        // First, try to find by provider ID
        $user = $this->findByProviderId($provider, $providerId);
        if ($user !== null) {
            return $user;
        }

        // Then, try to find by email and link the account
        if ($email !== null) {
            $user = $this->userRepository->findOneBy(['email' => $email]);
            if ($user !== null) {
                $this->linkProviderToUser($user, $provider, $providerId);
                return $user;
            }
        }

        // Create new user
        return $this->createOAuthUser($provider, $providerId, $email);
    }

    /**
     * Find a user by their OAuth provider ID
     */
    private function findByProviderId(string $provider, string $providerId): ?User
    {
        $field = match ($provider) {
            'google' => 'googleId',
            'apple' => 'appleId',
            default => throw new \InvalidArgumentException("Unknown OAuth provider: $provider"),
        };

        return $this->userRepository->findOneBy([$field => $providerId]);
    }

    /**
     * Link an OAuth provider to an existing user
     */
    private function linkProviderToUser(User $user, string $provider, string $providerId): void
    {
        match ($provider) {
            'google' => $user->setGoogleId($providerId),
            'apple' => $user->setAppleId($providerId),
            default => throw new \InvalidArgumentException("Unknown OAuth provider: $provider"),
        };

        // /api/register never verifies the email, so whoever set this password may
        // not own the address. The provider just proved ownership: drop the password
        // and its sessions, otherwise a pre-registered account stays open to its
        // creator. Admins are exempt, the back-office only has password login.
        if ($user->getPassword() !== null && !in_array('ROLE_ADMIN', $user->getRoles(), true)) {
            $user->setPassword(null);
            $refreshTokens = $this->entityManager->getRepository(RefreshToken::class)
                ->findBy(['username' => $user->getEmail()]);
            foreach ($refreshTokens as $refreshToken) {
                $this->entityManager->remove($refreshToken);
            }
        }

        $this->entityManager->flush();
    }

    /**
     * Create a new user from OAuth data
     */
    private function createOAuthUser(string $provider, string $providerId, ?string $email): User
    {
        $user = new User();

        // Set email if available, otherwise generate a placeholder
        if ($email !== null) {
            $user->setEmail($email);
        } else {
            // Apple may hide real email - generate a unique placeholder
            $user->setEmail(sprintf('%s_%s@oauth.local', $provider, $providerId));
        }

        // Link provider
        match ($provider) {
            'google' => $user->setGoogleId($providerId),
            'apple' => $user->setAppleId($providerId),
            default => throw new \InvalidArgumentException("Unknown OAuth provider: $provider"),
        };

        // OAuth users don't have a password
        $user->setPassword(null);

        $this->entityManager->persist($user);
        $this->entityManager->flush();

        return $user;
    }
}
