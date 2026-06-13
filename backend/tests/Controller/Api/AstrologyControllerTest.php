<?php

namespace App\Tests\Controller\Api;

use App\Controller\Api\AstrologyController;
use App\Entity\BirthProfile;
use App\Entity\User;
use App\Repository\NatalChartRepository;
use App\Repository\SynastryHistoryRepository;
use App\Service\AstrologyService;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\Container;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\UsernamePasswordToken;

class AstrologyControllerTest extends TestCase
{
    private $astrologyService;
    private $natalChartRepository;
    private $synastryHistoryRepository;
    private $tokenStorage;
    private $container;
    private AstrologyController $controller;

    protected function setUp(): void
    {
        $this->astrologyService = $this->createMock(AstrologyService::class);
        $this->natalChartRepository = $this->createMock(NatalChartRepository::class);
        $this->synastryHistoryRepository = $this->createMock(SynastryHistoryRepository::class);
        $this->tokenStorage = $this->createMock(TokenStorageInterface::class);

        $this->container = new Container();
        $this->container->set('security.token_storage', $this->tokenStorage);

        $logger = $this->createMock(\Psr\Log\LoggerInterface::class);
        $this->controller = new AstrologyController(
            $this->astrologyService,
            $this->natalChartRepository,
            $this->synastryHistoryRepository,
            $logger
        );
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

    public function testGetNatalChartReturns400IfNoBirthProfile()
    {
        $user = new User();
        $this->loginUser($user);

        $request = new Request();
        $response = $this->controller->getNatalChart($request);

        $this->assertEquals(400, $response->getStatusCode());
        $data = json_decode($response->getContent(), true);
        $this->assertEquals('Please complete your birth profile first', $data['error']);
    }

    public function testGetNatalChartSummaryReturnsData()
    {
        $user = new User();
        $user->setBirthProfile(new BirthProfile());
        $this->loginUser($user);

        $request = new Request();
        $request->headers->set('Accept-Language', 'en');

        $this->astrologyService->expects($this->once())
            ->method('setLocale')
            ->with('en');

        $this->astrologyService->expects($this->once())
            ->method('getNatalChartSummary')
            ->with($user)
            ->willReturn(['success' => true, 'summary' => 'You are great']);

        $response = $this->controller->getNatalChartSummary($request);

        $this->assertEquals(200, $response->getStatusCode());
        $data = json_decode($response->getContent(), true);
        $this->assertEquals('You are great', $data['summary']);
    }

    public function testCalculateSynastryLimitsFreeUsers()
    {
        $user = new User();
        $user->setIsPremium(false);
        $user->setBirthProfile(new BirthProfile());
        $this->loginUser($user);

        $this->synastryHistoryRepository->expects($this->once())
            ->method('countByUser')
            ->with($user)
            ->willReturn(1); // Free user already has 1 analysis

        $request = new Request([], [], [], [], [], [], json_encode([
            'partnerName' => 'Alice',
            'birthDate' => '1990-01-01',
            'birthCity' => 'Paris',
            'latitude' => 48.8,
            'longitude' => 2.3
        ]));

        $response = $this->controller->calculateSynastry($request);

        $this->assertEquals(403, $response->getStatusCode());
        $data = json_decode($response->getContent(), true);
        $this->assertEquals('free_limit_reached', $data['error']);
    }

    public function testCalculateSynastryAllowsPremiumUsers()
    {
        $user = new User();
        $user->setIsPremium(true);
        $user->setBirthProfile(new BirthProfile());
        $this->loginUser($user);

        // Should not even check the count
        $this->synastryHistoryRepository->expects($this->never())->method('countByUser');

        $request = new Request([], [], [], [], [], [], json_encode([
            'partnerName' => 'Alice',
            'birthDate' => '1990-01-01',
            'birthCity' => 'Paris',
            'latitude' => 48.8,
            'longitude' => 2.3
        ]));

        $this->astrologyService->expects($this->once())
            ->method('calculateSynastryWithExternal')
            ->willReturn(['success' => true, 'score' => 90]);

        $response = $this->controller->calculateSynastry($request);

        $this->assertEquals(200, $response->getStatusCode());
        $data = json_decode($response->getContent(), true);
        $this->assertEquals(90, $data['score']);
    }
}
