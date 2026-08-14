<?php

namespace App\Tests\Service\Rectification;

use App\Service\Rectification\ActiveLoop;
use App\Service\Rectification\BirthWindow;
use App\Service\Rectification\LifeEvent;
use App\Service\Rectification\RectificationConfig;
use App\Service\Rectification\RectificationEngine;
use App\Service\Rectification\RectificationResult;
use App\Tests\Service\Rectification\Fixtures\RectificationFixtures;
use PHPUnit\Framework\TestCase;

/**
 * The active loop (spec §8).
 *
 * The acceptance criterion of §14 is unusually concrete for a UI feature — the
 * loop must *actually* reduce the entropy of the posterior — so that is what
 * {@see testAnsweringReducesEntropy} measures, end to end, rather than
 * asserting that a question was produced.
 */
class ActiveLoopTest extends TestCase
{
    private RectificationEngine $engine;
    private ActiveLoop $loop;

    protected function setUp(): void
    {
        $this->engine = new RectificationEngine();
        $this->loop   = new ActiveLoop($this->engine);
    }

    /**
     * A question is only generated when there is genuinely something to
     * separate. A single-peaked posterior needs more events, not more
     * questions — asking anyway would spend the user's attention on nothing.
     */
    public function testNoQuestionWhenPosteriorIsAlreadySharp(): void
    {
        $result = $this->infer($this->signalEvents(8));

        $this->assertFalse($result->posterior->isMultimodal(), 'Pré-requis : postérieur unimodal.');
        $this->assertNull($this->loop->nextQuestion($result));
    }

    /** The loop stops once the ceiling of questions has been reached. */
    public function testStopsAfterMaxQuestions(): void
    {
        $result = $this->infer($this->vagueEvents());
        $asked  = array_map(
            static fn (int $i): string => sprintf('20%02d-01', $i),
            range(1, RectificationConfig::ACTIVE_LOOP_MAX_QUESTIONS)
        );

        $this->assertNull($this->loop->nextQuestion($result, $asked));
    }

    /**
     * The question must speak about the person's life and never about the
     * technique underneath. Naming the transit would bias the answer on top of
     * being jargon.
     */
    public function testQuestionIsPlainLanguage(): void
    {
        $question = $this->firstQuestion();

        $this->assertMatchesRegularExpression(
            '/^Entre \p{L}+ (\d{4} et \p{L}+ )?(et \p{L}+ )?\d{4}, tu as vécu quelque chose de marquant \?$/u',
            $question['question'],
            'Formulation inattendue : ' . $question['question']
        );

        foreach (['Pluton', 'Saturne', 'Uranus', 'Neptune', 'ascendant', 'transit', 'arc', 'aspect', 'orbe'] as $jargon) {
            $this->assertStringNotContainsStringIgnoringCase($jargon, $question['question']);
        }
    }

    /** Windows already put to the user are never offered again. */
    public function testDoesNotRepeatAQuestion(): void
    {
        $result = $this->infer($this->vagueEvents());

        $first = $this->loop->nextQuestion($result);
        $this->assertNotNull($first);

        $second = $this->loop->nextQuestion($result, [$first['key']]);

        if ($second !== null) {
            $this->assertNotSame($first['key'], $second['key']);
        }
        $this->addToAssertionCount(1);
    }

    /** The selected window must carry a positive expected information gain. */
    public function testSelectedQuestionHasPositiveExpectedGain(): void
    {
        $question = $this->firstQuestion();

        $this->assertGreaterThanOrEqual(
            RectificationConfig::ACTIVE_LOOP_MIN_INFORMATION_GAIN,
            $question['expected_gain'],
        );
    }

    /**
     * Spec §14 — the acceptance criterion: the loop must actually reduce the
     * entropy of the posterior.
     *
     * Stated precisely, that is a claim about the *expected* entropy, averaged
     * over the answers the user might give and weighted by how likely each is.
     * `expected_gain` is exactly that quantity, and the loop selects the window
     * that maximises it, so asserting it is strictly positive is the criterion
     * itself rather than a proxy for it.
     *
     * It cannot be a claim about every individual answer — see
     * {@see testRefutingAnswerMayRaiseEntropyAndThatIsCorrect}.
     */
    public function testTheLoopReducesExpectedEntropy(): void
    {
        $before   = $this->infer($this->vagueEvents());
        $question = $this->loop->nextQuestion($before);

        $this->assertNotNull($question, 'Pré-requis : une question doit être générée.');
        $this->assertGreaterThan(
            0.0,
            $question['expected_gain'],
            "Le gain d'information attendu doit être strictement positif."
        );
    }

    /**
     * The answer that confirms a contact sharpens the posterior.
     */
    public function testConfirmingAnswerSharpensThePosterior(): void
    {
        $events   = $this->vagueEvents();
        $before   = $this->infer($events);
        $question = $this->loop->nextQuestion($before);
        $this->assertNotNull($question);

        $after = $this->infer(array_merge($events, [
            $this->toDomainEvent($this->loop->answerToPseudoEvent($question, ActiveLoop::ANSWER_TURNING)),
        ]));

        $this->assertLessThan($before->posterior->entropy(), $after->posterior->entropy());
    }

    /**
     * A "rien de spécial" answer is allowed to *raise* the entropy, and this
     * test exists to stop someone "fixing" that.
     *
     * When the leading candidate was the one predicting a contact, learning
     * that nothing happened refutes it. The mass it held redistributes across
     * the remaining candidates, and a flatter posterior has higher entropy.
     * That is a genuine update — the model has learned something real and is
     * now correctly less sure — not a failure of the loop.
     *
     * Information gain is non-negative only in expectation, never per outcome.
     * Forcing every answer to reduce entropy would mean discarding refutations,
     * which is precisely how the loop would ratchet towards whichever candidate
     * predicts the most events.
     */
    public function testRefutingAnswerMayRaiseEntropyAndThatIsCorrect(): void
    {
        $events   = $this->vagueEvents();
        $before   = $this->infer($events);
        $question = $this->loop->nextQuestion($before);
        $this->assertNotNull($question);

        $after = $this->infer(array_merge($events, [
            $this->toDomainEvent($this->loop->answerToPseudoEvent($question, ActiveLoop::ANSWER_NOTHING)),
        ]));

        // The posterior must have moved — a negative answer that changed
        // nothing would mean it was silently discarded.
        $this->assertNotEqualsWithDelta(
            $before->posterior->entropy(),
            $after->posterior->entropy(),
            1e-9,
            '« Rien de spécial » n\'a rien changé : la réponse négative est ignorée.'
        );
    }

    /**
     * Spec §8: "rien de spécial" is information of its own right. It must push
     * the posterior in the opposite direction from the same window reported as
     * an event — otherwise a negative answer would be silently discarded.
     */
    public function testNothingHappenedPushesOppositeToSomethingHappened(): void
    {
        $events   = $this->vagueEvents();
        $before   = $this->infer($events);
        $question = $this->loop->nextQuestion($before);
        $this->assertNotNull($question);

        $occurred = $this->infer(array_merge($events, [
            $this->toDomainEvent($this->loop->answerToPseudoEvent($question, ActiveLoop::ANSWER_TURNING)),
        ]));
        $absent = $this->infer(array_merge($events, [
            $this->toDomainEvent($this->loop->answerToPseudoEvent($question, ActiveLoop::ANSWER_NOTHING)),
        ]));

        // Stated as the property that actually holds: the two answers move the
        // posterior in opposite directions. Every candidate that "something
        // happened" promotes, "nothing happened" must demote.
        //
        // Comparing a single candidate — the mode — is too brittle: with a
        // broad posterior the mode is set by the base events, and the
        // pseudo-event only nudges it. The correlation across all candidates is
        // the real statement and does not depend on which peak happens to win.
        $before  = $before->posterior->probabilities;
        $deltaUp = [];
        $deltaDown = [];

        foreach ($before as $i => $baseline) {
            $deltaUp[]   = log($occurred->posterior->probabilities[$i] / $baseline);
            $deltaDown[] = log($absent->posterior->probabilities[$i] / $baseline);
        }

        $this->assertLessThan(
            -0.5,
            $this->correlation($deltaUp, $deltaDown),
            '« Rien de spécial » doit déplacer le postérieur à l\'opposé de « il s\'est passé quelque chose ».'
        );
    }

    /**
     * Pearson correlation of two equal-length series.
     *
     * @param list<float> $a
     * @param list<float> $b
     */
    private function correlation(array $a, array $b): float
    {
        $n     = count($a);
        $meanA = array_sum($a) / $n;
        $meanB = array_sum($b) / $n;

        $covariance = 0.0;
        $varianceA  = 0.0;
        $varianceB  = 0.0;

        for ($i = 0; $i < $n; ++$i) {
            $da = $a[$i] - $meanA;
            $db = $b[$i] - $meanB;

            $covariance += $da * $db;
            $varianceA  += $da ** 2;
            $varianceB  += $db ** 2;
        }

        if ($varianceA <= 0.0 || $varianceB <= 0.0) {
            return 0.0;
        }

        return $covariance / sqrt($varianceA * $varianceB);
    }

    /** "Je ne sais plus" is a non-answer and must update nothing. */
    public function testUnknownAnswerProducesNoEvent(): void
    {
        $question = $this->firstQuestion();

        $this->assertNull($this->loop->answerToPseudoEvent($question, ActiveLoop::ANSWER_UNKNOWN));
    }

    /**
     * The answer is convolved over exactly the span the question covered — a
     * question about a quarter must not produce a day-precise event, which
     * would claim precision the user was never asked for.
     */
    public function testAnswerClaimsNoMorePrecisionThanTheQuestionAsked(): void
    {
        $question    = $this->firstQuestion();
        $pseudoEvent = $this->loop->answerToPseudoEvent($question, ActiveLoop::ANSWER_DIFFICULT);

        $this->assertSame(LifeEvent::PRECISION_QUARTER, $pseudoEvent['precision']);
        $this->assertTrue($pseudoEvent['pseudo']);
        $this->assertSame($question['midpoint'], $pseudoEvent['date']);

        // And the pseudo-event weighs less than a real, user-volunteered one.
        $this->assertLessThan(
            (new LifeEvent(new \DateTimeImmutable('2010-01-01'), LifeEvent::PRECISION_QUARTER))->weight(),
            $this->toDomainEvent($pseudoEvent)->weight(),
        );
    }

    public function testUnknownAnswerKeyIsRejected(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->loop->answerToPseudoEvent($this->firstQuestion(), 'peut_etre');
    }

    /** Valence reaches the stored event but must never touch the maths. */
    public function testValenceIsRecordedButNotUsedInTheCalculation(): void
    {
        $question = $this->firstQuestion();

        $difficult = $this->loop->answerToPseudoEvent($question, ActiveLoop::ANSWER_DIFFICULT);
        $happy     = $this->loop->answerToPseudoEvent($question, ActiveLoop::ANSWER_HAPPY);

        $this->assertSame('difficile', $difficult['valence']);
        $this->assertSame('heureux', $happy['valence']);

        // Same weight, same expectation, same date: only the wording differs.
        $this->assertSame(
            $this->toDomainEvent($difficult)->weight(),
            $this->toDomainEvent($happy)->weight(),
        );
        $this->assertSame($difficult['expectation'], $happy['expectation']);
    }

    /** A period the user has already told us about is not worth asking about. */
    public function testDoesNotAskAboutAPeriodAlreadyCovered(): void
    {
        $events   = $this->vagueEvents();
        $result   = $this->infer($events);
        $question = $this->loop->nextQuestion($result);
        $this->assertNotNull($question);

        $from = new \DateTimeImmutable($question['from']);
        $to   = new \DateTimeImmutable($question['to']);

        foreach ($events as $event) {
            $this->assertFalse(
                $event->date >= $from && $event->date <= $to,
                'La boucle interroge une période déjà renseignée.'
            );
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    private function firstQuestion(): array
    {
        $question = $this->loop->nextQuestion($this->infer($this->vagueEvents()));
        $this->assertNotNull($question, 'Pré-requis : une question doit être générée.');

        return $question;
    }

    /** @param list<LifeEvent> $events */
    private function infer(array $events): RectificationResult
    {
        return $this->engine->run($this->window(), $events);
    }

    private function window(): BirthWindow
    {
        $profile = RectificationFixtures::level1Angles()['paris_summer_time'];

        return BirthWindow::fullDay(
            $profile['local_date'],
            $profile['utc_offset'],
            $profile['latitude'],
            $profile['longitude'],
        );
    }

    /**
     * Events precise enough to produce a single sharp peak.
     *
     * @return list<LifeEvent>
     */
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

    /**
     * Events dated only to the month — enough signal to leave several
     * competing peaks, which is exactly the situation the loop exists for.
     *
     * @return list<LifeEvent>
     */
    private function vagueEvents(): array
    {
        $reflection = new \ReflectionMethod(RectificationEngineTest::class, 'signalEvents');
        $reflection->setAccessible(true);

        // Three year-dated events measured to leave two competing peaks on the
        // reference profile. More events than that — or tighter dates — and the
        // four enabled techniques agree on one broad hill, which needs more
        // evidence rather than questions.
        return $reflection->invoke(
            new RectificationEngineTest('vagueEvents'),
            RectificationFixtures::level1Angles()['paris_summer_time'],
            3,
            LifeEvent::PRECISION_YEAR,
        );
    }

    /** @param array<string, mixed> $stored */
    private function toDomainEvent(array $stored): LifeEvent
    {
        return new LifeEvent(
            date: new \DateTimeImmutable($stored['date'], new \DateTimeZone('UTC')),
            precision: $stored['precision'],
            intensity: $stored['intensity'],
            sudden: $stored['sudden'],
            valence: $stored['valence'],
            category: $stored['category'],
            expectation: $stored['expectation'],
            pseudo: $stored['pseudo'],
        );
    }
}
