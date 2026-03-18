<?php

namespace App\Entity;

use App\Repository\NatalChartRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: NatalChartRepository::class)]
#[ORM\Table(name: 'natal_chart')]
#[ORM\HasLifecycleCallbacks]
class NatalChart
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?User $user = null;

    #[ORM\OneToOne(targetEntity: BirthProfile::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?BirthProfile $birthProfile = null;

    #[ORM\Column(type: Types::JSON)]
    private array $planetaryPositions = [];

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $interpretation = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private ?\DateTimeInterface $calculatedAt = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private ?\DateTimeInterface $createdAt = null;

    public function __construct()
    {
        $this->createdAt = new \DateTime();
        $this->calculatedAt = new \DateTime();
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

    public function getBirthProfile(): ?BirthProfile
    {
        return $this->birthProfile;
    }

    public function setBirthProfile(?BirthProfile $birthProfile): static
    {
        $this->birthProfile = $birthProfile;
        return $this;
    }

    public function getPlanetaryPositions(): array
    {
        return $this->planetaryPositions;
    }

    public function setPlanetaryPositions(array $planetaryPositions): static
    {
        $this->planetaryPositions = $planetaryPositions;
        return $this;
    }

    public function getInterpretation(): ?string
    {
        return $this->interpretation;
    }

    public function setInterpretation(?string $interpretation): static
    {
        $this->interpretation = $interpretation;
        return $this;
    }

    public function getCalculatedAt(): ?\DateTimeInterface
    {
        return $this->calculatedAt;
    }

    public function setCalculatedAt(\DateTimeInterface $calculatedAt): static
    {
        $this->calculatedAt = $calculatedAt;
        return $this;
    }

    public function getCreatedAt(): ?\DateTimeInterface
    {
        return $this->createdAt;
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'planetaryPositions' => $this->planetaryPositions,
            'interpretation' => $this->interpretation,
            'calculatedAt' => $this->calculatedAt?->format('Y-m-d H:i:s'),
        ];
    }
}