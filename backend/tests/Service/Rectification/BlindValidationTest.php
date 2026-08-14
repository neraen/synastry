<?php

namespace App\Tests\Service\Rectification;

use App\Entity\BlindValidation;
use App\Entity\BirthProfile;
use App\Entity\RectificationSession;
use App\Entity\User;
use App\Repository\BlindValidationRepository;
use App\Service\Rectification\BlindValidationService;
use App\Service\Rectification\RectificationEngine;
use App\Tests\Service\Rectification\Fixtures\RectificationFixtures;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;

/**
 * Blind validation (spec §10).
 *
 * The property that matters most here is not an output but an absence: the
 * known birth time must not be able to reach the inference. Everything else in
 * the module can be wrong and be corrected later; a leak here would silently
 * turn the product's only accuracy figure into a self-congratulation, and it
 * would look excellent while doing so.
 */
class BlindValidationTest extends TestCase
{
    /**
     * The engine must produce the same estimate whether or not the profile
     * carries the true birth time.
     *
     * This is the blindness guarantee, tested as behaviour rather than trusted
     * from reading the code: run the same session twice, once with the truth on
     * the profile and once with it removed, and require an identical result.
     * Any path by which the known time influenced the inference would show up
     * as a difference.
     */
    public function testKnownTimeCannotInfluenceTheEstimate(): void
    {
        $withTruth    = $this->session(knownTime: '03:20');
        $withoutTruth = $this->session(knownTime: null);

        $engine = new RectificationEngine();

        $a = $engine->run(
            $this->windowOf($withTruth),
            $this->eventsOf($withTruth),
        );
        $b = $engine->run(
            $this->windowOf($withoutTruth),
            $this->eventsOf($withoutTruth),
        );

        $this->assertSame(
            $a->estimate()['time'],
            $b->estimate()['time'],
            'L\'heure connue influence l\'estimation : la validation en aveugle ne mesure plus rien.'
        );
        $this->assertSame($a->coherenceScore(), $b->coherenceScore());
    }

    /**
     * A rectified time is the engine's own output. Scoring against it would
     * measure the engine's agreement with itself, so it must be refused.
     */
    public function testRefusesToScoreAgainstARectifiedTime(): void
    {
        $session = $this->session(knownTime: null);
        $session->getUser()->getBirthProfile()->adoptRectifiedTime(new \DateTime('03:20'), 12);

        $this->expectException(\DomainException::class);
        $this->expectExceptionMessage('no_known_time');
        $this->service()->run($session);
    }

    public function testRefusesWithoutAKnownTime(): void
    {
        $this->expectException(\DomainException::class);
        $this->expectExceptionMessage('no_known_time');
        $this->service()->run($this->session(knownTime: null));
    }

    public function testEligibilityReportsWhyItIsBlocked(): void
    {
        $service = $this->service();

        $noTime = $service->eligibility($this->session(knownTime: null)->getUser(), $this->session(knownTime: null));
        $this->assertFalse($noTime['eligible']);
        $this->assertSame('no_known_time', $noTime['reason']);

        $ready = $service->eligibility($this->session(knownTime: '03:20')->getUser(), $this->session(knownTime: '03:20'));
        $this->assertTrue($ready['eligible']);
        $this->assertSame('03:20', $ready['known_time']);
    }

    /**
     * A birth at 00:05 estimated at 23:55 is ten minutes out, not twenty-three
     * hours. Without the wrap, a handful of near-midnight births would destroy
     * the median and make the engine look far worse than it is.
     */
    public function testErrorWrapsAroundMidnight(): void
    {
        $this->assertSame(
            10,
            BlindValidation::clockDistanceMinutes(new \DateTime('00:05'), new \DateTime('23:55'))
        );
        $this->assertSame(
            25,
            BlindValidation::clockDistanceMinutes(new \DateTime('07:42'), new \DateTime('08:07'))
        );
        $this->assertSame(
            720,
            BlindValidation::clockDistanceMinutes(new \DateTime('00:00'), new \DateTime('12:00'))
        );
    }

    /**
     * Inconclusive runs are refusals, not wrong answers. Folding them into the
     * accuracy figures would conflate two different products: a cautious engine
     * and a confidently wrong one.
     */
    public function testInconclusiveRunsAreCountedButNotScored(): void
    {
        $summary = BlindValidationRepository::summarise([
            $this->validation(error: 10),
            $this->validation(error: 20),
            $this->validation(error: null, status: 'inconclusive'),
            $this->validation(error: null, status: 'multimodal'),
        ]);

        $this->assertSame(4, $summary['total']);
        $this->assertSame(2, $summary['scored']);
        $this->assertSame(2, $summary['inconclusive']);
        $this->assertSame(0.5, $summary['inconclusive_rate']);
        $this->assertSame(15, $summary['median_error']);
    }

    /**
     * The median must be reported, not the mean.
     *
     * Rectification errors are long-tailed: a couple of runs land half a day
     * out. A mean is dragged around by them and describes nobody, while the
     * median answers "what will most people actually see".
     */
    public function testMedianIsRobustToTheLongTail(): void
    {
        $summary = BlindValidationRepository::summarise([
            $this->validation(error: 8),
            $this->validation(error: 12),
            $this->validation(error: 15),
            $this->validation(error: 18),
            $this->validation(error: 700),
        ]);

        $this->assertSame(15, $summary['median_error']);
        $this->assertGreaterThan(100, $summary['mean_error'], 'La moyenne doit bien être écrasée par la traîne.');
    }

    public function testWithinThresholdsAreCumulative(): void
    {
        $summary = BlindValidationRepository::summarise([
            $this->validation(error: 5),
            $this->validation(error: 20),
            $this->validation(error: 45),
            $this->validation(error: 300),
        ]);

        $this->assertSame(0.25, $summary['within_15']);
        $this->assertSame(0.5, $summary['within_30']);
        $this->assertSame(0.75, $summary['within_60']);
    }

    /**
     * Calibration: the share of runs whose real error fell inside their own
     * announced margin.
     *
     * This is the number that says whether the "±25 min" shown to users is
     * honest. A well-behaved 80 % credible interval should sit near 0.8.
     */
    public function testCalibrationMeasuresWhetherTheAnnouncedMarginHolds(): void
    {
        $honest = BlindValidationRepository::summarise([
            $this->validation(error: 5, uncertainty: 25),
            $this->validation(error: 10, uncertainty: 25),
            $this->validation(error: 20, uncertainty: 25),
            $this->validation(error: 60, uncertainty: 25),
        ]);
        $this->assertSame(0.75, $honest['calibration']);

        $overconfident = BlindValidationRepository::summarise([
            $this->validation(error: 90, uncertainty: 2),
            $this->validation(error: 120, uncertainty: 2),
        ]);
        $this->assertSame(0.0, $overconfident['calibration'], 'Une marge annoncée jamais tenue doit ressortir à 0.');
    }

    public function testEmptyCorpusReportsNullRatherThanZero(): void
    {
        $summary = BlindValidationRepository::summarise([]);

        $this->assertSame(0, $summary['total']);
        $this->assertNull($summary['median_error'], 'Un corpus vide n\'a pas une erreur de 0 : il n\'en a pas.');
        $this->assertNull($summary['within_30']);
        $this->assertNull($summary['calibration']);
    }

    /**
     * Segmentation is the point of §10: "±22 min" means nothing without "with
     * eight events, three of them dated to the day".
     */
    public function testSegmentationSplitsByVolumeAndDateQuality(): void
    {
        $segments = BlindValidationRepository::segment([
            $this->validation(error: 8, events: 11, dayDated: 6),
            $this->validation(error: 12, events: 10, dayDated: 5),
            $this->validation(error: 90, events: 5, dayDated: 2),
        ]);

        $this->assertArrayHasKey('10+ évts · 5+ au jour', $segments);
        $this->assertArrayHasKey('5-6 évts · 0-2 au jour', $segments);

        $this->assertSame(10, $segments['10+ évts · 5+ au jour']['median_error']);
        $this->assertSame(90, $segments['5-6 évts · 0-2 au jour']['median_error']);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    private function service(): BlindValidationService
    {
        return new BlindValidationService(
            $this->createMock(BlindValidationRepository::class),
            $this->createMock(EntityManagerInterface::class),
            new RectificationEngine(),
        );
    }

    private function validation(
        ?int $error,
        string $status = 'conclusive',
        ?int $uncertainty = null,
        int $events = 8,
        int $dayDated = 4,
    ): BlindValidation {
        return (new BlindValidation())
            ->setKnownTime(new \DateTime('03:20'))
            ->setErrorMinutes($error)
            ->setStatus($status)
            ->setUncertaintyMinutes($uncertainty)
            ->setEventCount($events)
            ->setDayDatedCount($dayDated);
    }

    private function session(?string $knownTime): RectificationSession
    {
        $fixture = RectificationFixtures::level1Angles()['paris_summer_time'];

        $profile = (new BirthProfile())
            ->setBirthDate(new \DateTime($fixture['local_date']))
            ->setBirthCity('Paris')
            ->setLatitude((string) $fixture['latitude'])
            ->setLongitude((string) $fixture['longitude'])
            ->setTimezone((string) $fixture['utc_offset']);

        if ($knownTime !== null) {
            $profile->setBirthTime(\DateTime::createFromFormat('H:i', $knownTime));
        }

        $user = new User();
        $user->setBirthProfile($profile);
        $profile->setUser($user);

        $session = (new RectificationSession())->setUser($user);
        $session->setWindow(0.0, 24.0);

        foreach ($this->eventPayloads() as $event) {
            $session->addEvent($event);
        }

        return $session;
    }

    /** @return list<array<string, mixed>> */
    private function eventPayloads(): array
    {
        $dates = ['2001-11-01', '2003-07-14', '2006-09-01', '2008-09-20', '2016-01-27', '2020-08-13'];

        return array_map(
            static fn (string $date): array => [
                'date'      => $date,
                'precision' => 'day',
                'intensity' => 'turning_point',
                'sudden'    => true,
                'category'  => 'test',
            ],
            $dates
        );
    }

    private function windowOf(RectificationSession $session): \App\Service\Rectification\BirthWindow
    {
        $profile = $session->getUser()->getBirthProfile();

        return \App\Service\Rectification\BirthWindow::fromLocalHours(
            $profile->getBirthDate()->format('Y-m-d'),
            $session->getWindowStartHour(),
            $session->getWindowEndHour(),
            (float) $profile->getTimezone(),
            (float) $profile->getLatitude(),
            (float) $profile->getLongitude(),
        );
    }

    /** @return list<\App\Service\Rectification\LifeEvent> */
    private function eventsOf(RectificationSession $session): array
    {
        return array_map(
            static fn (array $e): \App\Service\Rectification\LifeEvent => new \App\Service\Rectification\LifeEvent(
                date: new \DateTimeImmutable($e['date'], new \DateTimeZone('UTC')),
                precision: $e['precision'],
                intensity: $e['intensity'],
                sudden: $e['sudden'],
                category: $e['category'],
            ),
            $session->getEvents()
        );
    }
}
