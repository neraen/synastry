<?php

namespace App\Entity;

use App\Repository\UserNotificationPreferencesRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: UserNotificationPreferencesRepository::class)]
#[ORM\Table(name: 'user_notification_preferences')]
class UserNotificationPreferences
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\OneToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?User $user = null;

    #[ORM\Column]
    private bool $enabled = true;

    #[ORM\Column]
    private bool $transitsEnabled = true;

    #[ORM\Column]
    private bool $skyEventsEnabled = true;

    #[ORM\Column]
    private bool $dailyReminderEnabled = false;

    /** Hour 0-23 at which the user prefers to receive notifications */
    #[ORM\Column]
    private int $preferredHour = 8;

    #[ORM\Column(length: 60)]
    private string $timezone = 'Europe/Paris';

    public function getId(): ?int { return $this->id; }

    public function getUser(): ?User { return $this->user; }
    public function setUser(?User $user): static { $this->user = $user; return $this; }

    public function isEnabled(): bool { return $this->enabled; }
    public function setEnabled(bool $enabled): static { $this->enabled = $enabled; return $this; }

    public function isTransitsEnabled(): bool { return $this->transitsEnabled; }
    public function setTransitsEnabled(bool $v): static { $this->transitsEnabled = $v; return $this; }

    public function isSkyEventsEnabled(): bool { return $this->skyEventsEnabled; }
    public function setSkyEventsEnabled(bool $v): static { $this->skyEventsEnabled = $v; return $this; }

    public function isDailyReminderEnabled(): bool { return $this->dailyReminderEnabled; }
    public function setDailyReminderEnabled(bool $v): static { $this->dailyReminderEnabled = $v; return $this; }

    public function getPreferredHour(): int { return $this->preferredHour; }
    public function setPreferredHour(int $hour): static { $this->preferredHour = max(0, min(23, $hour)); return $this; }

    public function getTimezone(): string { return $this->timezone; }
    public function setTimezone(string $tz): static { $this->timezone = $tz; return $this; }

    public function toArray(): array
    {
        return [
            'enabled'              => $this->enabled,
            'transitsEnabled'      => $this->transitsEnabled,
            'skyEventsEnabled'     => $this->skyEventsEnabled,
            'dailyReminderEnabled' => $this->dailyReminderEnabled,
            'preferredHour'        => $this->preferredHour,
            'timezone'             => $this->timezone,
        ];
    }
}
