<?php

namespace App\Command;

use App\Repository\NotificationLogRepository;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:notifications:stats',
    description: 'Show notification statistics (today and this week)',
)]
class NotificationStatsCommand extends Command
{
    public function __construct(
        private NotificationLogRepository $logRepository,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        $today     = new \DateTime('today');
        $weekStart = new \DateTime('monday this week');

        $todayStats = $this->logRepository->getStatsByType($today);
        $weekStats  = $this->logRepository->getStatsByType($weekStart);

        $io->title('Notification Statistics');

        $io->section('Today');
        if (empty($todayStats)) {
            $io->text('No notifications sent today.');
        } else {
            $io->table(['Type', 'Count'], array_map(fn($r) => [$r['type'], $r['count']], $todayStats));
        }

        $io->section('This week');
        if (empty($weekStats)) {
            $io->text('No notifications sent this week.');
        } else {
            $io->table(['Type', 'Count'], array_map(fn($r) => [$r['type'], $r['count']], $weekStats));
        }

        return Command::SUCCESS;
    }
}
