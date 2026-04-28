<?php

namespace App\Tests\Service;

use App\Entity\BirthProfile;
use App\Entity\User;
use App\Service\AstrologyAnalysisService;
use App\Service\PlanetaryCalculator;
use PHPUnit\Framework\TestCase;

class AstrologyAnalysisServiceTest extends TestCase
{
    private AstrologyAnalysisService $service;

    protected function setUp(): void
    {
        $this->service = new AstrologyAnalysisService();
    }

    public function testCreateCalculatorFromBirthProfile()
    {
        $profile = new BirthProfile();
        $profile->setFirstName('TestUser');
        $profile->setBirthDate(new \DateTime('1990-01-01'));
        $profile->setBirthTime(new \DateTime('12:00:00'));
        $profile->setLatitude('48.8566');
        $profile->setLongitude('2.3522');
        $profile->setTimezone('1.0'); // UTC+1

        $calculator = $this->service->createCalculatorFromBirthProfile($profile);

        $this->assertInstanceOf(PlanetaryCalculator::class, $calculator);
        $this->assertEquals('TestUser', $calculator->getName());
    }

    public function testPrepareHoroscopeDataThrowsExceptionIfNoBirthProfile()
    {
        $user = new User(); // No birth profile attached

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('User has no birth profile');

        $this->service->prepareHoroscopeData($user);
    }

    public function testPrepareHoroscopeDataReturnsExpectedStructure()
    {
        $profile = new BirthProfile();
        $profile->setBirthDate(new \DateTime('1990-01-01'));
        $profile->setBirthTime(new \DateTime('12:00:00'));
        $profile->setLatitude('48.8566');
        $profile->setLongitude('2.3522');
        $profile->setTimezone('1.0');

        $user = new User();
        $user->setBirthProfile($profile);

        $data = $this->service->prepareHoroscopeData($user);

        $this->assertIsArray($data);
        $this->assertArrayHasKey('sun_sign', $data);
        $this->assertArrayHasKey('moon_sign', $data);
        $this->assertArrayHasKey('ascendant', $data);
        $this->assertArrayHasKey('natal_planets', $data);
        $this->assertArrayHasKey('current_transits', $data);
        $this->assertArrayHasKey('major_aspects', $data);
        $this->assertArrayHasKey('slow_aspects', $data);

        // Sanity check on natal planets
        $this->assertIsArray($data['natal_planets']);
        $this->assertArrayHasKey('Sun', $data['natal_planets']);
    }

    public function testBuildNatalDataJson()
    {
        $input = [
            'Sun' => ['Sign' => 'Capricorn', 'Position' => 10.555, 'Retrograde' => 'No'],
            'Moon' => ['Sign' => 'Aries', 'Position' => 20.123, 'Retrograde' => 'No'],
        ];

        $result = $this->service->buildNatalDataJson($input);

        $this->assertEquals([
            'Sun' => ['sign' => 'Capricorn', 'position' => 10.56],
            'Moon' => ['sign' => 'Aries', 'position' => 20.12],
        ], $result);
    }

    public function testBuildTransitsDataJson()
    {
        $input = [
            'Mars' => ['Sign' => 'Gemini', 'Position' => 15.666, 'Retrograde' => 'Yes'],
        ];

        $result = $this->service->buildTransitsDataJson($input);

        $this->assertEquals([
            'Mars' => ['sign' => 'Gemini', 'position' => 15.67, 'retrograde' => true],
        ], $result);
    }
}
