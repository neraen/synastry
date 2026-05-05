<?php

namespace App\Entity;

use App\Repository\NotificationLogRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: NotificationLogRepository::class)]
#[ORM\Table(name: 'notification_log')]
#[ORM\Index(columns: ['user_id', 'type'], name: 'idx_notif_user_type')]
class NotificationLog
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?User $user = null;

    /** transit_personal | sky_event | daily_reminder */
    #[ORM\Column(length: 50)]
    private ?string $type = null;

    #[ORM\Column(length: 255)]
    private ?string $title = null;

    #[ORM\Column(type: Types::TEXT)]
    private ?string $body = null;

    /** Stores the astrological event that triggered this notification (for dedup and debug) */
    #[ORM\Column(type: Types::JSON)]
    private array $triggerData = [];

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private ?\DateTimeInterface $sentAt = null;

    public function getId(): ?int { return $this->id; }

    public function getUser(): ?User { return $this->user; }
    public function setUser(?User $user): static { $this->user = $user; return $this; }

    public function getType(): ?string { return $this->type; }
    public function setType(string $type): static { $this->type = $type; return $this; }

    public function getTitle(): ?string { return $this->title; }
    public function setTitle(string $title): static { $this->title = $title; return $this; }

    public function getBody(): ?string { return $this->body; }
    public function setBody(string $body): static { $this->body = $body; return $this; }

    public function getTriggerData(): array { return $this->triggerData; }
    public function setTriggerData(array $data): static { $this->triggerData = $data; return $this; }

    public function getSentAt(): ?\DateTimeInterface { return $this->sentAt; }
    public function setSentAt(\DateTimeInterface $sentAt): static { $this->sentAt = $sentAt; return $this; }
}
