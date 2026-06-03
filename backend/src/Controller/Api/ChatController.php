<?php

namespace App\Controller\Api;

use App\Entity\LyraConversationLog;
use App\Entity\User;
use App\Repository\NatalChartRepository;
use App\Repository\SynastryHistoryRepository;
use App\Service\AstrologyAnalysisService;
use App\Service\HoroscopeGeneratorService;
use App\Service\PromptLocaleService;
use App\Service\Webservice\OpenAiService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Contracts\Cache\CacheInterface;
use Symfony\Contracts\Cache\ItemInterface;

#[Route('/api/chat')]
class ChatController extends AbstractController
{
    private const DAILY_FREE_LIMIT = 5;
    // Key planets to include in the context (most astrologically significant)
    private const CONTEXT_PLANETS = ['Sun', 'Moon', 'Ascendant', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];

    /** Cache TTL for upcoming transit summary: 7 days */
    private const TRANSIT_CACHE_TTL = 604800;

    public function __construct(
        private OpenAiService $openAiService,
        private NatalChartRepository $natalChartRepository,
        private SynastryHistoryRepository $synastryHistoryRepository,
        private AstrologyAnalysisService $astrologyAnalysisService,
        private HoroscopeGeneratorService $horoscopeGeneratorService,
        private CacheInterface $cache,
        private EntityManagerInterface $em,
    ) {}

    /**
     * List past compatibility partners for the chat context picker.
     * Returns synastry history summaries (id + partner name + score).
     */
    #[Route('/partners', name: 'api_chat_partners', methods: ['GET'])]
    public function getPartners(): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        $histories = $this->synastryHistoryRepository->findByUser($user, 20);

        $partners = array_values(array_filter(array_map(fn($h) => [
            'id'               => $h->getId(),
            'partnerName'      => $h->getPartnerName(),
            'compatibilityScore' => $h->getCompatibilityScore(),
        ], $histories)));

        return $this->json(['success' => true, 'partners' => $partners]);
    }

    /**
     * Send a message to Lyra (AI astrologer).
     * Stateless — client sends full history each time.
     *
     * Body: {
     *   "messages": [{ "role": "user"|"assistant", "content": string }, ...],
     *   "partnerHistoryId": int|null   // optional: add a partner's chart as context
     * }
     */
    #[Route('', name: 'api_chat', methods: ['POST'])]
    public function chat(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        $data = json_decode($request->getContent(), true);

        if (empty($data['messages']) || !is_array($data['messages'])) {
            return $this->json(
                ['success' => false, 'error' => 'messages array is required'],
                Response::HTTP_BAD_REQUEST
            );
        }

        // Sanitize messages
        $messages = [];
        foreach ($data['messages'] as $msg) {
            if (!isset($msg['role'], $msg['content'])) continue;
            if (!in_array($msg['role'], ['user', 'assistant'], true)) continue;
            $content = trim((string) $msg['content']);
            if ($content === '') continue;
            $messages[] = ['role' => $msg['role'], 'content' => $content];
        }

        if (empty($messages)) {
            return $this->json(['success' => false, 'error' => 'No valid messages'], Response::HTTP_BAD_REQUEST);
        }

        // ── Conversation chaining ─────────────────────────────────────────────────
        $previousResponseId = isset($data['previousResponseId']) && is_string($data['previousResponseId'])
            ? $data['previousResponseId']
            : null;

        // Hybrid truncation when no server-side chain exists (lost-in-middle mitigation)
        if (!$previousResponseId && count($messages) > 10) {
            $first    = array_slice($messages, 0, 4);
            $last     = array_slice($messages, -6);
            $marker   = ['role' => 'assistant', 'content' => '[Début de conversation omis — derniers échanges ci-dessous]'];
            $messages = array_merge($first, [$marker], $last);
        } elseif (!$previousResponseId && count($messages) > 20) {
            $messages = array_slice($messages, -20);
        }

        // Last user message — drives Lyra's domain classification and the exchange log
        $lastUserMessage = '';
        foreach (array_reverse($messages) as $msg) {
            if ($msg['role'] === 'user') { $lastUserMessage = $msg['content']; break; }
        }

        // ── Daily message limit (free users) ────────────────────────────────────
        $remainingMessages = -1; // -1 = unlimited (premium)
        if (!$user->isPremium()) {
            $today = (new \DateTime())->format('Y-m-d');
            $cacheKey = sprintf('chat_usage_%d_%s', $user->getId(), $today);

            // Get current count (0 if not yet set today)
            $count = $this->cache->get($cacheKey, function (ItemInterface $item) {
                $tomorrow = new \DateTime('tomorrow midnight');
                $item->expiresAt($tomorrow);
                return 0;
            });

            if ($count >= self::DAILY_FREE_LIMIT) {
                return $this->json([
                    'success' => false,
                    'error' => 'daily_limit_reached',
                    'remaining_messages' => 0,
                    'daily_limit_reached' => true,
                ], Response::HTTP_FORBIDDEN);
            }

            // Increment: force recomputation with beta=INF (always calls callback & saves)
            $newCount = $count + 1;
            $this->cache->get($cacheKey, function (ItemInterface $item) use ($newCount) {
                $item->expiresAt(new \DateTime('tomorrow midnight'));
                return $newCount;
            }, \INF);

            $remainingMessages = self::DAILY_FREE_LIMIT - $newCount;
        }

        // ── User context ────────────────────────────────────────────────────────
        $userContext = [];

        if ($user->hasBirthProfile()) {
            $bp = $user->getBirthProfile();
            if ($bp->getFirstName())  $userContext['name']       = $bp->getFirstName();
            if ($bp->getBirthDate())  $userContext['birth_date'] = $bp->getBirthDate()->format('Y-m-d');
            if ($bp->getBirthCity())  $userContext['birth_city'] = $bp->getBirthCity();
        }

        // Natal chart planetary positions
        $natalChart = $this->natalChartRepository->findByUser($user);
        if ($natalChart) {
            $userContext['positions'] = $this->filterPositions($natalChart->getPlanetaryPositions());
        }

        // ── Upcoming transit summary (next 12 months, cached 7 days) ────────────
        if ($user->hasBirthProfile()) {
            $transitCacheKey = sprintf('chat_upcoming_transits_%d', $user->getId());
            $upcomingTransits = $this->cache->get($transitCacheKey, function (ItemInterface $item) use ($user) {
                $item->expiresAfter(self::TRANSIT_CACHE_TTL);
                return $this->astrologyAnalysisService->getUpcomingTransitSummary($user, 3);
            });
            if (!empty($upcomingTransits)) {
                $userContext['upcoming_transits'] = $upcomingTransits;
            }

            // Lyra structured context (grounded transits, domain-ranked)
            $userContext['lyra_context'] = $this->horoscopeGeneratorService->buildLyraContext($user, $lastUserMessage);
        }

        // ── Partner context (optional) ──────────────────────────────────────────
        $partnerHistoryId = isset($data['partnerHistoryId']) ? (int) $data['partnerHistoryId'] : null;
        if ($partnerHistoryId) {
            $history = $this->synastryHistoryRepository->findOneByUserAndId($user, $partnerHistoryId);
            if ($history && $history->getPartnerPositions()) {
                $userContext['partner_name']      = $history->getPartnerName();
                $userContext['partner_positions'] = $this->filterPositions($history->getPartnerPositions());
                $userContext['compatibility_score'] = $history->getCompatibilityScore();
            }
        }

        // ── Locale ──────────────────────────────────────────────────────────────
        $localeService = new PromptLocaleService();
        $locale = $localeService->normalizeLocale($request->headers->get('Accept-Language', 'fr'));
        $this->openAiService->setLocale($locale);

        // ── AI Tools ────────────────────────────────────────────────────────────
        $tools = [
            [
                'type' => 'function',
                'function' => [
                    'name' => 'get_transits',
                    'description' => $locale === 'en'
                        ? 'Calculates exact planetary transits (slow planets only: Saturn, Jupiter, Uranus, Neptune, Pluto, Mars) for a specific number of months from now. Use when the user asks about their future (e.g. "in 6 months", "next year").'
                        : 'Calcule les transits planétaires exacts (planètes lentes uniquement : Saturne, Jupiter, Uranus, Neptune, Pluton, Mars) pour un nombre précis de mois dans le futur. À utiliser quand l\'utilisateur pose une question sur son avenir (ex: "dans 6 mois", "l\'année prochaine").',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'months_from_now' => [
                                'type' => 'integer',
                                'description' => $locale === 'en'
                                    ? 'The number of months in the future. For example, 6 for "in 6 months". Can be negative for the past.'
                                    : 'Le nombre de mois dans le futur. Par exemple, 6 pour "dans 6 mois". Peut être négatif pour le passé.'
                            ]
                        ],
                        'required' => ['months_from_now']
                    ]
                ]
            ],
            [
                'type' => 'function',
                'function' => [
                    'name' => 'get_sky',
                    'description' => $locale === 'en'
                        ? 'Returns the exact position (sign + degree) of ALL planets including the Moon for a given number of days from today. Use for questions about where a planet is on a specific day (e.g. "is the Moon in Scorpio tomorrow?", "what sign is Venus in today?").'
                        : 'Retourne la position exacte (signe + degré) de TOUTES les planètes incluant la Lune pour un nombre de jours à partir d\'aujourd\'hui. À utiliser pour les questions sur la position d\'une planète un jour précis (ex: "la Lune est en Scorpion demain ?", "dans quel signe est Vénus aujourd\'hui ?").',
                    'parameters' => [
                        'type' => 'object',
                        'properties' => [
                            'days_from_now' => [
                                'type' => 'integer',
                                'description' => $locale === 'en'
                                    ? 'Number of days from today. 0 = today, 1 = tomorrow, -1 = yesterday, 7 = next week.'
                                    : 'Nombre de jours à partir d\'aujourd\'hui. 0 = aujourd\'hui, 1 = demain, -1 = hier, 7 = la semaine prochaine.'
                            ]
                        ],
                        'required' => ['days_from_now']
                    ]
                ]
            ],
        ];

        $toolHandler = function (string $functionName, array $arguments) use ($user) {
            if ($functionName === 'get_transits') {
                $months = (int) ($arguments['months_from_now'] ?? 0);
                return $this->astrologyAnalysisService->getTransitsForSpecificMonth($user, $months);
            }
            if ($functionName === 'get_sky') {
                $days = (int) ($arguments['days_from_now'] ?? 0);
                return $this->astrologyAnalysisService->getPlanetPositionsForDate($days);
            }
            return ['error' => 'Unknown function'];
        };

        $result = $this->openAiService->getChatResponse($messages, $userContext, $toolHandler, $tools, $previousResponseId);

        if (!$result['success']) {
            return $this->json($result, Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        // Log exchange
        try {
            $log = new LyraConversationLog($user, $lastUserMessage, count($messages));
            $log->setAssistantResponse($result['message'] ?? null);
            $this->em->persist($log);
            $this->em->flush();
        } catch (\Throwable) {}

        $result['remaining_messages'] = $remainingMessages;
        $result['daily_limit_reached'] = false;

        return $this->json($result);
    }

    /**
     * Stream a chat response via SSE (text/event-stream).
     * Mirrors /api/chat but streams tokens as they arrive from OpenAI.
     */
    #[Route('/stream', name: 'api_chat_stream', methods: ['POST'])]
    public function chatStream(Request $request): Response
    {
        /** @var User $user */
        $user = $this->getUser();

        $data = json_decode($request->getContent(), true);

        if (empty($data['messages']) || !is_array($data['messages'])) {
            return $this->json(['success' => false, 'error' => 'messages array is required'], Response::HTTP_BAD_REQUEST);
        }

        // Sanitize messages
        $messages = [];
        foreach ($data['messages'] as $msg) {
            if (!isset($msg['role'], $msg['content'])) continue;
            if (!in_array($msg['role'], ['user', 'assistant'], true)) continue;
            $content = trim((string) $msg['content']);
            if ($content === '') continue;
            $messages[] = ['role' => $msg['role'], 'content' => $content];
        }
        if (empty($messages)) {
            return $this->json(['success' => false, 'error' => 'No valid messages'], Response::HTTP_BAD_REQUEST);
        }

        $previousResponseId = isset($data['previousResponseId']) && is_string($data['previousResponseId'])
            ? $data['previousResponseId'] : null;

        if (!$previousResponseId && count($messages) > 10) {
            $first    = array_slice($messages, 0, 4);
            $last     = array_slice($messages, -6);
            $marker   = ['role' => 'assistant', 'content' => '[Début de conversation omis — derniers échanges ci-dessous]'];
            $messages = array_merge($first, [$marker], $last);
        }

        // Last user message — drives Lyra's domain classification and the exchange log
        $lastUserMessage = '';
        foreach (array_reverse($messages) as $msg) {
            if ($msg['role'] === 'user') { $lastUserMessage = $msg['content']; break; }
        }

        // Daily limit
        $remainingMessages = -1;
        if (!$user->isPremium()) {
            $today    = (new \DateTime())->format('Y-m-d');
            $cacheKey = sprintf('chat_usage_%d_%s', $user->getId(), $today);
            $count    = $this->cache->get($cacheKey, function (\Symfony\Contracts\Cache\ItemInterface $item) {
                $item->expiresAt(new \DateTime('tomorrow midnight'));
                return 0;
            });
            if ($count >= self::DAILY_FREE_LIMIT) {
                return $this->json([
                    'success' => false, 'error' => 'daily_limit_reached',
                    'remaining_messages' => 0, 'daily_limit_reached' => true,
                ], Response::HTTP_FORBIDDEN);
            }
            $newCount = $count + 1;
            $this->cache->get($cacheKey, function (\Symfony\Contracts\Cache\ItemInterface $item) use ($newCount) {
                $item->expiresAt(new \DateTime('tomorrow midnight'));
                return $newCount;
            }, \INF);
            $remainingMessages = self::DAILY_FREE_LIMIT - $newCount;
        }

        // Locale
        $localeService = new PromptLocaleService();
        $locale = $localeService->normalizeLocale($request->headers->get('Accept-Language', 'fr'));
        $this->openAiService->setLocale($locale);

        // Build user context (same as chat())
        $userContext = [];
        try {
            if ($user->hasBirthProfile()) {
                $bp = $user->getBirthProfile();
                if ($bp->getFirstName())  $userContext['name']       = $bp->getFirstName();
                if ($bp->getBirthDate())  $userContext['birth_date'] = $bp->getBirthDate()->format('Y-m-d');
                if ($bp->getBirthCity())  $userContext['birth_city'] = $bp->getBirthCity();
            }
            $natalChart = $this->natalChartRepository->findByUser($user);
            if ($natalChart) {
                $userContext['positions'] = $this->filterPositions($natalChart->getPlanetaryPositions());
            }
            if ($user->hasBirthProfile()) {
                $transitCacheKey  = sprintf('chat_upcoming_transits_%d', $user->getId());
                $upcomingTransits = $this->cache->get($transitCacheKey, function (\Symfony\Contracts\Cache\ItemInterface $item) use ($user) {
                    $item->expiresAfter(self::TRANSIT_CACHE_TTL);
                    return $this->astrologyAnalysisService->getUpcomingTransitSummary($user, 3);
                });
                if (!empty($upcomingTransits)) {
                    $userContext['upcoming_transits'] = $upcomingTransits;
                }

                // Lyra structured context (grounded transits, domain-ranked)
                $userContext['lyra_context'] = $this->horoscopeGeneratorService->buildLyraContext($user, $lastUserMessage);
            }
            $partnerHistoryId = isset($data['partnerHistoryId']) ? (int) $data['partnerHistoryId'] : null;
            if ($partnerHistoryId) {
                $history = $this->synastryHistoryRepository->findOneByUserAndId($user, $partnerHistoryId);
                if ($history && $history->getPartnerPositions()) {
                    $userContext['partner_name']         = $history->getPartnerName();
                    $userContext['partner_positions']    = $this->filterPositions($history->getPartnerPositions());
                    $userContext['compatibility_score']  = $history->getCompatibilityScore();
                }
            }
        } catch (\Throwable $e) {
            // Context enrichment failed (e.g. astrology calculation error) — continue with minimal context
        }

        // Tools
        $tools = $this->buildChatTools($locale);
        $toolHandler = function (string $functionName, array $arguments) use ($user) {
            if ($functionName === 'get_transits') {
                return $this->astrologyAnalysisService->getTransitsForSpecificMonth($user, (int) ($arguments['months_from_now'] ?? 0));
            }
            if ($functionName === 'get_sky') {
                return $this->astrologyAnalysisService->getPlanetPositionsForDate((int) ($arguments['days_from_now'] ?? 0));
            }
            return ['error' => 'Unknown function'];
        };

        // Snapshot for closure
        $openAiService      = $this->openAiService;
        $remainingSnap      = $remainingMessages;
        $em                 = $this->em;

        return new StreamedResponse(function () use (
            $messages, $userContext, $toolHandler, $tools, $previousResponseId,
            $openAiService, $remainingSnap, $em, $user, $lastUserMessage
        ) {
            $fullResponse = '';
            try {
                $chatMessages = $openAiService->buildChatMessages($messages, $userContext, $tools);
                $result = $openAiService->streamChatResponse(
                    $chatMessages,
                    $toolHandler,
                    $tools,
                    $previousResponseId,
                    function (string $delta) use (&$fullResponse) {
                        $fullResponse .= $delta;
                        echo 'data: ' . json_encode(['type' => 'delta', 'content' => $delta]) . "\n\n";
                        if (ob_get_level() > 0) ob_flush();
                        flush();
                    }
                );

                echo 'data: ' . json_encode([
                    'type'               => 'done',
                    'response_id'        => $result['response_id'] ?? null,
                    'remaining_messages' => $remainingSnap,
                    'daily_limit_reached' => false,
                ]) . "\n\n";

                // Log exchange
                try {
                    $log = new LyraConversationLog($user, $lastUserMessage, count($messages));
                    $log->setAssistantResponse($fullResponse ?: null);
                    $em->persist($log);
                    $em->flush();
                } catch (\Throwable) {}

            } catch (\Throwable $e) {
                echo 'data: ' . json_encode(['type' => 'error', 'message' => 'AI service error']) . "\n\n";
            }
            if (ob_get_level() > 0) ob_flush();
            flush();
        }, 200, [
            'Content-Type'    => 'text/event-stream',
            'Cache-Control'   => 'no-cache',
            'X-Accel-Buffering' => 'no',
            'Connection'      => 'keep-alive',
        ]);
    }

    /**
     * Build the tool definitions for the chat endpoint (shared by both actions).
     */
    private function buildChatTools(string $locale): array
    {
        $isEn = $locale === 'en';
        return [
            [
                'type' => 'function',
                'function' => [
                    'name'        => 'get_transits',
                    'description' => $isEn
                        ? 'Calculates exact planetary transits (slow planets only: Saturn, Jupiter, Uranus, Neptune, Pluto, Mars) for a specific number of months from now.'
                        : 'Calcule les transits planétaires exacts (planètes lentes : Saturne, Jupiter, Uranus, Neptune, Pluton, Mars) pour un nombre précis de mois dans le futur.',
                    'parameters'  => [
                        'type'       => 'object',
                        'properties' => [
                            'months_from_now' => [
                                'type'        => 'integer',
                                'description' => $isEn ? 'The number of months in the future.' : 'Le nombre de mois dans le futur.',
                            ],
                        ],
                        'required' => ['months_from_now'],
                    ],
                ],
            ],
            [
                'type' => 'function',
                'function' => [
                    'name'        => 'get_sky',
                    'description' => $isEn
                        ? 'Returns the exact position of ALL planets including Moon for a given number of days from today.'
                        : 'Retourne la position exacte de TOUTES les planètes incluant la Lune pour un nombre de jours à partir d\'aujourd\'hui.',
                    'parameters'  => [
                        'type'       => 'object',
                        'properties' => [
                            'days_from_now' => [
                                'type'        => 'integer',
                                'description' => $isEn ? 'Number of days from today. 0=today, 1=tomorrow.' : 'Nombre de jours à partir d\'aujourd\'hui. 0=aujourd\'hui.',
                            ],
                        ],
                        'required' => ['days_from_now'],
                    ],
                ],
            ],
        ];
    }

    /**
     * Keep only the most relevant planets for the context prompt.
     */
    private function filterPositions(array $positions): array
    {
        $filtered = [];
        foreach (self::CONTEXT_PLANETS as $planet) {
            if (isset($positions[$planet])) {
                $filtered[$planet] = $positions[$planet];
            }
        }
        return $filtered;
    }
}