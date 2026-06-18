<?php

namespace App\Tests\Service\Astro;

use App\Entity\AstroEvent;
use App\Repository\AstroEventRepository;
use App\Service\Astro\ActuAstroService;
use App\Service\Astro\ActuPersonalizer;
use App\Service\Astro\SkyEvent;
use App\Service\Astro\SkyEventDetector;
use App\Service\AstrologyAnalysisService;
use App\Service\Webservice\OpenAiService;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Psr\Log\NullLogger;

/**
 * The brief handed to the LLM must contain ONLY pre-decided facts (no invented
 * astronomy). This tests the deterministic builder in isolation (no DB / no LLM),
 * verifying the brief carries the exact sign/degree/date from the event.
 */
class ActuBriefBuilderTest extends TestCase
{
    private function service(): ActuAstroService
    {
        return new ActuAstroService(
            new SkyEventDetector(),
            $this->createMock(AstroEventRepository::class),
            new ActuPersonalizer(),
            $this->createMock(AstrologyAnalysisService::class),
            $this->createMock(OpenAiService::class),
            $this->createMock(EntityManagerInterface::class),
            new NullLogger(),
        );
    }

    public function testLunationBriefCarriesFixedFacts(): void
    {
        $sky = new SkyEvent(
            type: SkyEvent::TYPE_FULL_MOON,
            exactAt: new \DateTimeImmutable('2026-06-12 22:41:00', new \DateTimeZone('UTC')),
            planet: 'Moon',
            longitude: 233.0, // 23° Scorpio
            metadata: ['phase' => 'full'],
        );
        $event = AstroEvent::fromSkyEvent($sky, 'fr');

        $brief = $this->service()->buildEventBrief($event);

        $this->assertSame('Pleine lune', $brief['type_label']);
        $this->assertStringContainsString('Scorpion', $brief['fact']);
        $this->assertStringContainsString('23°', $brief['fact']);
        $this->assertStringContainsString('12 juin 2026', $brief['fact']);
        $this->assertNotEmpty($brief['angles']);
    }

    public function testAspectBriefNamesBothBodiesAndAspect(): void
    {
        $sky = new SkyEvent(
            type: SkyEvent::TYPE_ASPECT,
            exactAt: new \DateTimeImmutable('2026-06-28 05:10:00', new \DateTimeZone('UTC')),
            planet: 'Mars',
            planet2: 'Pluto',
            aspectType: 'square',
            longitude: 122.0, // 2° Leo
            longitude2: 302.0, // 2° Aquarius
            metadata: ['angle' => 90],
        );
        $event = AstroEvent::fromSkyEvent($sky, 'fr');

        $brief = $this->service()->buildEventBrief($event);

        $this->assertStringContainsString('Mars', $brief['fact']);
        $this->assertStringContainsString('carré', $brief['fact']);
        $this->assertStringContainsString('Pluton', $brief['fact']);
        $this->assertArrayHasKey('Mars', $brief['planets']);
        $this->assertArrayHasKey('Pluto', $brief['planets']);
        // square angles come from the aspect-specific grain
        $this->assertNotEmpty($brief['angles']);
    }

    public function testSolsticeBriefFlagsSeasonal(): void
    {
        $sky = new SkyEvent(
            type: SkyEvent::TYPE_INGRESSION,
            exactAt: new \DateTimeImmutable('2026-06-21 08:20:00', new \DateTimeZone('UTC')),
            planet: 'Sun',
            longitude: 90.0, // 0° Cancer
            metadata: ['seasonal' => 'solstice_summer', 'direction' => 'direct'],
        );
        $event = AstroEvent::fromSkyEvent($sky, 'fr');

        $brief = $this->service()->buildEventBrief($event);
        $this->assertSame('solstice_summer', $brief['seasonal'] ?? null);
        $this->assertStringContainsString('entre en Cancer', $brief['fact']);
    }
}
