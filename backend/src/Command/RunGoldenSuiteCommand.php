<?php

namespace App\Command;

use App\Entity\EvalRun;
use App\Service\Eval\GoldenCaseRunner;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * Synchronous fallback / manual trigger for a golden evaluation run.
 * The admin UI normally enqueues RunGoldenSuiteMessage instead.
 */
#[AsCommand(name: 'app:eval:run-golden', description: 'Run the golden evaluation suite synchronously.')]
class RunGoldenSuiteCommand extends Command
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly GoldenCaseRunner $runner,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->addOption('run', null, InputOption::VALUE_REQUIRED, 'Existing EvalRun id to execute (otherwise a new run is created).');
        $this->addOption('label', null, InputOption::VALUE_REQUIRED, 'Label for a newly created run.');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        $runId = $input->getOption('run');
        if ($runId) {
            $run = $this->em->getRepository(EvalRun::class)->find((int) $runId);
            if (!$run) {
                $io->error("EvalRun #$runId not found.");
                return Command::FAILURE;
            }
        } else {
            $run = new EvalRun('golden', $input->getOption('label') ?? 'CLI ' . date('Y-m-d H:i'));
            $this->em->persist($run);
            $this->em->flush();
        }

        $io->title('Golden suite — run #' . $run->getId());
        $this->runner->run($run);

        $io->success(sprintf(
            'Status: %s · cases: %d · avg: %s · cost: $%s',
            $run->getStatus(),
            $run->getCaseCount(),
            $run->getAvgScore() !== null ? (string) $run->getAvgScore() : 'n/a',
            $run->getTotalCostUsd(),
        ));

        return $run->getStatus() === EvalRun::STATUS_COMPLETED ? Command::SUCCESS : Command::FAILURE;
    }
}
