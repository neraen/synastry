<?php

namespace App\Tests\Service;

use App\Entity\RefreshToken;
use App\Entity\User;
use App\Repository\UserRepository;
use App\Service\OAuthUserManager;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\EntityRepository;
use PHPUnit\Framework\TestCase;

class OAuthUserManagerTest extends TestCase
{
    private function link(User $existing, int $expectedTokenPurges): User
    {
        $repository = $this->createMock(UserRepository::class);
        $repository->method('findOneBy')->willReturnCallback(
            fn (array $criteria) => isset($criteria['email']) ? $existing : null,
        );

        $tokens = $this->createMock(EntityRepository::class);
        $tokens->method('findBy')->willReturn([new RefreshToken()]);

        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->method('getRepository')->willReturn($tokens);
        $entityManager->expects($this->exactly($expectedTokenPurges))->method('remove');

        return (new OAuthUserManager($repository, $entityManager))
            ->findOrCreateUser('google', 'google-sub', 'victim@example.com');
    }

    public function testLinkingDropsThePasswordOfAnUnverifiedRegistration(): void
    {
        $user = (new User())->setEmail('victim@example.com')->setPassword('hash-set-by-someone-else');

        $linked = $this->link($user, 1);

        $this->assertSame($user, $linked);
        $this->assertNull($linked->getPassword());
        $this->assertSame('google-sub', $linked->getGoogleId());
    }

    public function testLinkingKeepsTheAdminPassword(): void
    {
        $user = (new User())->setEmail('victim@example.com')->setPassword('admin-hash');
        $user->setRoles(['ROLE_ADMIN']);

        $this->assertSame('admin-hash', $this->link($user, 0)->getPassword());
    }

    public function testLinkingAPasswordlessAccountPurgesNothing(): void
    {
        $user = (new User())->setEmail('victim@example.com')->setPassword(null);

        $this->assertNull($this->link($user, 0)->getPassword());
    }
}
