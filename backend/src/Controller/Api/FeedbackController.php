<?php

namespace App\Controller\Api;

use App\Entity\ContentFeedback;
use App\Entity\User;
use App\Repository\ContentFeedbackRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/feedback')]
class FeedbackController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface $em,
        private ContentFeedbackRepository $feedbackRepository,
    ) {}

    /**
     * Submit or update feedback for a content item.
     *
     * Body: { contentType: string, contentRef: string, isPositive: bool }
     */
    #[Route('', name: 'api_feedback_submit', methods: ['POST'])]
    public function submit(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        $data = json_decode($request->getContent(), true);

        $contentType = $data['contentType'] ?? null;
        $contentRef  = $data['contentRef']  ?? null;
        $isPositive  = $data['isPositive']  ?? null;

        if (!in_array($contentType, ['chat', 'horoscope', 'natal'], true)) {
            return $this->json(['success' => false, 'error' => 'Invalid contentType'], Response::HTTP_BAD_REQUEST);
        }
        if ($contentRef === null || $contentRef === '') {
            return $this->json(['success' => false, 'error' => 'contentRef is required'], Response::HTTP_BAD_REQUEST);
        }
        if (!is_bool($isPositive)) {
            return $this->json(['success' => false, 'error' => 'isPositive must be a boolean'], Response::HTTP_BAD_REQUEST);
        }

        $feedback = $this->feedbackRepository->findOneByUserContent($user, $contentType, $contentRef);

        if ($feedback) {
            $feedback->setIsPositive($isPositive);
        } else {
            $feedback = new ContentFeedback();
            $feedback->setUser($user);
            $feedback->setContentType($contentType);
            $feedback->setContentRef($contentRef);
            $feedback->setIsPositive($isPositive);
            $this->em->persist($feedback);
        }

        $this->em->flush();

        return $this->json(['success' => true]);
    }
}
