<?php

namespace App\Controller\Api;

use App\Entity\ChatSession;
use App\Entity\User;
use App\Enum\TopicLyra;
use App\Repository\ChatSessionRepository;
use App\Service\Webservice\OpenAiService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/chat/sessions')]
class ChatSessionController extends AbstractController
{
    private const MAX_SESSIONS = 20;

    public function __construct(
        private ChatSessionRepository $chatSessionRepository,
        private EntityManagerInterface $em,
        private OpenAiService $openAiService
    ) {}

    #[Route('', name: 'api_chat_sessions_list', methods: ['GET'])]
    public function list(): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        // Non-premium and expired premium users can still view the list of their past chats
        $sessions = $this->chatSessionRepository->findByUser($user);

        $data = array_map(function (ChatSession $session) {
            return [
                'id' => $session->getId(),
                'title' => $session->getTitle(),
                'partnerHistoryId' => $session->getPartnerHistoryId(),
                'createdAt' => $session->getCreatedAt()->format(\DateTimeInterface::ATOM),
                'updatedAt' => $session->getUpdatedAt()->format(\DateTimeInterface::ATOM),
            ];
        }, $sessions);

        return $this->json(['success' => true, 'sessions' => $data]);
    }

    #[Route('/{id}', name: 'api_chat_sessions_get', methods: ['GET'])]
    public function getSession(int $id): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        $session = $this->chatSessionRepository->find($id);

        if (!$session || $session->getUser() !== $user) {
            return $this->json(['success' => false, 'error' => 'Not found'], Response::HTTP_NOT_FOUND);
        }

        return $this->json([
            'success' => true,
            'session' => [
                'id' => $session->getId(),
                'title' => $session->getTitle(),
                'partnerHistoryId' => $session->getPartnerHistoryId(),
                'topic' => $session->getTopic(),
                'messages' => $session->getMessages(),
                'lastResponseId' => $session->getLastResponseId(),
                'createdAt' => $session->getCreatedAt()->format(\DateTimeInterface::ATOM),
                'updatedAt' => $session->getUpdatedAt()->format(\DateTimeInterface::ATOM),
            ],
            // Add a flag to let the frontend know if they can reply (must be premium)
            'can_reply' => $user->isPremium(),
        ]);
    }

    #[Route('', name: 'api_chat_sessions_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        if (!$user->isPremium()) {
            return $this->json(['success' => false, 'error' => 'Premium feature'], Response::HTTP_FORBIDDEN);
        }

        // Check limits
        $count = $this->chatSessionRepository->countByUser($user);
        if ($count >= self::MAX_SESSIONS) {
            return $this->json(['success' => false, 'error' => 'max_sessions_reached'], Response::HTTP_FORBIDDEN);
        }

        $data = json_decode($request->getContent(), true);
        $messages = $data['messages'] ?? [];
        $title = trim((string)($data['title'] ?? ''));
        $partnerHistoryId = isset($data['partnerHistoryId']) ? (int)$data['partnerHistoryId'] : null;
        $topic = TopicLyra::tryFrom((string)($data['topic'] ?? ''));

        if (empty($title) && !empty($messages)) {
            $title = $this->openAiService->generateChatTitle($messages);
        } elseif (empty($title)) {
            $title = 'Nouvelle conversation';
        }

        $session = new ChatSession();
        $session->setUser($user);
        $session->setTitle($title);
        $session->setMessages($messages);
        $session->setPartnerHistoryId($partnerHistoryId);
        $session->setTopic($topic?->value);

        $this->em->persist($session);
        $this->em->flush();

        return $this->json([
            'success' => true,
            'id' => $session->getId(),
            'title' => $session->getTitle(),
        ], Response::HTTP_CREATED);
    }

    #[Route('/{id}', name: 'api_chat_sessions_update', methods: ['PUT'])]
    public function update(int $id, Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        // Expired premium can read, but cannot update
        if (!$user->isPremium()) {
            return $this->json(['success' => false, 'error' => 'Premium feature'], Response::HTTP_FORBIDDEN);
        }

        $session = $this->chatSessionRepository->find($id);

        if (!$session || $session->getUser() !== $user) {
            return $this->json(['success' => false, 'error' => 'Not found'], Response::HTTP_NOT_FOUND);
        }

        $data = json_decode($request->getContent(), true);
        
        if (isset($data['messages'])) {
            $session->setMessages($data['messages']);
        }

        if (isset($data['title']) && trim($data['title']) !== '') {
            $session->setTitle(trim($data['title']));
        }

        if (array_key_exists('lastResponseId', $data)) {
            $session->setLastResponseId($data['lastResponseId'] ?: null);
        }

        $this->em->flush();

        return $this->json(['success' => true]);
    }

    #[Route('/{id}', name: 'api_chat_sessions_delete', methods: ['DELETE'])]
    public function delete(int $id): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        // Expired premium users CAN delete their chats
        $session = $this->chatSessionRepository->find($id);

        if (!$session || $session->getUser() !== $user) {
            return $this->json(['success' => false, 'error' => 'Not found'], Response::HTTP_NOT_FOUND);
        }

        $this->em->remove($session);
        $this->em->flush();

        return $this->json(['success' => true]);
    }
}
