<?php

namespace App\Tests\Controller\Api;

use App\Controller\Api\HoroscopeController;
use App\Entity\BirthProfile;
use App\Entity\User;
use App\Service\HoroscopeGeneratorService;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\Container;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\UsernamePasswordToken;

class HoroscopeControllerTest extends TestCase
{
    private $horoscopeGeneratorService;
    private $tokenStorage;
    private $container;
    private HoroscopeController $controller;

    protected function setUp(): void
    {
        $this->horoscopeGeneratorService = $this->createMock(HoroscopeGeneratorService::class);
        $this->tokenStorage = $this->createMock(TokenStorageInterface::class);

        $this->container = new Container();
        $this->container->set('security.token_storage', $this->tokenStorage);

        $this->controller = new HoroscopeController($this->horoscopeGeneratorService);
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

    // NOTE: the per-user daily horoscope endpoint was removed in the Actu astro
    // pivot. The underlying service method is kept (eval + admin sandbox) and is
    // covered by HoroscopeGeneratorServiceTest.

    public function testGetCosmicHeadlineReturnsData()
    {
        $request = new Request();
        $request->headers->set('Accept-Language', 'en');

        $this->horoscopeGeneratorService->expects($this->once())
            ->method('setLocale')
            ->with('en');

        $this->horoscopeGeneratorService->expects($this->once())
            ->method('getCosmicHeadline')
            ->willReturn(['success' => true, 'headline' => 'Big news']);

        $response = $this->controller->getCosmicHeadline($request);

        $this->assertEquals(200, $response->getStatusCode());
        $data = json_decode($response->getContent(), true);
        $this->assertEquals('Big news', $data['headline']);
    }

    public function testGetCalendarTransitsReturns400IfInvalidMonth()
    {
        $user = new User();
        $user->setBirthProfile(new BirthProfile());
        $this->loginUser($user);

        $request = new Request();
        $request->query->set('month', 'invalid-format');

        $response = $this->controller->getCalendarTransits($request);

        $this->assertEquals(400, $response->getStatusCode());
        $data = json_decode($response->getContent(), true);
        $this->assertEquals('Invalid month format. Use YYYY-MM.', $data['error']);
    }
}
