<?php

namespace App\Command;

use App\Service\Rectification\BirthWindow;
use App\Service\Rectification\LifeEvent;
use App\Service\Rectification\PosteriorDistribution;
use App\Service\Rectification\RectificationConfig;
use App\Service\Rectification\RectificationEngine;
use App\Service\Rectification\RectificationResult;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * Outil de tuning du moteur de rectification (spec §13, étape 2 :
 * « exposé d'abord en ligne de commande pour itérer vite »).
 *
 *   # démo sur le profil de référence parisien, événements synthétiques
 *   php bin/console app:rectification:preview --demo
 *
 *   # validation en aveugle : l'heure connue est affichée mais jamais utilisée
 *   php bin/console app:rectification:preview --events=var/events.json --blind=03:20
 *
 * Format du fichier d'événements :
 *   {
 *     "birth_date": "1985-07-14", "utc_offset": 2,
 *     "latitude": 48.8566, "longitude": 2.3522,
 *     "window": [0, 24],
 *     "events": [
 *       {"date": "2001-11-01", "precision": "day", "intensity": "life_changing",
 *        "sudden": true, "category": "accident", "title": "Accident de voiture"}
 *     ]
 *   }
 */
#[AsCommand(
    name: 'app:rectification:preview',
    description: 'Estime une heure de naissance à partir d\'événements de vie, et affiche le postérieur et les garde-fous.',
)]
class RectificationPreviewCommand extends Command
{
    public function __construct(private readonly RectificationEngine $engine)
    {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addOption('events', null, InputOption::VALUE_REQUIRED, 'Fichier JSON d\'événements')
            ->addOption('demo', null, InputOption::VALUE_NONE, 'Jeu de démonstration (profil de référence parisien)')
            ->addOption('blind', null, InputOption::VALUE_REQUIRED, 'Heure réelle connue (HH:MM) — affichée pour mesurer l\'écart, jamais utilisée par le calcul');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        try {
            $payload = $input->getOption('demo')
                ? $this->demoPayload()
                : $this->loadPayload((string) $input->getOption('events'));
        } catch (\RuntimeException $e) {
            $io->error($e->getMessage());

            return Command::FAILURE;
        }

        [$window, $events] = $payload;

        $io->title('Rectification de l\'heure de naissance');
        $io->text(sprintf(
            'Fenêtre %s → %s (UTC%+g) · %d candidats à %d min · %d événements',
            $window->startLocal->format('Y-m-d H:i'),
            $window->endLocal->format('Y-m-d H:i'),
            $window->utcOffset,
            count($window->candidates()),
            RectificationConfig::GRID_STEP_MINUTES,
            count($events),
        ));

        $started = microtime(true);
        $result  = $this->engine->run($window, $events);
        $elapsed = microtime(true) - $started;

        $this->renderEstimate($io, $result);
        $this->renderDial($io, $result->posterior);
        $this->renderGuardRails($io, $result);
        $this->renderContributions($io, $result);

        if ($blind = $input->getOption('blind')) {
            $this->renderBlindComparison($io, $result, (string) $blind);
        }

        $io->comment(sprintf('Calculé en %.2f s', $elapsed));

        return Command::SUCCESS;
    }

    private function renderEstimate(SymfonyStyle $io, RectificationResult $result): void
    {
        $estimate = $result->estimate();

        $io->section('Résultat');

        switch ($result->status()) {
            case RectificationResult::STATUS_CONCLUSIVE:
                // Jamais un chiffre sec : l'heure ne s'affiche qu'avec son incertitude.
                $io->success(sprintf(
                    '%s · ±%d min · cohérence %d/100',
                    $estimate['time'],
                    $estimate['uncertainty_minutes'],
                    $estimate['coherence'],
                ));
                $io->text(sprintf('Intervalle crédible 80 %% : %s → %s', $estimate['from'], $estimate['to']));
                break;

            case RectificationResult::STATUS_MULTIMODAL:
                $times = array_map(
                    static fn (array $m): string => sprintf('%s (%.0f %%)', $m['time'], $m['probability'] * 100),
                    $result->candidateTimes(),
                );
                $io->warning('Plusieurs heures possibles : ' . implode(' ou ', $times));
                $io->text('Quelques questions ciblées permettraient de trancher (boucle active).');
                break;

            default:
                $io->warning(sprintf(
                    'Non concluant — cohérence %d/100, contraste %.1f×',
                    $result->coherenceScore(),
                    $result->posterior->contrast(),
                ));
                foreach ($result->whatWouldHelp() as $hint) {
                    $io->text('  → ' . $hint);
                }
        }
    }

    /**
     * Le cadran de précision du §6, en ASCII : la zone éclairée est la région
     * crédible à 80 %, le pic est le mode.
     */
    private function renderDial(SymfonyStyle $io, PosteriorDistribution $posterior): void
    {
        $columns = 72;
        $size    = $posterior->size();
        $region  = array_flip($posterior->credibleRegion());
        $peak    = max($posterior->probabilities);
        $mode    = $posterior->modeIndex();

        $line = '';
        for ($column = 0; $column < $columns; ++$column) {
            $from = (int) floor($column * $size / $columns);
            $to   = max($from + 1, (int) floor(($column + 1) * $size / $columns));

            $best      = 0.0;
            $inRegion  = false;
            $holdsMode = false;

            for ($i = $from; $i < $to && $i < $size; ++$i) {
                $best      = max($best, $posterior->probabilities[$i]);
                $inRegion  = $inRegion || isset($region[$i]);
                $holdsMode = $holdsMode || $i === $mode;
            }

            $line .= match (true) {
                $holdsMode          => '█',
                $inRegion           => '▓',
                $best > $peak * 0.1 => '▒',
                $best > $peak * 0.01 => '░',
                default             => '·',
            };
        }

        $io->section('Cadran de précision');
        $io->text($line);
        $io->text(sprintf(
            '±%d min · entropie normalisée %.3f · %d mode(s)',
            $posterior->uncertaintyMinutes(),
            $posterior->normalisedEntropy(),
            count($posterior->modes()),
        ));
    }

    private function renderGuardRails(SymfonyStyle $io, RectificationResult $result): void
    {
        $io->section('Garde-fous (§7.4)');

        $rows = [];
        foreach ($result->holdOutDetail() as $entry) {
            $event  = $result->events[$entry['event']];
            $rows[] = [
                $event->label(),
                $event->date->format('Y-m-d'),
                $event->precision,
                $entry['mode_stable'] ? 'oui' : 'NON',
                $entry['event_predicted'] ? 'oui' : 'NON',
                $entry['passed'] ? '✓' : '✗',
            ];
        }

        if ($rows !== []) {
            $io->table(['Événement', 'Date', 'Précision', 'Mode stable', 'Prédit au mode', ''], $rows);
        }

        $io->text(sprintf(
            'Cohérence %d/100 (seuil %d) · contraste %.1f× (seuil %.1f×)',
            $result->coherenceScore(),
            RectificationConfig::COHERENCE_THRESHOLD,
            $result->posterior->contrast(),
            RectificationConfig::CONTRAST_FACTOR,
        ));
    }

    private function renderContributions(SymfonyStyle $io, RectificationResult $result): void
    {
        if ($result->contributions === []) {
            return;
        }

        $io->section('Pourquoi cette heure (§9.2)');

        foreach (array_slice($result->contributions, 0, 5) as $contribution) {
            $io->text(sprintf(
                '  %s — %s %s %s, orbe %.2f°',
                $contribution['event']->label(),
                $contribution['moving'],
                $contribution['aspect'],
                $contribution['target'],
                $contribution['orb'],
            ));
        }
    }

    /**
     * Validation en aveugle (§10) : l'heure réelle n'entre jamais dans le
     * calcul, elle ne sert qu'à mesurer l'écart après coup.
     */
    private function renderBlindComparison(SymfonyStyle $io, RectificationResult $result, string $truth): void
    {
        $date     = $result->window->startLocal->format('Y-m-d');
        $timezone = new \DateTimeZone('UTC');

        $actual   = new \DateTimeImmutable("$date $truth", $timezone);
        $estimate = new \DateTimeImmutable($date . ' ' . $result->estimate()['time'], $timezone);

        $error = abs($actual->getTimestamp() - $estimate->getTimestamp()) / 60;

        $io->section('Validation en aveugle');
        $io->text(sprintf('Heure réelle %s · estimée %s · écart %d min', $truth, $result->estimate()['time'], $error));
        $io->text(sprintf(
            'Masse du postérieur à ±15 min : %.0f %% · à ±30 min : %.0f %% · à ±60 min : %.0f %%',
            $result->posterior->massWithin(15) * 100,
            $result->posterior->massWithin(30) * 100,
            $result->posterior->massWithin(60) * 100,
        ));
    }

    /**
     * @return array{0: BirthWindow, 1: list<LifeEvent>}
     */
    private function loadPayload(string $path): array
    {
        if ($path === '' || !is_file($path)) {
            throw new \RuntimeException("Fichier d'événements introuvable : $path (ou utilisez --demo)");
        }

        $payload = json_decode((string) file_get_contents($path), true, flags: JSON_THROW_ON_ERROR);

        [$from, $to] = $payload['window'] ?? [0, 24];

        $window = BirthWindow::fromLocalHours(
            $payload['birth_date'],
            (float) $from,
            (float) $to,
            (float) $payload['utc_offset'],
            (float) $payload['latitude'],
            (float) $payload['longitude'],
        );

        $events = array_map(
            static fn (array $e): LifeEvent => new LifeEvent(
                date: new \DateTimeImmutable($e['date'], new \DateTimeZone('UTC')),
                precision: $e['precision'] ?? LifeEvent::PRECISION_DAY,
                intensity: $e['intensity'] ?? LifeEvent::INTENSITY_TURNING_POINT,
                sudden: $e['sudden'] ?? true,
                valence: $e['valence'] ?? null,
                category: $e['category'] ?? null,
                title: $e['title'] ?? null,
                expectation: $e['expectation'] ?? LifeEvent::EXPECTATION_OCCURRED,
            ),
            $payload['events'],
        );

        return [$window, $events];
    }

    /**
     * Jeu de démonstration : le profil de référence parisien (né à 03 h 20
     * locale), avec des événements placés sur ses contacts les plus forts. Sert
     * à vérifier d'un coup d'œil que la chaîne complète tourne — ce n'est pas
     * une mesure d'exactitude, les événements étant dérivés de la vérité.
     *
     * @return array{0: BirthWindow, 1: list<LifeEvent>}
     */
    private function demoPayload(): array
    {
        $window = BirthWindow::fullDay('1985-07-14', 2.0, 48.8566, 2.3522);

        $events = [
            ['2001-11-01', LifeEvent::PRECISION_DAY,   LifeEvent::INTENSITY_LIFE_CHANGING, true,  'accident',   'Accident'],
            ['2003-07-14', LifeEvent::PRECISION_DAY,   LifeEvent::INTENSITY_TURNING_POINT, true,  'rupture',    'Rupture'],
            ['2006-09-01', LifeEvent::PRECISION_DAY,   LifeEvent::INTENSITY_TURNING_POINT, false, 'travail',    'Changement de travail'],
            ['2008-09-20', LifeEvent::PRECISION_DAY,   LifeEvent::INTENSITY_TURNING_POINT, true,  'rencontre',  'Rencontre marquante'],
            ['2013-02-26', LifeEvent::PRECISION_MONTH, LifeEvent::INTENSITY_MOMENT,        false, 'demenagement', 'Déménagement'],
            ['2016-01-27', LifeEvent::PRECISION_DAY,   LifeEvent::INTENSITY_LIFE_CHANGING, true,  'deces',      'Décès d\'un proche'],
            ['2020-08-13', LifeEvent::PRECISION_DAY,   LifeEvent::INTENSITY_TURNING_POINT, true,  'charniere',  'Année charnière'],
        ];

        return [$window, array_map(
            static fn (array $e): LifeEvent => new LifeEvent(
                date: new \DateTimeImmutable($e[0], new \DateTimeZone('UTC')),
                precision: $e[1],
                intensity: $e[2],
                sudden: $e[3],
                category: $e[4],
                title: $e[5],
            ),
            $events
        )];
    }
}
