<?php

namespace App\Tests\Controller\Api;

use App\Controller\Api\ProfileController;
use App\Entity\BirthProfile;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\Container;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\UsernamePasswordToken;

class ProfileControllerTest extends TestCase
{
    private $entityManager;
    private $tokenStorage;
    private $container;
    private ProfileController $controller;

    protected function setUp(): void
    {
        $this->entityManager = $this->createMock(EntityManagerInterface::class);
        $this->tokenStorage = $this->createMock(TokenStorageInterface::class);

        $this->container = new Container();
        $this->container->set('security.token_storage', $this->tokenStorage);

        $this->controller = new ProfileController($this->entityManager);
        $this->controller->setContainer($this->container);
    }

    private function loginUser(?User $user)
    {
        if ($user) {
            $token = new UsernamePasswordToken($user, 'main', $user->getRoles());
            $this->tokenStorage->method('getToken')->willReturn($token);
        } else {
            $this->tokenStorage->method('getToken')->willReturn(null);
        }
    }

    public function testMeReturns401IfNotAuthenticated()
    {
        $this->loginUser(null);

        $response = $this->controller->me();

        $this->assertInstanceOf(JsonResponse::class, $response);
        $this->assertEquals(401, $response->getStatusCode());
        
        $data = json_decode($response->getContent(), true);
        $this->assertEquals('Not authenticated', $data['error']);
    }

    public function testMeReturnsUserData()
    {
        $user = new User();
        $user->setEmail('test@example.com');
        $user->setRoles(['ROLE_USER']);
        
        $profile = new BirthProfile();
        $profile->setFirstName('John');
        $user->setBirthProfile($profile);

        $this->loginUser($user);

        $response = $this->controller->me();

        $this->assertEquals(200, $response->getStatusCode());
        
        $data = json_decode($response->getContent(), true);
        $this->assertEquals('test@example.com', $data['email']);
        $this->assertTrue($data['hasBirthProfile']);
        $this->assertEquals('John', $data['birthProfile']['firstName']);
        $this->assertFalse($data['isPremium']);
    }

    public function testDeleteAccountReturns401IfNotAuthenticated()
    {
        $this->loginUser(null);

        $response = $this->controller->deleteAccount();

        $this->assertEquals(401, $response->getStatusCode());
    }
}
