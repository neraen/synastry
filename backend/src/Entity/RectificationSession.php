<?php

namespace App\Entity;

use App\Repository\RectificationSessionRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * The persisted state machine of the birth-time rectification wizard.
 *
 *   source_officielle → fenetre → collecte → calcul → resultat
 *                                    ↑                    ↓
 *                                    └── boucle_active ───┤
 *                                                         ↓
 *                                                     adoption
 *
 * Everything lives server-side and every answer is written as it is given —
 * there is no global submit. That is the whole reason this entity exists: the
 * spec requires the journey to be resumable at the exact step after the app is
 * closed, and a wizard whose state lives in component memory cannot be.
 *
 * One session per user, reused rather than replaced: "affiner" (spec §9.5) adds
 * events to the same collection and recalculates, so the event history is not
 * lost when someone returns a year later with one more date.
 */
#[ORM\Entity(repositoryClass: RectificationSessionRepository::class)]
#[ORM\Table(name: 'rectification_session')]
#[ORM\HasLifecycleCallbacks]
class RectificationSession
{
    public const STEP_OFFICIAL_SOURCE = 'source_officielle';
    public const STEP_WINDOW          = 'fenetre';
    public const STEP_COLLECTION      = 'collecte';
    public const STEP_CALCULATION     = 'calcul';
    public const STEP_RESULT          = 'resultat';
    public const STEP_ACTIVE_LOOP     = 'boucle_active';
    public const STEP_ADOPTION        = 'adoption';
    public const STEP_DONE            = 'termine';

    /** Outcomes of the "source officielle" screen (spec §3). */
    public const SOURCE_HAS_TIME  = 'has_time';
    public const SOURCE_REQUESTED = 'requested';
    public const SOURCE_IMPOSSIBLE = 'impossible';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\OneToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?User $user = null;

    #[ORM\Column(length: 30)]
    private string $step = self::STEP_OFFICIAL_SOURCE;

    #[ORM\Column(length: 20, nullable: true)]
    private ?string $officialSourceChoice = null;

    /**
     * Set when the user turns up with an actual birth time. The journey ends
     * there — a known time is always better than an inferred one, and the spec
     * makes that the first exit of the first screen rather than a fallback.
     */
    #[ORM\Column(type: Types::TIME_MUTABLE, nullable: true)]
    private ?\DateTimeInterface $knownTime = null;

    /** J+10 reminder for "j'ai fait la demande d'acte de naissance". */
    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $documentReminderAt = null;

    /** Last 48 h "il te manque X" nudge, so it is not sent twice. */
    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $lastNudgeAt = null;

    /**
     * Raw chip answers of the window step, kept verbatim.
     *
     * Stored as given rather than only as the derived bounds: if the mapping
     * from "la matinée" to an hour range is ever retuned, existing sessions can
     * be re-derived instead of asking everyone again.
     *
     * @var array<string, mixed>
     */
    #[ORM\Column(type: Types::JSON)]
    private array $windowAnswers = [];

    #[ORM\Column(type: Types::FLOAT, nullable: true)]
    private ?float $windowStartHour = null;

    #[ORM\Column(type: Types::FLOAT, nullable: true)]
    private ?float $windowEndHour = null;

    /**
     * Life events, as submitted.
     *
     * JSON rather than a child entity, following the precedent set by
     * ChatSession::$messages: they are only ever read as a whole block, always
     * belong to exactly one session, and are never queried across users. A
     * table would buy nothing and cost a join on every read.
     *
     * @var list<array<string, mixed>>
     */
    #[ORM\Column(type: Types::JSON)]
    private array $events = [];

    /**
     * Cached output of the last run: estimate, posterior curve, guard rails,
     * contributions. Recomputed on demand, kept so reopening the result screen
     * does not re-run a one-second inference.
     *
     * @var array<string, mixed>|null
     */
    #[ORM\Column(type: Types::JSON, nullable: true)]
    private ?array $lastResult = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $lastCalculatedAt = null;

    /**
     * Uncertainty currently shown on the precision dial, in minutes.
     *
     * Cached rather than derived on read: the dial appears in the header of
     * every collection screen, and recomputing a posterior over a 24 h window
     * costs about a second. It only ever changes when the events or the window
     * change, so it is refreshed there and read everywhere else.
     */
    #[ORM\Column(nullable: true)]
    private ?int $dialUncertaintyMinutes = null;

    /**
     * Window keys already put to the user by the active loop.
     *
     * Kept separately from the events because a question that was answered
     * "je ne sais plus" produces no event, yet must never be asked again —
     * re-asking would read as the app not listening.
     *
     * @var list<string>
     */
    #[ORM\Column(type: Types::JSON)]
    private array $askedQuestions = [];

    /**
     * The question currently on screen, if any.
     *
     * Persisted rather than regenerated on read: the selection is stochastic in
     * the sense that it depends on the posterior, and a user who backgrounds
     * the app mid-question must come back to the same one.
     *
     * @var array<string, mixed>|null
     */
    #[ORM\Column(type: Types::JSON, nullable: true)]
    private ?array $pendingQuestion = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $updatedAt;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = new \DateTimeImmutable();
    }

    #[ORM\PreUpdate]
    public function touch(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
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

    public function getStep(): string
    {
        return $this->step;
    }

    public function setStep(string $step): static
    {
        $this->step = $step;

        return $this;
    }

    public function getOfficialSourceChoice(): ?string
    {
        return $this->officialSourceChoice;
    }

    public function setOfficialSourceChoice(?string $choice): static
    {
        $this->officialSourceChoice = $choice;

        return $this;
    }

    public function getKnownTime(): ?\DateTimeInterface
    {
        return $this->knownTime;
    }

    public function setKnownTime(?\DateTimeInterface $time): static
    {
        $this->knownTime = $time;

        return $this;
    }

    public function getDocumentReminderAt(): ?\DateTimeImmutable
    {
        return $this->documentReminderAt;
    }

    public function setDocumentReminderAt(?\DateTimeImmutable $at): static
    {
        $this->documentReminderAt = $at;

        return $this;
    }

    public function getLastNudgeAt(): ?\DateTimeImmutable
    {
        return $this->lastNudgeAt;
    }

    public function setLastNudgeAt(?\DateTimeImmutable $at): static
    {
        $this->lastNudgeAt = $at;

        return $this;
    }

    /** @return array<string, mixed> */
    public function getWindowAnswers(): array
    {
        return $this->windowAnswers;
    }

    /** @param array<string, mixed> $answers */
    public function setWindowAnswers(array $answers): static
    {
        $this->windowAnswers = $answers;

        return $this;
    }

    public function getWindowStartHour(): ?float
    {
        return $this->windowStartHour;
    }

    public function getWindowEndHour(): ?float
    {
        return $this->windowEndHour;
    }

    public function setWindow(float $startHour, float $endHour): static
    {
        $this->windowStartHour = $startHour;
        $this->windowEndHour   = $endHour;

        return $this;
    }

    /** @return list<array<string, mixed>> */
    public function getEvents(): array
    {
        return $this->events;
    }

    /** @param array<string, mixed> $event */
    public function addEvent(array $event): static
    {
        $this->events[] = $event;

        return $this;
    }

    public function removeEventAt(int $index): static
    {
        unset($this->events[$index]);
        $this->events = array_values($this->events);

        return $this;
    }

    /** @param list<array<string, mixed>> $events */
    public function setEvents(array $events): static
    {
        $this->events = array_values($events);

        return $this;
    }

    /** Events the user has dated to the day — the scarce, valuable kind. */
    public function countDayDatedEvents(): int
    {
        return count(array_filter(
            $this->events,
            static fn (array $e): bool => ($e['precision'] ?? 'day') === 'day'
        ));
    }

    /** @return array<string, mixed>|null */
    public function getLastResult(): ?array
    {
        return $this->lastResult;
    }

    /** @param array<string, mixed>|null $result */
    public function setLastResult(?array $result): static
    {
        $this->lastResult      = $result;
        $this->lastCalculatedAt = $result === null ? null : new \DateTimeImmutable();

        return $this;
    }

    public function getLastCalculatedAt(): ?\DateTimeImmutable
    {
        return $this->lastCalculatedAt;
    }

    public function getDialUncertaintyMinutes(): ?int
    {
        return $this->dialUncertaintyMinutes;
    }

    public function setDialUncertaintyMinutes(?int $minutes): static
    {
        $this->dialUncertaintyMinutes = $minutes;

        return $this;
    }

    /** @return list<string> */
    public function getAskedQuestions(): array
    {
        return $this->askedQuestions;
    }

    public function markQuestionAsked(string $key): static
    {
        if (!in_array($key, $this->askedQuestions, true)) {
            $this->askedQuestions[] = $key;
        }

        return $this;
    }

    /** @return array<string, mixed>|null */
    public function getPendingQuestion(): ?array
    {
        return $this->pendingQuestion;
    }

    /** @param array<string, mixed>|null $question */
    public function setPendingQuestion(?array $question): static
    {
        $this->pendingQuestion = $question;

        return $this;
    }

    /**
     * The cached result is stale as soon as the event list changes — otherwise
     * "affiner" would show the old estimate next to the new events.
     */
    public function invalidateResult(): static
    {
        $this->lastResult       = null;
        $this->lastCalculatedAt = null;

        return $this;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getUpdatedAt(): \DateTimeImmutable
    {
        return $this->updatedAt;
    }
}
