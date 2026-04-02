<?php

namespace App\Entity;

use App\Repository\CosmicHeadlineRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * Weekly cosmic headline — global cache, not per user.
 * One row per locale per week.
 */
#[ORM\Entity(repositoryClass: CosmicHeadlineRepository::class)]
#[ORM\Table(name: 'cosmic_headline')]
#[ORM\UniqueConstraint(name: 'locale_week_unique', columns: ['locale', 'week_of'])]
class CosmicHeadline
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    /** ISO locale: "fr" or "en" */
    #[ORM\Column(length: 10)]
    private string $locale;

    /** Monday of the current week (cache key) */
    #[ORM\Column(type: Types::DATE_MUTABLE)]
    private \DateTimeInterface $weekOf;

    /** Short punchy title, e.g. "Vénus en Rétrograde" */
    #[ORM\Column(length: 255)]
    private string $title;

    /** One-sentence subtitle about the week's cosmic energy */
    #[ORM\Column(type: Types::TEXT)]
    private string $subtitle;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $generatedAt;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $createdAt;

    public function __construct()
    {
        $this->generatedAt = new \DateTime();
        $this->createdAt   = new \DateTime();
    }

    public function getId(): ?int { return $this->id; }

    public function getLocale(): string { return $this->locale; }
    public function setLocale(string $locale): static { $this->locale = $locale; return $this; }

    public function getWeekOf(): \DateTimeInterface { return $this->weekOf; }
    public function setWeekOf(\DateTimeInterface $weekOf): static { $this->weekOf = $weekOf; return $this; }

    public function getTitle(): string { return $this->title; }
    public function setTitle(string $title): static { $this->title = $title; return $this; }

    public function getSubtitle(): string { return $this->subtitle; }
    public function setSubtitle(string $subtitle): static { $this->subtitle = $subtitle; return $this; }

    public function getGeneratedAt(): \DateTimeInterface { return $this->generatedAt; }
    public function setGeneratedAt(\DateTimeInterface $generatedAt): static { $this->generatedAt = $generatedAt; return $this; }

    public function toArray(): array
    {
        return [
            'title'       => $this->title,
            'subtitle'    => $this->subtitle,
            'weekOf'      => $this->weekOf->format('Y-m-d'),
            'generatedAt' => $this->generatedAt->format('Y-m-d H:i:s'),
        ];
    }
}