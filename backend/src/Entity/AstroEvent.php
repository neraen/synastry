<?php

namespace App\Entity;

use App\Repository\AstroEventRepository;
use App\Service\Astro\SkyEvent;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * A dated astrological event for the collective "Actu astro" feed.
 *
 * Global cache (not per user): one row per locale per astronomical event. The
 * astronomical facts (type/sign/degree/exactAt) are produced deterministically
 * by {@see SkyEvent}/SkyEventDetector; the collective prose (title/body) is
 * written once by the LLM and cached here. Per-user personalisation is applied
 * at read time and never stored.
 */
#[ORM\Entity(repositoryClass: AstroEventRepository::class)]
#[ORM\Table(name: 'astro_event')]
#[ORM\UniqueConstraint(name: 'locale_fingerprint_unique', columns: ['locale', 'fingerprint'])]
#[ORM\Index(name: 'idx_locale_month', columns: ['locale', 'month_key'])]
class AstroEvent
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 10)]
    private string $locale;

    #[ORM\Column(length: 40)]
    private string $type;

    #[ORM\Column(length: 20, nullable: true)]
    private ?string $planet = null;

    #[ORM\Column(length: 20, nullable: true)]
    private ?string $planet2 = null;

    #[ORM\Column(length: 20, nullable: true)]
    private ?string $aspectType = null;

    #[ORM\Column(length: 20, nullable: true)]
    private ?string $sign = null;

    #[ORM\Column(length: 20, nullable: true)]
    private ?string $signFr = null;

    #[ORM\Column(nullable: true)]
    private ?int $degree = null;

    #[ORM\Column(length: 20, nullable: true)]
    private ?string $sign2Fr = null;

    #[ORM\Column(nullable: true)]
    private ?int $degree2 = null;

    #[ORM\Column(type: Types::FLOAT, nullable: true)]
    private ?float $longitude = null;

    #[ORM\Column(type: Types::FLOAT, nullable: true)]
    private ?float $longitude2 = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $exactAt;

    /** 'YYYY-MM' bucket for fast monthly queries. */
    #[ORM\Column(length: 7)]
    private string $monthKey;

    #[ORM\Column(length: 32)]
    private string $fingerprint;

    /** @var array<string,mixed> */
    #[ORM\Column(type: Types::JSON)]
    private array $metadata = [];

    // ── Collective prose (LLM, written once, cached) ──────────────────────────

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $title = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $body = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $generatedAt = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    /** Build a row (astronomical facts only) from a detected SkyEvent. */
    public static function fromSkyEvent(SkyEvent $event, string $locale): self
    {
        $e = new self();
        $e->locale      = $locale;
        $e->type        = $event->type;
        $e->planet      = $event->planet;
        $e->planet2     = $event->planet2;
        $e->aspectType  = $event->aspectType;
        $e->sign        = $event->sign();
        $e->signFr      = $event->signFr();
        $e->degree      = $event->degreeInSign();
        $e->sign2Fr     = $event->signFr2();
        $e->degree2     = $event->degreeInSign2();
        $e->longitude   = $event->longitude;
        $e->longitude2  = $event->longitude2;
        $e->exactAt     = $event->exactAt;
        $e->monthKey    = $event->exactAt->format('Y-m');
        $e->fingerprint = $event->fingerprint();
        $e->metadata    = $event->metadata;
        return $e;
    }

    public function hasProse(): bool
    {
        return $this->title !== null && $this->body !== null;
    }

    /** @return array<string,mixed> */
    public function toArray(): array
    {
        return [
            'id'         => $this->id,
            'type'       => $this->type,
            'planet'     => $this->planet,
            'planet2'    => $this->planet2,
            'aspectType' => $this->aspectType,
            'sign'       => $this->sign,
            'signFr'     => $this->signFr,
            'degree'     => $this->degree,
            'sign2Fr'    => $this->sign2Fr,
            'degree2'    => $this->degree2,
            'longitude'  => $this->longitude,
            'longitude2' => $this->longitude2,
            'exactAt'    => $this->exactAt->format(\DateTimeInterface::ATOM),
            'monthKey'   => $this->monthKey,
            'metadata'   => $this->metadata,
            'title'      => $this->title,
            'body'       => $this->body,
        ];
    }

    public function getId(): ?int { return $this->id; }
    public function getLocale(): string { return $this->locale; }
    public function getType(): string { return $this->type; }
    public function getPlanet(): ?string { return $this->planet; }
    public function getPlanet2(): ?string { return $this->planet2; }
    public function getAspectType(): ?string { return $this->aspectType; }
    public function getSign(): ?string { return $this->sign; }
    public function getSignFr(): ?string { return $this->signFr; }
    public function getDegree(): ?int { return $this->degree; }
    public function getSign2Fr(): ?string { return $this->sign2Fr; }
    public function getDegree2(): ?int { return $this->degree2; }
    public function getLongitude(): ?float { return $this->longitude; }
    public function getLongitude2(): ?float { return $this->longitude2; }
    public function getExactAt(): \DateTimeImmutable { return $this->exactAt; }
    public function getMonthKey(): string { return $this->monthKey; }
    public function getFingerprint(): string { return $this->fingerprint; }
    public function getMetadata(): array { return $this->metadata; }
    public function getTitle(): ?string { return $this->title; }
    public function getBody(): ?string { return $this->body; }
    public function getGeneratedAt(): ?\DateTimeImmutable { return $this->generatedAt; }

    public function setTitle(?string $title): static { $this->title = $title; return $this; }
    public function setBody(?string $body): static { $this->body = $body; return $this; }
    public function setGeneratedAt(?\DateTimeImmutable $at): static { $this->generatedAt = $at; return $this; }
}
