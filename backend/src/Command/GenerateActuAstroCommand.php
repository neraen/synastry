<?php

namespace App\Command;

use App\Service\Astro\ActuAstroService;
use App\Service\Astro\MoodService;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * Backfill / manually generate the Actu astro feed and mood corpus for a month.
 *
 *   php bin/console app:actu:generate 2026-06 --locale=fr
 *   php bin/console app:actu:generate            # current month, fr+en
 *   php bin/console app:actu:generate --mood-only
 */
#[AsCommand(
    name: 'app:actu:generate',
    description: 'Detect events + generate collective prose and mood corpus (cached).',
)]
class GenerateActuAstroCommand extends Command
{
    public function __construct(
        private ActuAstroService $actuAstroService,
        private MoodService $moodService,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addArgument('month', InputArgument::OPTIONAL, 'Month as YYYY-MM (default: current month)')
            ->addOption('locale', null, InputOption::VALUE_REQUIRED, 'Locale(s), comma-separated', 'fr,en')
            ->addOption('mood-only', null, InputOption::VALUE_NONE, 'Only (re)generate the mood corpus');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $locales = array_filter(array_map('trim', explode(',', (string) $input->getOption('locale'))));

        $monthArg = $input->getArgument('month');
        if (is_string($monthArg) && preg_match('/^(\d{4})-(\d{2})$/', $monthArg, $m)) {
            $year = (int) $m[1];
            $month = (int) $m[2];
        } else {
            $now = new \DateTimeImmutable();
            $year = (int) $now->format('Y');
            $month = (int) $now->format('n');
        }

        foreach ($locales as $locale) {
            $io->section("Locale: {$locale}");

            $io->writeln('Mood corpus…');
            $mood = $this->moodService->ensureCorpus($locale);
            $io->writeln(sprintf('  generated=%d skipped=%d failed=%d', $mood['generated'], $mood['skipped'], $mood['failed']));

            if (!$input->getOption('mood-only')) {
                $io->writeln(sprintf('Actu astro %04d-%02d…', $year, $month));
                $stats = $this->actuAstroService->generateMonth($locale, $year, $month);
                $io->writeln(sprintf('  detected=%d created=%d prosed=%d', $stats['detected'], $stats['created'], $stats['prosed']));
            }
        }

        $io->success('Done.');
        return Command::SUCCESS;
    }
}
