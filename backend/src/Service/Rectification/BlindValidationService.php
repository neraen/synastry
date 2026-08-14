<?php

namespace App\Service\Rectification;

use App\Entity\BlindValidation;
use App\Entity\RectificationSession;
use App\Entity\User;
use App\Repository\BlindValidationRepository;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Blind validation (spec §10) — the only honest accuracy measurement the
 * product has.
 *
 * A user who already knows their birth time gives us their life events, the
 * engine estimates the time without ever seeing the answer, and the gap is
 * revealed. That gap is what calibrates every precision claim in the UI, and it
 * is the corpus the technique weights will eventually be fitted on.
 *
 * The blindness is structural rather than promised. {@see run()} takes no birth
 * time: it builds the search window from the wizard's own answers and the
 * profile's date and place, calls the engine, and only *afterwards* reads the
 * known time to subtract. There is no code path where the truth could reach the
 * inference, which is the only form of this guarantee worth having.
 */
class BlindValidationService
{
    public function __construct(
        private readonly BlindValidationRepository $validations,
        private readonly EntityManagerInterface $em,
        private readonly RectificationEngine $engine,
    ) {
    }

    /**
     * Run the engine blind against a session whose owner knows their real time.
     *
     * @throws \DomainException 'no_known_time' | 'no_birth_profile' | 'threshold_not_met'
     */
    public function run(RectificationSession $session): BlindValidation
    {
        $user    = $session->getUser();
        $profile = $user?->getBirthProfile();

        if ($profile === null || $profile->getBirthDate() === null) {
            throw new \DomainException('no_birth_profile');
        }

        // The truth is read here only to be *stored* and, at the very end,
        // subtracted. It is never passed to anything below.
        $knownTime = $session->getKnownTime() ?? $profile->getBirthTime();

        if ($knownTime === null || $profile->isBirthTimeRectified()) {
            // A rectified time is this engine's own output. Scoring against it
            // would measure nothing but the engine's agreement with itself.
            throw new \DomainException('no_known_time');
        }

        $events = $this->toDomainEvents($session->getEvents());

        if (count($events) < RectificationConfig::MIN_EVENTS
            || $session->countDayDatedEvents() < RectificationConfig::MIN_DAY_DATED_EVENTS) {
            throw new \DomainException('threshold_not_met');
        }

        $window = $this->blindWindow($session, $profile);
        $result = $this->engine->run($window, $events);

        $validation = (new BlindValidation())
            ->setUser($user)
            ->setKnownTime($knownTime)
            ->setStatus($result->status())
            ->setCoherence($result->coherenceScore())
            ->setEventCount(count($events))
            ->setDayDatedCount($session->countDayDatedEvents())
            ->setWindowHours(round($window->durationMinutes() / 60, 2));

        // Only a conclusive run has an estimate to be scored. A multimodal or
        // inconclusive one is recorded with a null error — it is a refusal, not
        // a wrong answer, and the metrics keep the two apart.
        if ($result->status() === \App\Service\Rectification\RectificationResult::STATUS_CONCLUSIVE) {
            $estimate      = $result->estimate();
            $estimatedTime = \DateTime::createFromFormat('H:i', $estimate['time']);

            $validation
                ->setEstimatedTime($estimatedTime)
                ->setUncertaintyMinutes($estimate['uncertainty_minutes'])
                ->setErrorMinutes(BlindValidation::clockDistanceMinutes($knownTime, $estimatedTime));
        }

        $this->validations->save($validation, flush: true);

        return $validation;
    }

    /**
     * Whether this user can take the blind test at all.
     *
     * @return array{eligible: bool, reason: string|null, known_time: string|null}
     */
    public function eligibility(User $user, ?RectificationSession $session): array
    {
        $profile   = $user->getBirthProfile();
        $knownTime = $session?->getKnownTime() ?? $profile?->getBirthTime();

        if ($profile === null || $profile->getBirthDate() === null) {
            return ['eligible' => false, 'reason' => 'no_birth_profile', 'known_time' => null];
        }

        if ($knownTime === null || $profile->isBirthTimeRectified()) {
            return ['eligible' => false, 'reason' => 'no_known_time', 'known_time' => null];
        }

        $events   = $session?->getEvents() ?? [];
        $dayDated = $session?->countDayDatedEvents() ?? 0;

        if (count($events) < RectificationConfig::MIN_EVENTS
            || $dayDated < RectificationConfig::MIN_DAY_DATED_EVENTS) {
            return ['eligible' => false, 'reason' => 'threshold_not_met', 'known_time' => $knownTime->format('H:i')];
        }

        return ['eligible' => true, 'reason' => null, 'known_time' => $knownTime->format('H:i')];
    }

    /**
     * The search window for a blind run.
     *
     * Uses the wizard's own answers when the user gave them, and the full day
     * otherwise. Critically it does *not* narrow around the known time: a
     * window centred on the answer would flatter the engine and produce an
     * accuracy figure that evaporates in production.
     */
    private function blindWindow(RectificationSession $session, \App\Entity\BirthProfile $profile): BirthWindow
    {
        return BirthWindow::fromLocalHours(
            $profile->getBirthDate()->format('Y-m-d'),
            $session->getWindowStartHour() ?? 0.0,
            $session->getWindowEndHour() ?? 24.0,
            (float) ($profile->getTimezone() ?? 0.0),
            (float) $profile->getLatitude(),
            (float) $profile->getLongitude(),
        );
    }

    /**
     * @param list<array<string, mixed>> $stored
     *
     * @return list<LifeEvent>
     */
    private function toDomainEvents(array $stored): array
    {
        return array_map(
            static fn (array $e): LifeEvent => new LifeEvent(
                date: new \DateTimeImmutable($e['date'], new \DateTimeZone('UTC')),
                precision: $e['precision'] ?? LifeEvent::PRECISION_DAY,
                intensity: $e['intensity'] ?? LifeEvent::INTENSITY_TURNING_POINT,
                sudden: (bool) ($e['sudden'] ?? true),
                valence: $e['valence'] ?? null,
                category: $e['category'] ?? null,
                title: $e['title'] ?? null,
                expectation: $e['expectation'] ?? LifeEvent::EXPECTATION_OCCURRED,
                pseudo: (bool) ($e['pseudo'] ?? false),
            ),
            $stored
        );
    }

    /**
     * Aggregate metrics for the admin dashboard.
     *
     * @return array{overall: array<string, mixed>, segments: array<string, array<string, mixed>>, recent: list<array<string, mixed>>}
     */
    public function metrics(): array
    {
        $all = $this->validations->findAllForMetrics();

        return [
            'overall'  => BlindValidationRepository::summarise($all),
            'segments' => BlindValidationRepository::segment($all),
            'recent'   => array_map(
                static fn (BlindValidation $v): array => $v->toArray(),
                array_slice($all, 0, 25)
            ),
        ];
    }
}
