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

    /**
     * Apple refresh token, stored to revoke Sign in with Apple on account deletion
     * (App Store guideline 5.1.1(v))
     */
    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $appleRefreshToken = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $displayName = null;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $createdAt = null;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $lastLoginAt = null;

    #[ORM\Column(type: 'boolean', options: ['default' => false])]
    private bool $isPremium = false;

    #[ORM\Column(type: 'datetime', nullable: true)]
    private ?\DateTimeInterface $premiumUntil = null;

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

    /** @var Collection<int, ChatSession> */
    #[ORM\OneToMany(mappedBy: 'user', targetEntity: ChatSession::class, cascade: ['remove'])]
    #[ORM\OrderBy(['updatedAt' => 'DESC'])]
    private Collection $chatSessions;

    public function __construct()
    {
        $this->synastryHistories = new ArrayCollection();
        $this->dailyHoroscopes = new ArrayCollection();
        $this->chatSessions = new ArrayCollection();
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

    public function getAppleRefreshToken(): ?string
    {
        return $this->appleRefreshToken;
    }

    public function setAppleRefreshToken(?string $appleRefreshToken): static
    {
        $this->appleRefreshToken = $appleRefreshToken;

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

    public function isPremium(): bool
    {
        // Also check that the subscription hasn't expired
        if (!$this->isPremium) {
            return false;
        }
        if ($this->premiumUntil !== null && $this->premiumUntil < new \DateTime()) {
            return false;
        }
        return true;
    }

    public function setIsPremium(bool $isPremium): static
    {
        $this->isPremium = $isPremium;
        return $this;
    }

    public function getPremiumUntil(): ?\DateTimeInterface
    {
        return $this->premiumUntil;
    }

    public function setPremiumUntil(?\DateTimeInterface $premiumUntil): static
    {
        $this->premiumUntil = $premiumUntil;
        return $this;
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

    /**
     * @return Collection<int, ChatSession>
     */
    public function getChatSessions(): Collection
    {
        return $this->chatSessions;
    }

    public function getDisplayName(): ?string
    {
        return $this->displayName;
    }

    public function setDisplayName(?string $displayName): static
    {
        $this->displayName = $displayName;
        return $this;
    }

    public function getCreatedAt(): ?\DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function setCreatedAt(?\DateTimeImmutable $createdAt): static
    {
        $this->createdAt = $createdAt;
        return $this;
    }

    public function getLastLoginAt(): ?\DateTimeImmutable
    {
        return $this->lastLoginAt;
    }

    public function setLastLoginAt(?\DateTimeImmutable $lastLoginAt): static
    {
        $this->lastLoginAt = $lastLoginAt;
        return $this;
    }

    public function getAuthProvider(): string
    {
        if ($this->googleId !== null) {
            return 'google';
        }
        if ($this->appleId !== null) {
            return 'apple';
        }
        return 'email';
    }

    public function getLyraMessageCount(): int
    {
        $count = 0;
        foreach ($this->chatSessions as $session) {
            $count += count($session->getMessages());
        }
        return $count;
    }

    #[\Deprecated]
    public function eraseCredentials(): void
    {
        // @deprecated, to be removed when upgrading to Symfony 8
    }
}