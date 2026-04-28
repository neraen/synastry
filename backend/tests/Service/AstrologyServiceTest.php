<?php

namespace App\Tests\Service;

use App\Entity\BirthProfile;
use App\Entity\NatalChart;
use App\Entity\User;
use App\Repository\NatalChartRepository;
use App\Repository\SynastryHistoryRepository;
use App\Service\AstrologyAnalysisService;
use App\Service\AstrologyService;
use App\Service\PlanetaryCalculator;
use App\Service\Webservice\OpenAiService;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Symfony\Contracts\Cache\CacheInterface;

class AstrologyServiceTest extends TestCase
{
    private $openAiService;
    private $natalChartRepository;
    private $synastryHistoryRepository;
    private $entityManager;
    private $cache;
    private $astrologyAnalysisService;
    private AstrologyService $service;

    protected function setUp(): void
    {
        $this->openAiService = $this->createMock(OpenAiService::class);
        $this->natalChartRepository = $this->createMock(NatalChartRepository::class);
        $this->synastryHistoryRepository = $this->createMock(SynastryHistoryRepository::class);
        $this->entityManager = $this->createMock(EntityManagerInterface::class);
        $this->cache = $this->createMock(CacheInterface::class);
        $this->astrologyAnalysisService = $this->createMock(AstrologyAnalysisService::class);

        $this->service = new AstrologyService(
            $this->openAiService,
            $this->natalChartRepository,
            $this->synastryHistoryRepository,
            $this->entityManager,
            $this->cache,
            $this->astrologyAnalysisService
        );
        
        $this->service->setLocale('fr');
    }

    public function testCalculateNatalChartFailsIfNoBirthProfile()
    {
        $user = new User();

        $result = $this->service->calculateNatalChart($user);

        $this->assertFalse($result['success']);
        $this->assertEquals('No birth profile found for this user', $result['error']);
    }

    public function testCalculateNatalChartReturnsExistingIfNotForced()
    {
        $user = new User();
        $profile = new BirthProfile();
        $user->setBirthProfile($profile);

        $existingChart = new NatalChart();
        $existingChart->setPlanetaryPositions(['Sun' => ['Sign' => 'Leo']]);
        
        $this->natalChartRepository->expects($this->once())
            ->method('findByBirthProfile')
            ->with($profile)
            ->willReturn($existingChart);

        $this->astrologyAnalysisService->expects($this->never())->method('createCalculatorFromBirthProfile');
        $this->entityManager->expects($this->never())->method('persist');

        $result = $this->service->calculateNatalChart($user);

        $this->assertTrue($result['success']);
        $this->assertTrue($result['cached']);
        $this->assertEquals('Leo', $result['chart']['planetaryPositions']['Sun']['Sign']);
    }

    public function testCalculateNatalChartGeneratesNew()
    {
        $user = new User();
        $profile = new BirthProfile();
        $user->setBirthProfile($profile);

        $this->natalChartRepository->expects($this->once())
            ->method('findByBirthProfile')
            ->willReturn(null);

        $calculatorMock = $this->createMock(PlanetaryCalculator::class);
        $calculatorMock->expects($this->once())
            ->method('getPlanetaryPositionsForApi')
            ->willReturn(['Moon' => ['Sign' => 'Cancer']]);

        $this->astrologyAnalysisService->expects($this->once())
            ->method('createCalculatorFromBirthProfile')
            ->with($profile)
            ->willReturn($calculatorMock);

        $this->entityManager->expects($this->once())->method('persist');
        $this->entityManager->expects($this->once())->method('flush');

        $result = $this->service->calculateNatalChart($user);

        $this->assertTrue($result['success']);
        $this->assertFalse($result['cached']);
        $this->assertEquals('Cancer', $result['chart']['planetaryPositions']['Moon']['Sign']);
    }
}
