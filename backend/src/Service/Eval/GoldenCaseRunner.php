<?php

namespace App\Service\Eval;

use App\Entity\EvalGoldenCase;
use App\Entity\EvalResult;
use App\Entity\EvalRun;
use App\Repository\EvalGoldenCaseRepository;
use App\Service\Webservice\OpenAiService;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Executes the golden suite: replays each active case's stored prompt through
 * the REAL generation methods, scores the output, and persists results +
 * denormalized run aggregates. Cost is rolled up via LlmCallLog.evalRun.
 *
 * Golden cases operate at the prompt level (prompt in → LLM output → score),
 * so runs are reproducible without DB/ephemeris fixtures.
 */
class GoldenCaseRunner
{
    public function __construct(
        private readonly OpenAiService $openAiService,
        private readonly EvaluationService $evaluator,
        private readonly LlmCallRecorder $recorder,
        private readonly EvalGoldenCaseRepository $caseRepo,
        private readonly EntityManagerInterface $em,
    ) {
    }

    public function run(EvalRun $run): void
    {
        $run->setStatus(EvalRun::STATUS_RUNNING)->setStartedAt(new \DateTimeImmutable());
        $this->em->flush();

        $cases = $this->caseRepo->findActive();
        $run->setCaseCount(count($cases));

        $this->openAiService->setLocale('fr');
        $this->recorder->setEvalRun($run);

        $scoreSum = 0.0;
        $scored   = 0;

        try {
            foreach ($cases as $case) {
                $result = $this->runCase($case, $run);
                if ($result->getCompositeScore() !== null) {
                    $scoreSum += $result->getCompositeScore();
                    $scored++;
                }
            }

            $run->setAvgScore($scored > 0 ? round($scoreSum / $scored, 1) : null);
            $run->setTotalCostUsd($this->sumRunCost($run));
            $run->setStatus(EvalRun::STATUS_COMPLETED);
        } catch (\Throwable $e) {
            $run->setStatus(EvalRun::STATUS_FAILED)->setErrorMessage($e->getMessage());
        } finally {
            $this->recorder->setEvalRun(null);
            $run->setFinishedAt(new \DateTimeImmutable());
            $this->em->flush();
        }
    }

    private function runCase(EvalGoldenCase $case, EvalRun $run): EvalResult
    {
        $type  = $case->getGenerationType();
        $input = $case->getInputData();

        $this->recorder->setContext($type, 'EvalGoldenCase', (string) $case->getId());

        try {
            [$output, $promptForJudge] = $this->generate($type, $input);
        } catch (\Throwable $e) {
            $output = ['error' => $e->getMessage()];
            $promptForJudge = $input;
        } finally {
            $this->recorder->setContext($type); // keep type, drop ref
        }

        $result = $this->evaluator->evaluate($type, $promptForJudge, $output, [
            'source'       => 'golden',
            'runJudge'     => true,
            'goldenCase'   => $case,
            'evalRun'      => $run,
            'expectations' => $case->getExpectations() ?? [],
            'inputData'    => $input,
        ]);

        // Per-case flush keeps progress durable for the polling UI.
        $this->em->flush();

        return $result;
    }

    /**
     * Dispatch to the real generation method and normalize the output to an array.
     *
     * @return array{0:array<string,mixed>,1:mixed} [output, inputForJudge]
     */
    private function generate(string $type, array $input): array
    {
        return match ($type) {
            'horoscope' => [
                $this->asArray($this->openAiService->generateDailyHoroscope((string) ($input['prompt'] ?? ''))['content'] ?? []),
                $input['prompt'] ?? null,
            ],
            'transits' => [
                ['transits' => $this->openAiService->getUpcomingTransits((string) ($input['prompt'] ?? ''))['transits'] ?? []],
                $input['prompt'] ?? null,
            ],
            'synastry_v2' => [
                ['analysis' => $this->openAiService->getCompatibilityAnalysisV2((string) ($input['prompt'] ?? ''), $input['scores'] ?? [])['analysis'] ?? []],
                $input['prompt'] ?? null,
            ],
            'cosmic_headline' => [
                $this->headline(),
                null,
            ],
            'natal_section' => [
                ['content' => $this->openAiService->generateNatalChartSection((string) ($input['input'] ?? ''), (string) ($input['instructions'] ?? ''))['content'] ?? ''],
                $input['input'] ?? null,
            ],
            'chat' => [
                ['text' => $this->openAiService->getChatResponse($input['messages'] ?? [], $input['userContext'] ?? [])['message'] ?? ''],
                $input['messages'] ?? null,
            ],
            default => [['error' => "Unsupported golden type: $type"], null],
        };
    }

    private function headline(): array
    {
        $r = $this->openAiService->getCosmicHeadline();
        return ['title' => $r['title'] ?? '', 'subtitle' => $r['subtitle'] ?? ''];
    }

    private function asArray(mixed $v): array
    {
        return is_array($v) ? $v : ['content' => (string) $v];
    }

    private function sumRunCost(EvalRun $run): string
    {
        $sum = (float) $this->em->createQuery(
            'SELECT COALESCE(SUM(l.estimatedCostUsd), 0) FROM App\Entity\LlmCallLog l WHERE l.evalRun = :run'
        )->setParameter('run', $run)->getSingleScalarResult();

        return number_format($sum, 6, '.', '');
    }
}
