<?php

namespace App\Tests\Entity;

use App\Entity\SynastryHistory;
use PHPUnit\Framework\TestCase;

class SynastryHistoryTest extends TestCase
{
    public function testConstructSetsDates()
    {
        $history = new SynastryHistory();
        
        $this->assertInstanceOf(\DateTimeInterface::class, $history->getCreatedAt());
        $this->assertInstanceOf(\DateTimeInterface::class, $history->getUpdatedAt());
    }

    public function testOnPreUpdateUpdatesDate()
    {
        $history = new SynastryHistory();
        $initialDate = clone $history->getUpdatedAt();
        
        sleep(1);
        
        $history->onPreUpdate();
        
        $this->assertNotEquals($initialDate, $history->getUpdatedAt());
        $this->assertGreaterThan($initialDate, $history->getUpdatedAt());
    }

    public function testToArrayAndSummary()
    {
        $history = new SynastryHistory();
        $history->setPartnerName('Partner');
        $history->setPartnerBirthData(['year' => 1990]);
        $history->setAnalysis('Analysis text');
        $history->setCompatibilityScore(85.5);
        $history->setCompatibilityDetails(['aspect' => 'Trine']);
        $history->setUserPositions(['Sun' => 'Aries']);
        $history->setPartnerPositions(['Moon' => 'Leo']);
        $history->setQuestion('Question?');
        $history->setCreatedAt(new \DateTime('2024-01-01 12:00:00'));

        $data = $history->toArray();

        $this->assertNull($data['id']);
        $this->assertEquals('Partner', $data['partnerName']);
        $this->assertEquals(['year' => 1990], $data['partnerBirthData']);
        $this->assertEquals('Analysis text', $data['analysis']);
        $this->assertEquals(85.5, $data['compatibilityScore']);
        $this->assertEquals(['aspect' => 'Trine'], $data['compatibilityDetails']);
        $this->assertEquals(['Sun' => 'Aries'], $data['userPositions']);
        $this->assertEquals(['Moon' => 'Leo'], $data['partnerPositions']);
        $this->assertEquals('Question?', $data['question']);
        $this->assertEquals('2024-01-01 12:00:00', $data['createdAt']);

        $summary = $history->toSummary();
        $this->assertEquals('Partner', $summary['partnerName']);
        $this->assertEquals(85.5, $summary['compatibilityScore']);
        $this->assertEquals('2024-01-01 12:00:00', $summary['createdAt']);
    }
}
