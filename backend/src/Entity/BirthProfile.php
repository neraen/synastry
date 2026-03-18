<?php

namespace App\Entity;

use App\Repository\BirthProfileRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: BirthProfileRepository::class)]
#[ORM\Table(name: 'birth_profile')]
class BirthProfile
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\OneToOne(inversedBy: 'birthProfile', targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?User $user = null;

    #[ORM\Column(length: 100, nullable: true)]
    private ?string $firstName = null;

    #[ORM\Column(type: Types::DATE_MUTABLE)]
    #[Assert\NotBlank(message: 'Birth date is required')]
    private ?\DateTimeInterface $birthDate = null;

    #[ORM\Column(type: Types::TIME_MUTABLE, nullable: true)]
    private ?\DateTimeInterface $birthTime = null;

    #[ORM\Column(length: 255)]
    #[Assert\NotBlank(message: 'Birth city is required')]
    private ?string $birthCity = null;

    #[ORM\Column(length: 100, nullable: true)]
    private ?string $birthCountry = null;

    #[ORM\Column(type: Types::DECIMAL, precision: 10, scale: 7)]
    #[Assert\NotBlank(message: 'Latitude is required')]
    #[Assert\Range(min: -90, max: 90)]
    private ?string $latitude = null;

    #[ORM\Column(type: Types::DECIMAL, precision: 10, scale: 7)]
    #[Assert\NotBlank(message: 'Longitude is required')]
    #[Assert\Range(min: -180, max: 180)]
    private ?string $longitude = null;

    #[ORM\Column(type: Types::DECIMAL, precision: 4, scale: 2, nullable: true)]
    private ?string $timezone = null;

    #[ORM\Column(length: 100, nullable: true)]
    private ?string $timezoneName = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private ?\DateTimeInterface $createdAt = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private ?\DateTimeInterface $updatedAt = null;

    public function __construct()
    {
        $this->createdAt = new \DateTime();
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

    public function getFirstName(): ?string
    {
        return $this->firstName;
    }

    public function setFirstName(?string $firstName): static
    {
        $this->firstName = $firstName;
        return $this;
    }

    public function getBirthDate(): ?\DateTimeInterface
    {
        return $this->birthDate;
    }

    public function setBirthDate(\DateTimeInterface $birthDate): static
    {
        $this->birthDate = $birthDate;
        return $this;
    }

    public function getBirthTime(): ?\DateTimeInterface
    {
        return $this->birthTime;
    }

    public function setBirthTime(?\DateTimeInterface $birthTime): static
    {
        $this->birthTime = $birthTime;
        return $this;
    }

    public function getBirthCity(): ?string
    {
        return $this->birthCity;
    }

    public function setBirthCity(string $birthCity): static
    {
        $this->birthCity = $birthCity;
        return $this;
    }

    public function getBirthCountry(): ?string
    {
        return $this->birthCountry;
    }

    public function setBirthCountry(?string $birthCountry): static
    {
        $this->birthCountry = $birthCountry;
        return $this;
    }

    public function getLatitude(): ?string
    {
        return $this->latitude;
    }

    public function setLatitude(string $latitude): static
    {
        $this->latitude = $latitude;
        return $this;
    }

    public function getLongitude(): ?string
    {
        return $this->longitude;
    }

    public function setLongitude(string $longitude): static
    {
        $this->longitude = $longitude;
        return $this;
    }

    public function getTimezone(): ?string
    {
        return $this->timezone;
    }

    public function setTimezone(?string $timezone): static
    {
        $this->timezone = $timezone;
        return $this;
    }

    public function getTimezoneName(): ?string
    {
        return $this->timezoneName;
    }

    public function setTimezoneName(?string $timezoneName): static
    {
        $this->timezoneName = $timezoneName;
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

    #[ORM\PreUpdate]
    public function onPreUpdate(): void
    {
        $this->updatedAt = new \DateTime();
    }

    /**
     * Convert to array for API response
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'firstName' => $this->firstName,
            'birthDate' => $this->birthDate?->format('Y-m-d'),
            'birthTime' => $this->birthTime?->format('H:i'),
            'birthCity' => $this->birthCity,
            'birthCountry' => $this->birthCountry,
            'latitude' => $this->latitude ? (float) $this->latitude : null,
            'longitude' => $this->longitude ? (float) $this->longitude : null,
            'timezone' => $this->timezone ? (float) $this->timezone : null,
            'timezoneName' => $this->timezoneName,
        ];
    }

    /**
     * Get data formatted for Ephemeris API
     */
    public function toEphemerisData(): array
    {
        $date = $this->birthDate;
        $time = $this->birthTime ?? new \DateTime('12:00:00');

        return [
            'year' => (int) $date->format('Y'),
            'month' => (int) $date->format('m'),
            'day' => (int) $date->format('d'),
            'hours' => (int) $time->format('H'),
            'minutes' => (int) $time->format('i'),
            'seconds' => (int) $time->format('s'),
            'latitude' => (float) $this->latitude,
            'longitude' => (float) $this->longitude,
            'timezone' => (float) ($this->timezone ?? 0),
        ];
    }
}