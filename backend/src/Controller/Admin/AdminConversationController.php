<?php

namespace App\Controller\Admin;

use App\Entity\ChatSession;
use App\Repository\ChatSessionRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/admin/conversations')]
class AdminConversationController extends AbstractController
{
    public function __construct(
        private ChatSessionRepository $sessionRepo,
    ) {}

    #[Route('', name: 'admin_conversations_list', methods: ['GET'])]
    public function list(Request $request): JsonResponse
    {
        $page     = max(1, (int) $request->query->get('page', 1));
        $limit    = min(100, max(1, (int) $request->query->get('limit', 25)));
        $userId   = $request->query->get('userId');
        $dateFrom = $request->query->get('dateFrom');
        $dateTo   = $request->query->get('dateTo');

        $qb = $this->sessionRepo->createQueryBuilder('cs')
            ->join('cs.user', 'u')
            ->addSelect('u');

        if ($userId) {
            $qb->andWhere('cs.user = :userId')->setParameter('userId', (int) $userId);
        }

        if ($dateFrom) {
            $qb->andWhere('cs.createdAt >= :dateFrom')->setParameter('dateFrom', new \DateTimeImmutable($dateFrom));
        }

        if ($dateTo) {
            $qb->andWhere('cs.createdAt <= :dateTo')->setParameter('dateTo', new \DateTimeImmutable($dateTo . ' 23:59:59'));
        }

        $qb->orderBy('cs.updatedAt', 'DESC');

        $total = (clone $qb)->select('COUNT(cs.id)')->getQuery()->getSingleScalarResult();

        $sessions = $qb->select('cs', 'u')
            ->setFirstResult(($page - 1) * $limit)
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();

        return $this->json([
            'data'  => array_map(fn(ChatSession $s) => $this->serializeSession($s), $sessions),
            'total' => (int) $total,
            'page'  => $page,
            'limit' => $limit,
        ]);
    }

    #[Route('/{id}/messages', name: 'admin_conversation_messages', methods: ['GET'])]
    public function messages(int $id, Request $request): JsonResponse
    {
        $session = $this->sessionRepo->find($id);
        if (!$session) {
            return $this->json(['error' => 'Conversation not found'], Response::HTTP_NOT_FOUND);
        }

        $page  = max(1, (int) $request->query->get('page', 1));
        $limit = min(200, max(1, (int) $request->query->get('limit', 100)));

        $allMessages = $session->getMessages();
        $total       = count($allMessages);
        $offset      = ($page - 1) * $limit;
        $messages    = array_slice($allMessages, $offset, $limit);

        $serialized = array_map(function (array $msg, int $idx) use ($offset): array {
            return [
                'id'         => $offset + $idx + 1,
                'role'       => $msg['role'] ?? 'user',
                'content'    => $msg['content'] ?? '',
                'createdAt'  => $msg['created_at'] ?? null,
                'tokenCount' => $msg['token_count'] ?? null,
            ];
        }, $messages, array_keys($messages));

        return $this->json([
            'sessionId' => $session->getId(),
            'userEmail' => $session->getUser()?->getEmail(),
            'title'     => $session->getTitle(),
            'data'      => $serialized,
            'total'     => $total,
            'page'      => $page,
            'limit'     => $limit,
        ]);
    }

    private function serializeSession(ChatSession $session): array
    {
        $messages = $session->getMessages();
        return [
            'id'             => $session->getId(),
            'userId'         => $session->getUser()?->getId(),
            'userEmail'      => $session->getUser()?->getEmail(),
            'title'          => $session->getTitle(),
            'messageCount'   => count($messages),
            'firstMessageAt' => $session->getCreatedAt()?->format('c'),
            'lastMessageAt'  => $session->getUpdatedAt()?->format('c'),
        ];
    }
}
