<?php

namespace App\Controller\Admin;

use App\Entity\LyraConversationLog;
use App\Repository\LyraConversationLogRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/admin/chat-logs')]
class AdminChatLogController extends AbstractController
{
    public function __construct(
        private LyraConversationLogRepository $repo,
    ) {}

    #[Route('', name: 'admin_chat_logs_list', methods: ['GET'])]
    public function list(Request $request): JsonResponse
    {
        $page     = max(1, (int) $request->query->get('page', 1));
        $limit    = min(100, max(1, (int) $request->query->get('limit', 50)));
        $userId   = $request->query->get('userId');
        $search   = $request->query->get('search', '');

        $qb = $this->repo->createQueryBuilder('l')
            ->join('l.user', 'u')
            ->addSelect('u')
            ->orderBy('l.createdAt', 'DESC');

        if ($userId) {
            $qb->andWhere('l.user = :userId')->setParameter('userId', (int) $userId);
        }

        if ($search) {
            $qb->andWhere('u.email LIKE :search OR l.userMessage LIKE :search')
               ->setParameter('search', '%' . $search . '%');
        }

        $total = (clone $qb)->select('COUNT(l.id)')->getQuery()->getSingleScalarResult();

        $logs = $qb->select('l', 'u')
            ->setFirstResult(($page - 1) * $limit)
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();

        return $this->json([
            'data'  => array_map(fn(LyraConversationLog $l) => [
                'id'                => $l->getId(),
                'userId'            => $l->getUser()->getId(),
                'userEmail'         => $l->getUser()->getEmail(),
                'userDisplayName'   => $l->getUser()->getDisplayName(),
                'userMessage'       => $l->getUserMessage(),
                'assistantResponse' => $l->getAssistantResponse(),
                'messageCount'      => $l->getMessageCount(),
                'createdAt'         => $l->getCreatedAt()->format('c'),
            ], $logs),
            'total' => (int) $total,
            'page'  => $page,
            'limit' => $limit,
        ]);
    }
}
