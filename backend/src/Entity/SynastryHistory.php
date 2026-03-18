<?php

namespace App\Entity;

use App\Repository\SynastryHistoryRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: SynastryHistoryRepository::class)]
#[ORM\Table(name: 'synastry_history')]
#[ORM\HasLifecycleCallbacks]
class SynastryHistory
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class, inversedBy: 'synastryHistories')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?User $user = null;

    #[ORM\Column(length: 255)]
    #[Assert\NotBlank]
    private ?string $partnerName = null;

    #[ORM\Column(type: Types::JSON)]
    private array $partnerBirthData = [];

    #[ORM\Column(type: Types::TEXT)]
    private ?string $analysis = null;

    #[ORM\Column(type: Types::DECIMAL, precision: 5, scale: 2, nullable: true)]
    private ?string $compatibilityScore = null;

    #[ORM\Column(type: Types::JSON, nullable: true)]
    private ?array $compatibilityDetails = null;

    #[ORM\Column(type: Types::JSON, nullable: true)]
    private ?array $userPositions = null;

    #[ORM\Column(type: Types::JSON, nullable: true)]
    private ?array $partnerPositions = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $question = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private ?\DateTimeInterface $createdAt = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private ?\DateTimeInterface $updatedAt = null;

    public function __construct()
    {
        $this->createdAt = new \DateTime();
        $this->updatedAt = new \DateTime();
    }

    #[ORM\PreUpdate]
    public function onPreUpdate(): void
    {
        $this->updatedAt = new \DateTime();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getUser(): ?User
    {
        return $this->user;
    }

    public function setUser(?User $user): static
    {
        $this->user = $user;
        return $this;
    }

    public function getPartnerName(): ?string
    {
        return $this->partnerName;
    }

    public function setPartnerName(string $partnerName): static
    {
        $this->partnerName = $partnerName;
        return $this;
    }

    public function getPartnerBirthData(): array
    {
        return $this->partnerBirthData;
    }

    public function setPartnerBirthData(array $partnerBirthData): static
    {
        $this->partnerBirthData = $partnerBirthData;
        return $this;
    }

    public function getAnalysis(): ?string
    {
        return $this->analysis;
    }

    public function setAnalysis(string $analysis): static
    {
        $this->analysis = $analysis;
        return $this;
    }

    public function getCompatibilityScore(): ?float
    {
        return $this->compatibilityScore !== null ? (float) $this->compatibilityScore : null;
    }

    public function setCompatibilityScore(?float $compatibilityScore): static
    {
        $this->compatibilityScore = $compatibilityScore !== null ? (string) $compatibilityScore : null;
        return $this;
    }

    public function getCompatibilityDetails(): ?array
    {
        return $this->compatibilityDetails;
    }

    public function setCompatibilityDetails(?array $compatibilityDetails): static
    {
        $this->compatibilityDetails = $compatibilityDetails;
        return $this;
    }

    public function getUserPositions(): ?array
    {
        return $this->userPositions;
    }

    public function setUserPositions(?array $userPositions): static
    {
        $this->userPositions = $userPositions;
        return $this;
    }

    public function getPartnerPositions(): ?array
    {
        return $this->partnerPositions;
    }

    public function setPartnerPositions(?array $partnerPositions): static
    {
        $this->partnerPositions = $partnerPositions;
        return $this;
    }

    public function getQuestion(): ?string
    {
        return $this->question;
    }

    public function setQuestion(?string $question): static
    {
        $this->question = $question;
        return $this;
    }

    public function getCreatedAt(): ?\DateTimeInterface
    {
        return $this->createdAt;
    }

    public function setCreatedAt(\DateTimeInterface $createdAt): static
    {
        $this->createdAt = $createdAt;
        return $this;
    }

    public function getUpdatedAt(): ?\DateTimeInterface
    {
        return $this->updatedAt;
    }

    public function setUpdatedAt(\DateTimeInterface $updatedAt): static
    {
        $this->updatedAt = $updatedAt;
        return $this;
    }

    /**
     * Convert to array for API response
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'partnerName' => $this->partnerName,
            'partnerBirthData' => $this->partnerBirthData,
            'analysis' => $this->analysis,
            'compatibilityScore' => $this->getCompatibilityScore(),
            'compatibilityDetails' => $this->compatibilityDetails,
            'userPositions' => $this->userPositions,
            'partnerPositions' => $this->partnerPositions,
            'question' => $this->question,
            'createdAt' => $this->createdAt?->format('Y-m-d H:i:s'),
            'updatedAt' => $this->updatedAt?->format('Y-m-d H:i:s'),
        ];
    }

    /**
     * Summary for list view
     */
    public function toSummary(): array
    {
        return [
            'id' => $this->id,
            'partnerName' => $this->partnerName,
            'compatibilityScore' => $this->getCompatibilityScore(),
            'createdAt' => $this->createdAt?->format('Y-m-d H:i:s'),
        ];
    }
}
