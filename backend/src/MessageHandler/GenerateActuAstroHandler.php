<?php

namespace App\MessageHandler;

use App\Message\GenerateActuAstroMessage;
use App\Service\Astro\ActuAstroService;
use App\Service\Astro\MoodService;
use Psr\Log\LoggerInterface;
use Symfony\Component\Messenger\Attribute\AsMessageHandler;

#[AsMessageHandler]
final class GenerateActuAstroHandler
{
    public function __construct(
        private ActuAstroService $actuAstroService,
        private MoodService $moodService,
        private LoggerInterface $logger,
    ) {
    }

    public function __invoke(GenerateActuAstroMessage $message): void
    {
        // Which months to (re)generate. Default: current + next, so the feed is
        // always populated a month ahead.
        $months = [];
        if ($message->year !== null && $message->month !== null) {
            $months[] = [$message->year, $message->month];
        } else {
            $now  = new \DateTimeImmutable('now', new \DateTimeZone('UTC'));
            $next = $now->modify('first day of next month');
            $months[] = [(int) $now->format('Y'), (int) $now->format('n')];
            $months[] = [(int) $next->format('Y'), (int) $next->format('n')];
        }

        foreach ($message->locales as $locale) {
            // Mood corpus is locale-wide (not month-specific): fill any gaps once.
            try {
                $mood = $this->moodService->ensureCorpus($locale);
                $this->logger->info('Mood corpus ensured', ['locale' => $locale] + $mood);
            } catch (\Throwable $e) {
                $this->logger->error('Mood corpus generation failed', ['locale' => $locale, 'msg' => $e->getMessage()]);
            }

            foreach ($months as [$year, $month]) {
                try {
                    $stats = $this->actuAstroService->generateMonth($locale, $year, $month);
                    $this->logger->info('Actu astro month generated', [
                        'locale' => $locale, 'month' => sprintf('%04d-%02d', $year, $month),
                    ] + $stats);
                } catch (\Throwable $e) {
                    $this->logger->error('Actu astro month generation failed', [
                        'locale' => $locale, 'month' => sprintf('%04d-%02d', $year, $month), 'msg' => $e->getMessage(),
                    ]);
                }
            }
        }
    }
}
