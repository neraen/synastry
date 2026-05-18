<?php

namespace App\Entity;

use App\Repository\ContentFeedbackRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ContentFeedbackRepository::class)]
#[ORM\Table(name: 'content_feedback')]
#[ORM\UniqueConstraint(name: 'user_content_unique', columns: ['user_id', 'content_type', 'content_ref'])]
class ContentFeedback
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?User $user = null;

    /** chat | horoscope | natal */
    #[ORM\Column(length: 50)]
    private ?string $contentType = null;

    /** Message id, horoscope date, or section key */
    #[ORM\Column(length: 255)]
    private ?string $contentRef = null;

    #[ORM\Column]
    private ?bool $isPositive = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private ?\DateTimeImmutable $createdAt = null;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }

    public function getUser(): ?User { return $this->user; }
    public function setUser(?User $user): static { $this->user = $user; return $this; }

    public function getContentType(): ?string { return $this->contentType; }
    public function setContentType(string $contentType): static { $this->contentType = $contentType; return $this; }

    public function getContentRef(): ?string { return $this->contentRef; }
    public function setContentRef(string $contentRef): static { $this->contentRef = $contentRef; return $this; }

    public function isPositive(): ?bool { return $this->isPositive; }
    public function setIsPositive(bool $isPositive): static { $this->isPositive = $isPositive; return $this; }

    public function getCreatedAt(): ?\DateTimeImmutable { return $this->createdAt; }
    public function setCreatedAt(\DateTimeImmutable $createdAt): static { $this->createdAt = $createdAt; return $this; }
}
