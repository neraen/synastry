<?php

namespace App\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * User report of an inappropriate AI (Lyra) response.
 * Required reporting mechanism for AI-generated content (App Store guideline 1.2).
 */
#[ORM\Entity]
#[ORM\Table(name: 'chat_report')]
#[ORM\Index(columns: ['user_id'], name: 'idx_chat_report_user')]
#[ORM\Index(columns: ['created_at'], name: 'idx_chat_report_created')]
class ChatReport
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private User $user;

    #[ORM\Column(type: Types::TEXT)]
    private string $reportedMessage;

    #[ORM\Column(length: 500, nullable: true)]
    private ?string $reason = null;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    public function __construct(User $user, string $reportedMessage, ?string $reason = null)
    {
        $this->user            = $user;
        $this->reportedMessage = $reportedMessage;
        $this->reason          = $reason;
        $this->createdAt       = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }
    public function getUser(): User { return $this->user; }
    public function getReportedMessage(): string { return $this->reportedMessage; }
    public function getReason(): ?string { return $this->reason; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
