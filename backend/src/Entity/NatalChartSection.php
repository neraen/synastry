<?php

namespace App\Entity;

use App\Repository\NatalChartSectionRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: NatalChartSectionRepository::class)]
#[ORM\Table(name: 'natal_chart_section')]
#[ORM\UniqueConstraint(name: 'user_section_unique', columns: ['user_id', 'section'])]
class NatalChartSection
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'user_id', nullable: false, onDelete: 'CASCADE')]
    private ?User $user = null;

    /** One of: synthesis, identity, emotions, mental, relationships, ambition, mission, aspects */
    #[ORM\Column(type: Types::STRING, length: 50)]
    private string $section = '';

    /**
     * SHA-256 hash of the chart data used during generation.
     * If the birth profile changes, this hash will differ and the content will be regenerated.
     */
    #[ORM\Column(type: Types::STRING, length: 16)]
    private string $chartHash = '';

    /** The generated content — string for text sections, array for synthesis/aspects */
    #[ORM\Column(type: Types::JSON)]
    private mixed $content = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTime $generatedAt;

    public function __construct()
    {
        $this->generatedAt = new \DateTime();
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

    public function getSection(): string
    {
        return $this->section;
    }

    public function setSection(string $section): static
    {
        $this->section = $section;
        return $this;
    }

    public function getChartHash(): string
    {
        return $this->chartHash;
    }

    public function setChartHash(string $chartHash): static
    {
        $this->chartHash = $chartHash;
        return $this;
    }

    public function getContent(): mixed
    {
        return $this->content;
    }

    public function setContent(mixed $content): static
    {
        $this->content = $content;
        return $this;
    }

    public function getGeneratedAt(): \DateTime
    {
        return $this->generatedAt;
    }

    public function setGeneratedAt(\DateTime $generatedAt): static
    {
        $this->generatedAt = $generatedAt;
        return $this;
    }
}
