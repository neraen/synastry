<?php

namespace App\Command;

use App\Service\AstroNotificationEngine;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:notifications:process-transits',
    description: 'Manually trigger personal transit notifications (without waiting for the scheduler)',
)]
class ProcessTransitsCommand extends Command
{
    public function __construct(
        private AstroNotificationEngine $engine,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $io->info('Processing personal transit notifications…');

        $this->engine->processPersonalTransits();

        $io->success('Done.');
        return Command::SUCCESS;
    }
}
