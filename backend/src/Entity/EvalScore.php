<?php

namespace App\Entity;

use App\Repository\EvalScoreRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * Per-criterion score for an {@see EvalResult}. Powers regression diffs
 * (criterion-level deltas between runs).
 */
#[ORM\Entity(repositoryClass: EvalScoreRepository::class)]
#[ORM\Table(name: 'eval_score')]
class EvalScore
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: EvalResult::class, inversedBy: 'scores')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?EvalResult $evalResult = null;

    /** deterministic | judge */
    #[ORM\Column(length: 20)]
    private string $category;

    /** json_valid | length_ok | banned_terms | structural_complete | tone | astro_accuracy | readability | personalization */
    #[ORM\Column(length: 60)]
    private string $criterion;

    #[ORM\Column(type: Types::FLOAT)]
    private float $score;

    #[ORM\Column(type: Types::FLOAT)]
    private float $maxScore;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $rationale = null;

    public function __construct(string $category, string $criterion, float $score, float $maxScore, ?string $rationale = null)
    {
        $this->category  = $category;
        $this->criterion = $criterion;
        $this->score     = $score;
        $this->maxScore  = $maxScore;
        $this->rationale = $rationale;
    }

    public function getId(): ?int { return $this->id; }

    public function getEvalResult(): ?EvalResult { return $this->evalResult; }
    public function setEvalResult(?EvalResult $r): static { $this->evalResult = $r; return $this; }

    public function getCategory(): string { return $this->category; }
    public function getCriterion(): string { return $this->criterion; }
    public function getScore(): float { return $this->score; }
    public function getMaxScore(): float { return $this->maxScore; }
    public function getRationale(): ?string { return $this->rationale; }

    /** Normalized 0..1 ratio for blending/diffing. */
    public function ratio(): float
    {
        return $this->maxScore > 0 ? $this->score / $this->maxScore : 0.0;
    }
}
