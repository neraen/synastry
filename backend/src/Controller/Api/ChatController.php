<?php

namespace App\Controller\Api;

use App\Entity\User;
use App\Repository\NatalChartRepository;
use App\Repository\SynastryHistoryRepository;
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

    public function __construct(
        private OpenAiService $openAiService,
        private NatalChartRepository $natalChartRepository,
        private SynastryHistoryRepository $synastryHistoryRepository,
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

        if (count($messages) > 20) {
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

        $result = $this->openAiService->getChatResponse($messages, $userContext);

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