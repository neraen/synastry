<?php

namespace App\Controller\Api;

use App\Entity\ChatReport;
use App\Entity\LyraConversationLog;
use App\Entity\User;
use App\Enum\TopicLyra;
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
     * Static intro for a freshly opened conversation: the welcome message and the
     * three suggestion chips for the chosen topic. No LLM call — everything comes
     * from the TopicLyra enum (single source of truth). Unknown/empty topic -> LIBRE.
     */
    #[Route('/topic-intro', name: 'api_chat_topic_intro', methods: ['GET'])]
    public function topicIntro(Request $request): JsonResponse
    {
        $topic = TopicLyra::tryFrom((string) $request->query->get('topic', '')) ?? TopicLyra::LIBRE;

        return $this->json([
            'success'         => true,
            'topic'           => $topic->value,
            'welcome_message' => $topic->welcomeMessage(),
            'suggestions'     => $topic->suggestions(),
        ]);
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

        // Conversation subject chosen at open time (defaults to LIBRE = legacy behavior).
        $topic = TopicLyra::tryFrom((string) ($data['topic'] ?? '')) ?? TopicLyra::LIBRE;

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
        $userContext['topic'] = $topic;

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
            $userContext['lyra_context'] = $this->horoscopeGeneratorService->buildLyraContext($user, $lastUserMessage, $topic);
        }

        // ── Partner context (optional) ──────────────────────────────────────────
        $partnerHistoryId = isset($data['partnerHistoryId']) ? (int) $data['partnerHistoryId'] : null;
        if ($partnerHistoryId) {
            $history = $this->synastryHistoryRepository->findOneByUserAndId($user, $partnerHistoryId);
            if ($history && $history->getPartnerPositions()) {
                $userContext['partner_name']      = $history->getPartnerName();
                $userContext['partner_gender']    = $history->getPartnerGender();
                $userContext['partner_positions'] = $this->filterPositions($history->getPartnerPositions());
                $userContext['compatibility_score'] = $history->getCompatibilityScore();
            }
        }

        // ── Locale ──────────────────────────────────────────────────────────────
        $localeService = new PromptLocaleService();
        $locale = $localeService->normalizeLocale($request->headers->get('Accept-Language', 'fr'));
        $this->openAiService->setLocale($locale);

        // ── AI Tools ────────────────────────────────────────────────────────────
        $tools = $this->buildChatTools($locale);
        $toolHandler = $this->buildToolHandler($user, $topic);

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
     * Report an inappropriate AI response (App Store guideline 1.2).
     *
     * Body: { "message": string, "reason": string|null }
     */
    #[Route('/report', name: 'api_chat_report', methods: ['POST'])]
    public function report(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        $data = json_decode($request->getContent(), true);
        $message = isset($data['message']) ? trim((string) $data['message']) : '';

        if ($message === '') {
            return $this->json(
                ['success' => false, 'error' => 'message is required'],
                Response::HTTP_BAD_REQUEST
            );
        }

        $reason = isset($data['reason']) ? mb_substr(trim((string) $data['reason']), 0, 500) : null;

        $report = new ChatReport($user, mb_substr($message, 0, 10000), $reason ?: null);
        $this->em->persist($report);
        $this->em->flush();

        return $this->json(['success' => true]);
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

        // Conversation subject chosen at open time (defaults to LIBRE = legacy behavior).
        $topic = TopicLyra::tryFrom((string) ($data['topic'] ?? '')) ?? TopicLyra::LIBRE;

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
        $userContext['topic'] = $topic;
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
                $userContext['lyra_context'] = $this->horoscopeGeneratorService->buildLyraContext($user, $lastUserMessage, $topic);
            }
            $partnerHistoryId = isset($data['partnerHistoryId']) ? (int) $data['partnerHistoryId'] : null;
            if ($partnerHistoryId) {
                $history = $this->synastryHistoryRepository->findOneByUserAndId($user, $partnerHistoryId);
                if ($history && $history->getPartnerPositions()) {
                    $userContext['partner_name']         = $history->getPartnerName();
                    $userContext['partner_gender']       = $history->getPartnerGender();
                    $userContext['partner_positions']    = $this->filterPositions($history->getPartnerPositions());
                    $userContext['compatibility_score']  = $history->getCompatibilityScore();
                }
            }
        } catch (\Throwable $e) {
            // Context enrichment failed (e.g. astrology calculation error) — continue with minimal context
        }

        // Tools
        $tools = $this->buildChatTools($locale);
        $toolHandler = $this->buildToolHandler($user, $topic);

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
                        ? 'Computes the user\'s personal transits (already interpreted: supportive/tense nature, life domains, houses, orb, peak date) for a past or future period. Call it whenever the question is about a period that is NOT now: "in 6 months", "in December", "next year", "3 months ago", "this summer". Filtering by the conversation subject is automatic.'
                        : 'Calcule les transits personnels de l\'utilisateur (déjà interprétés : nature soutien/tension, domaines de vie, maisons, orbe, date de pic) pour une période passée ou future. À appeler dès que la question porte sur une période qui n\'est PAS maintenant : "dans 6 mois", "en décembre", "l\'année prochaine", "il y a 3 mois", "cet été". Le filtrage selon le sujet de la conversation est automatique.',
                    'parameters'  => [
                        'type'       => 'object',
                        'properties' => [
                            'months_from_now' => [
                                'type'        => 'integer',
                                'description' => $isEn
                                    ? 'Month offset from today to the START of the period. 6 = in 6 months, -3 = 3 months ago. Compute it from the current date given in the context.'
                                    : 'Décalage en mois depuis aujourd\'hui jusqu\'au DÉBUT de la période. 6 = dans 6 mois, -3 = il y a 3 mois. Calcule-le à partir de la Date du jour fournie dans le contexte.',
                            ],
                            'duration_months' => [
                                'type'        => 'integer',
                                'description' => $isEn
                                    ? 'Length of the period in months, 1 to 3. 1 for a specific month, 3 for "this summer" or a quarter. Default 1.'
                                    : 'Durée de la période en mois, de 1 à 3. 1 pour un mois précis, 3 pour "cet été" ou un trimestre. Défaut 1.',
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
                        ? 'Returns the exact position (sign + degree, retrograde) of ALL planets including the Moon for a given number of days from today. Use for questions about where a planet is on a specific day (e.g. "is the Moon in Scorpio tomorrow?").'
                        : 'Retourne la position exacte (signe + degré, rétrogradation) de TOUTES les planètes incluant la Lune pour un nombre de jours à partir d\'aujourd\'hui. À utiliser pour les questions sur la position d\'une planète un jour précis (ex : "la Lune est en Scorpion demain ?").',
                    'parameters'  => [
                        'type'       => 'object',
                        'properties' => [
                            'days_from_now' => [
                                'type'        => 'integer',
                                'description' => $isEn
                                    ? 'Number of days from today. 0 = today, 1 = tomorrow, -1 = yesterday, 7 = next week.'
                                    : 'Nombre de jours à partir d\'aujourd\'hui. 0 = aujourd\'hui, 1 = demain, -1 = hier, 7 = la semaine prochaine.',
                            ],
                        ],
                        'required' => ['days_from_now'],
                    ],
                ],
            ],
        ];
    }

    /**
     * Tool dispatcher shared by both chat actions. Topic-aware: get_transits
     * results are boosted/filtered for the conversation subject, like the
     * main lyra_context.
     */
    private function buildToolHandler(User $user, TopicLyra $topic): \Closure
    {
        return function (string $functionName, array $arguments) use ($user, $topic) {
            if ($functionName === 'get_transits') {
                return $this->horoscopeGeneratorService->getTransitsForPeriod(
                    $user,
                    (int) ($arguments['months_from_now'] ?? 0),
                    (int) ($arguments['duration_months'] ?? 1),
                    $topic
                );
            }
            if ($functionName === 'get_sky') {
                return $this->astrologyAnalysisService->getPlanetPositionsForDate(
                    (int) ($arguments['days_from_now'] ?? 0)
                );
            }
            return ['error' => 'Unknown function'];
        };
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