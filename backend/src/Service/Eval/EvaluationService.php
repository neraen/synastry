<?php

namespace App\Service\Eval;

use App\Entity\EvalGoldenCase;
use App\Entity\EvalResult;
use App\Entity\EvalRun;
use App\Entity\EvalScore;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Single scoring engine shared by the golden suite and production scoring.
 * Runs deterministic checks (always) + the LLM judge (optional), blends a
 * composite score, and persists an {@see EvalResult} with per-criterion
 * {@see EvalScore} children.
 */
class EvaluationService
{
    /** Composite weighting when a judge score is available. */
    private const W_JUDGE = 0.6;
    private const W_DETERMINISTIC = 0.4;

    public function __construct(
        private readonly DeterministicChecker $checker,
        private readonly LlmJudgeService $judge,
        private readonly EntityManagerInterface $em,
    ) {
    }

    /**
     * @param array<string,mixed>|string $output
     * @param array{
     *   source?:string, runJudge?:bool, user?:?User,
     *   referenceType?:?string, referenceId?:?string,
     *   inputData?:array<string,mixed>|string|null, expectations?:array<string,mixed>,
     *   evalRun?:?EvalRun, goldenCase?:?EvalGoldenCase
     * } $options
     */
    public function evaluate(string $generationType, array|string|null $input, array|string $output, array $options = []): EvalResult
    {
        $source        = $options['source'] ?? 'production';
        $runJudge      = $options['runJudge'] ?? false;
        $expectations  = $options['expectations'] ?? [];

        $result = new EvalResult($source, $generationType);
        $result->setReferenceType($options['referenceType'] ?? null)
            ->setReferenceId($options['referenceId'] ?? null)
            ->setUser($options['user'] ?? null)
            ->setEvalRun($options['evalRun'] ?? null)
            ->setGoldenCase($options['goldenCase'] ?? null)
            ->setInputData($this->asArray($options['inputData'] ?? $input))
            ->setOutputData($this->asArray($output));

        // ── Deterministic ───────────────────────────────────────────────────
        $det = $this->checker->check($generationType, $output, $expectations);
        foreach ($det['scores'] as $s) {
            $result->addScore(new EvalScore('deterministic', $s['criterion'], $s['score'], $s['maxScore'], $s['rationale']));
        }
        $result->setDeterministicScore($det['aggregate']);
        $result->setPassed($det['passed']);

        // ── LLM judge (optional) ────────────────────────────────────────────
        $judgeScore = null;
        if ($runJudge) {
            $j = $this->judge->judge($generationType, $input ?? [], $output);
            if ($j['ok']) {
                foreach ($j['scores'] as $s) {
                    $result->addScore(new EvalScore('judge', $s['criterion'], $s['score'], $s['maxScore'], $s['rationale']));
                }
                $judgeScore = $j['overall'];
                $result->setJudgeScore($judgeScore);
                $result->setJudgeModel($j['model']);
                $result->setJudgeCostUsd($j['costUsd']);
            } else {
                // Record the failure as a judge criterion so it's visible.
                $result->addScore(new EvalScore('judge', 'judge_error', 0, 1, $j['error']));
                $result->setJudgeModel($j['model']);
            }
        }

        // ── Composite ───────────────────────────────────────────────────────
        $detPct = $det['aggregate'] * 100;
        $composite = $judgeScore !== null
            ? self::W_JUDGE * $judgeScore + self::W_DETERMINISTIC * $detPct
            : $detPct;
        // A hard deterministic gate failure caps the composite.
        if (!$det['passed']) {
            $composite = min($composite, 49.0);
        }
        $result->setCompositeScore(round($composite, 1));

        $this->em->persist($result);

        return $result;
    }

    private function asArray(mixed $v): ?array
    {
        if ($v === null) {
            return null;
        }
        if (is_array($v)) {
            return $v;
        }
        return ['text' => (string) $v];
    }
}
