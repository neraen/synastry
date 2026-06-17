<?php

namespace App\Service\Eval;

use App\Service\Webservice\OpenAiService;

/**
 * LLM-as-judge: grades a generated output on qualitative criteria using a
 * strong model. Returns per-criterion scores (0..10) + an overall (0..100).
 * Parse failures degrade gracefully (judge marked errored, never throws).
 */
class LlmJudgeService
{
    private const CRITERIA = ['tone', 'astro_accuracy', 'readability', 'personalization'];

    /** Per-type framing appended to the shared rubric. */
    private const TYPE_GUIDANCE = [
        'horoscope'       => "C'est un horoscope quotidien personnalisé (titre + sections amour/énergie/conseil).",
        'synastry_v2'     => "C'est une analyse de compatibilité (synastrie) entre deux thèmes.",
        'natal_section'   => "C'est une section d'interprétation de thème natal.",
        'transits'        => "Ce sont des prédictions de transits à venir.",
        'cosmic_headline' => "C'est un titre/sous-titre cosmique hebdomadaire très court.",
        'chat'            => "C'est une réponse de l'assistante astro Lyra en conversation.",
    ];

    public function __construct(
        private readonly OpenAiService $openAiService,
        private readonly LlmCallRecorder $recorder,
    ) {
    }

    /**
     * @param array<string,mixed>|string $output
     *
     * @return array{
     *   ok:bool,
     *   overall:?float,
     *   scores:array<array{criterion:string,score:float,maxScore:float,rationale:?string}>,
     *   model:string,
     *   costUsd:?string,
     *   error:?string
     * }
     */
    public function judge(string $generationType, array|string $input, array|string $output): array
    {
        $instructions = $this->buildRubric($generationType);
        $payload = json_encode([
            'type'   => $generationType,
            'input'  => $input,
            'output' => $output,
        ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

        $result = $this->openAiService->callJudge($payload, $instructions);

        if (empty($result['success']) || empty($result['content'])) {
            return $this->errored($result['error'] ?? 'Judge call failed');
        }

        $parsed = $this->parseJson((string) $result['content']);
        if ($parsed === null) {
            return $this->errored('Judge returned unparseable JSON');
        }

        $scores = [];
        foreach (self::CRITERIA as $crit) {
            $entry = $parsed[$crit] ?? null;
            if (!is_array($entry) || !isset($entry['score'])) {
                continue;
            }
            $scores[] = [
                'criterion' => $crit,
                'score'     => max(0.0, min(10.0, (float) $entry['score'])),
                'maxScore'  => 10.0,
                'rationale' => isset($entry['rationale']) ? (string) $entry['rationale'] : null,
            ];
        }

        $overall = isset($parsed['overall'])
            ? max(0.0, min(100.0, (float) $parsed['overall']))
            : ($scores ? round(array_sum(array_column($scores, 'score')) / count($scores) * 10, 1) : null);

        return [
            'ok'      => true,
            'overall' => $overall,
            'scores'  => $scores,
            'model'   => OpenAiService::MODEL_JUDGE,
            'costUsd' => $this->recorder->estimate(OpenAiService::MODEL_JUDGE, $result['usage'] ?? null),
            'error'   => null,
        ];
    }

    private function buildRubric(string $generationType): string
    {
        $guidance = self::TYPE_GUIDANCE[$generationType] ?? "C'est un contenu généré par l'app d'astrologie Lunestia.";

        return <<<TXT
        Tu es un évaluateur qualité rigoureux pour une app d'astrologie haut de gamme (Lunestia).
        {$guidance}

        On te fournit un objet JSON {type, input, output}. Évalue UNIQUEMENT la qualité de "output".

        Note chacun de ces critères de 0 à 10 :
        - tone : ton direct, incarné, sans jargon ni langue New Age ; respect du style "tu".
        - astro_accuracy : cohérence astrologique au regard de l'input fourni ; pas d'invention.
        - readability : clarté, concision, paragraphes courts, lisibilité.
        - personalization : le contenu est-il spécifique à la personne/au thème, pas générique.

        Réponds UNIQUEMENT en JSON valide, sans texte autour, avec ce schéma exact :
        {
          "tone": {"score": 0-10, "rationale": "..."},
          "astro_accuracy": {"score": 0-10, "rationale": "..."},
          "readability": {"score": 0-10, "rationale": "..."},
          "personalization": {"score": 0-10, "rationale": "..."},
          "overall": 0-100
        }
        TXT;
    }

    private function parseJson(string $content): ?array
    {
        $content = preg_replace('/^```json?\s*/m', '', $content);
        $content = preg_replace('/```\s*$/m', '', (string) $content);
        $content = trim((string) $content);

        $data = json_decode($content, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($data)) {
            return $data;
        }
        if (preg_match('/\{.*\}/s', $content, $m)) {
            $data = json_decode($m[0], true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($data)) {
                return $data;
            }
        }
        return null;
    }

    private function errored(string $error): array
    {
        return [
            'ok'      => false,
            'overall' => null,
            'scores'  => [],
            'model'   => OpenAiService::MODEL_JUDGE,
            'costUsd' => null,
            'error'   => $error,
        ];
    }
}
