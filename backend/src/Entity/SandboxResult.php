<?php

namespace App\Entity;

use App\Repository\SandboxResultRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: SandboxResultRepository::class)]
#[ORM\Table(name: 'sandbox_result')]
#[ORM\Index(columns: ['created_at'], name: 'idx_sandbox_created')]
class SandboxResult
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private User $user;

    #[ORM\Column(length: 32)]
    private string $type; // 'horoscope' | 'compatibility'

    #[ORM\Column(type: Types::JSON, nullable: true)]
    private ?array $inputData = null;

    #[ORM\Column(type: Types::JSON, nullable: true)]
    private ?array $outputData = null;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    public function __construct(User $user, string $type, ?array $inputData = null)
    {
        $this->user      = $user;
        $this->type      = $type;
        $this->inputData = $inputData;
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }
    public function getUser(): User { return $this->user; }
    public function getType(): string { return $this->type; }
    public function getInputData(): ?array { return $this->inputData; }
    public function getOutputData(): ?array { return $this->outputData; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }

    public function setOutputData(?array $data): void { $this->outputData = $data; }
}
