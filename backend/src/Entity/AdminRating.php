<?php

namespace App\Entity;

use App\Repository\AdminRatingRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * Human (admin) rating of an evaluated output. Either attached to an
 * {@see EvalResult} or pointing directly at a production reference.
 */
#[ORM\Entity(repositoryClass: AdminRatingRepository::class)]
#[ORM\Table(name: 'admin_rating')]
#[ORM\Index(columns: ['generation_type'], name: 'idx_adminrating_type')]
class AdminRating
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?User $admin = null;

    #[ORM\ManyToOne(targetEntity: EvalResult::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'CASCADE')]
    private ?EvalResult $evalResult = null;

    #[ORM\Column(length: 40)]
    private string $generationType;

    #[ORM\Column(length: 40, nullable: true)]
    private ?string $referenceType = null;

    #[ORM\Column(length: 64, nullable: true)]
    private ?string $referenceId = null;

    /** 1..5 */
    #[ORM\Column(type: Types::SMALLINT)]
    private int $score;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    public function __construct(User $admin, string $generationType, int $score)
    {
        $this->admin          = $admin;
        $this->generationType = $generationType;
        $this->score          = max(1, min(5, $score));
        $this->createdAt      = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }

    public function getAdmin(): ?User { return $this->admin; }

    public function getEvalResult(): ?EvalResult { return $this->evalResult; }
    public function setEvalResult(?EvalResult $r): static { $this->evalResult = $r; return $this; }

    public function getGenerationType(): string { return $this->generationType; }

    public function getReferenceType(): ?string { return $this->referenceType; }
    public function setReferenceType(?string $v): static { $this->referenceType = $v; return $this; }

    public function getReferenceId(): ?string { return $this->referenceId; }
    public function setReferenceId(?string $v): static { $this->referenceId = $v; return $this; }

    public function getScore(): int { return $this->score; }
    public function setScore(int $v): static { $this->score = max(1, min(5, $v)); return $this; }

    public function getNotes(): ?string { return $this->notes; }
    public function setNotes(?string $v): static { $this->notes = $v; return $this; }

    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
