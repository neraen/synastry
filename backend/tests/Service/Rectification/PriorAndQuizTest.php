<?php

namespace App\Tests\Service\Rectification;

use App\Service\Rectification\BirthTimePrior;
use App\Service\Rectification\BirthWindow;
use App\Service\Rectification\Candidate;
use App\Service\Rectification\LifeEvent;
use App\Service\Rectification\RectificationConfig;
use App\Service\Rectification\RectificationEngine;
use App\Service\Rectification\TemperamentQuiz;
use App\Service\Rectification\Technique\SecondaryProgression;
use App\Tests\Service\Rectification\Fixtures\RectificationFixtures;
use PHPUnit\Framework\TestCase;

/**
 * The step-7 extensions: the informed prior, the temperament quiz, and the
 * secondary-progression techniques.
 *
 * Every one of these adds a way for something *other than the user's own dated
 * life* to move the answer. So most of what is tested here is not that they
 * work but that they stay small: demographics and a self-reported quiz may
 * settle a tie and nothing more.
 */
class PriorAndQuizTest extends TestCase
{
    // ─────────────────────────────────────────────────────────────────────────
    // Informed prior
    // ─────────────────────────────────────────────────────────────────────────

    public function testPriorIsAProperDistribution(): void
    {
        $distribution = BirthTimePrior::hourlyDistribution();

        $this->assertCount(24, $distribution);
        $this->assertEqualsWithDelta(1.0, array_sum($distribution), 1e-9);

        // Morning hours are the busiest — scheduled inductions and caesareans.
        $this->assertGreaterThan($distribution[17], $distribution[9]);
    }

    /**
     * The prior must be small enough that it cannot outvote a single event,
     * let alone several. A genuine 03:00 birth must not drift towards 09:00
     * because more people are born then.
     */
    public function testPriorCannotOutweighOneEvent(): void
    {
        $span = max(array_map(
            static fn (int $hour): float => BirthTimePrior::logPriorFor(self::candidateAtHour($hour)),
            range(0, 23)
        )) - min(array_map(
            static fn (int $hour): float => BirthTimePrior::logPriorFor(self::candidateAtHour($hour)),
            range(0, 23)
        ));

        $this->assertLessThan(
            RectificationConfig::MAX_LOG_CONTRIBUTION / 2,
            $span,
            'Le prior démographique pèse trop : il pourrait renverser un événement daté.'
        );
    }

    /** Switching the prior on must change the shape, never the overall scale. */
    public function testPriorIsCentredOnZero(): void
    {
        $total = 0.0;
        foreach (range(0, 23) as $hour) {
            $total += BirthTimePrior::logPriorFor(self::candidateAtHour($hour));
        }

        $this->assertEqualsWithDelta(0.0, $total, 1e-9);
    }

    /**
     * The events still decide. With a real signal in the data, the estimate
     * must land where the events point, not where the demographics do.
     */
    public function testEventsStillWinOverThePrior(): void
    {
        $profile = RectificationFixtures::level1Angles()['paris_summer_time'];
        $window  = BirthWindow::fullDay(
            $profile['local_date'],
            $profile['utc_offset'],
            $profile['latitude'],
            $profile['longitude'],
        );

        $result = (new RectificationEngine())->run($window, $this->signalEvents(8));

        // The reference profile was born at 03:20 — a low-prior hour. If the
        // prior had any real pull, the estimate would drift towards the morning.
        $this->assertSame('03:20', $result->estimate()['time']);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Temperament quiz
    // ─────────────────────────────────────────────────────────────────────────

    public function testQuizProducesScoresOnlyForAnsweredQuestions(): void
    {
        $none = TemperamentQuiz::signScores([]);
        $this->assertSame(0.0, array_sum($none), 'Un quiz vide ne doit rien affirmer.');

        $some = TemperamentQuiz::signScores([
            'premiere_impression' => 'remarque',
            'rythme'              => 'vif',
        ]);

        $this->assertGreaterThan(0.0, $some['Bélier']);
        $this->assertLessThanOrEqual(1.0, max($some));
    }

    /**
     * Spec §7.3: the quiz is capped at ten percent of the score. Enforced as
     * arithmetic, not as a guideline — this is what makes "départage
     * uniquement" true.
     */
    public function testQuizContributionIsHardCapped(): void
    {
        $scores = TemperamentQuiz::signScores($this->unanimousQuizFor('Balance'));
        $profile = RectificationFixtures::level1Angles()['paris_summer_time'];

        $ceiling = RectificationConfig::TEMPERAMENT_QUIZ_MAX_SHARE
            * RectificationConfig::MAX_LOG_CONTRIBUTION;

        $window = BirthWindow::fullDay(
            $profile['local_date'],
            $profile['utc_offset'],
            $profile['latitude'],
            $profile['longitude'],
        );

        foreach ($window->candidates() as $candidate) {
            $contribution = TemperamentQuiz::logContributionFor(
                $candidate,
                $scores,
                $profile['latitude'],
                $profile['longitude'],
            );

            $this->assertLessThanOrEqual(
                $ceiling + 1e-9,
                abs($contribution),
                'Le quiz dépasse son plafond : il pourrait renverser les événements.'
            );
        }
    }

    /**
     * A quiz that likes every sign equally must contribute nothing rather than
     * a uniform nudge.
     */
    public function testUninformativeQuizContributesNothing(): void
    {
        $profile = RectificationFixtures::level1Angles()['paris_summer_time'];
        $flat    = array_fill_keys(\App\Service\PlanetaryCalculator::SIGNS_FR, 0.5);

        $contribution = TemperamentQuiz::logContributionFor(
            self::candidateAtHour(9),
            $flat,
            $profile['latitude'],
            $profile['longitude'],
        );

        $this->assertSame(0.0, $contribution);
    }

    /** The quiz must not be able to move a well-supported estimate. */
    public function testQuizCannotOverturnTheEvents(): void
    {
        $profile = RectificationFixtures::level1Angles()['paris_summer_time'];
        $window  = BirthWindow::fullDay(
            $profile['local_date'],
            $profile['utc_offset'],
            $profile['latitude'],
            $profile['longitude'],
        );

        $engine = new RectificationEngine();
        $events = $this->signalEvents(8);

        $without = $engine->run($window, $events);

        // A quiz pointing hard at whatever sign the answer is *not*.
        $wrongSign = $this->signOtherThan($without, $profile);
        $with      = $engine->run($window, $events, $this->unanimousQuizFor($wrongSign));

        $this->assertSame(
            $without->estimate()['time'],
            $with->estimate()['time'],
            'Un quiz contradictoire ne doit pas déplacer une heure soutenue par les événements.'
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Secondary progressions
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Secondary progression is not solar arc.
     *
     * Under solar arc every point advances by the Sun's arc — about a degree a
     * year for all of them. Under secondary progression the chart is recast, so
     * the Moon moves about a degree a *month* of life. Confusing the two is the
     * first error spec §11 names, and this is the measurement that separates
     * them.
     */
    public function testProgressedMoonMovesADegreePerMonthNotPerYear(): void
    {
        SecondaryProgression::clearCache();

        $profile  = RectificationFixtures::level1Angles()['paris_summer_time'];
        $natalUtc = RectificationFixtures::toUtc($profile);

        $atBirth = SecondaryProgression::chartFor($natalUtc, $natalUtc, $profile['latitude'], $profile['longitude'])
            ->getMoon()['longitude'];

        $tenYearsOn = SecondaryProgression::chartFor(
            $natalUtc,
            $natalUtc->modify('+10 years'),
            $profile['latitude'],
            $profile['longitude'],
        )->getMoon()['longitude'];

        // Ten years of life = about 120 degrees of progressed Moon, i.e. a third
        // of the zodiac. A solar-arc displacement would be about 10 degrees.
        $travelled = \App\Service\Rectification\Ephemeris::signedDelta($atBirth, $tenYearsOn);
        $travelled = $travelled < 0 ? $travelled + 360.0 : $travelled;

        $this->assertGreaterThan(100.0, $travelled, 'La Lune progressée avance ~1°/mois de vie.');
        $this->assertLessThan(145.0, $travelled);
    }

    /**
     * The progressed instant is one day after birth per year lived — a few days
     * after birth for an adult, not a few years.
     */
    public function testProgressedInstantIsDaysNotYearsAfterBirth(): void
    {
        $profile  = RectificationFixtures::level1Angles()['paris_summer_time'];
        $natalUtc = RectificationFixtures::toUtc($profile);

        $instant = SecondaryProgression::instantFor($natalUtc, $natalUtc->modify('+40 years'));

        $daysAfterBirth = ($instant->getTimestamp() - $natalUtc->getTimestamp()) / 86400.0;

        $this->assertEqualsWithDelta(40.0, $daysAfterBirth, 0.5);
    }

    /**
     * The progressed angles are what make this technique discriminating: two
     * candidate birth times minutes apart must give progressed angles degrees
     * apart, because the recast chart's Ascendant has gone round many times.
     */
    public function testProgressedAnglesAreSensitiveToTheCandidateTime(): void
    {
        SecondaryProgression::clearCache();

        $profile  = RectificationFixtures::level1Angles()['paris_summer_time'];
        $natalUtc = RectificationFixtures::toUtc($profile);
        $date     = $natalUtc->modify('+30 years');

        $a = SecondaryProgression::chartFor($natalUtc, $date, $profile['latitude'], $profile['longitude'])
            ->getAscendant()['longitude'];
        $b = SecondaryProgression::chartFor($natalUtc->modify('+10 minutes'), $date, $profile['latitude'], $profile['longitude'])
            ->getAscendant()['longitude'];

        $separation = abs(\App\Service\PlanetaryCalculator::separation($a, $b));

        $this->assertGreaterThan(
            1.0,
            $separation,
            'Dix minutes d\'écart natal doivent déplacer l\'ASC progressé de plus d\'un degré.'
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    private static function candidateAtHour(int $hour): Candidate
    {
        $local = new \DateTimeImmutable(sprintf('1985-07-14 %02d:00:00', $hour), new \DateTimeZone('UTC'));

        return new Candidate($hour, $local, $local);
    }

    /** @return array<string, string> */
    private function unanimousQuizFor(string $sign): array
    {
        $answers = [];

        foreach (TemperamentQuiz::QUESTIONS as $question) {
            foreach ($question['options'] as $option) {
                if (in_array($sign, $option['signs'], true)) {
                    $answers[$question['key']] = $option['key'];
                    break;
                }
            }
        }

        return $answers;
    }

    private function signOtherThan(
        \App\Service\Rectification\RectificationResult $result,
        array $profile,
    ): string {
        $points = $result->posterior->mode()->points($profile['latitude'], $profile['longitude']);
        $actual = \App\Service\PlanetaryCalculator::SIGNS_FR[(int) floor($points['Ascendant'] / 30)];

        foreach (\App\Service\PlanetaryCalculator::SIGNS_FR as $sign) {
            if ($sign !== $actual) {
                return $sign;
            }
        }

        return 'Balance';
    }

    /** @return list<LifeEvent> */
    private function signalEvents(int $count): array
    {
        $reflection = new \ReflectionMethod(RectificationEngineTest::class, 'signalEvents');
        $reflection->setAccessible(true);

        return $reflection->invoke(
            new RectificationEngineTest('signalEvents'),
            RectificationFixtures::level1Angles()['paris_summer_time'],
            $count,
            LifeEvent::PRECISION_DAY,
        );
    }
}
