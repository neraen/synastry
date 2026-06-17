<?php

namespace App\Service\Eval;

use App\Entity\DailyHoroscope;
use App\Entity\EvalResult;
use App\Entity\NatalChartSection;
use App\Entity\SynastryHistory;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Loads a real production entity, extracts its generated output, and runs it
 * through the shared {@see EvaluationService}. Used by the admin "score this
 * production output" endpoint and by sampled batch scoring.
 */
class ProductionScorer
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly EvaluationService $evaluator,
    ) {
    }

    /**
     * @param string $generationType horoscope | synastry_v2 | natal_section
     * @param int|string $id         entity id
     */
    public function score(string $generationType, int|string $id, bool $runJudge = true): ?EvalResult
    {
        return match ($generationType) {
            'horoscope'     => $this->scoreHoroscope((int) $id, $runJudge),
            'synastry_v2'   => $this->scoreSynastry((int) $id, $runJudge),
            'natal_section' => $this->scoreNatalSection((int) $id, $runJudge),
            default         => null,
        };
    }

    private function scoreHoroscope(int $id, bool $runJudge): ?EvalResult
    {
        $h = $this->em->getRepository(DailyHoroscope::class)->find($id);
        if (!$h) {
            return null;
        }

        $output = [
            'title'    => $h->getTitle(),
            'overview' => $h->getOverview(),
            'love'     => $h->getLove(),
            'energy'   => $h->getEnergy(),
            'advice'   => $h->getAdvice(),
        ];
        $input = ['natalData' => $h->getNatalData(), 'transitsData' => $h->getTransitsData()];

        return $this->evaluator->evaluate('horoscope', $input, $output, [
            'source'        => 'production',
            'runJudge'      => $runJudge,
            'user'          => $h->getUser(),
            'referenceType' => 'DailyHoroscope',
            'referenceId'   => (string) $h->getId(),
        ]);
    }

    private function scoreSynastry(int $id, bool $runJudge): ?EvalResult
    {
        $s = $this->em->getRepository(SynastryHistory::class)->find($id);
        if (!$s) {
            return null;
        }

        // compatibilityDetails holds the structured v2 "analysis" payload.
        $output = ['analysis' => $s->getCompatibilityDetails() ?? ['text' => (string) $s->getAnalysis()]];
        $input  = [
            'question'         => $s->getQuestion(),
            'userPositions'    => $s->getUserPositions(),
            'partnerPositions' => $s->getPartnerPositions(),
        ];

        return $this->evaluator->evaluate('synastry_v2', $input, $output, [
            'source'        => 'production',
            'runJudge'      => $runJudge,
            'user'          => $s->getUser(),
            'referenceType' => 'SynastryHistory',
            'referenceId'   => (string) $s->getId(),
        ]);
    }

    private function scoreNatalSection(int $id, bool $runJudge): ?EvalResult
    {
        $sec = $this->em->getRepository(NatalChartSection::class)->find($id);
        if (!$sec) {
            return null;
        }

        $content = $sec->getContent();
        $output  = is_array($content) ? $content : ['content' => (string) $content];

        return $this->evaluator->evaluate('natal_section', ['section' => $sec->getSection()], $output, [
            'source'        => 'production',
            'runJudge'      => $runJudge,
            'user'          => $sec->getUser(),
            'referenceType' => 'NatalChartSection',
            'referenceId'   => (string) $sec->getId(),
            'expectations'  => ['requiredKeys' => []], // content shape varies per section
        ]);
    }
}
