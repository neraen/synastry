<?php

namespace App\Entity;

use App\Repository\LyraConversationLogRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: LyraConversationLogRepository::class)]
#[ORM\Table(name: 'lyra_conversation_log')]
#[ORM\Index(columns: ['user_id'], name: 'idx_lyra_log_user')]
#[ORM\Index(columns: ['created_at'], name: 'idx_lyra_log_created')]
class LyraConversationLog
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private User $user;

    #[ORM\Column(type: Types::TEXT)]
    private string $userMessage;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $assistantResponse = null;

    #[ORM\Column]
    private int $messageCount = 1;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    public function __construct(User $user, string $userMessage, int $messageCount = 1)
    {
        $this->user         = $user;
        $this->userMessage  = $userMessage;
        $this->messageCount = $messageCount;
        $this->createdAt    = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }
    public function getUser(): User { return $this->user; }
    public function getUserMessage(): string { return $this->userMessage; }
    public function getAssistantResponse(): ?string { return $this->assistantResponse; }
    public function getMessageCount(): int { return $this->messageCount; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }

    public function setAssistantResponse(?string $response): void
    {
        $this->assistantResponse = $response;
    }
}
