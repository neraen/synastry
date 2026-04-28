<?php

namespace App\Tests\Entity;

use App\Entity\NatalChart;
use PHPUnit\Framework\TestCase;

class NatalChartTest extends TestCase
{
    public function testConstructSetsDates()
    {
        $chart = new NatalChart();
        
        $this->assertInstanceOf(\DateTimeInterface::class, $chart->getCreatedAt());
        $this->assertInstanceOf(\DateTimeInterface::class, $chart->getCalculatedAt());
    }

    public function testToArray()
    {
        $chart = new NatalChart();
        $chart->setPlanetaryPositions(['Sun' => ['Sign' => 'Aries']]);
        $chart->setInterpretation('Test Interpretation');
        $chart->setCalculatedAt(new \DateTime('2024-01-01 12:00:00'));

        $data = $chart->toArray();

        $this->assertNull($data['id']);
        $this->assertEquals(['Sun' => ['Sign' => 'Aries']], $data['planetaryPositions']);
        $this->assertEquals('Test Interpretation', $data['interpretation']);
        $this->assertEquals('2024-01-01 12:00:00', $data['calculatedAt']);
    }
}
