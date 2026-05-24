<?php

namespace App\Controller\Admin;

use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/admin/users')]
class AdminUserController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface $em,
        private UserRepository $userRepo,
    ) {}

    #[Route('', name: 'admin_users_list', methods: ['GET'])]
    public function list(Request $request): JsonResponse
    {
        $page   = max(1, (int) $request->query->get('page', 1));
        $limit  = min(100, max(1, (int) $request->query->get('limit', 25)));
        $search = $request->query->get('search', '');
        $filter = $request->query->get('filter', 'all');
        $sort   = $request->query->get('sort', 'created_at');
        $order  = strtoupper($request->query->get('order', 'desc')) === 'ASC' ? 'ASC' : 'DESC';

        $qb = $this->userRepo->createQueryBuilder('u')
            ->leftJoin('u.birthProfile', 'bp')
            ->addSelect('bp');

        if ($search) {
            $qb->andWhere('u.email LIKE :search OR u.displayName LIKE :search')
               ->setParameter('search', '%' . $search . '%');
        }

        if ($filter === 'premium') {
            $qb->andWhere('u.isPremium = true');
        } elseif ($filter === 'free') {
            $qb->andWhere('u.isPremium = false');
        }

        $sortMap = [
            'created_at' => 'u.createdAt',
            'last_login'  => 'u.lastLoginAt',
            'name'        => 'u.displayName',
            'email'       => 'u.email',
        ];
        $sortField = $sortMap[$sort] ?? 'u.createdAt';
        $qb->orderBy($sortField, $order);

        $total = (clone $qb)->select('COUNT(u.id)')->getQuery()->getSingleScalarResult();

        $users = $qb->select('u', 'bp')
            ->setFirstResult(($page - 1) * $limit)
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();

        return $this->json([
            'data'  => array_map(fn(User $u) => $this->serializeUser($u), $users),
            'total' => (int) $total,
            'page'  => $page,
            'limit' => $limit,
        ]);
    }

    #[Route('/{id}', name: 'admin_user_detail', methods: ['GET'])]
    public function detail(int $id): JsonResponse
    {
        $user = $this->userRepo->find($id);
        if (!$user) {
            return $this->json(['error' => 'User not found'], Response::HTTP_NOT_FOUND);
        }

        return $this->json($this->serializeUserDetail($user));
    }

    #[Route('/{id}/premium', name: 'admin_user_toggle_premium', methods: ['PATCH'])]
    public function togglePremium(int $id, Request $request): JsonResponse
    {
        $user = $this->userRepo->find($id);
        if (!$user) {
            return $this->json(['error' => 'User not found'], Response::HTTP_NOT_FOUND);
        }

        $data = json_decode($request->getContent(), true);
        $isPremium = (bool) ($data['isPremium'] ?? false);
        $expiresAt = $data['expiresAt'] ?? null;

        $user->setIsPremium($isPremium);
        if ($expiresAt) {
            $user->setPremiumUntil(new \DateTime($expiresAt));
        } elseif (!$isPremium) {
            $user->setPremiumUntil(null);
        }

        $this->em->flush();

        return $this->json(['success' => true, 'isPremium' => $user->isPremium()]);
    }

    #[Route('/{id}', name: 'admin_user_delete', methods: ['DELETE'])]
    public function delete(int $id): JsonResponse
    {
        $user = $this->userRepo->find($id);
        if (!$user) {
            return $this->json(['error' => 'User not found'], Response::HTTP_NOT_FOUND);
        }

        $this->em->remove($user);
        $this->em->flush();

        return $this->json(['success' => true]);
    }

    private function serializeUser(User $user): array
    {
        $messageCount = 0;
        foreach ($user->getChatSessions() as $session) {
            $messageCount += count($session->getMessages());
        }

        return [
            'id'                  => $user->getId(),
            'email'               => $user->getEmail(),
            'displayName'         => $user->getDisplayName(),
            'authProvider'        => $user->getAuthProvider(),
            'isPremium'           => $user->isPremium(),
            'premiumExpiresAt'    => $user->getPremiumUntil()?->format('c'),
            'createdAt'           => $user->getCreatedAt()?->format('c'),
            'lastLoginAt'         => $user->getLastLoginAt()?->format('c'),
            'lyraMessageCount'    => $messageCount,
            'natalChartGenerated' => $user->getBirthProfile() !== null,
        ];
    }

    private function serializeUserDetail(User $user): array
    {
        $base = $this->serializeUser($user);
        $bp   = $user->getBirthProfile();

        $conversations = [];
        foreach ($user->getChatSessions() as $session) {
            $msgs = $session->getMessages();
            $conversations[] = [
                'id'             => $session->getId(),
                'title'          => $session->getTitle(),
                'messageCount'   => count($msgs),
                'firstMessageAt' => $session->getCreatedAt()?->format('c'),
                'lastMessageAt'  => $session->getUpdatedAt()?->format('c'),
            ];
        }

        $base['birthDate']      = $bp?->getBirthDate()?->format('Y-m-d');
        $base['birthPlace']     = $bp ? trim(($bp->getBirthCity() ?? '') . ', ' . ($bp->getBirthCountry() ?? '')) : null;
        $base['revenuecatId']   = $user->getId() ? (string) $user->getId() : null;
        $base['subscriptionPlatform'] = null;
        $base['conversations']  = $conversations;

        return $base;
    }
}
