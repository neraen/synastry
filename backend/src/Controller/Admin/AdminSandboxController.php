<?php

namespace App\Controller\Admin;

use App\Entity\SandboxResult;
use App\Repository\SandboxResultRepository;
use App\Repository\UserRepository;
use App\Service\AstrologyService;
use App\Service\HoroscopeGeneratorService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/admin/sandbox')]
class AdminSandboxController extends AbstractController
{
    public function __construct(
        private UserRepository $userRepo,
        private HoroscopeGeneratorService $horoscopeService,
        private AstrologyService $astrologyService,
        private SandboxResultRepository $sandboxRepo,
        private EntityManagerInterface $em,
    ) {}

    #[Route('/horoscope', name: 'admin_sandbox_horoscope', methods: ['POST'])]
    public function horoscope(Request $request): JsonResponse
    {
        $data   = json_decode($request->getContent(), true);
        $userId = (int) ($data['userId'] ?? 0);

        $user = $this->userRepo->find($userId);
        if (!$user) {
            return $this->json(['error' => 'User not found'], Response::HTTP_NOT_FOUND);
        }

        if (!$user->hasBirthProfile()) {
            return $this->json(['error' => 'User has no birth profile'], Response::HTTP_BAD_REQUEST);
        }

        $this->horoscopeService->setLocale('fr');
        $result = $this->horoscopeService->getDailyHoroscope($user, true);

        $sandbox = new SandboxResult($user, 'horoscope', ['userId' => $userId]);
        $sandbox->setOutputData($result);
        $this->em->persist($sandbox);
        $this->em->flush();

        return $this->json(['success' => true, 'sandboxId' => $sandbox->getId(), 'result' => $result]);
    }

    #[Route('/compatibility', name: 'admin_sandbox_compatibility', methods: ['POST'])]
    public function compatibility(Request $request): JsonResponse
    {
        $data   = json_decode($request->getContent(), true);
        $userId = (int) ($data['userId'] ?? 0);

        $user = $this->userRepo->find($userId);
        if (!$user) {
            return $this->json(['error' => 'User not found'], Response::HTTP_NOT_FOUND);
        }

        if (!$user->hasBirthProfile()) {
            return $this->json(['error' => 'User has no birth profile'], Response::HTTP_BAD_REQUEST);
        }

        $requiredFields = ['partnerName', 'birthDate', 'birthCity', 'latitude', 'longitude'];
        foreach ($requiredFields as $field) {
            if (empty($data[$field])) {
                return $this->json(['error' => "Field '$field' is required"], Response::HTTP_BAD_REQUEST);
            }
        }

        try {
            $birthDate = new \DateTime($data['birthDate']);
        } catch (\Exception) {
            return $this->json(['error' => 'Invalid birth date'], Response::HTTP_BAD_REQUEST);
        }

        $timeParts = explode(':', $data['birthTime'] ?? '12:00');
        $partnerBirthData = [
            'year'         => (int) $birthDate->format('Y'),
            'month'        => (int) $birthDate->format('m'),
            'day'          => (int) $birthDate->format('d'),
            'hours'        => (int) ($timeParts[0] ?? 12),
            'minutes'      => (int) ($timeParts[1] ?? 0),
            'seconds'      => 0,
            'latitude'     => (float) $data['latitude'],
            'longitude'    => (float) $data['longitude'],
            'timezone'     => (float) ($data['timezone'] ?? 0),
            'timezoneName' => $data['timezoneName'] ?? null,
            'birthDate'    => $birthDate,
        ];

        $this->astrologyService->setLocale('fr');
        $result = $this->astrologyService->calculateSynastryV2WithExternal(
            $user,
            $data['partnerName'],
            $partnerBirthData,
            $data['question'] ?? null
        );

        $inputData = [
            'userId'      => $userId,
            'partnerName' => $data['partnerName'],
            'birthDate'   => $data['birthDate'],
            'birthCity'   => $data['birthCity'],
            'latitude'    => $data['latitude'],
            'longitude'   => $data['longitude'],
        ];

        $sandbox = new SandboxResult($user, 'compatibility', $inputData);
        $sandbox->setOutputData($result);
        $this->em->persist($sandbox);
        $this->em->flush();

        return $this->json(['success' => true, 'sandboxId' => $sandbox->getId(), 'result' => $result]);
    }

    #[Route('/results', name: 'admin_sandbox_results', methods: ['GET'])]
    public function results(Request $request): JsonResponse
    {
        $page  = max(1, (int) $request->query->get('page', 1));
        $limit = 20;
        $type  = $request->query->get('type');

        $qb = $this->sandboxRepo->createQueryBuilder('s')
            ->join('s.user', 'u')
            ->addSelect('u')
            ->orderBy('s.createdAt', 'DESC');

        if ($type) {
            $qb->andWhere('s.type = :type')->setParameter('type', $type);
        }

        $total = (clone $qb)->select('COUNT(s.id)')->getQuery()->getSingleScalarResult();

        $results = $qb->select('s', 'u')
            ->setFirstResult(($page - 1) * $limit)
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();

        return $this->json([
            'data' => array_map(fn(SandboxResult $s) => [
                'id'        => $s->getId(),
                'type'      => $s->getType(),
                'userId'    => $s->getUser()->getId(),
                'userEmail' => $s->getUser()->getEmail(),
                'inputData' => $s->getInputData(),
                'outputData'=> $s->getOutputData(),
                'createdAt' => $s->getCreatedAt()->format('c'),
            ], $results),
            'total' => (int) $total,
            'page'  => $page,
            'limit' => $limit,
        ]);
    }
}
