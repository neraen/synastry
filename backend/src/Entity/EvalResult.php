<?php

namespace App\Entity;

use App\Repository\EvalResultRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * One scored LLM output. Source is either a golden-suite case or a real
 * production entity. Holds the blended scores; per-criterion detail lives in
 * {@see EvalScore}.
 */
#[ORM\Entity(repositoryClass: EvalResultRepository::class)]
#[ORM\Table(name: 'eval_result')]
#[ORM\Index(columns: ['generation_type', 'created_at'], name: 'idx_evalres_type_created')]
#[ORM\Index(columns: ['source'], name: 'idx_evalres_source')]
class EvalResult
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    /** golden | production */
    #[ORM\Column(length: 20)]
    private string $source;

    #[ORM\Column(length: 40)]
    private string $generationType;

    #[ORM\Column(length: 40, nullable: true)]
    private ?string $referenceType = null;

    #[ORM\Column(length: 64, nullable: true)]
    private ?string $referenceId = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?User $user = null;

    #[ORM\ManyToOne(targetEntity: EvalRun::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'CASCADE')]
    private ?EvalRun $evalRun = null;

    #[ORM\ManyToOne(targetEntity: EvalGoldenCase::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?EvalGoldenCase $goldenCase = null;

    #[ORM\Column(type: Types::JSON, nullable: true)]
    private ?array $inputData = null;

    #[ORM\Column(type: Types::JSON, nullable: true)]
    private ?array $outputData = null;

    /** 0..1 deterministic checks aggregate */
    #[ORM\Column(type: Types::FLOAT, nullable: true)]
    private ?float $deterministicScore = null;

    /** 0..100 LLM-judge overall */
    #[ORM\Column(type: Types::FLOAT, nullable: true)]
    private ?float $judgeScore = null;

    /** 0..100 blended composite */
    #[ORM\Column(type: Types::FLOAT, nullable: true)]
    private ?float $compositeScore = null;

    /** Deterministic hard-gate result */
    #[ORM\Column(nullable: true)]
    private ?bool $passed = null;

    #[ORM\Column(length: 60, nullable: true)]
    private ?string $judgeModel = null;

    #[ORM\Column(type: Types::DECIMAL, precision: 10, scale: 6, nullable: true)]
    private ?string $judgeCostUsd = null;

    /** @var Collection<int, EvalScore> */
    #[ORM\OneToMany(mappedBy: 'evalResult', targetEntity: EvalScore::class, cascade: ['persist', 'remove'], orphanRemoval: true)]
    private Collection $scores;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    public function __construct(string $source, string $generationType)
    {
        $this->source         = $source;
        $this->generationType = $generationType;
        $this->scores         = new ArrayCollection();
        $this->createdAt      = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }

    public function getSource(): string { return $this->source; }
    public function getGenerationType(): string { return $this->generationType; }

    public function getReferenceType(): ?string { return $this->referenceType; }
    public function setReferenceType(?string $v): static { $this->referenceType = $v; return $this; }

    public function getReferenceId(): ?string { return $this->referenceId; }
    public function setReferenceId(?string $v): static { $this->referenceId = $v; return $this; }

    public function getUser(): ?User { return $this->user; }
    public function setUser(?User $u): static { $this->user = $u; return $this; }

    public function getEvalRun(): ?EvalRun { return $this->evalRun; }
    public function setEvalRun(?EvalRun $r): static { $this->evalRun = $r; return $this; }

    public function getGoldenCase(): ?EvalGoldenCase { return $this->goldenCase; }
    public function setGoldenCase(?EvalGoldenCase $c): static { $this->goldenCase = $c; return $this; }

    public function getInputData(): ?array { return $this->inputData; }
    public function setInputData(?array $v): static { $this->inputData = $v; return $this; }

    public function getOutputData(): ?array { return $this->outputData; }
    public function setOutputData(?array $v): static { $this->outputData = $v; return $this; }

    public function getDeterministicScore(): ?float { return $this->deterministicScore; }
    public function setDeterministicScore(?float $v): static { $this->deterministicScore = $v; return $this; }

    public function getJudgeScore(): ?float { return $this->judgeScore; }
    public function setJudgeScore(?float $v): static { $this->judgeScore = $v; return $this; }

    public function getCompositeScore(): ?float { return $this->compositeScore; }
    public function setCompositeScore(?float $v): static { $this->compositeScore = $v; return $this; }

    public function getPassed(): ?bool { return $this->passed; }
    public function setPassed(?bool $v): static { $this->passed = $v; return $this; }

    public function getJudgeModel(): ?string { return $this->judgeModel; }
    public function setJudgeModel(?string $v): static { $this->judgeModel = $v; return $this; }

    public function getJudgeCostUsd(): ?string { return $this->judgeCostUsd; }
    public function setJudgeCostUsd(?string $v): static { $this->judgeCostUsd = $v; return $this; }

    /** @return Collection<int, EvalScore> */
    public function getScores(): Collection { return $this->scores; }

    public function addScore(EvalScore $score): static
    {
        if (!$this->scores->contains($score)) {
            $this->scores->add($score);
            $score->setEvalResult($this);
        }
        return $this;
    }

    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
