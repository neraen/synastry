<?php

namespace App\Command;

use App\Service\AstroNotificationEngine;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:notifications:process-sky-events',
    description: 'Manually trigger sky event notifications (without waiting for the scheduler)',
)]
class ProcessSkyEventsCommand extends Command
{
    public function __construct(
        private AstroNotificationEngine $engine,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $io->info('Processing sky event notifications…');

        $this->engine->processSkyEvents();

        $io->success('Done.');
        return Command::SUCCESS;
    }
}
