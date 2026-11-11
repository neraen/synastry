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

        // The cached path only recomputes the house cusps, never the positions.
        $calculatorMock = $this->createMock(PlanetaryCalculator::class);
        $calculatorMock->expects($this->never())->method('getWheelPositionsForApi');
        $calculatorMock->method('getHouseCusps')->willReturn([]);
        $this->astrologyAnalysisService->method('createCalculatorFromBirthProfile')->willReturn($calculatorMock);
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
            ->method('getWheelPositionsForApi')
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

    public function testGetBirthSkyFailsIfNoBirthProfile()
    {
        $result = $this->service->getBirthSky(new User());

        $this->assertFalse($result['success']);
    }

    public function testGetBirthSkyUsesEveningSkyWhenBirthTimeUnknown()
    {
        $user = new User();
        $profile = new BirthProfile();
        $profile->setBirthDate(new \DateTime('1994-03-14'));
        $profile->setBirthCity('Toulouse');
        $user->setBirthProfile($profile);

        $this->astrologyAnalysisService->expects($this->once())
            ->method('createCalculatorFromBirthProfile')
            ->with($profile, '22:00:00')
            ->willReturn(new PlanetaryCalculator('1994-03-14', '21:00', 43.6047, 1.4442));

        $result = $this->service->getBirthSky($user);

        $this->assertTrue($result['success']);
        $this->assertFalse($result['sky']['timeKnown']);
        $this->assertSame('22:00', $result['sky']['birthTime']);
        $this->assertSame('1994-03-14', $result['sky']['birthDate']);
        $this->assertSame('Toulouse', $result['sky']['city']);
        $this->assertCount(10, $result['sky']['planets']);
    }

    public function testGetBirthSkyKeepsKnownBirthTime()
    {
        $user = new User();
        $profile = new BirthProfile();
        $profile->setBirthDate(new \DateTime('1994-03-14'));
        $profile->setBirthTime(new \DateTime('21:30'));
        $profile->setBirthCity('Toulouse');
        $user->setBirthProfile($profile);

        $this->astrologyAnalysisService->method('createCalculatorFromBirthProfile')
            ->willReturn(new PlanetaryCalculator('1994-03-14', '20:30', 43.6047, 1.4442));

        $result = $this->service->getBirthSky($user);

        $this->assertTrue($result['sky']['timeKnown']);
        $this->assertSame('21:30', $result['sky']['birthTime']);
    }

    private function profileWithSky(int $discovered): User
    {
        $user = new User();
        $profile = new BirthProfile();
        $profile->setSkyDiscovered($discovered);
        $user->setBirthProfile($profile);

        return $user;
    }

    public function testSaveSkyProgressOnlyAddsDiscoveries()
    {
        $user = $this->profileWithSky(0b0000000110);

        // Un appel en retard (moins d'astres) ne doit rien effacer.
        $result = $this->service->saveSkyProgress($user, 0b0000000001, null);

        $this->assertTrue($result['success']);
        $this->assertSame(0b0000000111, $result['discovered']);
    }

    public function testSaveSkyProgressIgnoresUnknownBits()
    {
        $result = $this->service->saveSkyProgress($this->profileWithSky(0), 0b111110000000001, null);

        // Seul le bit 0 correspond à un astre : les bits au-delà du dixième sont écartés.
        $this->assertSame(0b0000000001, $result['discovered']);
    }

    public function testConstellationNameRefusedBeforeAllBodiesFound()
    {
        $result = $this->service->saveSkyProgress($this->profileWithSky(0b0111111111), null, 'L\'Hirondelle');

        $this->assertFalse($result['success']);
    }

    public function testConstellationNameSavedTrimmedAndCapped()
    {
        $user = $this->profileWithSky(0b1111111111);

        $result = $this->service->saveSkyProgress($user, null, "  L'Hirondelle   du  soir " . str_repeat('x', 60));

        $this->assertTrue($result['success']);
        $this->assertSame(40, mb_strlen($result['constellationName']));
        $this->assertStringStartsWith("L'Hirondelle du soir", $result['constellationName']);
    }

    public function testNameAndLastDiscoveryCanArriveTogether()
    {
        $result = $this->service->saveSkyProgress($this->profileWithSky(0b0111111111), 0b1000000000, 'Vega');

        $this->assertTrue($result['success']);
        $this->assertSame('Vega', $result['constellationName']);
    }

    public function testGetPartnerSkyReturnsPartnerPlanets()
    {
        $history = new \App\Entity\SynastryHistory();
        $history->setPartnerName('Léa');
        $history->setPartnerBirthData([
            'year' => 1994, 'month' => 3, 'day' => 14, 'hours' => 21, 'minutes' => 30,
            'latitude' => 43.6047, 'longitude' => 1.4442, 'timezone' => 1,
        ]);

        $user = new User();
        $this->synastryHistoryRepository->method('findOneByUserAndId')->with($user, 7)->willReturn($history);

        $result = $this->service->getPartnerSky($user, 7);

        $this->assertTrue($result['success']);
        $this->assertSame('Léa', $result['partner']['name']);
        $this->assertCount(10, $result['partner']['planets']);
        // 21h30 à UTC+1 = 20h30 UTC : même ciel que la naissance d'exemple.
        $this->assertEqualsWithDelta(354.03, $result['partner']['planets']['Sun']['lon'], 0.01);
    }

    public function testGetPartnerSkyFailsForUnknownHistory()
    {
        $this->synastryHistoryRepository->method('findOneByUserAndId')->willReturn(null);

        $result = $this->service->getPartnerSky(new User(), 99);

        $this->assertFalse($result['success']);
    }
}
