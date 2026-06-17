<?php

namespace App\Controller\Admin;

use App\Entity\EvalGoldenCase;
use App\Entity\EvalResult;
use App\Entity\EvalRun;
use App\Entity\User;
use App\Message\RunGoldenSuiteMessage;
use App\Repository\EvalGoldenCaseRepository;
use App\Repository\EvalResultRepository;
use App\Repository\EvalRunRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Messenger\MessageBusInterface;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/admin/eval/golden')]
class AdminGoldenController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface $em,
        private EvalGoldenCaseRepository $caseRepo,
        private EvalRunRepository $runRepo,
        private EvalResultRepository $resultRepo,
        private MessageBusInterface $bus,
    ) {}

    // ── Cases ───────────────────────────────────────────────────────────────

    #[Route('/cases', name: 'admin_golden_cases', methods: ['GET'])]
    public function listCases(): JsonResponse
    {
        $cases = $this->caseRepo->findBy([], ['id' => 'ASC']);
        return $this->json(['data' => array_map([$this, 'serializeCase'], $cases)]);
    }

    #[Route('/cases', name: 'admin_golden_case_create', methods: ['POST'])]
    public function createCase(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?: [];
        if (empty($data['name']) || empty($data['generationType'])) {
            return $this->json(['error' => 'name and generationType are required'], Response::HTTP_BAD_REQUEST);
        }

        $case = new EvalGoldenCase((string) $data['name'], (string) $data['generationType']);
        $case->setInputData($data['inputData'] ?? [])
            ->setExpectations($data['expectations'] ?? null)
            ->setActive($data['active'] ?? true);

        $this->em->persist($case);
        $this->em->flush();

        return $this->json(['success' => true, 'case' => $this->serializeCase($case)]);
    }

    #[Route('/cases/{id}', name: 'admin_golden_case_update', methods: ['PUT'], requirements: ['id' => '\d+'])]
    public function updateCase(int $id, Request $request): JsonResponse
    {
        $case = $this->caseRepo->find($id);
        if (!$case) {
            return $this->json(['error' => 'Not found'], Response::HTTP_NOT_FOUND);
        }

        $data = json_decode($request->getContent(), true) ?: [];
        if (isset($data['name']))           { $case->setName((string) $data['name']); }
        if (isset($data['generationType'])) { $case->setGenerationType((string) $data['generationType']); }
        if (array_key_exists('inputData', $data))    { $case->setInputData($data['inputData'] ?? []); }
        if (array_key_exists('expectations', $data)) { $case->setExpectations($data['expectations']); }
        if (isset($data['active']))         { $case->setActive((bool) $data['active']); }

        $this->em->flush();
        return $this->json(['success' => true, 'case' => $this->serializeCase($case)]);
    }

    #[Route('/cases/{id}', name: 'admin_golden_case_delete', methods: ['DELETE'], requirements: ['id' => '\d+'])]
    public function deleteCase(int $id): JsonResponse
    {
        $case = $this->caseRepo->find($id);
        if (!$case) {
            return $this->json(['error' => 'Not found'], Response::HTTP_NOT_FOUND);
        }
        // Soft-delete to preserve historical run references.
        $case->setActive(false);
        $this->em->flush();
        return $this->json(['success' => true]);
    }

    // ── Runs ────────────────────────────────────────────────────────────────

    #[Route('/runs', name: 'admin_golden_run_create', methods: ['POST'])]
    public function createRun(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?: [];
        $run = new EvalRun('golden', $data['label'] ?? ('Run ' . date('Y-m-d H:i')));

        $admin = $this->getUser();
        if ($admin instanceof User) {
            $run->setTriggeredBy($admin);
        }

        $this->em->persist($run);
        $this->em->flush();

        $this->bus->dispatch(new RunGoldenSuiteMessage($run->getId()));

        return $this->json(['success' => true, 'run' => $this->serializeRun($run)]);
    }

    #[Route('/runs', name: 'admin_golden_runs', methods: ['GET'])]
    public function listRuns(): JsonResponse
    {
        $runs = $this->runRepo->findBy([], ['createdAt' => 'DESC'], 50);
        return $this->json(['data' => array_map([$this, 'serializeRun'], $runs)]);
    }

    #[Route('/runs/diff', name: 'admin_golden_run_diff', methods: ['GET'])]
    public function diff(Request $request): JsonResponse
    {
        $a = $this->runRepo->find((int) $request->query->get('a'));
        $b = $this->runRepo->find((int) $request->query->get('b'));
        if (!$a || !$b) {
            return $this->json(['error' => 'Both runs a and b are required'], Response::HTTP_BAD_REQUEST);
        }

        return $this->json([
            'runA' => $this->serializeRun($a),
            'runB' => $this->serializeRun($b),
            'rows' => $this->runRepo->diff($a, $b),
        ]);
    }

    #[Route('/runs/{id}', name: 'admin_golden_run_detail', methods: ['GET'], requirements: ['id' => '\d+'])]
    public function runDetail(int $id): JsonResponse
    {
        $run = $this->runRepo->find($id);
        if (!$run) {
            return $this->json(['error' => 'Not found'], Response::HTTP_NOT_FOUND);
        }

        $results = $this->resultRepo->findBy(['evalRun' => $run], ['id' => 'ASC']);

        return $this->json([
            'run'     => $this->serializeRun($run),
            'results' => array_map(fn(EvalResult $r) => [
                'id'             => $r->getId(),
                'generationType' => $r->getGenerationType(),
                'caseName'       => $r->getGoldenCase()?->getName(),
                'compositeScore' => $r->getCompositeScore(),
                'judgeScore'     => $r->getJudgeScore(),
                'passed'         => $r->getPassed(),
            ], $results),
        ]);
    }

    // ── Serializers ─────────────────────────────────────────────────────────

    private function serializeCase(EvalGoldenCase $c): array
    {
        return [
            'id'             => $c->getId(),
            'name'           => $c->getName(),
            'generationType' => $c->getGenerationType(),
            'inputData'      => $c->getInputData(),
            'expectations'   => $c->getExpectations(),
            'active'         => $c->isActive(),
            'updatedAt'      => $c->getUpdatedAt()->format('c'),
        ];
    }

    private function serializeRun(EvalRun $r): array
    {
        return [
            'id'           => $r->getId(),
            'label'        => $r->getLabel(),
            'status'       => $r->getStatus(),
            'caseCount'    => $r->getCaseCount(),
            'avgScore'     => $r->getAvgScore(),
            'totalCostUsd' => (float) $r->getTotalCostUsd(),
            'errorMessage' => $r->getErrorMessage(),
            'startedAt'    => $r->getStartedAt()?->format('c'),
            'finishedAt'   => $r->getFinishedAt()?->format('c'),
            'createdAt'    => $r->getCreatedAt()->format('c'),
        ];
    }
}
