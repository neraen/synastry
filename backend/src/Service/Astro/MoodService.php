<?php

namespace App\Service\Astro;

use App\Entity\MoodCorpus;
use App\Repository\MoodCorpusRepository;
use App\Service\PlanetaryCalculator;
use App\Service\Webservice\OpenAiService;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;

/**
 * "Humeur du jour" — a light, secondary mood touch (never a prediction).
 *
 *  - ensureCorpus(): generate the missing (sign × phase) paragraphs once, cached.
 *  - getToday(): deterministic lookup on today's Moon sign + phase. NO LLM.
 */
class MoodService
{
    /** French phase label + meaning, fed to the LLM as grounded context. */
    private const PHASE_MEANING = [
        'new'             => ['Nouvelle lune', "tout début de cycle, intériorité, on amorce sans encore montrer"],
        'waxing_crescent' => ['Premier croissant', "l'élan se met en route, premiers gestes concrets"],
        'first_quarter'   => ['Premier quartier', "moment de décision, on pousse malgré les résistances"],
        'waxing_gibbous'  => ['Gibbeuse croissante', "ajustements, on peaufine avant l'aboutissement"],
        'full'            => ['Pleine lune', "point culminant, émotions vives, ce qui mûrit se voit"],
        'waning_gibbous'  => ['Gibbeuse décroissante', "on partage, on digère, on tire les leçons"],
        'last_quarter'    => ['Dernier quartier', "on relâche, on fait le tri, on tourne une page"],
        'balsamic'        => ['Lune balsamique', "fin de cycle, repos, retrait, on se vide pour repartir"],
    ];

    private const SIGN_TONE = [
        0 => 'vif', 1 => 'posé', 2 => 'curieux', 3 => 'tendre', 4 => 'chaleureux', 5 => 'appliqué',
        6 => 'harmonieux', 7 => 'intense', 8 => 'aventureux', 9 => 'sérieux', 10 => 'détaché', 11 => 'rêveur',
    ];

    public function __construct(
        private MoodCorpusRepository $repository,
        private OpenAiService $openAiService,
        private EntityManagerInterface $entityManager,
        private LoggerInterface $logger,
    ) {
    }

    // ── Read (deterministic) ────────────────────────────────────────────────────

    /**
     * Today's mood paragraph for a locale. Pure lookup, no LLM.
     *
     * @return array{signFr:string, phase:string, tone:?string, text:string}|null
     */
    public function getToday(string $locale, ?\DateTimeInterface $when = null): ?array
    {
        $info = MoonPhase::at($when ?? new \DateTimeImmutable('now', new \DateTimeZone('UTC')));
        $entry = $this->repository->findEntry($locale, $info['signIndex'], $info['phase']);
        if ($entry === null) {
            return null;
        }
        return [
            'signFr' => PlanetaryCalculator::SIGNS_FR[$info['signIndex']],
            'phase'  => $info['phase'],
            'tone'   => $entry->getTone(),
            'text'   => $entry->getText(),
        ];
    }

    // ── Generation (worker / command) ──────────────────────────────────────────

    /**
     * Generate every missing (sign × phase) paragraph for a locale (96 total).
     *
     * @return array{generated:int, skipped:int, failed:int}
     */
    public function ensureCorpus(string $locale): array
    {
        $existing = $this->repository->existingKeys($locale);
        $generated = 0;
        $skipped = 0;
        $failed = 0;

        foreach (range(0, 11) as $signIndex) {
            foreach (MoodCorpus::PHASES as $phase) {
                if (isset($existing[$signIndex . ':' . $phase])) {
                    $skipped++;
                    continue;
                }
                if ($this->generateOne($locale, $signIndex, $phase)) {
                    $generated++;
                } else {
                    $failed++;
                }
            }
            $this->entityManager->flush();
        }

        return ['generated' => $generated, 'skipped' => $skipped, 'failed' => $failed];
    }

    private function generateOne(string $locale, int $signIndex, string $phase): bool
    {
        [$phaseLabel, $phaseMeaning] = self::PHASE_MEANING[$phase];
        $brief = [
            'moon_sign'     => PlanetaryCalculator::SIGNS_FR[$signIndex],
            'phase_label'   => $phaseLabel,
            'phase_meaning' => $phaseMeaning,
            'tone'          => self::SIGN_TONE[$signIndex],
        ];

        try {
            $result = $this->openAiService->generateMoodParagraph($brief, $locale);
            if (!($result['success'] ?? false) || empty($result['text'])) {
                $this->logger->warning('Mood paragraph generation failed', ['sign' => $signIndex, 'phase' => $phase]);
                return false;
            }
            $entry = (new MoodCorpus())
                ->setLocale($locale)
                ->setMoonSignIndex($signIndex)
                ->setMoonPhase($phase)
                ->setTone($result['tone'] ?? self::SIGN_TONE[$signIndex])
                ->setText($result['text'])
                ->setGeneratedAt(new \DateTimeImmutable());
            $this->entityManager->persist($entry);
            return true;
        } catch (\Throwable $e) {
            $this->logger->error('Mood paragraph threw', ['msg' => $e->getMessage()]);
            return false;
        }
    }
}
