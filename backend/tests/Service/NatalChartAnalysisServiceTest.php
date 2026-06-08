<?php

namespace App\Tests\Service;

use App\Entity\BirthProfile;
use App\Entity\User;
use App\Repository\NatalChartSectionRepository;
use App\Service\AstrologyAnalysisService;
use App\Service\NatalChartAnalysisService;
use App\Service\PlanetaryCalculator;
use App\Service\Webservice\OpenAiService;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;

class NatalChartAnalysisServiceTest extends TestCase
{
    private $openAiService;
    private $astrologyAnalysisService;
    private $sectionRepository;
    private $entityManager;
    private NatalChartAnalysisService $service;

    protected function setUp(): void
    {
        $this->openAiService = $this->createMock(OpenAiService::class);
        $this->astrologyAnalysisService = $this->createMock(AstrologyAnalysisService::class);
        $this->sectionRepository = $this->createMock(NatalChartSectionRepository::class);
        $this->entityManager = $this->createMock(EntityManagerInterface::class);

        $this->service = new NatalChartAnalysisService(
            $this->openAiService,
            $this->astrologyAnalysisService,
            $this->sectionRepository,
            $this->entityManager
        );
    }

    public function testGetSectionReturnsCachedContent()
    {
        $user = new User();
        $profile = new BirthProfile();
        $user->setBirthProfile($profile);

        $calculatorMock = $this->createMock(PlanetaryCalculator::class);
        $calculatorMock->expects($this->once())
            ->method('getFullChartPayload')
            ->willReturn(['Sun' => ['Sign' => 'Leo']]);

        $this->astrologyAnalysisService->expects($this->once())
            ->method('createCalculatorFromBirthProfile')
            ->with($profile)
            ->willReturn($calculatorMock);

        $cachedRecord = $this->createMock(\App\Entity\NatalChartSection::class);
        $cachedRecord->expects($this->once())
            ->method('getChartHash')
            ->willReturn('b1cbd42690fd79b8'); // hash of ksorted payload ['Sun' => ['Sign' => 'Leo']]
        $cachedRecord->expects($this->once())
            ->method('getContent')
            ->willReturn('Cached content');

        $this->sectionRepository->expects($this->once())
            ->method('findByUserAndSection')
            ->with($user, 'identity')
            ->willReturn($cachedRecord);

        // We shouldn't call OpenAI or save anything
        $this->openAiService->expects($this->never())->method('generateNatalChartSection');
        $this->entityManager->expects($this->never())->method('persist');

        $result = $this->service->getSection($user, 'identity', false);

        $this->assertTrue($result['success']);
        $this->assertEquals('identity', $result['section']);
        $this->assertEquals('Cached content', $result['content']);
    }

    public function testGetSectionGeneratesNewAndSaves()
    {
        $user = new User();
        $profile = new BirthProfile();
        $profile->setFirstName('Test');
        $user->setBirthProfile($profile);

        $calculatorMock = $this->createMock(PlanetaryCalculator::class);
        $calculatorMock->expects($this->once())
            ->method('getFullChartPayload')
            ->willReturn(['Sun' => ['Sign' => 'Leo']]);

        $this->astrologyAnalysisService->expects($this->once())
            ->method('createCalculatorFromBirthProfile')
            ->with($profile)
            ->willReturn($calculatorMock);

        // First findByUserAndSection for identity, and one for synthesis context, and one for re-fetch
        $this->sectionRepository->expects($this->exactly(3))
            ->method('findByUserAndSection')
            ->withConsecutive(
                [$user, 'identity'],
                [$user, 'synthesis'],
                [$user, 'identity']
            )
            ->willReturnOnConsecutiveCalls(null, null, null);

        $this->openAiService->expects($this->once())
            ->method('generateNatalChartSection')
            ->willReturn([
                'success' => true,
                'content' => 'Generated text content'
            ]);

        $this->entityManager->expects($this->once())->method('persist');
        $this->entityManager->expects($this->once())->method('flush');

        $result = $this->service->getSection($user, 'identity', false);

        $this->assertTrue($result['success']);
        $this->assertEquals('identity', $result['section']);
        $this->assertEquals('Generated text content', $result['content']);
    }

    public function testGetSectionHandlesUniqueConstraintViolationGracefully()
    {
        $user = new User();
        $profile = new BirthProfile();
        $profile->setFirstName('Test');
        $user->setBirthProfile($profile);

        $calculatorMock = $this->createMock(PlanetaryCalculator::class);
        $calculatorMock->expects($this->once())
            ->method('getFullChartPayload')
            ->willReturn(['Sun' => ['Sign' => 'Leo']]);

        $this->astrologyAnalysisService->expects($this->once())
            ->method('createCalculatorFromBirthProfile')
            ->with($profile)
            ->willReturn($calculatorMock);

        // First findByUserAndSection for identity, synthesis context, and re-fetch.
        // Return null for all so it tries to persist a new one.
        $this->sectionRepository->expects($this->exactly(3))
            ->method('findByUserAndSection')
            ->withConsecutive(
                [$user, 'identity'],
                [$user, 'synthesis'],
                [$user, 'identity']
            )
            ->willReturnOnConsecutiveCalls(null, null, null);

        $this->openAiService->expects($this->once())
            ->method('generateNatalChartSection')
            ->willReturn([
                'success' => true,
                'content' => 'Generated text content'
            ]);

        $this->entityManager->expects($this->once())->method('persist');
        
        // Mock flush to throw UniqueConstraintViolationException
        $exception = $this->createMock(\Doctrine\DBAL\Exception\UniqueConstraintViolationException::class);
        $this->entityManager->expects($this->once())
            ->method('flush')
            ->willThrowException($exception);

        // It should catch the exception and succeed with the generated content anyway
        $result = $this->service->getSection($user, 'identity', false);

        $this->assertTrue($result['success']);
        $this->assertEquals('identity', $result['section']);
        $this->assertEquals('Generated text content', $result['content']);
    }
}
