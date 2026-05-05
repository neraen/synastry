<?php

namespace App\Service;

use App\Entity\NotificationLog;
use App\Entity\User;
use App\Entity\UserPushToken;
use App\Repository\NotificationLogRepository;
use App\Repository\UserNotificationPreferencesRepository;
use App\Repository\UserPushTokenRepository;
use App\Service\Webservice\OpenAiService;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;

/**
 * Detects notifiable astrological events and dispatches push notifications.
 *
 * Transit priority (most to least impactful):
 * 1. Saturn/Pluto → natal Sun/Moon
 * 2. Jupiter → natal Sun/Moon/ASC
 * 3. Uranus → natal Venus/Mars
 * 4. Neptune → any personal planet
 * 5. Mars → natal Sun/Moon/ASC (conjunctions/squares only)
 */
class AstroNotificationEngine
{
    // Slow planets that trigger personal transit notifications
    private const SLOW_PLANETS = ['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];

    // Personal natal points worth tracking
    private const PERSONAL_POINTS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Ascendant', 'Midheaven'];

    // Orb threshold for "exact" transit (degrees)
    private const EXACT_ORB = 1.5;

    // Max 1 push/day, 5/week per user
    private const MAX_PER_DAY = 1;
    private const MAX_PER_WEEK = 5;

    private const DAILY_REMINDER_TEMPLATES = [
        'Ton ciel du jour t\'attend ✨',
        'Un check astro avant de démarrer ?',
        'On a regardé ton ciel — viens voir',
        'Nouvelle journée, nouveaux transits',
        'Ton horoscope du jour est prêt',
    ];

    public function __construct(
        private ExpoPushService $expoPushService,
        private OpenAiService $openAiService,
        private UserPushTokenRepository $tokenRepository,
        private UserNotificationPreferencesRepository $prefsRepository,
        private NotificationLogRepository $logRepository,
        private AstrologyAnalysisService $astrologyAnalysisService,
        private EntityManagerInterface $entityManager,
        private LoggerInterface $logger,
    ) {}

    // ─── Personal transits ───────────────────────────────────────────────────

    public function processPersonalTransits(): void
    {
        $tokenRows = $this->tokenRepository->findActiveTokensWithPreferences('transits');
        $userIds   = array_unique(array_column($tokenRows, 'userId'));
        $tokenMap  = $this->buildTokenMap($tokenRows); // userId → [tokens]

        $now   = new \DateTime('now', new \DateTimeZone('UTC'));
        $today = $now->format('Y-m-d');

        // Current transiting positions (same for everyone)
        $transitCalc = new PlanetaryCalculator($today, $now->format('H:i'), 0.0, 0.0, 'Transit');
        $transitPositions = $this->getSlowPlanetPositions($transitCalc);

        foreach ($userIds as $userId) {
            try {
                $this->processTransitsForUser(
                    (int) $userId,
                    $tokenMap[$userId] ?? [],
                    $transitPositions
                );
            } catch (\Throwable $e) {
                $this->logger->error('Transit processing failed for user', [
                    'userId' => $userId,
                    'error'  => $e->getMessage(),
                ]);
            }
        }
    }

    private function processTransitsForUser(int $userId, array $tokens, array $transitPositions): void
    {
        /** @var \App\Entity\User|null $user */
        $user = $this->entityManager->find(User::class, $userId);
        if (!$user || !$user->getBirthProfile()) {
            return;
        }

        // Respect quiet hours
        $prefs = $this->prefsRepository->findByUser($user);
        if (!$this->isWithinNotificationWindow($prefs)) {
            return;
        }

        // Rate limiting
        if ($this->logRepository->countTodayForUser($user, $prefs?->getTimezone() ?? 'Europe/Paris') >= self::MAX_PER_DAY) {
            return;
        }
        if ($this->logRepository->countThisWeekForUser($user) >= self::MAX_PER_WEEK) {
            return;
        }

        // Compute natal chart
        $birthProfile = $user->getBirthProfile();
        $natalCalc    = $this->astrologyAnalysisService->createCalculatorFromBirthProfile($birthProfile);
        $natalChart   = $natalCalc->getFullChart();
        $natalPoints  = $this->extractNatalPoints($natalChart);

        // Find the best notifiable transit (highest priority, orb < EXACT_ORB)
        $best = $this->findBestNotifiableTransit($transitPositions, $natalPoints);
        if (!$best) {
            return;
        }

        // Dedup
        $triggerData = [
            'transit_planet' => $best['transitPlanet'],
            'natal_planet'   => $best['natalPlanet'],
            'aspect'         => $best['aspect'],
            'date_key'       => (new \DateTime())->format('Y-m'),
        ];

        if ($this->logRepository->alreadySent($user, 'transit_personal', $triggerData)) {
            return;
        }

        // Generate message via AI
        $firstName = $birthProfile->getFirstName() ?? 'toi';
        $message   = $this->generateTransitMessage($firstName, $best);
        if (!$message) {
            return;
        }

        // Send
        $this->expoPushService->send($tokens, $message['title'], $message['body'], [
            'type'   => 'transit_personal',
            'screen' => 'transits',
        ]);

        // Log
        $log = (new NotificationLog())
            ->setUser($user)
            ->setType('transit_personal')
            ->setTitle($message['title'])
            ->setBody($message['body'])
            ->setTriggerData(array_merge($triggerData, ['fingerprint' => md5(json_encode($triggerData))]))
            ->setSentAt(new \DateTime());

        $this->entityManager->persist($log);
        $this->entityManager->flush();

        $this->logger->info('Transit notification sent', ['userId' => $userId, 'transit' => $best]);
    }

    // ─── Sky events ──────────────────────────────────────────────────────────

    public function processSkyEvents(): void
    {
        $events = $this->detectTodaySkyEvents();
        if (empty($events)) {
            return;
        }

        // Use the most significant event
        $event = $events[0];
        $triggerData = ['event' => $event['type'], 'date' => date('Y-m-d'), 'fingerprint' => md5(json_encode($event))];

        $message = $this->generateSkyEventMessage($event);
        if (!$message) {
            return;
        }

        $tokenRows = $this->tokenRepository->findActiveTokensWithPreferences('skyEvents');
        $tokenMap  = $this->buildTokenMap($tokenRows);

        foreach ($tokenMap as $userId => $tokens) {
            $user = $this->entityManager->find(User::class, $userId);
            if (!$user) {
                continue;
            }
            if ($this->logRepository->alreadySent($user, 'sky_event', $triggerData)) {
                continue;
            }
            $prefs = $this->prefsRepository->findByUser($user);
            if (!$this->isWithinNotificationWindow($prefs)) {
                continue;
            }
            if ($this->logRepository->countTodayForUser($user, $prefs?->getTimezone() ?? 'Europe/Paris') >= self::MAX_PER_DAY) {
                continue;
            }

            $this->expoPushService->send($tokens, $message['title'], $message['body'], [
                'type'   => 'sky_event',
                'screen' => 'horoscope',
            ]);

            $log = (new NotificationLog())
                ->setUser($user)
                ->setType('sky_event')
                ->setTitle($message['title'])
                ->setBody($message['body'])
                ->setTriggerData($triggerData)
                ->setSentAt(new \DateTime());

            $this->entityManager->persist($log);
        }

        $this->entityManager->flush();
    }

    // ─── Daily reminder ──────────────────────────────────────────────────────

    public function processDailyReminders(): void
    {
        $tokenRows = $this->tokenRepository->findActiveTokensWithPreferences('dailyReminder');
        $tokenMap  = $this->buildTokenMap($tokenRows);

        $templates = self::DAILY_REMINDER_TEMPLATES;
        $title     = $templates[array_rand($templates)];
        $body      = 'Ton horoscope personnalisé est disponible dans l\'app.';

        foreach ($tokenMap as $userId => $tokens) {
            $user = $this->entityManager->find(User::class, $userId);
            if (!$user) {
                continue;
            }
            $prefs = $this->prefsRepository->findByUser($user);
            if (!$this->isWithinNotificationWindow($prefs)) {
                continue;
            }

            $triggerData = ['date' => date('Y-m-d'), 'fingerprint' => 'daily_' . date('Y-m-d') . '_' . $userId];
            if ($this->logRepository->alreadySent($user, 'daily_reminder', $triggerData)) {
                continue;
            }

            $this->expoPushService->send($tokens, $title, $body, ['type' => 'daily_reminder', 'screen' => 'horoscope']);

            $log = (new NotificationLog())
                ->setUser($user)
                ->setType('daily_reminder')
                ->setTitle($title)
                ->setBody($body)
                ->setTriggerData($triggerData)
                ->setSentAt(new \DateTime());

            $this->entityManager->persist($log);
        }

        $this->entityManager->flush();
    }

    // ─── Transit detection ───────────────────────────────────────────────────

    private function getSlowPlanetPositions(PlanetaryCalculator $calc): array
    {
        $positions = [];
        $chart = $calc->getAllPlanets();
        foreach (self::SLOW_PLANETS as $planet) {
            if (isset($chart[$planet])) {
                $positions[$planet] = $chart[$planet]['longitude'];
            }
        }
        // Add Mars (special case)
        if (isset($chart['Mars'])) {
            $positions['Mars'] = $chart['Mars']['longitude'];
        }
        return $positions;
    }

    private function extractNatalPoints(array $natalChart): array
    {
        $points = [];
        foreach (self::PERSONAL_POINTS as $planet) {
            if (isset($natalChart['planets'][$planet])) {
                $points[$planet] = [
                    'longitude' => $natalChart['planets'][$planet]['longitude'],
                    'sign'      => $natalChart['planets'][$planet]['sign'],
                ];
            }
        }
        if (isset($natalChart['ascendant'])) {
            $points['Ascendant'] = [
                'longitude' => $natalChart['ascendant']['longitude'],
                'sign'      => $natalChart['ascendant']['sign'],
            ];
        }
        return $points;
    }

    private function findBestNotifiableTransit(array $transitPositions, array $natalPoints): ?array
    {
        $candidates = [];

        foreach ($transitPositions as $transitPlanet => $transitLon) {
            foreach ($natalPoints as $natalPlanet => $natalData) {
                // Mars special rule: only conjunction/square with Sun/Moon/ASC
                if ($transitPlanet === 'Mars') {
                    if (!in_array($natalPlanet, ['Sun', 'Moon', 'Ascendant'])) {
                        continue;
                    }
                }

                $diff = abs($transitLon - $natalData['longitude']);
                if ($diff > 180) {
                    $diff = 360 - $diff;
                }

                foreach ([0 => 'conjunction', 180 => 'opposition', 120 => 'trine', 90 => 'square', 60 => 'sextile'] as $angle => $aspect) {
                    // Mars special rule: only conjunction and square
                    if ($transitPlanet === 'Mars' && !in_array($aspect, ['conjunction', 'square'])) {
                        continue;
                    }

                    $orb = abs($diff - $angle);
                    if ($orb <= self::EXACT_ORB) {
                        $priority = $this->getTransitPriority($transitPlanet, $natalPlanet, $aspect);
                        $candidates[] = [
                            'transitPlanet' => $transitPlanet,
                            'natalPlanet'   => $natalPlanet,
                            'natalSign'     => $natalData['sign'],
                            'aspect'        => $aspect,
                            'orb'           => round($orb, 2),
                            'priority'      => $priority,
                        ];
                    }
                }
            }
        }

        if (empty($candidates)) {
            return null;
        }

        // Sort by priority (lower = more important), then by tightest orb
        usort($candidates, fn($a, $b) => $a['priority'] !== $b['priority']
            ? $a['priority'] <=> $b['priority']
            : $a['orb'] <=> $b['orb']);

        return $candidates[0];
    }

    private function getTransitPriority(string $transitPlanet, string $natalPlanet, string $aspect): int
    {
        // Priority 1: Saturn/Pluto → Sun/Moon
        if (in_array($transitPlanet, ['Saturn', 'Pluto']) && in_array($natalPlanet, ['Sun', 'Moon'])) {
            return 1;
        }
        // Priority 2: Jupiter → Sun/Moon/ASC
        if ($transitPlanet === 'Jupiter' && in_array($natalPlanet, ['Sun', 'Moon', 'Ascendant'])) {
            return 2;
        }
        // Priority 3: Uranus → Venus/Mars
        if ($transitPlanet === 'Uranus' && in_array($natalPlanet, ['Venus', 'Mars'])) {
            return 3;
        }
        // Priority 4: Neptune → any personal planet
        if ($transitPlanet === 'Neptune') {
            return 4;
        }
        // Priority 5: Mars → Sun/Moon/ASC (hard aspects)
        if ($transitPlanet === 'Mars' && in_array($aspect, ['conjunction', 'square'])) {
            return 5;
        }
        // Other slow planets
        return 6;
    }

    // ─── Sky event detection ─────────────────────────────────────────────────

    private function detectTodaySkyEvents(): array
    {
        $today = new \DateTime('today');
        $events = [];

        // Full Moon / New Moon (check Moon's elongation from Sun)
        $moonEvent = $this->checkLunarPhase($today);
        if ($moonEvent) {
            $events[] = $moonEvent;
        }

        // Mercury retrograde start
        $mercuryRx = $this->checkMercuryRetrograde($today);
        if ($mercuryRx) {
            $events[] = $mercuryRx;
        }

        // Solstice / Equinox
        $seasonEvent = $this->checkSeasonalEvent($today);
        if ($seasonEvent) {
            $events[] = $seasonEvent;
        }

        return $events;
    }

    private function checkLunarPhase(\DateTime $date): ?array
    {
        $dateStr = $date->format('Y-m-d');
        $calc    = new PlanetaryCalculator($dateStr, '12:00', 0.0, 0.0, 'Today');
        $calc2   = new PlanetaryCalculator($date->modify('+1 day')->format('Y-m-d'), '12:00', 0.0, 0.0, 'Tomorrow');

        $moonLon  = $calc->getPlanetLongitude('Moon');
        $sunLon   = $calc->getPlanetLongitude('Sun');
        $moonLon2 = $calc2->getPlanetLongitude('Moon');
        $sunLon2  = $calc2->getPlanetLongitude('Sun');

        $elong1 = fmod($moonLon  - $sunLon  + 360, 360);
        $elong2 = fmod($moonLon2 - $sunLon2 + 360, 360);

        // Full Moon: elongation crosses 180
        if (($elong1 < 180 && $elong2 >= 180) || abs($elong1 - 180) < 3) {
            $sign = $this->longitudeToSign($moonLon);
            return ['type' => 'full_moon', 'sign' => $sign, 'description' => "Pleine Lune en {$sign}"];
        }

        // New Moon: elongation crosses 0
        if (($elong1 > 350 || $elong1 < 10) && abs($elong1) < 10) {
            $sign = $this->longitudeToSign($moonLon);
            return ['type' => 'new_moon', 'sign' => $sign, 'description' => "Nouvelle Lune en {$sign}"];
        }

        return null;
    }

    private function checkMercuryRetrograde(\DateTime $date): ?array
    {
        $dateStr   = $date->format('Y-m-d');
        $yesterday = (clone $date)->modify('-1 day')->format('Y-m-d');

        $calc1 = new PlanetaryCalculator($yesterday, '12:00', 0.0, 0.0, 'Yesterday');
        $calc2 = new PlanetaryCalculator($dateStr, '12:00', 0.0, 0.0, 'Today');

        $chart1 = $calc1->getAllPlanets();
        $chart2 = $calc2->getAllPlanets();

        $wasRetro = $chart1['Mercury']['retrograde'] ?? false;
        $isRetro  = $chart2['Mercury']['retrograde'] ?? false;

        if (!$wasRetro && $isRetro) {
            $sign = $chart2['Mercury']['sign'] ?? '';
            return ['type' => 'mercury_retrograde', 'sign' => $sign, 'description' => "Mercure rétrograde en {$sign}"];
        }

        return null;
    }

    private function checkSeasonalEvent(\DateTime $date): ?array
    {
        $month = (int) $date->format('m');
        $day   = (int) $date->format('d');

        $events = [
            [3,  20, 'equinox_spring', 'Équinoxe de printemps — le Soleil entre en Bélier'],
            [6,  21, 'solstice_summer', 'Solstice d\'été — le Soleil entre en Cancer'],
            [9,  22, 'equinox_autumn', 'Équinoxe d\'automne — le Soleil entre en Balance'],
            [12, 21, 'solstice_winter', 'Solstice d\'hiver — le Soleil entre en Capricorne'],
        ];

        foreach ($events as [$m, $d, $type, $desc]) {
            if ($month === $m && abs($day - $d) <= 1) {
                return ['type' => $type, 'description' => $desc];
            }
        }

        return null;
    }

    private function longitudeToSign(float $longitude): string
    {
        $signs = PlanetaryCalculator::SIGNS_FR;
        $index = (int) floor(fmod($longitude, 360) / 30);
        return $signs[$index] ?? 'Bélier';
    }

    // ─── AI message generation ───────────────────────────────────────────────

    private function generateTransitMessage(string $firstName, array $transit): ?array
    {
        $aspectLabels = [
            'conjunction' => 'arrive sur',
            'trine'       => 'forme une belle harmonie avec',
            'sextile'     => 'soutient doucement',
            'square'      => 'met en tension',
            'opposition'  => 'se confronte à',
        ];
        $aspectLabel = $aspectLabels[$transit['aspect']] ?? 'touche';

        $impactHints = [
            'Saturn'  => ['Sun' => 'remise en question profonde', 'Moon' => 'émotions plus structurées', 'Venus' => 'relations testées', 'Mars' => 'freins sur l\'action'],
            'Jupiter' => ['Sun' => 'expansion et opportunités', 'Moon' => 'mieux-être émotionnel', 'Ascendant' => 'ouverture vers le monde', 'Venus' => 'cœur qui s\'ouvre'],
            'Uranus'  => ['Venus' => 'retournements amoureux', 'Mars' => 'énergie imprévisible', 'Sun' => 'besoin soudain de liberté'],
            'Neptune' => ['Sun' => 'idéaux et brouillard', 'Moon' => 'hypersensibilité', 'Venus' => 'romantisme idéalisé'],
            'Mars'    => ['Sun' => 'énergie et friction', 'Moon' => 'tension intérieure', 'Ascendant' => 'confrontations possibles'],
            'Pluto'   => ['Sun' => 'transformation profonde', 'Moon' => 'émotions intenses', 'Venus' => 'relations qui se transforment'],
        ];

        $impact = $impactHints[$transit['transitPlanet']][$transit['natalPlanet']]
            ?? 'une influence notable sur ta vie';

        $planetsFR = [
            'Sun' => 'Soleil', 'Moon' => 'Lune', 'Mercury' => 'Mercure',
            'Venus' => 'Vénus', 'Mars' => 'Mars', 'Jupiter' => 'Jupiter',
            'Saturn' => 'Saturne', 'Uranus' => 'Uranus', 'Neptune' => 'Neptune',
            'Pluto' => 'Pluton', 'Ascendant' => 'Ascendant',
        ];

        $tp = $planetsFR[$transit['transitPlanet']] ?? $transit['transitPlanet'];
        $np = $planetsFR[$transit['natalPlanet']]   ?? $transit['natalPlanet'];
        $sign = $transit['natalSign'] ?? '';

        $prompt = <<<PROMPT
Tu génères une notification push pour une app d'astrologie. La notification doit :
- Donner envie de cliquer et d'ouvrir l'app
- Être ancrée dans un fait astrologique précis (le transit fourni)
- Être rédigée comme un message d'une amie qui prévient de quelque chose
- Ne JAMAIS utiliser de jargon technique (pas de "trigone", "carré", "conjonction", etc.)
- Ne JAMAIS utiliser "l'univers", "les énergies", "vibration"

Données :
- Prénom : {$firstName}
- Transit : {$tp} {$aspectLabel} {$np} en {$sign}
- Impact principal : {$impact}

Réponds UNIQUEMENT en JSON :
{
  "title": "<max 50 caractères, accrocheur, avec le prénom si possible>",
  "body": "<max 140 caractères, concret, donne envie d'en savoir plus>"
}
PROMPT;

        return $this->callAiForMessage($prompt);
    }

    private function generateSkyEventMessage(array $event): ?array
    {
        $prompt = <<<PROMPT
Tu génères une notification push pour une app d'astrologie à propos d'un événement astronomique.

Données :
- Événement : {$event['description']}
- Date : {$this->todayFormatted()}

Règles :
- Pas de jargon astrologique technique dans les textes
- Ton amical, comme une amie qui te prévient de quelque chose
- Ne JAMAIS utiliser "l'univers", "les énergies", "vibration"
- Max 50 caractères pour le titre, max 140 pour le body

Réponds UNIQUEMENT en JSON :
{
  "title": "<max 50 caractères>",
  "body": "<max 140 caractères>"
}
PROMPT;

        return $this->callAiForMessage($prompt);
    }

    private function callAiForMessage(string $prompt): ?array
    {
        try {
            $result = $this->openAiService->generateNotificationMessage($prompt);
            if ($result['success'] ?? false) {
                return $result['message'] ?? null;
            }
        } catch (\Throwable $e) {
            $this->logger->error('AI message generation failed', ['error' => $e->getMessage()]);
        }
        return null;
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function buildTokenMap(array $tokenRows): array
    {
        $map = [];
        foreach ($tokenRows as $row) {
            $map[$row['userId']][] = $row['token'];
        }
        return $map;
    }

    private function isWithinNotificationWindow(?object $prefs): bool
    {
        if (!$prefs) {
            return true;
        }

        $tz   = new \DateTimeZone($prefs->getTimezone());
        $hour = (int) (new \DateTime('now', $tz))->format('G');

        return $hour >= 8 && $hour < 21;
    }

    private function todayFormatted(): string
    {
        return date('d/m/Y');
    }
}
