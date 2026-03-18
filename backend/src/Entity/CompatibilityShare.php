<?php

namespace App\Entity;

use App\Repository\CompatibilityShareRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: CompatibilityShareRepository::class)]
#[ORM\Table(name: 'compatibility_share')]
#[ORM\Index(columns: ['share_id'], name: 'idx_share_id')]
#[ORM\HasLifecycleCallbacks]
class CompatibilityShare
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 8, unique: true)]
    private ?string $shareId = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?User $user = null;

    #[ORM\Column(length: 100)]
    private ?string $userOneName = null;

    #[ORM\Column(length: 100)]
    private ?string $userTwoName = null;

    #[ORM\Column(type: Types::DECIMAL, precision: 5, scale: 2)]
    private ?string $compatibilityScore = null;

    #[ORM\Column(type: Types::TEXT)]
    private ?string $summary = null;

    #[ORM\Column(type: Types::JSON)]
    private array $userOnePositions = [];

    #[ORM\Column(type: Types::JSON)]
    private array $userTwoPositions = [];

    #[ORM\Column(type: Types::JSON, nullable: true)]
    private ?array $compatibilityDetails = null;

    #[ORM\Column]
    private ?int $synastryHistoryId = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private ?\DateTimeInterface $createdAt = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private ?\DateTimeInterface $expiresAt = null;

    public function __construct()
    {
        $this->createdAt = new \DateTime();
        // Expire after 30 days
        $this->expiresAt = (new \DateTime())->modify('+30 days');
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getShareId(): ?string
    {
        return $this->shareId;
    }

    public function setShareId(string $shareId): static
    {
        $this->shareId = $shareId;
        return $this;
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

    public function getUserOneName(): ?string
    {
        return $this->userOneName;
    }

    public function setUserOneName(string $userOneName): static
    {
        $this->userOneName = $userOneName;
        return $this;
    }

    public function getUserTwoName(): ?string
    {
        return $this->userTwoName;
    }

    public function setUserTwoName(string $userTwoName): static
    {
        $this->userTwoName = $userTwoName;
        return $this;
    }

    public function getCompatibilityScore(): ?float
    {
        return $this->compatibilityScore !== null ? (float) $this->compatibilityScore : null;
    }

    public function setCompatibilityScore(float $compatibilityScore): static
    {
        $this->compatibilityScore = (string) $compatibilityScore;
        return $this;
    }

    public function getSummary(): ?string
    {
        return $this->summary;
    }

    public function setSummary(string $summary): static
    {
        $this->summary = $summary;
        return $this;
    }

    public function getUserOnePositions(): array
    {
        return $this->userOnePositions;
    }

    public function setUserOnePositions(array $userOnePositions): static
    {
        $this->userOnePositions = $userOnePositions;
        return $this;
    }

    public function getUserTwoPositions(): array
    {
        return $this->userTwoPositions;
    }

    public function setUserTwoPositions(array $userTwoPositions): static
    {
        $this->userTwoPositions = $userTwoPositions;
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

    public function getSynastryHistoryId(): ?int
    {
        return $this->synastryHistoryId;
    }

    public function setSynastryHistoryId(int $synastryHistoryId): static
    {
        $this->synastryHistoryId = $synastryHistoryId;
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

    public function getExpiresAt(): ?\DateTimeInterface
    {
        return $this->expiresAt;
    }

    public function setExpiresAt(\DateTimeInterface $expiresAt): static
    {
        $this->expiresAt = $expiresAt;
        return $this;
    }

    public function isExpired(): bool
    {
        return $this->expiresAt < new \DateTime();
    }

    /**
     * Get sign from planetary positions
     */
    private function getSign(array $positions, string $planet): ?string
    {
        return $positions[$planet]['Sign'] ?? null;
    }

    /**
     * Convert to public API response (no sensitive data)
     */
    public function toPublicArray(): array
    {
        return [
            'shareId' => $this->shareId,
            'nameOne' => $this->userOneName,
            'nameTwo' => $this->userTwoName,
            'sunOne' => $this->getSign($this->userOnePositions, 'Sun'),
            'sunTwo' => $this->getSign($this->userTwoPositions, 'Sun'),
            'moonOne' => $this->getSign($this->userOnePositions, 'Moon'),
            'moonTwo' => $this->getSign($this->userTwoPositions, 'Moon'),
            'ascendantOne' => $this->getSign($this->userOnePositions, 'Ascendant'),
            'ascendantTwo' => $this->getSign($this->userTwoPositions, 'Ascendant'),
            'compatibilityScore' => $this->getCompatibilityScore(),
            'summary' => $this->summary,
            'createdAt' => $this->createdAt?->format('Y-m-d'),
        ];
    }
}
