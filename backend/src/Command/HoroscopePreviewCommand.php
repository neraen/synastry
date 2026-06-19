<?php

namespace App\Command;

use App\Entity\BirthProfile;
use App\Service\AstrologyAnalysisService;
use App\Service\HoroscopeGeneratorService;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * Aperçu du moteur d'horoscope (voie du milieu) — outil de tuning du prompt.
 * Pour quelques thèmes natals d'exemple, génère l'horoscope du jour à partir
 * des faits astro bruts interprétés par le LLM, et montre les faits envoyés.
 *
 *   php bin/console app:horoscope:preview
 *   php bin/console app:horoscope:preview --locale=fr
 */
#[AsCommand(
    name: 'app:horoscope:preview',
    description: 'Aperçu de l\'horoscope (voie du milieu : faits bruts interprétés par le LLM) sur des thèmes d\'exemple.',
)]
class HoroscopePreviewCommand extends Command
{
    public function __construct(
        private HoroscopeGeneratorService $horoscopeGenerator,
        private AstrologyAnalysisService $astrologyAnalysisService,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->addOption('locale', null, InputOption::VALUE_REQUIRED, 'Locale (fr|en)', 'fr');
    }

    /**
     * Quelques thèmes variés (date, heure locale, lat, lon, offset UTC, prénom).
     */
    private function profilsExemple(): array
    {
        return [
            ['1990-05-15', '14:30', 48.8566, 2.3522, '2', 'Camille (Paris)'],
            ['1985-11-02', '08:00', 45.7640, 4.8357, '1', 'Sofia (Lyon)'],
            ['1995-07-21', '22:15', 43.2965, 5.3698, '2', 'Léa (Marseille)'],
        ];
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $locale = (string) $input->getOption('locale');
        $this->horoscopeGenerator->setLocale($locale);

        foreach ($this->profilsExemple() as [$date, $time, $lat, $lon, $tz, $nom]) {
            $io->section($nom . "  ({$date} {$time}, UTC+{$tz})");

            $profile = (new BirthProfile())
                ->setFirstName($nom)
                ->setBirthDate(new \DateTime($date))
                ->setBirthTime(new \DateTime($time))
                ->setLatitude((string) $lat)
                ->setLongitude((string) $lon)
                ->setTimezone($tz);

            $calc = $this->astrologyAnalysisService->createCalculatorFromBirthProfile($profile);

            try {
                $res = $this->horoscopeGenerator->genererApercu($calc);
            } catch (\Throwable $e) {
                $io->error('Échec : ' . $e->getMessage());
                continue;
            }

            // Faits bruts envoyés au LLM (transparence)
            $io->writeln('<comment>Faits envoyés au LLM :</comment>');
            $io->writeln(json_encode($res['brief']['faits'], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . "\n");

            $this->afficherHoroscope($io, 'Horoscope du jour', $res['horoscope']);
        }

        $io->success('Aperçu terminé.');

        return Command::SUCCESS;
    }

    private function afficherHoroscope(SymfonyStyle $io, string $titre, array $h): void
    {
        $io->writeln("<info>── {$titre} ──</info>");
        if (isset($h['error'])) {
            $io->writeln('  <error>' . $h['error'] . '</error>');

            return;
        }
        $io->writeln('  <options=bold>' . ($h['title'] ?? '') . '</>');
        foreach (['overview' => 'Aperçu', 'love' => 'Amour', 'energy' => 'Énergie', 'advice' => 'Conseil'] as $k => $label) {
            if (!empty($h[$k])) {
                $io->writeln("  <comment>{$label} :</comment> " . $h[$k]);
            }
        }
        $io->newLine();
    }
}
