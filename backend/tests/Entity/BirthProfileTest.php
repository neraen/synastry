<?php

namespace App\Tests\Entity;

use App\Entity\BirthProfile;
use PHPUnit\Framework\TestCase;

class BirthProfileTest extends TestCase
{
    public function testConstructSetsDates()
    {
        $profile = new BirthProfile();
        
        $this->assertInstanceOf(\DateTimeInterface::class, $profile->getCreatedAt());
        $this->assertInstanceOf(\DateTimeInterface::class, $profile->getUpdatedAt());
    }

    public function testOnPreUpdateUpdatesDate()
    {
        $profile = new BirthProfile();
        $initialDate = clone $profile->getUpdatedAt();
        
        // Simuler un délai
        sleep(1);
        
        $profile->onPreUpdate();
        
        $this->assertNotEquals($initialDate, $profile->getUpdatedAt());
        $this->assertGreaterThan($initialDate, $profile->getUpdatedAt());
    }

    public function testToArray()
    {
        $profile = new BirthProfile();
        $profile->setFirstName('Test');
        $profile->setBirthDate(new \DateTime('1990-01-01'));
        $profile->setBirthTime(new \DateTime('14:30:00'));
        $profile->setBirthCity('Paris');
        $profile->setBirthCountry('France');
        $profile->setLatitude('48.8566');
        $profile->setLongitude('2.3522');
        $profile->setTimezone('1.0');
        $profile->setTimezoneName('Europe/Paris');

        $data = $profile->toArray();

        $this->assertNull($data['id']);
        $this->assertEquals('Test', $data['firstName']);
        $this->assertEquals('1990-01-01', $data['birthDate']);
        $this->assertEquals('14:30', $data['birthTime']);
        $this->assertEquals('Paris', $data['birthCity']);
        $this->assertEquals('France', $data['birthCountry']);
        $this->assertEquals(48.8566, $data['latitude']);
        $this->assertEquals(2.3522, $data['longitude']);
        $this->assertEquals(1.0, $data['timezone']);
        $this->assertEquals('Europe/Paris', $data['timezoneName']);
    }

    public function testToEphemerisData()
    {
        $profile = new BirthProfile();
        $profile->setBirthDate(new \DateTime('1990-01-01'));
        $profile->setBirthTime(new \DateTime('14:30:00'));
        $profile->setLatitude('48.8566');
        $profile->setLongitude('2.3522');
        $profile->setTimezone('1.0');

        $data = $profile->toEphemerisData();

        $this->assertEquals(1990, $data['year']);
        $this->assertEquals(1, $data['month']);
        $this->assertEquals(1, $data['day']);
        $this->assertEquals(14, $data['hours']);
        $this->assertEquals(30, $data['minutes']);
        $this->assertEquals(0, $data['seconds']);
        $this->assertEquals(48.8566, $data['latitude']);
        $this->assertEquals(2.3522, $data['longitude']);
        $this->assertEquals(1.0, $data['timezone']);
    }

    public function testToEphemerisDataUsesDefaultTimeIfNull()
    {
        $profile = new BirthProfile();
        $profile->setBirthDate(new \DateTime('1990-01-01'));
        // Pas de birthTime
        $profile->setLatitude('48.8566');
        $profile->setLongitude('2.3522');

        $data = $profile->toEphemerisData();

        $this->assertEquals(12, $data['hours']);
        $this->assertEquals(0, $data['minutes']);
        $this->assertEquals(0, $data['seconds']);
        $this->assertEquals(0.0, $data['timezone']); // default 0
    }
}
