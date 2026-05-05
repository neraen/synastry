<?php

namespace App\Controller\Api;

use App\Entity\User;
use App\Repository\NatalChartRepository;
use App\Repository\SynastryHistoryRepository;
use App\Service\AstrologyAnalysisService;
use App\Service\PromptLocaleService;
use App\Service\Webservice\OpenAiService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Contracts\Cache\CacheInterface;
use Symfony\Contracts\Cache\ItemInterface;

#[Route('/api/chat')]
class ChatController extends AbstractController
{
    private const DAILY_FREE_LIMIT = 5;
    // Key planets to include in the context (most astrologically significant)
    private const CONTEXT_PLANETS = ['Sun', 'Moon', 'Ascendant', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];

    /** Cache TTL for upcoming transit summary: 7 days */
    private const TRANSIT_CACHE_TTL = 604800;

    public function __construct(
        private OpenAiService $openAiService,
        private NatalChartRepository $natalChartRepository,
        private SynastryHistoryRepository $synastryHistoryRepository,
        private AstrologyAnalysisService $astrologyAnalysisService,
        private CacheInterface $cache,
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

            // Increment: delete and re-store with new count
            $newCount = $count + 1;
            $this->cache->delete($cacheKey);
            $this->cache->get($cacheKey, function (ItemInterface $item) use ($newCount) {
                $tomorrow = new \DateTime('tomorrow midnight');
                $item->expiresAt($tomorrow);
                return $newCount;
            });

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
                return $this->astrologyAnalysisService->getUpcomingTransitSummary($user, 12);
            });
            if (!empty($upcomingTransits)) {
                $userContext['upcoming_transits'] = $upcomingTransits;
            }
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

        $result['remaining_messages'] = $remainingMessages;
        $result['daily_limit_reached'] = false;

        return $this->json($result);
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