<?php

namespace App\Entity;

use App\Repository\EvalGoldenCaseRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * A replayable golden test case: a fixed prompt-level input for a generation
 * type, re-run on demand and scored to detect prompt regressions.
 *
 * inputData shape by type:
 *   horoscope / transits     => { "prompt": "<brief or prompt text>" }
 *   synastry_v2              => { "prompt": "<compat prompt>", "scores"?: {...} }
 *   natal_section            => { "input": "<text>", "instructions": "<system>" }
 *   cosmic_headline          => { }
 *   chat                     => { "messages": [...], "userContext": {...} }
 */
#[ORM\Entity(repositoryClass: EvalGoldenCaseRepository::class)]
#[ORM\Table(name: 'eval_golden_case')]
class EvalGoldenCase
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 120)]
    private string $name;

    #[ORM\Column(length: 40)]
    private string $generationType;

    #[ORM\Column(type: Types::JSON)]
    private array $inputData = [];

    #[ORM\Column(type: Types::JSON, nullable: true)]
    private ?array $expectations = null;

    #[ORM\Column(options: ['default' => true])]
    private bool $active = true;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $updatedAt;

    public function __construct(string $name, string $generationType)
    {
        $this->name           = $name;
        $this->generationType = $generationType;
        $this->createdAt      = new \DateTimeImmutable();
        $this->updatedAt      = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }

    public function getName(): string { return $this->name; }
    public function setName(string $v): static { $this->name = $v; $this->touch(); return $this; }

    public function getGenerationType(): string { return $this->generationType; }
    public function setGenerationType(string $v): static { $this->generationType = $v; $this->touch(); return $this; }

    public function getInputData(): array { return $this->inputData; }
    public function setInputData(array $v): static { $this->inputData = $v; $this->touch(); return $this; }

    public function getExpectations(): ?array { return $this->expectations; }
    public function setExpectations(?array $v): static { $this->expectations = $v; $this->touch(); return $this; }

    public function isActive(): bool { return $this->active; }
    public function setActive(bool $v): static { $this->active = $v; $this->touch(); return $this; }

    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
    public function getUpdatedAt(): \DateTimeImmutable { return $this->updatedAt; }

    private function touch(): void { $this->updatedAt = new \DateTimeImmutable(); }
}
