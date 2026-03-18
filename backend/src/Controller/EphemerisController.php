<?php

namespace App\Controller;

use App\DTO\EphemerisDTO;
use App\Service\Webservice\EphemerisService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Routing\Annotation\Route;

class EphemerisController extends AbstractController
{
    #[Route('/ephemeris', name: 'get_ephemeris', methods: ['POST'])]
    public function getEphemeris(#[MapRequestPayload] EphemerisDTO $ephemerisDTO, EphemerisService $ephemerisService): JsonResponse
    {
        $positions = $ephemerisService->getPlanetaryPositions($ephemerisDTO);
        return new JsonResponse($positions);
    }
}
