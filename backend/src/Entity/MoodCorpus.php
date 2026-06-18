<?php

namespace App\Entity;

use App\Repository\MoodCorpusRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * Pre-generated "humeur du jour" corpus.
 *
 * Global cache: one short paragraph per (locale × Moon sign × Moon phase),
 * written once by the LLM and cached. At read time the app does a pure
 * deterministic lookup on today's Moon sign + phase — no LLM, near-free.
 *
 * 8 phases × 12 signs = 96 rows per locale. This is deliberately NOT a flagship
 * feature: a light mood touch, never sold as a prediction.
 */
#[ORM\Entity(repositoryClass: MoodCorpusRepository::class)]
#[ORM\Table(name: 'mood_corpus')]
#[ORM\UniqueConstraint(name: 'locale_sign_phase_unique', columns: ['locale', 'moon_sign_index', 'moon_phase'])]
class MoodCorpus
{
    /** Canonical 8-phase taxonomy (index = eighth of the lunar cycle). */
    public const PHASES = [
        'new',             // 0
        'waxing_crescent', // 1
        'first_quarter',   // 2
        'waxing_gibbous',  // 3
        'full',            // 4
        'waning_gibbous',  // 5
        'last_quarter',    // 6
        'balsamic',        // 7
    ];

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 10)]
    private string $locale;

    /** 0..11 (Aries..Pisces). */
    #[ORM\Column]
    private int $moonSignIndex;

    /** One of self::PHASES. */
    #[ORM\Column(length: 20)]
    private string $moonPhase;

    #[ORM\Column(length: 40, nullable: true)]
    private ?string $tone = null;

    #[ORM\Column(type: Types::TEXT)]
    private string $text;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $generatedAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->generatedAt = new \DateTimeImmutable();
        $this->createdAt   = new \DateTimeImmutable();
    }

    /** @return array<string,mixed> */
    public function toArray(): array
    {
        return [
            'moonSignIndex' => $this->moonSignIndex,
            'moonPhase'     => $this->moonPhase,
            'tone'          => $this->tone,
            'text'          => $this->text,
        ];
    }

    public function getId(): ?int { return $this->id; }
    public function getLocale(): string { return $this->locale; }
    public function setLocale(string $locale): static { $this->locale = $locale; return $this; }
    public function getMoonSignIndex(): int { return $this->moonSignIndex; }
    public function setMoonSignIndex(int $i): static { $this->moonSignIndex = $i; return $this; }
    public function getMoonPhase(): string { return $this->moonPhase; }
    public function setMoonPhase(string $p): static { $this->moonPhase = $p; return $this; }
    public function getTone(): ?string { return $this->tone; }
    public function setTone(?string $t): static { $this->tone = $t; return $this; }
    public function getText(): string { return $this->text; }
    public function setText(string $t): static { $this->text = $t; return $this; }
    public function setGeneratedAt(\DateTimeImmutable $at): static { $this->generatedAt = $at; return $this; }
}
