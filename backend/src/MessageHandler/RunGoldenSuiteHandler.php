<?php

namespace App\MessageHandler;

use App\Message\RunGoldenSuiteMessage;
use App\Repository\EvalRunRepository;
use App\Service\Eval\GoldenCaseRunner;
use Symfony\Component\Messenger\Attribute\AsMessageHandler;

#[AsMessageHandler]
final class RunGoldenSuiteHandler
{
    public function __construct(
        private EvalRunRepository $runRepo,
        private GoldenCaseRunner $runner,
    ) {}

    public function __invoke(RunGoldenSuiteMessage $message): void
    {
        $run = $this->runRepo->find($message->runId);
        if ($run === null) {
            return;
        }
        $this->runner->run($run);
    }
}
