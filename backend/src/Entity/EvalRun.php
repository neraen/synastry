<?php

namespace App\Entity;

use App\Repository\EvalRunRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * One execution of the golden suite (or a production-sampling batch).
 * Aggregates are denormalized for fast listing and run-to-run diffs.
 */
#[ORM\Entity(repositoryClass: EvalRunRepository::class)]
#[ORM\Table(name: 'eval_run')]
class EvalRun
{
    public const STATUS_PENDING   = 'pending';
    public const STATUS_RUNNING   = 'running';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_FAILED    = 'failed';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    /** golden | production_sample */
    #[ORM\Column(length: 20, options: ['default' => 'golden'])]
    private string $runType = 'golden';

    #[ORM\Column(length: 160, nullable: true)]
    private ?string $label = null;

    #[ORM\Column(length: 20)]
    private string $status = self::STATUS_PENDING;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?User $triggeredBy = null;

    #[ORM\Column(options: ['default' => 0])]
    private int $caseCount = 0;

    #[ORM\Column(type: Types::FLOAT, nullable: true)]
    private ?float $avgScore = null;

    #[ORM\Column(type: Types::DECIMAL, precision: 10, scale: 6, options: ['default' => 0])]
    private string $totalCostUsd = '0';

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $errorMessage = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $startedAt = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $finishedAt = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    public function __construct(string $runType = 'golden', ?string $label = null)
    {
        $this->runType   = $runType;
        $this->label     = $label;
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }

    public function getRunType(): string { return $this->runType; }

    public function getLabel(): ?string { return $this->label; }
    public function setLabel(?string $v): static { $this->label = $v; return $this; }

    public function getStatus(): string { return $this->status; }
    public function setStatus(string $v): static { $this->status = $v; return $this; }

    public function getTriggeredBy(): ?User { return $this->triggeredBy; }
    public function setTriggeredBy(?User $u): static { $this->triggeredBy = $u; return $this; }

    public function getCaseCount(): int { return $this->caseCount; }
    public function setCaseCount(int $v): static { $this->caseCount = $v; return $this; }

    public function getAvgScore(): ?float { return $this->avgScore; }
    public function setAvgScore(?float $v): static { $this->avgScore = $v; return $this; }

    public function getTotalCostUsd(): string { return $this->totalCostUsd; }
    public function setTotalCostUsd(string $v): static { $this->totalCostUsd = $v; return $this; }

    public function getErrorMessage(): ?string { return $this->errorMessage; }
    public function setErrorMessage(?string $v): static { $this->errorMessage = $v; return $this; }

    public function getStartedAt(): ?\DateTimeImmutable { return $this->startedAt; }
    public function setStartedAt(?\DateTimeImmutable $v): static { $this->startedAt = $v; return $this; }

    public function getFinishedAt(): ?\DateTimeImmutable { return $this->finishedAt; }
    public function setFinishedAt(?\DateTimeImmutable $v): static { $this->finishedAt = $v; return $this; }

    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
