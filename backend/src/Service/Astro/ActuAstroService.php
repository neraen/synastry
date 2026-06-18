<?php

namespace App\Service\Astro;

use App\Entity\AstroEvent;
use App\Entity\User;
use App\Repository\AstroEventRepository;
use App\Service\AstrologyAnalysisService;
use App\Service\Webservice\OpenAiService;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;

/**
 * Orchestrates the collective "Actu astro" feed.
 *
 *  - generateMonth(): deterministic detection (A) → persist facts → write the
 *    collective prose once per event (B), cached. Designed for the monthly worker.
 *  - getMonth(): serve cached events + apply the deterministic per-user overlay (C).
 *    NO LLM call at read time.
 */
class ActuAstroService
{
    private const FR_MONTHS = [
        1 => 'janvier', 2 => 'février', 3 => 'mars', 4 => 'avril', 5 => 'mai', 6 => 'juin',
        7 => 'juillet', 8 => 'août', 9 => 'septembre', 10 => 'octobre', 11 => 'novembre', 12 => 'décembre',
    ];

    private ?array $grain = null;

    public function __construct(
        private SkyEventDetector $detector,
        private AstroEventRepository $repository,
        private ActuPersonalizer $personalizer,
        private AstrologyAnalysisService $astrologyAnalysisService,
        private OpenAiService $openAiService,
        private EntityManagerInterface $entityManager,
        private LoggerInterface $logger,
    ) {
    }

    // ── Generation (worker) ────────────────────────────────────────────────────

    /**
     * Detect the month's events, persist any new ones (facts only), then fill in
     * the collective prose for every row still missing it. Idempotent.
     *
     * @return array{detected:int, created:int, prosed:int}
     */
    public function generateMonth(string $locale, int $year, int $month): array
    {
        $events = $this->detector->detectForMonth($year, $month);
        $created = 0;

        foreach ($events as $skyEvent) {
            $existing = $this->repository->findOneByFingerprint($locale, $skyEvent->fingerprint());
            if ($existing !== null) {
                continue;
            }
            $this->entityManager->persist(AstroEvent::fromSkyEvent($skyEvent, $locale));
            $created++;
        }
        $this->entityManager->flush();

        // Write collective prose for any row in this month still lacking it.
        $monthKey = sprintf('%04d-%02d', $year, $month);
        $prosed = 0;
        foreach ($this->repository->findByMonth($locale, $monthKey) as $event) {
            if ($event->hasProse()) {
                continue;
            }
            if ($this->writeProse($event, $locale)) {
                $prosed++;
            }
        }
        $this->entityManager->flush();

        return ['detected' => count($events), 'created' => $created, 'prosed' => $prosed];
    }

    private function writeProse(AstroEvent $event, string $locale): bool
    {
        try {
            $brief = $this->buildEventBrief($event);
            $result = $this->openAiService->generateActuEventProse($brief, $locale);
            if (!($result['success'] ?? false) || empty($result['title']) || empty($result['body'])) {
                $this->logger->warning('Actu prose generation failed', ['id' => $event->getId(), 'err' => $result['error'] ?? '?']);
                return false;
            }
            $event->setTitle($result['title'])
                  ->setBody($result['body'])
                  ->setGeneratedAt(new \DateTimeImmutable());
            return true;
        } catch (\Throwable $e) {
            $this->logger->error('Actu prose generation threw', ['id' => $event->getId(), 'msg' => $e->getMessage()]);
            return false;
        }
    }

    // ── Read (per user, deterministic overlay) ─────────────────────────────────

    /**
     * @return array{month:string, year:int, events:array<int,array<string,mixed>>}
     */
    public function getMonth(User $user, int $year, int $month, string $locale): array
    {
        $monthKey = sprintf('%04d-%02d', $year, $month);
        $rows = $this->repository->findByMonth($locale, $monthKey);

        $natal = null;
        $profile = $user->getBirthProfile();
        if ($profile !== null) {
            try {
                $natal = $this->astrologyAnalysisService->createCalculatorFromBirthProfile($profile);
            } catch (\Throwable $e) {
                $this->logger->warning('Actu overlay: natal calc failed', ['msg' => $e->getMessage()]);
            }
        }

        $now = new \DateTimeImmutable('now', new \DateTimeZone('UTC'));
        $today = $now->format('Y-m-d');

        $out = [];
        foreach ($rows as $event) {
            $payload = $event->toArray();
            $dayKey  = $event->getExactAt()->format('Y-m-d');
            $payload['status'] = $dayKey < $today ? 'past' : ($dayKey === $today ? 'today' : 'upcoming');

            if ($natal !== null) {
                $sky = $this->toSkyEvent($event);
                $payload['perso'] = $this->personalizer->personalize($sky, $natal);
            } else {
                $payload['perso'] = null;
            }
            $out[] = $payload;
        }

        return [
            'month' => self::FR_MONTHS[$month] ?? (string) $month,
            'year'  => $year,
            'events' => $out,
        ];
    }

    /** Rebuild a SkyEvent value object from a persisted row (for the overlay). */
    private function toSkyEvent(AstroEvent $e): SkyEvent
    {
        return new SkyEvent(
            type: $e->getType(),
            exactAt: $e->getExactAt(),
            planet: $e->getPlanet(),
            planet2: $e->getPlanet2(),
            aspectType: $e->getAspectType(),
            longitude: $e->getLongitude(),
            longitude2: $e->getLongitude2(),
            metadata: $e->getMetadata(),
        );
    }

    // ── Deterministic brief builder (grain DB → structured facts) ───────────────

    /**
     * Build the structured, pre-interpreted brief handed to the LLM. Pure &
     * deterministic: every astronomical fact is already decided here; the model
     * only turns this into prose.
     *
     * @return array<string,mixed>
     */
    public function buildEventBrief(AstroEvent $event): array
    {
        $grain = $this->grain();
        $type  = $event->getType();
        $typeGrain = $grain['types'][$type] ?? ['label' => $type, 'angles' => []];

        $dateFr = $this->formatDateFr($event->getExactAt());

        $brief = [
            'type'       => $type,
            'type_label' => $typeGrain['label'] ?? $type,
            'date'       => $dateFr,
            'fact'       => $this->factLine($event, $typeGrain['label'] ?? $type, $dateFr),
            'planets'    => [],
            'angles'     => [],
        ];

        // Planet essences.
        foreach ([$event->getPlanet(), $event->getPlanet2()] as $p) {
            if ($p !== null && isset($grain['planets'][$p])) {
                $brief['planets'][$p] = $grain['planets'][$p];
            }
        }

        // Sign essence (primary).
        if ($event->getSignFr() !== null && isset($grain['signs'][$event->getSignFr()])) {
            $brief['sign_essence'] = $grain['signs'][$event->getSignFr()];
        }

        // Interpretation angles.
        if ($type === 'aspect') {
            $brief['angles'] = $typeGrain['by_aspect'][$event->getAspectType()] ?? [];
        } else {
            $brief['angles'] = $typeGrain['angles'] ?? [];
        }

        if (!empty($event->getMetadata()['seasonal'])) {
            $brief['seasonal'] = $event->getMetadata()['seasonal'];
        }

        return $brief;
    }

    private function factLine(AstroEvent $e, string $label, string $dateFr): string
    {
        $fr = \App\Service\PlanetaryCalculator::PLANETS_FR;
        return match ($e->getType()) {
            'aspect' => sprintf(
                '%s %s %s — %s en %s %d°, %s en %s %d° (le %s)',
                $fr[$e->getPlanet()] ?? $e->getPlanet(),
                $this->aspectFr($e->getAspectType()),
                $fr[$e->getPlanet2()] ?? $e->getPlanet2(),
                $fr[$e->getPlanet()] ?? $e->getPlanet(), $e->getSignFr(), (int) $e->getDegree(),
                $fr[$e->getPlanet2()] ?? $e->getPlanet2(), $e->getSign2Fr(), (int) $e->getDegree2(),
                $dateFr,
            ),
            'ingression' => sprintf('%s entre en %s (le %s)', $fr[$e->getPlanet()] ?? $e->getPlanet(), $e->getSignFr(), $dateFr),
            'retrograde_start' => sprintf('%s commence sa rétrogradation en %s %d° (le %s)', $fr[$e->getPlanet()] ?? $e->getPlanet(), $e->getSignFr(), (int) $e->getDegree(), $dateFr),
            'retrograde_end'   => sprintf('%s redevient direct en %s %d° (le %s)', $fr[$e->getPlanet()] ?? $e->getPlanet(), $e->getSignFr(), (int) $e->getDegree(), $dateFr),
            default => sprintf('%s en %s %d° (le %s)', $label, $e->getSignFr(), (int) $e->getDegree(), $dateFr),
        };
    }

    private function aspectFr(?string $aspect): string
    {
        return match ($aspect) {
            'conjunction' => 'conjoint à',
            'sextile'     => 'sextile à',
            'square'      => 'carré à',
            'trine'       => 'trigone à',
            'opposition'  => 'opposé à',
            default       => 'en aspect avec',
        };
    }

    private function formatDateFr(\DateTimeImmutable $dt): string
    {
        return sprintf('%d %s %d', (int) $dt->format('j'), self::FR_MONTHS[(int) $dt->format('n')], (int) $dt->format('Y'));
    }

    /** @return array<string,mixed> */
    private function grain(): array
    {
        if ($this->grain === null) {
            $path = __DIR__ . '/../../../data/actu_events_grain.json';
            $this->grain = json_decode((string) file_get_contents($path), true) ?: [];
        }
        return $this->grain;
    }
}
