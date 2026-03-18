<?php

namespace App\Entity;

use App\Repository\UserRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\UserInterface;

#[ORM\Entity(repositoryClass: UserRepository::class)]
#[ORM\UniqueConstraint(name: 'UNIQ_IDENTIFIER_EMAIL', fields: ['email'])]
class User implements UserInterface, PasswordAuthenticatedUserInterface
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 180)]
    private ?string $email = null;

    /**
     * @var list<string> The user roles
     */
    #[ORM\Column]
    private array $roles = [];

    /**
     * @var string|null The hashed password (nullable for OAuth-only users)
     */
    #[ORM\Column(nullable: true)]
    private ?string $password = null;

    #[ORM\Column(length: 255, nullable: true, unique: true)]
    private ?string $googleId = null;

    #[ORM\Column(length: 255, nullable: true, unique: true)]
    private ?string $appleId = null;

    #[ORM\OneToOne(mappedBy: 'user', targetEntity: BirthProfile::class, cascade: ['persist', 'remove'])]
    private ?BirthProfile $birthProfile = null;

    /** @var Collection<int, SynastryHistory> */
    #[ORM\OneToMany(mappedBy: 'user', targetEntity: SynastryHistory::class, cascade: ['remove'])]
    #[ORM\OrderBy(['createdAt' => 'DESC'])]
    private Collection $synastryHistories;

    /** @var Collection<int, DailyHoroscope> */
    #[ORM\OneToMany(mappedBy: 'user', targetEntity: DailyHoroscope::class, cascade: ['remove'])]
    #[ORM\OrderBy(['date' => 'DESC'])]
    private Collection $dailyHoroscopes;

    public function __construct()
    {
        $this->synastryHistories = new ArrayCollection();
        $this->dailyHoroscopes = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getEmail(): ?string
    {
        return $this->email;
    }

    public function setEmail(string $email): static
    {
        $this->email = $email;

        return $this;
    }

    /**
     * A visual identifier that represents this user.
     *
     * @see UserInterface
     */
    public function getUserIdentifier(): string
    {
        return (string) $this->email;
    }

    /**
     * @see UserInterface
     */
    public function getRoles(): array
    {
        $roles = $this->roles;
        // guarantee every user at least has ROLE_USER
        $roles[] = 'ROLE_USER';

        return array_unique($roles);
    }

    /**
     * @param list<string> $roles
     */
    public function setRoles(array $roles): static
    {
        $this->roles = $roles;

        return $this;
    }

    /**
     * @see PasswordAuthenticatedUserInterface
     */
    public function getPassword(): ?string
    {
        return $this->password;
    }

    public function setPassword(?string $password): static
    {
        $this->password = $password;

        return $this;
    }

    public function getGoogleId(): ?string
    {
        return $this->googleId;
    }

    public function setGoogleId(?string $googleId): static
    {
        $this->googleId = $googleId;

        return $this;
    }

    public function getAppleId(): ?string
    {
        return $this->appleId;
    }

    public function setAppleId(?string $appleId): static
    {
        $this->appleId = $appleId;

        return $this;
    }

    public function getBirthProfile(): ?BirthProfile
    {
        return $this->birthProfile;
    }

    public function setBirthProfile(?BirthProfile $birthProfile): static
    {
        // Unset the owning side of the relation if necessary
        if ($birthProfile === null && $this->birthProfile !== null) {
            $this->birthProfile->setUser(null);
        }

        // Set the owning side of the relation if necessary
        if ($birthProfile !== null && $birthProfile->getUser() !== $this) {
            $birthProfile->setUser($this);
        }

        $this->birthProfile = $birthProfile;

        return $this;
    }

    public function hasBirthProfile(): bool
    {
        return $this->birthProfile !== null;
    }

    /**
     * @return Collection<int, SynastryHistory>
     */
    public function getSynastryHistories(): Collection
    {
        return $this->synastryHistories;
    }

    /**
     * @return Collection<int, DailyHoroscope>
     */
    public function getDailyHoroscopes(): Collection
    {
        return $this->dailyHoroscopes;
    }

    #[\Deprecated]
    public function eraseCredentials(): void
    {
        // @deprecated, to be removed when upgrading to Symfony 8
    }
}