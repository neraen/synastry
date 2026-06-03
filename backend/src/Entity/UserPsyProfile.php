<?php

namespace App\Entity;

use App\Repository\UserPsyProfileRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * Compact, persistent psychological digest extracted once from the user's full
 * natal analysis. Injected as lean context into the Lyra chat and the daily
 * horoscope. Sensitive derived data — removed with the account via FK cascade.
 */
#[ORM\Entity(repositoryClass: UserPsyProfileRepository::class)]
#[ORM\Table(name: 'user_psy_profile')]
#[ORM\UniqueConstraint(name: 'user_psy_profile_user_unique', columns: ['user_id'])]
class UserPsyProfile
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'user_id', nullable: false, onDelete: 'CASCADE')]
    private ?User $user = null;

    #[ORM\Column(type: Types::INTEGER)]
    private int $version = 1;

    #[ORM\Column(type: Types::DATE_MUTABLE)]
    private \DateTime $genereLe;

    #[ORM\Column(type: Types::JSON)]
    private mixed $data = null;

    public function __construct()
    {
        $this->genereLe = new \DateTime();
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

    public function getVersion(): int
    {
        return $this->version;
    }

    public function setVersion(int $version): static
    {
        $this->version = $version;
        return $this;
    }

    public function getGenereLe(): \DateTime
    {
        return $this->genereLe;
    }

    public function setGenereLe(\DateTime $genereLe): static
    {
        $this->genereLe = $genereLe;
        return $this;
    }

    public function getData(): mixed
    {
        return $this->data;
    }

    public function setData(mixed $data): static
    {
        $this->data = $data;
        return $this;
    }
}
