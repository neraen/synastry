<?php

namespace App\Tests\Service;

use App\Service\PlanetaryCalculator;
use PHPUnit\Framework\TestCase;

/**
 * Non-regression tests for the gender hint in compatibility prompts:
 * null gender must produce the exact same prompt as before the feature.
 */
class CompatibilityPromptGenderTest extends TestCase
{
    private PlanetaryCalculator $calcA;
    private PlanetaryCalculator $calcB;

    protected function setUp(): void
    {
        $this->calcA = new PlanetaryCalculator('1992-04-15', '10:30', 48.8566, 2.3522, 'Léa');
        $this->calcB = new PlanetaryCalculator('1990-11-02', '22:15', 45.7640, 4.8357, 'Marc');
    }

    public function testNullGenderKeepsPromptV2Identical(): void
    {
        $before = $this->calcA->buildCompatibilityPromptV2($this->calcB, null, 'fr');
        $after  = $this->calcA->buildCompatibilityPromptV2($this->calcB, null, 'fr', null, null);

        $this->assertSame($before, $after);
        $this->assertStringNotContainsString('(femme)', $after);
        $this->assertStringNotContainsString('(homme)', $after);
    }

    public function testGenderAppearsAfterNamesInFrenchPromptV2(): void
    {
        $prompt = $this->calcA->buildCompatibilityPromptV2($this->calcB, null, 'fr', 'female', 'male');

        $this->assertStringContainsString('Léa (femme)', $prompt);
        $this->assertStringContainsString('Marc (homme)', $prompt);
    }

    public function testGenderAppearsAfterNamesInEnglishPromptV2(): void
    {
        $prompt = $this->calcA->buildCompatibilityPromptV2($this->calcB, null, 'en', 'female', 'male');

        $this->assertStringContainsString('Léa (woman)', $prompt);
        $this->assertStringContainsString('Marc (man)', $prompt);
    }

    public function testPartialGenderOnlyTagsKnownPerson(): void
    {
        $prompt = $this->calcA->buildCompatibilityPromptV2($this->calcB, null, 'fr', null, 'male');

        $this->assertStringNotContainsString('Léa (femme)', $prompt);
        $this->assertStringNotContainsString('Léa (homme)', $prompt);
        $this->assertStringContainsString('Marc (homme)', $prompt);
    }
}
