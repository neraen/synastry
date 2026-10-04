<?php

namespace App\Service\Rectification;

use App\Entity\BirthProfile;
use App\Entity\RectificationSession;
use App\Entity\User;
use App\Repository\RectificationSessionRepository;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Everything between the wizard's HTTP surface and the inference engine.
 *
 * The controller stays thin on purpose: this is where the state machine's
 * transitions and the translation from
 * stored chip answers into engine inputs all live, so they can be tested
 * without a request.
 */
class RectificationSessionService
{
    private readonly ActiveLoop $activeLoop;

    public function __construct(
        private readonly RectificationSessionRepository $sessions,
        private readonly EntityManagerInterface $em,
        private readonly RectificationEngine $engine,
    ) {
        $this->activeLoop = new ActiveLoop($this->engine);
    }

    /**
     * The user's session, created on first access.
     *
     * Creating rather than 404-ing means the app can open the wizard with a
     * single call and always get a valid step to render.
     */
    public function sessionFor(User $user): RectificationSession
    {
        $session = $this->sessions->findForUser($user);

        if ($session === null) {
            $session = (new RectificationSession())->setUser($user);
            $this->sessions->save($session, flush: true);
        }

        return $session;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Step 1 — source officielle (spec §3)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @param string      $choice one of RectificationSession::SOURCE_*
     * @param string|null $time   'HH:MM', required when the user has their time
     */
    public function recordOfficialSource(RectificationSession $session, string $choice, ?string $time = null): RectificationSession
    {
        switch ($choice) {
            case RectificationSession::SOURCE_HAS_TIME:
                if ($time === null || !preg_match('/^\d{2}:\d{2}$/', $time)) {
                    throw new \InvalidArgumentException('Heure de naissance attendue au format HH:MM.');
                }

                // A known time ends the journey: there is nothing to infer.
                $session
                    ->setKnownTime(\DateTime::createFromFormat('H:i', $time))
                    ->setDocumentReminderAt(null)
                    ->setStep(RectificationSession::STEP_DONE);

                $profile = $session->getUser()?->getBirthProfile();
                if ($profile !== null) {
                    $profile->setBirthTime(\DateTime::createFromFormat('H:i', $time));
                }
                break;

            case RectificationSession::SOURCE_REQUESTED:
                // "Ton acte devrait être arrivé — tu as trouvé l'heure ?"
                $session
                    ->setDocumentReminderAt(new \DateTimeImmutable('+10 days'))
                    ->setStep(RectificationSession::STEP_WINDOW);
                break;

            case RectificationSession::SOURCE_IMPOSSIBLE:
                $session->setStep(RectificationSession::STEP_WINDOW);
                break;

            default:
                throw new \InvalidArgumentException("Choix de source inconnu : $choice");
        }

        $session->setOfficialSourceChoice($choice);
        $this->em->flush();

        return $session;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Step 2 — fenêtre (spec §4)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Local-hour ranges behind each memory chip.
     *
     * Generous on purpose. These bound the search, and a window that excludes
     * the true time makes every later step meaningless — whereas a window
     * that is too wide only costs computation. "Aucune idée" everywhere gives
     * the full 24 h, which the spec keeps as a valid case rather than a dead
     * end.
     */
    private const MEMORY_WINDOWS = [
        'matin_tot'      => [4.0, 8.0],
        'matinee'        => [7.0, 12.0],
        'apres_midi'     => [12.0, 18.0],
        'soiree'         => [17.0, 23.0],
        'nuit'           => [22.0, 5.0],
        'autour_minuit'  => [22.0, 2.0],
        'aucune_idee'    => [0.0, 24.0],
    ];

    private const DAY_NIGHT_WINDOWS = [
        'jour'        => [6.0, 20.0],
        'nuit'        => [20.0, 6.0],
        'aucune_idee' => [0.0, 24.0],
    ];

    /**
     * @param array{day_night?: string, memory?: string, memory_note?: string, date_certain?: bool} $answers
     */
    public function recordWindow(RectificationSession $session, array $answers): RectificationSession
    {
        $memory   = $answers['memory'] ?? 'aucune_idee';
        $dayNight = $answers['day_night'] ?? 'aucune_idee';

        // The specific memory wins when there is one; the day/night answer is
        // only a fallback, since "la matinée" already implies daytime.
        [$start, $end] = self::MEMORY_WINDOWS[$memory]
            ?? self::DAY_NIGHT_WINDOWS[$dayNight]
            ?? [0.0, 24.0];

        if ($memory === 'aucune_idee' && isset(self::DAY_NIGHT_WINDOWS[$dayNight])) {
            [$start, $end] = self::DAY_NIGHT_WINDOWS[$dayNight];
        }

        $session
            ->setWindowAnswers($answers)
            ->setWindow($start, $end)
            ->setStep(RectificationSession::STEP_COLLECTION)
            ->invalidateResult();

        // Narrowing the window tightens the dial even before any event is in.
        $this->refreshDial($session);
        $this->em->flush();

        return $session;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Step 3 — collecte (spec §5)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Add an event.
     *
     * The date precision is *derived* from which fields the user filled, never
     * declared by them — spec §5.2 is explicit that no toggle should ask the
     * user to classify their own memory.
     *
     * @param array{year: int, month?: int|null, day?: int|null, intensity?: string, sudden?: bool, valence?: string|null, category?: string|null, title?: string|null} $input
     */
    public function addEvent(RectificationSession $session, array $input): RectificationSession
    {
        $session->addEvent($this->normaliseEvent($input))->invalidateResult();

        // This is the moment the dial visibly tightens — the motor of the
        // whole collection step (spec §6).
        $this->refreshDial($session);
        $this->em->flush();

        return $session;
    }

    public function removeEvent(RectificationSession $session, int $index): RectificationSession
    {
        $session->removeEventAt($index)->invalidateResult();
        $this->refreshDial($session);
        $this->em->flush();

        return $session;
    }

    /**
     * @param array<string, mixed> $input
     *
     * @return array<string, mixed>
     */
    private function normaliseEvent(array $input): array
    {
        $year  = (int) $input['year'];
        $month = isset($input['month']) && $input['month'] !== null ? (int) $input['month'] : null;
        $day   = isset($input['day']) && $input['day'] !== null ? (int) $input['day'] : null;

        // Derived, not declared: year+month+day = day precision, and each
        // "je ne sais plus" up the cascade widens it one notch.
        $precision = match (true) {
            $day !== null   => LifeEvent::PRECISION_DAY,
            $month !== null => LifeEvent::PRECISION_MONTH,
            default         => LifeEvent::PRECISION_YEAR,
        };

        // The stored date is the midpoint of what the user actually knows, so
        // the convolution is centred on their memory rather than on the 1st.
        $date = match ($precision) {
            LifeEvent::PRECISION_DAY   => sprintf('%04d-%02d-%02d', $year, $month, $day),
            LifeEvent::PRECISION_MONTH => sprintf('%04d-%02d-15', $year, $month),
            default                    => sprintf('%04d-07-02', $year),
        };

        return [
            'date'      => $date,
            'precision' => $precision,
            'intensity' => $input['intensity'] ?? LifeEvent::INTENSITY_TURNING_POINT,
            'sudden'    => (bool) ($input['sudden'] ?? true),
            'valence'   => $input['valence'] ?? null,
            'category'  => $input['category'] ?? null,
            'title'     => $input['title'] ?? null,
            'added_at'  => (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM),
        ];
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Step 4 — calcul (spec §7)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Run the inference and cache its output on the session.
     *
     * @throws \DomainException 'no_birth_profile' | 'threshold_not_met'
     */
    public function calculate(RectificationSession $session): array
    {
        return $this->runAndStore($session)[1];
    }

    /**
     * Run the engine once, store everything that derives from it, and hand both
     * the live result and the client payload back.
     *
     * @return array{0: RectificationResult, 1: array<string, mixed>}
     */
    private function runAndStore(RectificationSession $session): array
    {
        $profile = $session->getUser()?->getBirthProfile();

        if ($profile === null || $profile->getBirthDate() === null) {
            throw new \DomainException('no_birth_profile');
        }

        $events = $this->toDomainEvents($session->getEvents());

        if (count($events) < RectificationConfig::MIN_EVENTS
            || $session->countDayDatedEvents() < RectificationConfig::MIN_DAY_DATED_EVENTS) {
            throw new \DomainException('threshold_not_met');
        }

        $result = $this->engine->run($this->toWindow($session, $profile), $events);

        $payload = $this->serialiseResult($result);

        $session
            ->setLastResult($payload)
            // The dial reads off this run rather than triggering its own: a
            // second full posterior purely to recover a number we already hold
            // was costing seconds on every answer of the active loop.
            ->setDialUncertaintyMinutes($result->posterior->uncertaintyMinutes())
            ->setStep(RectificationSession::STEP_RESULT);

        $this->em->flush();

        return [$result, $payload];
    }

    /**
     * Recompute the precision dial (spec §6).
     *
     * Called only when the inputs change — adding an event, removing one,
     * narrowing the window — because that is the only time the dial can move,
     * and a posterior over a 24 h window costs about a second.
     *
     * Below the calculation threshold this is explicitly a *preview*: the guard
     * rails are not applied and the number is only ever rendered as an
     * uncertainty on the dial, never as an estimate.
     */
    private function refreshDial(RectificationSession $session): void
    {
        $profile = $session->getUser()?->getBirthProfile();
        $events  = $session->getEvents();

        if ($events === [] || $profile === null || $profile->getBirthDate() === null) {
            $session->setDialUncertaintyMinutes(null);

            return;
        }

        $posterior = $this->engine
            ->run($this->toWindow($session, $profile), $this->toDomainEvents($events))
            ->posterior;

        $session->setDialUncertaintyMinutes($posterior->uncertaintyMinutes());
    }

    /**
     * The dial as the header renders it: current uncertainty, how many events
     * are in, and precisely what is still missing.
     *
     * @return array{uncertainty_minutes: int|null, events: int, day_dated: int, missing: list<string>, ready: bool}
     */
    public function dialState(RectificationSession $session): array
    {
        $events   = $session->getEvents();
        $dayDated = $session->countDayDatedEvents();

        $missing = [];
        if (count($events) < RectificationConfig::MIN_EVENTS) {
            $need      = RectificationConfig::MIN_EVENTS - count($events);
            $missing[] = sprintf('Il te manque %d événement%s pour lancer le calcul', $need, $need > 1 ? 's' : '');
        }
        if ($dayDated < RectificationConfig::MIN_DAY_DATED_EVENTS) {
            $need      = RectificationConfig::MIN_DAY_DATED_EVENTS - $dayDated;
            $missing[] = sprintf('%d événement%s daté%s au jour près', $need, $need > 1 ? 's' : '', $need > 1 ? 's' : '');
        }

        return [
            'uncertainty_minutes' => $session->getDialUncertaintyMinutes(),
            'events'              => count($events),
            'day_dated'           => $dayDated,
            'missing'             => $missing,
            'ready'               => $missing === [],
        ];
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Step 5 — boucle active (spec §8)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Generate and store the next discriminating question, if one is worth
     * asking.
     *
     * Returns null when the loop should stop — enough questions asked, tight enough already, or
     * nothing left that would separate the surviving candidates.
     *
     * @return array<string, mixed>|null
     */
    public function nextQuestion(
        RectificationSession $session,
        ?RectificationResult $result = null,
    ): ?array {
        // A question already on screen is returned as-is: someone who
        // backgrounds the app mid-question comes back to the same one.
        if ($session->getPendingQuestion() !== null) {
            return $session->getPendingQuestion();
        }

        // Callers that have just run the engine hand their result in — a second
        // full posterior here doubled the wait on every answer.
        $result ??= $this->recompute($session);

        $question = $this->activeLoop->nextQuestion($result, $session->getAskedQuestions());

        $session->setPendingQuestion($question);
        if ($question !== null) {
            $session->setStep(RectificationSession::STEP_ACTIVE_LOOP);
        }

        $this->em->flush();

        return $question;
    }

    /**
     * Record an answer and fold it back into the posterior.
     *
     * "Rien de spécial" produces a pseudo-event marked absent, which penalises
     * the candidate that predicted a contact there — that is the whole point of
     * asking. "Je ne sais plus" produces nothing at all, but the window is
     * still marked asked so it never comes back.
     */
    public function answerQuestion(RectificationSession $session, string $answer): array
    {
        $question = $session->getPendingQuestion();

        if ($question === null) {
            throw new \DomainException('no_pending_question');
        }

        $pseudoEvent = $this->activeLoop->answerToPseudoEvent($question, $answer);

        if ($pseudoEvent !== null) {
            $session->addEvent($pseudoEvent);
        }

        $session
            ->markQuestionAsked($question['key'])
            ->setPendingQuestion(null)
            ->invalidateResult();

        // One engine run for the whole answer: it updates the dial, produces
        // the payload, and feeds the search for the next question.
        [$result, $payload] = $this->runAndStore($session);

        // Chain straight into the next question while one is worth asking.
        $this->nextQuestion($session, $result);

        return $payload;
    }

    /**
     * Re-run the engine without touching the stored result.
     *
     * The active loop needs the live {@see RectificationResult} object — modes,
     * candidates, posterior — not the flattened JSON the client receives.
     */
    private function recompute(RectificationSession $session): RectificationResult
    {
        $profile = $session->getUser()?->getBirthProfile();

        if ($profile === null || $profile->getBirthDate() === null) {
            throw new \DomainException('no_birth_profile');
        }

        return $this->engine->run(
            $this->toWindow($session, $profile),
            $this->toDomainEvents($session->getEvents()),
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Step 6 — adoption (spec §9.5)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @throws \DomainException 'not_conclusive' | 'no_result' | 'no_birth_profile'
     */
    public function adopt(RectificationSession $session): BirthProfile
    {
        $result = $session->getLastResult();

        if ($result === null) {
            throw new \DomainException('no_result');
        }

        // An inconclusive run must not become someone's birth time.
        if ($result['status'] !== RectificationResult::STATUS_CONCLUSIVE) {
            throw new \DomainException('not_conclusive');
        }

        $profile = $session->getUser()?->getBirthProfile();
        if ($profile === null) {
            throw new \DomainException('no_birth_profile');
        }

        $profile->adoptRectifiedTime(
            \DateTime::createFromFormat('H:i', $result['estimate']['time']),
            (int) $result['estimate']['uncertainty_minutes'],
        );

        $session->setStep(RectificationSession::STEP_DONE);
        $this->em->flush();

        return $profile;
    }

    /** Back to a manually entered time, at any point (spec §9.5). */
    public function revertToDeclaredTime(User $user, ?string $time): ?BirthProfile
    {
        $profile = $user->getBirthProfile();
        if ($profile === null) {
            return null;
        }

        $profile->setBirthTime($time === null ? null : \DateTime::createFromFormat('H:i', $time));
        $this->em->flush();

        return $profile;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Mapping
    // ─────────────────────────────────────────────────────────────────────────

    private function toWindow(RectificationSession $session, BirthProfile $profile): BirthWindow
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
     * Shape the result for the client.
     *
     * @return array<string, mixed>
     */
    private function serialiseResult(RectificationResult $result): array
    {
        $posterior = $result->posterior;

        $payload = [
            'status'       => $result->status(),
            'coherence'    => $result->coherenceScore(),
            'contrast'     => round($posterior->contrast(), 1),
            'entropy'      => round($posterior->normalisedEntropy(), 4),
            'curve'        => $this->curve($posterior),
            'what_would_help' => $result->whatWouldHelp(),
            'calculated_at' => (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM),
        ];

        $payload['estimate']        = $result->estimate();
        $payload['candidate_times'] = $result->candidateTimes();
        $payload['contributions']   = $this->explainContributions($result);
        $payload['hold_out']        = $result->holdOutDetail();

        return $payload;
    }

    /**
     * The posterior, downsampled to something a phone can draw.
     *
     * @return list<array{t: string, p: float}>
     */
    private function curve(PosteriorDistribution $posterior, int $points = 96): array
    {
        $size  = $posterior->size();
        $curve = [];

        for ($column = 0; $column < $points; ++$column) {
            $from = (int) floor($column * $size / $points);
            $to   = max($from + 1, (int) floor(($column + 1) * $size / $points));

            $peak  = 0.0;
            $index = $from;
            for ($i = $from; $i < $to && $i < $size; ++$i) {
                if ($posterior->probabilities[$i] > $peak) {
                    $peak  = $posterior->probabilities[$i];
                    $index = $i;
                }
            }

            $curve[] = [
                't' => $posterior->candidates[$index]->local->format('H:i'),
                'p' => round($peak, 6),
            ];
        }

        return $curve;
    }

    /**
     * "Pourquoi cette heure" (spec §9.2), in plain language.
     *
     * @return list<array{event: string, text: string, orb: float}>
     */
    private function explainContributions(RectificationResult $result): array
    {
        $time = $result->estimate()['time'];

        return array_map(
            static function (array $c) use ($time): array {
                $moving = str_starts_with($c['moving'], 'T:')
                    ? substr($c['moving'], 2)
                    : substr($c['moving'], 3);

                $target = match ($c['target']) {
                    'Ascendant' => 'ton Ascendant',
                    'Midheaven' => 'ton Milieu du Ciel',
                    default     => 'ton ' . $c['target'],
                };

                return [
                    'event' => $c['event']->label(),
                    'orb'   => round($c['orb'], 2),
                    'text'  => sprintf(
                        '%s — si tu es né·e à %s, %s était à %s° de %s ce jour-là.',
                        $c['event']->label(),
                        $time,
                        \App\Service\PlanetaryCalculator::PLANETS_FR[$moving] ?? $moving,
                        // Two decimals and a French comma: at one decimal every
                        // tight hit collapses to "0.0°", which reads as a
                        // rounding artefact rather than as a precise contact.
                        number_format($c['orb'], 2, ',', ' '),
                        $target,
                    ),
                ];
            },
            array_slice($result->contributions, 0, 5)
        );
    }
}
