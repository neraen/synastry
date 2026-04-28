<?php

namespace App\Tests\Entity;

use App\Entity\DailyHoroscope;
use App\Entity\User;
use PHPUnit\Framework\TestCase;

class DailyHoroscopeTest extends TestCase
{
    public function testConstructSetsDates()
    {
        $horoscope = new DailyHoroscope();
        
        $this->assertInstanceOf(\DateTimeInterface::class, $horoscope->getCreatedAt());
        $this->assertInstanceOf(\DateTimeInterface::class, $horoscope->getGeneratedAt());
    }

    public function testToArray()
    {
        $horoscope = new DailyHoroscope();
        $horoscope->setTitle('Titre');
        $horoscope->setOverview('Overview');
        $horoscope->setLove('Love');
        $horoscope->setEnergy('Energy');
        $horoscope->setAdvice('Advice');
        $horoscope->setDate(new \DateTime('2024-01-01'));
        $horoscope->setGeneratedAt(new \DateTime('2024-01-01 12:00:00'));

        $data = $horoscope->toArray();

        $this->assertNull($data['id']);
        $this->assertEquals('Titre', $data['title']);
        $this->assertEquals('Overview', $data['overview']);
        $this->assertEquals('Love', $data['love']);
        $this->assertEquals('Energy', $data['energy']);
        $this->assertEquals('Advice', $data['advice']);
        $this->assertEquals('2024-01-01', $data['date']);
        $this->assertEquals('2024-01-01 12:00:00', $data['generatedAt']);
    }
}
