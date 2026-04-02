<?php

namespace App\Entity;

use App\Repository\NatalTransitCacheRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: NatalTransitCacheRepository::class)]
#[ORM\Table(name: 'natal_transit_cache')]
#[ORM\UniqueConstraint(name: 'user_age_unique', columns: ['user_id', 'age'])]
class NatalTransitCache
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'user_id', nullable: false, onDelete: 'CASCADE')]
    private ?User $user = null;

    #[ORM\Column(type: 'smallint')]
    private int $age = 0;

    #[ORM\Column(type: 'json')]
    private array $planetPositions = [];

    #[ORM\Column(type: 'datetime')]
    private \DateTime $calculatedAt;

    public function __construct()
    {
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

    public function getAge(): int
    {
        return $this->age;
    }

    public function setAge(int $age): static
    {
        $this->age = $age;
        return $this;
    }

    public function getPlanetPositions(): array
    {
        return $this->planetPositions;
    }

    public function setPlanetPositions(array $planetPositions): static
    {
        $this->planetPositions = $planetPositions;
        return $this;
    }

    public function getCalculatedAt(): \DateTime
    {
        return $this->calculatedAt;
    }

    public function setCalculatedAt(\DateTime $calculatedAt): static
    {
        $this->calculatedAt = $calculatedAt;
        return $this;
    }
}