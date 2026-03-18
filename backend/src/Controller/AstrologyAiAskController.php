<?php

namespace App\Controller;

use App\DTO\SynastryDTO;
use App\Service\Webservice\EphemerisService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use App\Service\Webservice\OpenAiService;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Routing\Annotation\Route;

class AstrologyAiAskController extends AbstractController
{
    public function __construct(private EphemerisService $ephemerisService, private OpenAiService $openAiService)
    {
        // Constructor logic if needed
    }

    #[Route('/astrology/synastry', name: 'get_synastry', methods: ['POST'])]
    public function askAstrologyAi(
        #[MapRequestPayload] SynastryDTO $synastryDTO,
    ): string {
        $userTheme = $this->ephemerisService->getPlanetaryPositions($synastryDTO->getUserTheme());
        $partnerTheme = $this->ephemerisService->getPlanetaryPositions($synastryDTO->getPartnerTheme());
        $question = $synastryDTO->getQuestion() ?? "En quoi on est compatible et incompatible ? Quels conseils relationnels peux-tu donner ?";
        return $this->openAiService->getAstroAdvice($synastryDTO->getUserName(), $synastryDTO->getPartnerName(), $userTheme, $partnerTheme, $question);
    }
}