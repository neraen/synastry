<?php

namespace App\Controller\Admin;

use App\Repository\BlindValidationRepository;
use App\Service\Rectification\BlindValidationService;
use App\Service\Rectification\RectificationConfig;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Annotation\Route;

/**
 * Accuracy dashboard for the rectification engine (spec §10).
 *
 * This is the instrument the module is steered by. Everything else it reports —
 * coherence, contrast, interval width — is the model grading its own homework;
 * only these numbers say whether it was right, and they are what any precision
 * claim in the UI has to be adossé to.
 *
 * Two readings matter most:
 *
 *   - `calibration` — the share of runs whose real error fell inside their own
 *     announced margin. A well-behaved 80 % interval should sit near 0.8. Well
 *     below and the app is promising precision it does not have.
 *   - `inconclusive_rate` — how often the guard rails refuse. Read together
 *     with the median error: a high refusal rate with a low error is a cautious
 *     engine, a low refusal rate with a high error is a confident wrong one.
 *
 * Protected by `^/api/admin` -> ROLE_ADMIN in security.yaml.
 */
#[Route('/api/admin/rectification')]
class AdminRectificationController extends AbstractController
{
    public function __construct(
        private readonly BlindValidationService $blindValidation,
        private readonly BlindValidationRepository $validations,
    ) {
    }

    #[Route('/metrics', name: 'admin_rectification_metrics', methods: ['GET'])]
    public function metrics(): JsonResponse
    {
        $metrics = $this->blindValidation->metrics();

        return $this->json([
            'success' => true,
            'overall' => $metrics['overall'],
            'segments' => $metrics['segments'],
            'recent'   => $metrics['recent'],
            // Shipped alongside so a calibration run can see, in one response,
            // which constants produced these numbers.
            'config'  => [
                'grid_step_minutes'   => RectificationConfig::GRID_STEP_MINUTES,
                'min_events'          => RectificationConfig::MIN_EVENTS,
                'min_day_dated'       => RectificationConfig::MIN_DAY_DATED_EVENTS,
                'coherence_threshold' => RectificationConfig::COHERENCE_THRESHOLD,
                'contrast_factor'     => RectificationConfig::CONTRAST_FACTOR,
                'max_conclusive_uncertainty_minutes' => RectificationConfig::MAX_CONCLUSIVE_UNCERTAINTY_MINUTES,
                'techniques'          => RectificationConfig::TECHNIQUES,
            ],
            // The honest headline. Null until the corpus exists — the UI must
            // not announce a precision that is not backed by this number.
            'headline' => $this->headline($metrics['overall']),
        ]);
    }

    /**
     * The one sentence the marketing copy may legitimately use, or null.
     *
     * Deliberately refuses to produce anything on a thin corpus: a "±12 min"
     * claim built on four measurements is worse than no claim, because it will
     * be quoted long after it stops being true.
     *
     * @param array<string, mixed> $overall
     */
    private function headline(array $overall): ?string
    {
        if ($overall['scored'] < 30 || $overall['median_error'] === null) {
            return null;
        }

        return sprintf(
            'Erreur médiane %d min · %d %% à ±30 min · %d %% à ±60 min (sur %d tests en aveugle)',
            $overall['median_error'],
            (int) round($overall['within_30'] * 100),
            (int) round($overall['within_60'] * 100),
            $overall['scored'],
        );
    }
}
