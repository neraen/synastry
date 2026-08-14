<?php

namespace App\Tests\Service\Rectification;

use App\Entity\BirthProfile;
use App\Entity\RectificationSession;
use App\Entity\User;
use App\Repository\RectificationSessionRepository;
use App\Service\Rectification\LifeEvent;
use App\Service\Rectification\RectificationConfig;
use App\Service\Rectification\RectificationEngine;
use App\Service\Rectification\RectificationSessionService;
use App\Tests\Service\Rectification\Fixtures\RectificationFixtures;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;

/**
 * The wizard's state machine and the free/premium boundary.
 *
 * These are the rules a user actually collides with — where the journey
 * resumes, when the calculate button is allowed to do anything, what a
 * non-subscriber receives — so they are pinned here rather than left to the
 * controller.
 */
class RectificationSessionServiceTest extends TestCase
{
    private RectificationSessionService $service;

    protected function setUp(): void
    {
        $this->service = new RectificationSessionService(
            $this->createMock(RectificationSessionRepository::class),
            $this->createMock(EntityManagerInterface::class),
            new RectificationEngine(),
        );
    }

    /**
     * Spec §3, first exit: someone who has their birth time must not be walked
     * through an inference. The journey ends, and the time lands on the profile
     * as declared — not rectified.
     */
    public function testKnownTimeEndsTheJourneyImmediately(): void
    {
        $session = $this->session();

        $this->service->recordOfficialSource($session, RectificationSession::SOURCE_HAS_TIME, '07:42');

        $this->assertSame(RectificationSession::STEP_DONE, $session->getStep());
        $this->assertSame('07:42', $session->getKnownTime()->format('H:i'));

        $profile = $session->getUser()->getBirthProfile();
        $this->assertSame('07:42', $profile->getBirthTime()->format('H:i'));
        $this->assertSame('declared', $profile->getBirthTimeSource());
        $this->assertNull($profile->getBirthTimeUncertaintyMinutes());
    }

    public function testRequestingTheDocumentSchedulesAReminderAndContinues(): void
    {
        $session = $this->session();

        $this->service->recordOfficialSource($session, RectificationSession::SOURCE_REQUESTED);

        $this->assertSame(RectificationSession::STEP_WINDOW, $session->getStep());
        $this->assertNotNull($session->getDocumentReminderAt());

        // J+10, per spec §3.
        $days = (new \DateTimeImmutable())->diff($session->getDocumentReminderAt())->days;
        $this->assertGreaterThanOrEqual(9, $days);
        $this->assertLessThanOrEqual(10, $days);
    }

    public function testMalformedKnownTimeIsRejected(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->service->recordOfficialSource($this->session(), RectificationSession::SOURCE_HAS_TIME, '7h42');
    }

    /**
     * Spec §4: "aucune idée" everywhere is a valid answer, not a dead end. It
     * yields the full 24 h window.
     */
    public function testNoIdeaEverywhereYieldsAFullDayWindow(): void
    {
        $session = $this->session();

        $this->service->recordWindow($session, ['day_night' => 'aucune_idee', 'memory' => 'aucune_idee']);

        $this->assertSame(0.0, $session->getWindowStartHour());
        $this->assertSame(24.0, $session->getWindowEndHour());
        $this->assertSame(RectificationSession::STEP_COLLECTION, $session->getStep());
    }

    /** A specific memory outranks the coarser day/night answer. */
    public function testSpecificMemoryNarrowsTheWindow(): void
    {
        $session = $this->session();

        $this->service->recordWindow($session, ['day_night' => 'jour', 'memory' => 'matin_tot']);

        $this->assertSame(4.0, $session->getWindowStartHour());
        $this->assertSame(8.0, $session->getWindowEndHour());
    }

    /** "Autour de minuit" wraps onto the next civil date (spec §4). */
    public function testAroundMidnightWrapsPastMidnight(): void
    {
        $session = $this->session();

        $this->service->recordWindow($session, ['memory' => 'autour_minuit']);

        $this->assertSame(22.0, $session->getWindowStartHour());
        $this->assertSame(2.0, $session->getWindowEndHour());
    }

    /** The raw answers are kept, so a retuned chip mapping can be re-derived. */
    public function testWindowAnswersAreStoredVerbatim(): void
    {
        $session = $this->session();
        $answers = ['day_night' => 'nuit', 'memory' => 'autour_minuit', 'memory_note' => 'ma mère parlait du dernier journal'];

        $this->service->recordWindow($session, $answers);

        $this->assertSame($answers, $session->getWindowAnswers());
    }

    /**
     * Spec §5.2: precision is derived from what the user filled in, never asked
     * for. Each "je ne sais plus" up the cascade widens it one notch.
     *
     * @dataProvider precisionProvider
     */
    public function testDatePrecisionIsDerivedNotDeclared(array $input, string $expectedPrecision, string $expectedDate): void
    {
        $session = $this->session();
        $this->service->addEvent($session, $input, isPremium: true);

        $event = $session->getEvents()[0];

        $this->assertSame($expectedPrecision, $event['precision']);
        $this->assertSame($expectedDate, $event['date']);
    }

    public static function precisionProvider(): array
    {
        return [
            'année + mois + jour' => [
                ['year' => 2016, 'month' => 3, 'day' => 12],
                LifeEvent::PRECISION_DAY,
                '2016-03-12',
            ],
            // Centred on the middle of the month, so the convolution sits on
            // the user's memory rather than on the 1st.
            'jour inconnu' => [
                ['year' => 2016, 'month' => 3, 'day' => null],
                LifeEvent::PRECISION_MONTH,
                '2016-03-15',
            ],
            'mois inconnu' => [
                ['year' => 2016, 'month' => null, 'day' => null],
                LifeEvent::PRECISION_YEAR,
                '2016-07-02',
            ],
        ];
    }

    /**
     * Spec §14: the day of an event is never required to save it. A user who
     * only remembers the year must still be able to move on.
     */
    public function testEventWithoutDayIsAccepted(): void
    {
        $session = $this->session();

        $this->service->addEvent($session, ['year' => 2011, 'category' => 'rupture'], isPremium: true);

        $this->assertCount(1, $session->getEvents());
        $this->assertSame(LifeEvent::PRECISION_YEAR, $session->getEvents()[0]['precision']);
    }

    /** Spec §12: the free tier stops at three events. */
    public function testFreeTierIsCappedAtThreeEvents(): void
    {
        $session = $this->session();

        for ($i = 0; $i < RectificationConfig::FREE_TIER_MAX_EVENTS; ++$i) {
            $this->service->addEvent($session, ['year' => 2010 + $i, 'month' => 5, 'day' => 4], isPremium: false);
        }

        $this->expectException(\DomainException::class);
        $this->expectExceptionMessage('premium_required');
        $this->service->addEvent($session, ['year' => 2020, 'month' => 5, 'day' => 4], isPremium: false);
    }

    public function testPremiumHasNoEventCap(): void
    {
        $session = $this->session();

        for ($i = 0; $i < 8; ++$i) {
            $this->service->addEvent($session, ['year' => 2005 + $i, 'month' => 5, 'day' => 4], isPremium: true);
        }

        $this->assertCount(8, $session->getEvents());
    }

    /**
     * Spec §5.3: below the threshold the calculation is refused, and the reason
     * says exactly what is missing rather than "not enough data".
     */
    public function testCalculationIsRefusedBelowThreshold(): void
    {
        $session = $this->session();
        $this->service->recordWindow($session, ['memory' => 'matinee']);

        // Five events, but only one dated to the day.
        $this->service->addEvent($session, ['year' => 2010, 'month' => 5, 'day' => 4], isPremium: true);
        for ($i = 0; $i < 4; ++$i) {
            $this->service->addEvent($session, ['year' => 2012 + $i, 'month' => 6], isPremium: true);
        }

        $dial = $this->service->dialState($session);
        $this->assertFalse($dial['ready']);
        $this->assertStringContainsString('daté au jour près', implode(' ', $dial['missing']));

        $this->expectException(\DomainException::class);
        $this->expectExceptionMessage('threshold_not_met');
        $this->service->calculate($session, isPremium: true);
    }

    /**
     * Spec §6: the dial's counter must state the exact shortfall, not a
     * progress percentage.
     */
    public function testDialReportsTheExactShortfall(): void
    {
        $session = $this->session();
        $this->service->recordWindow($session, ['memory' => 'matinee']);
        $this->service->addEvent($session, ['year' => 2010, 'month' => 5, 'day' => 4], isPremium: true);

        $dial = $this->service->dialState($session);

        $this->assertSame(1, $dial['events']);
        $this->assertSame(1, $dial['day_dated']);
        $this->assertStringContainsString('4 événements', $dial['missing'][0]);
        $this->assertStringContainsString('1 événement daté', $dial['missing'][1]);
    }

    /**
     * Spec §6: an event dated to the day must tighten the dial noticeably more
     * than one dated to the month. If it does not, the precision chips are
     * decoration and the whole "gain concret" framing of §5.2 is a lie.
     */
    public function testDayDatedEventTightensTheDialMoreThanAMonthDatedOne(): void
    {
        $dates = $this->strongDates(5);

        $precise = $this->sessionWithEvents($dates, withDay: true);
        $vague   = $this->sessionWithEvents($dates, withDay: false);

        $this->assertLessThan(
            $vague->getDialUncertaintyMinutes(),
            $precise->getDialUncertaintyMinutes(),
            'Une date au jour doit resserrer le cadran plus qu\'une date au mois.'
        );
    }

    /** Changing the events invalidates the cached result — no stale estimate. */
    public function testAddingAnEventInvalidatesTheCachedResult(): void
    {
        $session = $this->sessionWithEvents($this->strongDates(5), withDay: true);
        $this->service->calculate($session, isPremium: true);

        $this->assertNotNull($session->getLastResult());

        $this->service->addEvent($session, ['year' => 2019, 'month' => 2, 'day' => 8], isPremium: true);

        $this->assertNull($session->getLastResult());
        $this->assertNull($session->getLastCalculatedAt());
    }

    /**
     * Spec §12: a non-subscriber gets the shape of the answer — a likely
     * Ascendant sign — and none of the numbers. Enforced server-side, so the
     * time simply is not in the payload.
     */
    public function testFreeTierReceivesASignTeaserAndNoTime(): void
    {
        $session = $this->sessionWithEvents($this->strongDates(6), withDay: true);

        $payload = $this->service->calculate($session, isPremium: false);

        $this->assertArrayNotHasKey('estimate', $payload);
        $this->assertArrayNotHasKey('contributions', $payload);
        $this->assertArrayHasKey('teaser', $payload);
        $this->assertNotEmpty($payload['teaser']['signs']);
        $this->assertStringContainsString('Ascendant', $payload['teaser']['label']);

        // Nothing resembling a clock time anywhere in the free payload.
        $this->assertDoesNotMatchRegularExpression('/\d{2}:\d{2}/', json_encode($payload['teaser']));
    }

    public function testPremiumReceivesEstimateAndExplanations(): void
    {
        $session = $this->sessionWithEvents($this->strongDates(6), withDay: true);

        $payload = $this->service->calculate($session, isPremium: true);

        $this->assertArrayHasKey('estimate', $payload);
        $this->assertArrayHasKey('uncertainty_minutes', $payload['estimate']);
        $this->assertNotEmpty($payload['contributions']);
        $this->assertStringContainsString('si tu es né', $payload['contributions'][0]['text']);
    }

    /**
     * Spec §9.5: adopting writes the time *with* its uncertainty and marks it
     * as estimated. A profile can never end up with a rectified time and no
     * uncertainty attached.
     */
    public function testAdoptionRecordsTimeUncertaintyAndProvenance(): void
    {
        $session = $this->sessionWithEvents($this->strongDates(6), withDay: true);
        $payload = $this->service->calculate($session, isPremium: true);

        $this->assertSame('conclusive', $payload['status'], 'Pré-requis du test : le calcul doit être concluant.');

        $profile = $this->service->adopt($session);

        $this->assertTrue($profile->isBirthTimeRectified());
        $this->assertSame($payload['estimate']['time'], $profile->getBirthTime()->format('H:i'));
        $this->assertSame($payload['estimate']['uncertainty_minutes'], $profile->getBirthTimeUncertaintyMinutes());
        $this->assertSame(RectificationSession::STEP_DONE, $session->getStep());
    }

    /** An inconclusive run must never become someone's birth time. */
    public function testInconclusiveResultCannotBeAdopted(): void
    {
        $session = $this->session();
        $this->service->recordWindow($session, ['memory' => 'aucune_idee']);
        $session->setLastResult(['status' => 'inconclusive', 'coherence' => 20]);

        $this->expectException(\DomainException::class);
        $this->expectExceptionMessage('not_conclusive');
        $this->service->adopt($session);
    }

    public function testAdoptionRequiresAResult(): void
    {
        $this->expectException(\DomainException::class);
        $this->expectExceptionMessage('no_result');
        $this->service->adopt($this->session());
    }

    /**
     * Spec §9.5: the user can always go back to a time they type themselves,
     * and doing so must clear the estimated marker and its badge.
     */
    public function testRevertingToADeclaredTimeClearsTheEstimatedMarker(): void
    {
        $session = $this->sessionWithEvents($this->strongDates(6), withDay: true);
        $this->service->calculate($session, isPremium: true);
        $this->service->adopt($session);

        $profile = $this->service->revertToDeclaredTime($session->getUser(), '05:15');

        $this->assertFalse($profile->isBirthTimeRectified());
        $this->assertSame('declared', $profile->getBirthTimeSource());
        $this->assertNull($profile->getBirthTimeUncertaintyMinutes());
        $this->assertSame('05:15', $profile->getBirthTime()->format('H:i'));
    }

    /** The badge data always travels with the time in the API payload. */
    public function testProfilePayloadCarriesProvenanceAndUncertainty(): void
    {
        $session = $this->sessionWithEvents($this->strongDates(6), withDay: true);
        $this->service->calculate($session, isPremium: true);

        $payload = $this->service->adopt($session)->toArray();

        $this->assertSame('rectified', $payload['birthTimeSource']);
        $this->assertIsInt($payload['birthTimeUncertaintyMinutes']);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    private function session(): RectificationSession
    {
        $fixture = RectificationFixtures::level1Angles()['paris_summer_time'];

        $profile = (new BirthProfile())
            ->setBirthDate(new \DateTime($fixture['local_date']))
            ->setBirthCity('Paris')
            ->setLatitude((string) $fixture['latitude'])
            ->setLongitude((string) $fixture['longitude'])
            ->setTimezone((string) $fixture['utc_offset']);

        $user = new User();
        $user->setBirthProfile($profile);
        $profile->setUser($user);

        return (new RectificationSession())->setUser($user);
    }

    /**
     * @param list<string> $dates
     */
    private function sessionWithEvents(array $dates, bool $withDay): RectificationSession
    {
        $session = $this->session();
        $this->service->recordWindow($session, ['memory' => 'aucune_idee']);

        foreach ($dates as $date) {
            [$year, $month, $day] = array_map('intval', explode('-', $date));

            $this->service->addEvent($session, [
                'year'      => $year,
                'month'     => $month,
                'day'       => $withDay ? $day : null,
                'intensity' => LifeEvent::INTENSITY_TURNING_POINT,
                'sudden'    => true,
                'category'  => 'test',
            ], isPremium: true);
        }

        return $session;
    }

    /**
     * Dates carrying real signal for the reference profile, reused from the
     * engine test's generator so these tests exercise the same path a genuine
     * run would.
     *
     * @return list<string>
     */
    private function strongDates(int $count): array
    {
        static $cache = [];

        if (!isset($cache[$count])) {
            $reflection = new \ReflectionMethod(RectificationEngineTest::class, 'strongestDates');
            $reflection->setAccessible(true);

            $cache[$count] = $reflection->invoke(
                new RectificationEngineTest('strongDates'),
                RectificationFixtures::level1Angles()['paris_summer_time'],
                $count
            );
        }

        return $cache[$count];
    }
}
