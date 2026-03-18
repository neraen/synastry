<?php

namespace App\Entity;

use App\Repository\DailyHoroscopeRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: DailyHoroscopeRepository::class)]
#[ORM\Table(name: 'daily_horoscope')]
#[ORM\UniqueConstraint(name: 'user_date_unique', columns: ['user_id', 'date'])]
#[ORM\HasLifecycleCallbacks]
class DailyHoroscope
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class, inversedBy: 'dailyHoroscopes')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?User $user = null;

    #[ORM\Column(type: Types::DATE_MUTABLE)]
    private ?\DateTimeInterface $date = null;

    #[ORM\Column(length: 255)]
    private ?string $title = null;

    #[ORM\Column(type: Types::TEXT)]
    private ?string $overview = null;

    #[ORM\Column(type: Types::TEXT)]
    private ?string $love = null;

    #[ORM\Column(type: Types::TEXT)]
    private ?string $energy = null;

    #[ORM\Column(type: Types::TEXT)]
    private ?string $advice = null;

    #[ORM\Column(type: Types::JSON)]
    private array $natalData = [];

    #[ORM\Column(type: Types::JSON)]
    private array $transitsData = [];

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private ?\DateTimeInterface $generatedAt = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private ?\DateTimeInterface $createdAt = null;

    public function __construct()
    {
        $this->createdAt = new \DateTime();
        $this->generatedAt = new \DateTime();
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

    public function getDate(): ?\DateTimeInterface
    {
        return $this->date;
    }

    public function setDate(\DateTimeInterface $date): static
    {
        $this->date = $date;
        return $this;
    }

    public function getTitle(): ?string
    {
        return $this->title;
    }

    public function setTitle(string $title): static
    {
        $this->title = $title;
        return $this;
    }

    public function getOverview(): ?string
    {
        return $this->overview;
    }

    public function setOverview(string $overview): static
    {
        $this->overview = $overview;
        return $this;
    }

    public function getLove(): ?string
    {
        return $this->love;
    }

    public function setLove(string $love): static
    {
        $this->love = $love;
        return $this;
    }

    public function getEnergy(): ?string
    {
        return $this->energy;
    }

    public function setEnergy(string $energy): static
    {
        $this->energy = $energy;
        return $this;
    }

    public function getAdvice(): ?string
    {
        return $this->advice;
    }

    public function setAdvice(string $advice): static
    {
        $this->advice = $advice;
        return $this;
    }

    public function getNatalData(): array
    {
        return $this->natalData;
    }

    public function setNatalData(array $natalData): static
    {
        $this->natalData = $natalData;
        return $this;
    }

    public function getTransitsData(): array
    {
        return $this->transitsData;
    }

    public function setTransitsData(array $transitsData): static
    {
        $this->transitsData = $transitsData;
        return $this;
    }

    public function getGeneratedAt(): ?\DateTimeInterface
    {
        return $this->generatedAt;
    }

    public function setGeneratedAt(\DateTimeInterface $generatedAt): static
    {
        $this->generatedAt = $generatedAt;
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

    /**
     * Convert to array for API response
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'overview' => $this->overview,
            'love' => $this->love,
            'energy' => $this->energy,
            'advice' => $this->advice,
            'date' => $this->date?->format('Y-m-d'),
            'generatedAt' => $this->generatedAt?->format('Y-m-d H:i:s'),
        ];
    }
}
