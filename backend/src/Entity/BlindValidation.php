<?php

namespace App\Entity;

use App\Repository\BlindValidationRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * One blind test of the rectification engine against a known birth time
 * (spec §10).
 *
 * The point of the feature is that this is the only honest accuracy number the
 * product has. Everything else — coherence, contrast, the width of the credible
 * interval — measures the model's opinion of itself. This measures whether it
 * was right.
 *
 * `errorMinutes` is therefore the column the whole feature exists to fill, and
 * the segmentation columns next to it (`eventCount`, `dayDatedCount`,
 * `windowHours`) are what make it actionable: "±22 min median" means nothing
 * without "with eight events, three of them dated to the day".
 */
#[ORM\Entity(repositoryClass: BlindValidationRepository::class)]
#[ORM\Table(name: 'blind_validation')]
#[ORM\Index(name: 'idx_blind_created', columns: ['created_at'])]
#[ORM\Index(name: 'idx_blind_segment', columns: ['event_count', 'day_dated_count'])]
class BlindValidation
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?User $user = null;

    /**
     * The truth, snapshotted at the moment of the test.
     *
     * Stored so the measurement stays reproducible even if the user later edits
     * their profile — a corpus whose ground truth can silently change is not a
     * corpus.
     */
    #[ORM\Column(type: Types::TIME_MUTABLE)]
    private ?\DateTimeInterface $knownTime = null;

    /** Null when the run came out inconclusive: there was no estimate to score. */
    #[ORM\Column(type: Types::TIME_MUTABLE, nullable: true)]
    private ?\DateTimeInterface $estimatedTime = null;

    /**
     * Absolute error in minutes, wrapped over the 24 h clock.
     *
     * Null for an inconclusive run. That distinction matters when reading the
     * metrics: an engine that refuses often but is accurate when it answers is
     * a different product from one that always answers and is often wrong, and
     * averaging the two together would hide it.
     */
    #[ORM\Column(nullable: true)]
    private ?int $errorMinutes = null;

    #[ORM\Column(length: 20)]
    private string $status = 'inconclusive';

    #[ORM\Column]
    private int $coherence = 0;

    /** Half-width of the credible interval the engine reported. */
    #[ORM\Column(nullable: true)]
    private ?int $uncertaintyMinutes = null;

    #[ORM\Column]
    private int $eventCount = 0;

    #[ORM\Column]
    private int $dayDatedCount = 0;

    /** Width of the search window in hours — 24 when the user had no idea. */
    #[ORM\Column(type: Types::FLOAT)]
    private float $windowHours = 24.0;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    /**
     * Signed distance between two clock times, in minutes, taking the shorter
     * way round midnight.
     *
     * Without the wrap, an estimate of 23:55 against a truth of 00:05 would
     * score as a 1430-minute miss instead of a ten-minute one, and a handful of
     * near-midnight births would wreck the median.
     */
    public static function clockDistanceMinutes(\DateTimeInterface $a, \DateTimeInterface $b): int
    {
        $minutesA = (int) $a->format('G') * 60 + (int) $a->format('i');
        $minutesB = (int) $b->format('G') * 60 + (int) $b->format('i');

        $delta = abs($minutesA - $minutesB);

        return (int) min($delta, 1440 - $delta);
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getUser(): ?User
    {
        return $this->user;
    }

    public function setUser(User $user): static
    {
        $this->user = $user;

        return $this;
    }

    public function getKnownTime(): ?\DateTimeInterface
    {
        return $this->knownTime;
    }

    public function setKnownTime(\DateTimeInterface $time): static
    {
        $this->knownTime = $time;

        return $this;
    }

    public function getEstimatedTime(): ?\DateTimeInterface
    {
        return $this->estimatedTime;
    }

    public function setEstimatedTime(?\DateTimeInterface $time): static
    {
        $this->estimatedTime = $time;

        return $this;
    }

    public function getErrorMinutes(): ?int
    {
        return $this->errorMinutes;
    }

    public function setErrorMinutes(?int $minutes): static
    {
        $this->errorMinutes = $minutes;

        return $this;
    }

    public function getStatus(): string
    {
        return $this->status;
    }

    public function setStatus(string $status): static
    {
        $this->status = $status;

        return $this;
    }

    public function getCoherence(): int
    {
        return $this->coherence;
    }

    public function setCoherence(int $coherence): static
    {
        $this->coherence = $coherence;

        return $this;
    }

    public function getUncertaintyMinutes(): ?int
    {
        return $this->uncertaintyMinutes;
    }

    public function setUncertaintyMinutes(?int $minutes): static
    {
        $this->uncertaintyMinutes = $minutes;

        return $this;
    }

    public function getEventCount(): int
    {
        return $this->eventCount;
    }

    public function setEventCount(int $count): static
    {
        $this->eventCount = $count;

        return $this;
    }

    public function getDayDatedCount(): int
    {
        return $this->dayDatedCount;
    }

    public function setDayDatedCount(int $count): static
    {
        $this->dayDatedCount = $count;

        return $this;
    }

    public function getWindowHours(): float
    {
        return $this->windowHours;
    }

    public function setWindowHours(float $hours): static
    {
        $this->windowHours = $hours;

        return $this;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'id'                  => $this->id,
            'known_time'          => $this->knownTime?->format('H:i'),
            'estimated_time'      => $this->estimatedTime?->format('H:i'),
            'error_minutes'       => $this->errorMinutes,
            'status'              => $this->status,
            'coherence'           => $this->coherence,
            'uncertainty_minutes' => $this->uncertaintyMinutes,
            'event_count'         => $this->eventCount,
            'day_dated_count'     => $this->dayDatedCount,
            'window_hours'        => $this->windowHours,
            'created_at'          => $this->createdAt->format(\DateTimeInterface::ATOM),
        ];
    }
}
