<?php

namespace App\Tests\Service;

use App\Entity\BirthProfile;
use App\Entity\DailyHoroscope;
use App\Entity\User;
use App\Repository\CosmicHeadlineRepository;
use App\Repository\DailyHoroscopeRepository;
use App\Service\AstrologyAnalysisService;
use App\Service\HoroscopeGeneratorService;
use App\Service\Webservice\OpenAiService;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Psr\Log\NullLogger;

class HoroscopeGeneratorServiceTest extends TestCase
{
    private $astrologyAnalysisService;
    private $openAiService;
    private $dailyHoroscopeRepository;
    private $cosmicHeadlineRepository;
    private $entityManager;
    private HoroscopeGeneratorService $service;

    protected function setUp(): void
    {
        $this->astrologyAnalysisService = $this->createMock(AstrologyAnalysisService::class);
        $this->openAiService = $this->createMock(OpenAiService::class);
        $this->dailyHoroscopeRepository = $this->createMock(DailyHoroscopeRepository::class);
        $this->cosmicHeadlineRepository = $this->createMock(CosmicHeadlineRepository::class);
        $this->entityManager = $this->createMock(EntityManagerInterface::class);

        $this->service = new HoroscopeGeneratorService(
            $this->astrologyAnalysisService,
            $this->openAiService,
            $this->dailyHoroscopeRepository,
            $this->cosmicHeadlineRepository,
            $this->entityManager,
            new NullLogger()
        );
        
        $this->service->setLocale('fr');
    }

    public function testGetDailyHoroscopeFailsIfNoBirthProfile()
    {
        $user = new User(); // No birth profile

        $result = $this->service->getDailyHoroscope($user);

        $this->assertFalse($result['success']);
        $this->assertEquals('Veuillez compléter votre profil de naissance', $result['error']);
    }

    public function testGetDailyHoroscopeReturnsExistingHoroscope()
    {
        $user = new User();
        $user->setBirthProfile(new BirthProfile());

        $existing = new DailyHoroscope();
        $existing->setTitle('Mon horoscope');
        $existing->setOverview('Overview');
        $existing->setLove('Love');
        $existing->setEnergy('Energy');
        $existing->setAdvice('Advice');
        $existing->setDate(new \DateTime('today'));
        $existing->setGeneratedAt(new \DateTime());

        $this->dailyHoroscopeRepository->expects($this->once())
            ->method('findTodayForUser')
            ->with($user)
            ->willReturn($existing);

        // We shouldn't call OpenAI or save anything
        $this->openAiService->expects($this->never())->method('generateDailyHoroscope');
        $this->entityManager->expects($this->never())->method('persist');

        $result = $this->service->getDailyHoroscope($user, false);

        $this->assertTrue($result['success']);
        $this->assertArrayHasKey('horoscope', $result);
        $this->assertEquals('Mon horoscope', $result['horoscope']['title']);
        $this->assertTrue($result['horoscope']['cached']); // because we return true in DTO mapping
    }

    public function testGetDailyHoroscopeGeneratesNew()
    {
        $user = new User();
        $user->setBirthProfile(new BirthProfile());

        $this->dailyHoroscopeRepository->expects($this->once())
            ->method('findTodayForUser')
            ->willReturn(null);

        $this->astrologyAnalysisService->expects($this->once())
            ->method('prepareHoroscopeData')
            ->willReturn([
                'sun_sign' => 'Aries',
                'moon_sign' => 'Taurus',
                'ascendant' => 'Gemini',
                'natal_planets' => [],
                'current_transits' => [],
                'major_aspects' => [],
                'slow_aspects' => []
            ]);

        $this->openAiService->expects($this->once())
            ->method('generateDailyHoroscope')
            ->willReturn([
                'success' => true,
                'content' => [
                    'title' => 'Titre test',
                    'overview' => 'Overview test',
                    'love' => 'Love test',
                    'energy' => 'Energy test',
                    'advice' => 'Advice test'
                ]
            ]);

        // Linter pass-through: identity (its own logic is covered elsewhere)
        $this->openAiService->method('corrigerViolations')->willReturnArgument(0);

        $this->entityManager->expects($this->once())->method('persist');
        $this->entityManager->expects($this->once())->method('flush');

        $result = $this->service->getDailyHoroscope($user);

        $this->assertTrue($result['success']);
        $this->assertEquals('Titre test', $result['horoscope']['title']);
        $this->assertFalse($result['horoscope']['cached']);
    }

    public function testGetUpcomingTransitsFailsIfNoBirthProfile()
    {
        $user = new User();

        $result = $this->service->getUpcomingTransits($user);

        $this->assertFalse($result['success']);
        $this->assertEquals('Veuillez compléter votre profil de naissance', $result['error']);
    }
}
