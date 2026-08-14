<?php

namespace App\Tests\Service\Rectification;

use App\Service\Rectification\BirthWindow;
use App\Service\Rectification\Candidate;
use App\Service\Rectification\Ephemeris;
use App\Service\Rectification\LifeEvent;
use App\Service\Rectification\NatalContext;
use App\Service\Rectification\RectificationConfig;
use App\Service\Rectification\RectificationEngine;
use App\Service\Rectification\RectificationResult;
use App\Service\Rectification\Technique\SlowTransitTechnique;
use App\Service\Rectification\Technique\SolarArcTechnique;
use App\Tests\Service\Rectification\Fixtures\RectificationFixtures;
use PHPUnit\Framework\TestCase;

/**
 * The inference itself.
 *
 * Two tests here matter more than the rest, and they are a pair:
 *
 *   - {@see testRecoversAnInjectedBirthTime} shows the engine finds the answer
 *     when the answer is there;
 *   - {@see testRejectsMeaninglessInput} shows it says so when it is not.
 *
 * The second is the one that protects users. A rectification engine that always
 * returns a confident time is worse than useless, and — as that test documents
 * — the posterior peaks sharply even on randomly dated events. Sharpness is not
 * evidence. The hold-out score is.
 */
class RectificationEngineTest extends TestCase
{
    /**
     * The engine must find the time it was given, when the events genuinely
     * encode it.
     *
     * The events are synthesised from the true chart, so this measures whether
     * the estimator can invert its own forward model — not real-world accuracy,
     * which is what the level-3 blind corpus is for. It would catch a sign
     * error, a wrong local-to-UTC conversion, or a grid built off the wrong
     * date, all of which would leave the estimate somewhere else entirely.
     */
    public function testRecoversAnInjectedBirthTime(): void
    {
        $profile = RectificationFixtures::level1Angles()['paris_summer_time'];
        $window  = $this->fullDayWindow($profile);

        $result = (new RectificationEngine())->run(
            $window,
            $this->signalEvents($profile, 8)
        );

        $this->assertSame(RectificationResult::STATUS_CONCLUSIVE, $result->status());
        $this->assertLessThanOrEqual(
            RectificationConfig::GRID_STEP_MINUTES,
            $this->errorMinutes($profile, $result),
            'L\'heure injectée doit être retrouvée à un pas de grille près.'
        );
        $this->assertGreaterThanOrEqual(RectificationConfig::COHERENCE_THRESHOLD, $result->coherenceScore());
    }

    /**
     * Randomly dated events must not produce an estimate.
     *
     * This is the anti-overfitting guard rail of spec §7.4 doing its job, and
     * the assertion on contrast is deliberate documentation of *why* two
     * mechanisms are needed: on pure noise the posterior still peaks tens of
     * times above the window mean, so the contrast test alone would happily
     * certify nonsense. The hold-out is what catches it.
     */
    public function testRejectsMeaninglessInput(): void
    {
        $profile = RectificationFixtures::level1Angles()['paris_summer_time'];
        $window  = $this->fullDayWindow($profile);

        $result = (new RectificationEngine())->run($window, $this->decoyEvents(10, seed: 4242));

        $this->assertLessThan(
            RectificationConfig::COHERENCE_THRESHOLD,
            $result->coherenceScore(),
            'Des événements aléatoires ne doivent pas produire un score de cohérence crédible.'
        );
        $this->assertSame(RectificationResult::STATUS_INCONCLUSIVE, $result->status());
        $this->assertNotEmpty($result->whatWouldHelp(), 'Un résultat non concluant doit dire ce qui le débloquerait.');

        // The point of the pair of guard rails, asserted rather than assumed.
        $this->assertGreaterThan(
            RectificationConfig::CONTRAST_FACTOR,
            $result->posterior->contrast(),
            'Si le bruit ne passait plus le test de contraste, ce test ne documenterait plus rien — '
            . 'revoir la constante CONTRAST_FACTOR et ce commentaire.'
        );
    }

    /**
     * Decoys among real events must not derail the estimate — but they should
     * cost coherence, because that is what the score measures.
     */
    public function testSurvivesDecoysAmongRealEvents(): void
    {
        $profile = RectificationFixtures::level1Angles()['paris_summer_time'];
        $window  = $this->fullDayWindow($profile);

        $events = array_merge($this->signalEvents($profile, 6), $this->decoyEvents(3, seed: 77));

        $result = (new RectificationEngine())->run($window, $events);

        $this->assertLessThanOrEqual(
            15,
            $this->errorMinutes($profile, $result),
            'Trois événements parasites ne doivent pas déplacer l\'estimation de plus d\'un quart d\'heure.'
        );
    }

    /**
     * Spec §7.2: date precision must be *mechanically* useful, not declarative.
     *
     * The same events, described to the year instead of to the day, are
     * averaged over a whole year of dates — so they cannot pin anything, and
     * the interval has to widen. If this ever comes out equal, the convolution
     * has been short-circuited and the precision chips in the wizard are
     * decoration.
     */
    public function testImpreciseDatesWidenTheInterval(): void
    {
        $profile = RectificationFixtures::level1Angles()['paris_summer_time'];
        $window  = $this->fullDayWindow($profile);
        $engine  = new RectificationEngine();

        $precise = $engine->run($window, $this->signalEvents($profile, 6));
        $vague   = $engine->run($window, $this->signalEvents($profile, 6, LifeEvent::PRECISION_YEAR));

        $this->assertGreaterThan(
            $precise->posterior->uncertaintyMinutes(),
            $vague->posterior->uncertaintyMinutes(),
            'Des dates à l\'année doivent produire une incertitude plus large que des dates au jour.'
        );
        $this->assertGreaterThan(
            $precise->posterior->normalisedEntropy(),
            $vague->posterior->normalisedEntropy(),
            'Des dates vagues doivent laisser plus d\'entropie dans le postérieur.'
        );
    }

    /**
     * Spec §8: "rien de spécial" is information, not a blank.
     *
     * Reporting that nothing happened on a date the candidate predicts a hit
     * for must push the posterior *away* from that candidate — the exact
     * opposite of the same date reported as an event.
     */
    public function testAbsenceOfEventPenalisesTheCandidateThatPredictedIt(): void
    {
        $profile = RectificationFixtures::level1Angles()['paris_summer_time'];
        $window  = $this->fullDayWindow($profile);
        $engine  = new RectificationEngine();

        $dates = $this->strongestDates($profile, 6);

        $occurred = $engine->run($window, $this->eventsAt($dates));
        $absent   = $engine->run($window, $this->eventsAt($dates, LifeEvent::EXPECTATION_ABSENT));

        $truthIndex = $occurred->posterior->modeIndex();

        $this->assertGreaterThan(
            $absent->posterior->probabilities[$truthIndex],
            $occurred->posterior->probabilities[$truthIndex],
            'Déclarer qu\'il ne s\'est rien passé doit pénaliser le candidat qui prédisait un contact.'
        );
    }

    /**
     * Spec §7.4: no single event may carry the answer.
     *
     * One event given the strongest possible weighting must still not exceed
     * the per-event cap, otherwise a lucky exact aspect becomes unoutvotable.
     */
    public function testNoSingleEventExceedsTheContributionCap(): void
    {
        $profile = RectificationFixtures::level1Angles()['paris_summer_time'];
        $window  = $this->fullDayWindow($profile);

        $result = (new RectificationEngine())->run($window, $this->signalEvents($profile, 6));

        foreach ($result->logLikelihoodMatrix as $row) {
            foreach ($row as $contribution) {
                $this->assertLessThanOrEqual(
                    RectificationConfig::MAX_LOG_CONTRIBUTION + 1e-9,
                    abs($contribution),
                    'Un événement dépasse le plafond de contribution : surapprentissage possible.'
                );
            }
        }
    }

    /**
     * A user who reopens their result must see the same number. Nothing in the
     * pipeline may depend on a random draw or on the current date.
     */
    public function testRunIsDeterministic(): void
    {
        $profile = RectificationFixtures::level1Angles()['paris_summer_time'];
        $window  = $this->fullDayWindow($profile);
        $events  = $this->signalEvents($profile, 6);

        $first  = (new RectificationEngine())->run($window, $events);
        $second = (new RectificationEngine())->run($window, $events);

        $this->assertSame($first->estimate(), $second->estimate());
        $this->assertSame($first->coherenceScore(), $second->coherenceScore());
    }

    /**
     * Spec §14: no screen shows a time without its uncertainty. Enforced at the
     * source — the only accessor that yields a time yields both.
     */
    public function testEstimateAlwaysCarriesItsUncertainty(): void
    {
        $profile = RectificationFixtures::level1Angles()['paris_summer_time'];
        $window  = $this->fullDayWindow($profile);

        $estimate = (new RectificationEngine())->run($window, $this->signalEvents($profile, 5))->estimate();

        $this->assertArrayHasKey('time', $estimate);
        $this->assertArrayHasKey('uncertainty_minutes', $estimate);
        $this->assertArrayHasKey('coherence', $estimate);
        $this->assertIsInt($estimate['uncertainty_minutes']);
    }

    /**
     * Spec §4: a birth "autour de minuit" with an uncertain date makes the
     * window straddle two civil dates. The grid must cross midnight cleanly.
     */
    public function testWindowCanStraddleMidnight(): void
    {
        $profile = RectificationFixtures::level1Angles()['lyon_near_midnight'];

        $window = BirthWindow::fromLocalHours(
            $profile['local_date'],
            22.0,
            2.0, // wraps onto the next civil date
            $profile['utc_offset'],
            $profile['latitude'],
            $profile['longitude'],
        );

        $candidates = $window->candidates();

        $this->assertSame(4 * 60 / RectificationConfig::GRID_STEP_MINUTES, count($candidates));
        $this->assertSame('2001-03-03 22:00', $candidates[0]->local->format('Y-m-d H:i'));
        $this->assertSame('2001-03-04 01:58', end($candidates)->local->format('Y-m-d H:i'));

        $result = (new RectificationEngine())->run($window, $this->signalEvents($profile, 5));
        $this->assertLessThanOrEqual(
            RectificationConfig::GRID_STEP_MINUTES,
            $this->errorMinutes($profile, $result, '2001-03-03'),
        );
    }

    /** Spec §5.3: the threshold is reported, and reported precisely. */
    public function testInputThresholdIsReportedPrecisely(): void
    {
        $profile = RectificationFixtures::level1Angles()['paris_summer_time'];
        $window  = $this->fullDayWindow($profile);

        $result = (new RectificationEngine())->run($window, $this->signalEvents($profile, 3));

        $this->assertFalse($result->meetsInputThreshold());
        $this->assertStringContainsString('2 événements', $result->whatWouldHelp()[0]);
    }

    public function testRefusesToRunWithoutEvents(): void
    {
        $profile = RectificationFixtures::level1Angles()['paris_summer_time'];

        $this->expectException(\InvalidArgumentException::class);
        (new RectificationEngine())->run($this->fullDayWindow($profile), []);
    }

    /** Explanations for spec §9.2 must be produced, ranked, and event-linked. */
    public function testContributionsAreRankedAndExplainable(): void
    {
        $profile = RectificationFixtures::level1Angles()['paris_summer_time'];
        $window  = $this->fullDayWindow($profile);

        $result = (new RectificationEngine())->run($window, $this->signalEvents($profile, 6));

        $this->assertGreaterThanOrEqual(3, count($result->contributions), 'Le spec demande 3 à 5 contributions explicitées.');

        $scores = array_column($result->contributions, 'score');
        $sorted = $scores;
        rsort($sorted);
        $this->assertSame($sorted, $scores, 'Les contributions doivent être classées par force décroissante.');

        $first = $result->contributions[0];
        $this->assertInstanceOf(LifeEvent::class, $first['event']);
        $this->assertContains($first['aspect'], array_keys(RectificationConfig::HARD_ASPECTS));
        $this->assertLessThanOrEqual(2.0, $first['orb']);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    private function fullDayWindow(array $profile): BirthWindow
    {
        return BirthWindow::fullDay(
            $profile['local_date'],
            $profile['utc_offset'],
            $profile['latitude'],
            $profile['longitude'],
        );
    }

    /**
     * Dates on which the *true* chart has its strongest technique hits — the
     * dates a life would plausibly have marked, if astrology dating works.
     *
     * @return list<string>
     */
    private function strongestDates(array $profile, int $count): array
    {
        $window   = $this->fullDayWindow($profile);
        $local    = new \DateTimeImmutable($profile['local_date'] . ' ' . $profile['local_time'], new \DateTimeZone('UTC'));
        $utc      = $window->toUtc($local);

        $candidate = new Candidate(0, $local, $utc);
        $natal     = new NatalContext($candidate, $candidate->points($profile['latitude'], $profile['longitude']), $utc);

        $ephemeris = new Ephemeris();
        $techniques = [new SolarArcTechnique($ephemeris), new SlowTransitTechnique($ephemeris)];

        $scores = [];
        $from   = $utc->modify('+15 years');
        $until  = $utc->modify('+40 years');

        for ($day = $from; $day < $until; $day = $day->modify('+5 days')) {
            $noon  = $day->setTime(12, 0, 0);
            $score = 0.0;
            foreach ($techniques as $technique) {
                $score += $technique->score($natal, $noon);
            }
            $scores[$noon->format('Y-m-d')] = $score;
        }

        arsort($scores);

        // One per year, so the events look like a life rather than a cluster.
        $picked = [];
        $years  = [];
        foreach ($scores as $date => $score) {
            $year = substr($date, 0, 4);
            if (isset($years[$year])) {
                continue;
            }
            $years[$year] = true;
            $picked[]     = $date;
            if (count($picked) >= $count) {
                break;
            }
        }

        return $picked;
    }

    /** @return list<LifeEvent> */
    private function signalEvents(array $profile, int $count, string $precision = LifeEvent::PRECISION_DAY): array
    {
        return $this->eventsAt($this->strongestDates($profile, $count), LifeEvent::EXPECTATION_OCCURRED, $precision);
    }

    /**
     * @param list<string> $dates
     *
     * @return list<LifeEvent>
     */
    private function eventsAt(
        array $dates,
        string $expectation = LifeEvent::EXPECTATION_OCCURRED,
        string $precision = LifeEvent::PRECISION_DAY,
    ): array {
        return array_map(
            static fn (string $date): LifeEvent => new LifeEvent(
                date: new \DateTimeImmutable($date, new \DateTimeZone('UTC')),
                precision: $precision,
                intensity: LifeEvent::INTENSITY_TURNING_POINT,
                sudden: true,
                category: 'test',
                expectation: $expectation,
            ),
            $dates
        );
    }

    /**
     * Events on dates drawn deterministically at random — the control group.
     *
     * @return list<LifeEvent>
     */
    private function decoyEvents(int $count, int $seed): array
    {
        mt_srand($seed);
        $base = new \DateTimeImmutable('2002-01-01', new \DateTimeZone('UTC'));

        $events = [];
        for ($i = 0; $i < $count; ++$i) {
            $events[] = new LifeEvent(
                date: $base->modify('+' . mt_rand(0, 7000) . ' days'),
                precision: LifeEvent::PRECISION_DAY,
                intensity: LifeEvent::INTENSITY_TURNING_POINT,
                sudden: true,
                category: 'decoy',
            );
        }

        return $events;
    }

    private function errorMinutes(array $profile, RectificationResult $result, ?string $onDate = null): float
    {
        $timezone = new \DateTimeZone('UTC');
        $date     = $onDate ?? $profile['local_date'];

        $truth    = new \DateTimeImmutable($profile['local_date'] . ' ' . $profile['local_time'], $timezone);
        $estimate = new \DateTimeImmutable($date . ' ' . $result->estimate()['time'], $timezone);

        return abs($truth->getTimestamp() - $estimate->getTimestamp()) / 60.0;
    }
}
