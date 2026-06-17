<?php

namespace App\Entity;

use App\Repository\LlmCallLogRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * Token/cost ledger for every LLM call. One row per provider request.
 * Tagged with a generation type (horoscope, synastry_v2, chat, ...) and an
 * optional reference (entity + id) so cost is attributable per feature/user.
 */
#[ORM\Entity(repositoryClass: LlmCallLogRepository::class)]
#[ORM\Table(name: 'llm_call_log')]
#[ORM\Index(columns: ['generation_type', 'created_at'], name: 'idx_llm_type_created')]
#[ORM\Index(columns: ['created_at'], name: 'idx_llm_created')]
class LlmCallLog
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    /** anthropic | openai */
    #[ORM\Column(length: 20)]
    private string $provider;

    #[ORM\Column(length: 60)]
    private string $model;

    /** horoscope | synastry_v2 | natal_section | chat | transits | cosmic_headline | psy_extract | llm_judge | ... */
    #[ORM\Column(length: 40)]
    private string $generationType;

    /** Short entity class name, e.g. DailyHoroscope (nullable when not tied to an entity) */
    #[ORM\Column(length: 40, nullable: true)]
    private ?string $referenceType = null;

    /** Entity id / horoscope date / section key (mirrors ContentFeedback.contentRef) */
    #[ORM\Column(length: 64, nullable: true)]
    private ?string $referenceId = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?User $user = null;

    /** Set when the call originates from a golden run (cost roll-up per run). */
    #[ORM\ManyToOne(targetEntity: EvalRun::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'CASCADE')]
    private ?EvalRun $evalRun = null;

    #[ORM\Column(options: ['default' => 0])]
    private int $inputTokens = 0;

    #[ORM\Column(options: ['default' => 0])]
    private int $outputTokens = 0;

    #[ORM\Column(options: ['default' => 0])]
    private int $cacheCreationInputTokens = 0;

    #[ORM\Column(options: ['default' => 0])]
    private int $cacheReadInputTokens = 0;

    #[ORM\Column(type: Types::DECIMAL, precision: 10, scale: 6, options: ['default' => 0])]
    private string $estimatedCostUsd = '0';

    #[ORM\Column(nullable: true)]
    private ?int $latencyMs = null;

    #[ORM\Column(options: ['default' => true])]
    private bool $success = true;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    public function __construct(string $provider, string $model, string $generationType)
    {
        $this->provider       = $provider;
        $this->model          = $model;
        $this->generationType = $generationType;
        $this->createdAt      = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }

    public function getProvider(): string { return $this->provider; }
    public function getModel(): string { return $this->model; }
    public function getGenerationType(): string { return $this->generationType; }

    public function getReferenceType(): ?string { return $this->referenceType; }
    public function setReferenceType(?string $v): static { $this->referenceType = $v; return $this; }

    public function getReferenceId(): ?string { return $this->referenceId; }
    public function setReferenceId(?string $v): static { $this->referenceId = $v; return $this; }

    public function getUser(): ?User { return $this->user; }
    public function setUser(?User $user): static { $this->user = $user; return $this; }

    public function getEvalRun(): ?EvalRun { return $this->evalRun; }
    public function setEvalRun(?EvalRun $r): static { $this->evalRun = $r; return $this; }

    public function getInputTokens(): int { return $this->inputTokens; }
    public function setInputTokens(int $v): static { $this->inputTokens = $v; return $this; }

    public function getOutputTokens(): int { return $this->outputTokens; }
    public function setOutputTokens(int $v): static { $this->outputTokens = $v; return $this; }

    public function getCacheCreationInputTokens(): int { return $this->cacheCreationInputTokens; }
    public function setCacheCreationInputTokens(int $v): static { $this->cacheCreationInputTokens = $v; return $this; }

    public function getCacheReadInputTokens(): int { return $this->cacheReadInputTokens; }
    public function setCacheReadInputTokens(int $v): static { $this->cacheReadInputTokens = $v; return $this; }

    public function getEstimatedCostUsd(): string { return $this->estimatedCostUsd; }
    public function setEstimatedCostUsd(string $v): static { $this->estimatedCostUsd = $v; return $this; }

    public function getLatencyMs(): ?int { return $this->latencyMs; }
    public function setLatencyMs(?int $v): static { $this->latencyMs = $v; return $this; }

    public function isSuccess(): bool { return $this->success; }
    public function setSuccess(bool $v): static { $this->success = $v; return $this; }

    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
