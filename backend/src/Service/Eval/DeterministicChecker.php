<?php

namespace App\Service\Eval;

/**
 * Pure, LLM-free quality checks on a generated output. Returns a list of
 * per-criterion scores plus a hard pass/fail gate.
 *
 * Each criterion is reported as:
 *   ['criterion' => string, 'score' => float, 'maxScore' => float, 'rationale' => ?string]
 */
class DeterministicChecker
{
    /** Required top-level keys per generation type (override via $expectations['requiredKeys']). */
    private const REQUIRED_KEYS = [
        'horoscope'       => ['title', 'overview', 'love', 'energy', 'advice'],
        'synastry_v2'     => ['tagline', 'analyse', 'dimensions', 'forces', 'vigilance', 'aspect_cle', 'conseil'],
        'natal_section'   => ['content'],
        'cosmic_headline' => ['title', 'subtitle'],
        'transits'        => [],
        'chat'            => [],
    ];

    /** Default per-type max character length for the concatenated prose. */
    private const MAX_CHARS = [
        'horoscope'       => 1600,
        'synastry_v2'     => 6000,
        'natal_section'   => 6000,
        'cosmic_headline' => 200,
        'transits'        => 4000,
        'chat'            => 4000,
    ];

    public function __construct(private readonly LyraLinter $linter)
    {
    }

    /**
     * @param array<string,mixed>|string $output  parsed generation output
     * @param array<string,mixed>        $expectations  optional per-case overrides
     *
     * @return array{scores:array<array{criterion:string,score:float,maxScore:float,rationale:?string}>,passed:bool,aggregate:float}
     */
    public function check(string $generationType, array|string $output, array $expectations = []): array
    {
        $scores = [];

        // ── json_valid / non-empty ──────────────────────────────────────────
        $isStructured = is_array($output) && $output !== [];
        $jsonOk = is_string($output) ? trim($output) !== '' : $isStructured;
        $scores[] = $this->score('json_valid', $jsonOk ? 1 : 0, 1, $jsonOk ? null : 'Empty or unparseable output');

        // Locate the payload to inspect: synastry wraps text under "analysis".
        $payload = is_array($output) ? ($output['analysis'] ?? $output) : $output;

        // ── structural_complete ─────────────────────────────────────────────
        $required = $expectations['requiredKeys'] ?? self::REQUIRED_KEYS[$generationType] ?? [];
        if (!empty($required) && is_array($payload)) {
            $missing = array_values(array_filter($required, fn($k) => !array_key_exists($k, $payload) || $payload[$k] === null || $payload[$k] === ''));
            $ratio   = 1 - (count($missing) / max(1, count($required)));
            $scores[] = $this->score('structural_complete', round($ratio, 3), 1, $missing ? 'Missing: ' . implode(', ', $missing) : null);
        } else {
            $scores[] = $this->score('structural_complete', 1, 1, empty($required) ? 'No required keys for this type' : null);
        }

        // ── length_ok ───────────────────────────────────────────────────────
        $prose = $this->extractProse($payload);
        $len   = mb_strlen($prose);
        $min   = (int) ($expectations['minChars'] ?? 1);
        $max   = (int) ($expectations['maxChars'] ?? self::MAX_CHARS[$generationType] ?? 8000);
        $lenOk = $len >= $min && $len <= $max;
        $scores[] = $this->score('length_ok', $lenOk ? 1 : 0, 1, $lenOk ? null : "Length $len not in [$min, $max]");

        // ── banned_terms ────────────────────────────────────────────────────
        $violations = $prose !== '' ? $this->linter->lint($prose) : [];
        $bannedScore = empty($violations) ? 1.0 : max(0.0, 1 - 0.2 * count($violations));
        $scores[] = $this->score('banned_terms', round($bannedScore, 3), 1, $violations ? 'Banned: ' . implode(', ', $violations) : null);

        // ── Aggregate + hard gate ───────────────────────────────────────────
        $aggregate = array_sum(array_map(fn($s) => $s['score'] / $s['maxScore'], $scores)) / count($scores);

        // Hard gate: must be valid, structurally complete enough, no banned terms.
        $byCrit = [];
        foreach ($scores as $s) { $byCrit[$s['criterion']] = $s['score'] / $s['maxScore']; }
        $passed = ($byCrit['json_valid'] ?? 0) >= 1
            && ($byCrit['structural_complete'] ?? 0) >= 0.99
            && ($byCrit['banned_terms'] ?? 0) >= 1
            && ($byCrit['length_ok'] ?? 0) >= 1;

        return ['scores' => $scores, 'passed' => $passed, 'aggregate' => round($aggregate, 4)];
    }

    /**
     * Recursively concatenate all string leaves of the payload (for length +
     * banned-term checks). Skips obvious enum/id fields used by the UI glyphs.
     */
    private function extractProse(mixed $payload): string
    {
        if (is_string($payload)) {
            return $payload;
        }
        if (!is_array($payload)) {
            return '';
        }

        $skipKeys = ['planet', 'planet_a', 'planet_b', 'badge', 'icon', 'tags', 'date', 'locale'];
        $parts = [];
        foreach ($payload as $key => $value) {
            if (is_string($key) && in_array($key, $skipKeys, true)) {
                continue;
            }
            if (is_string($value)) {
                $parts[] = $value;
            } elseif (is_array($value)) {
                $parts[] = $this->extractProse($value);
            }
        }
        return trim(implode(' ', array_filter($parts)));
    }

    /**
     * @return array{criterion:string,score:float,maxScore:float,rationale:?string}
     */
    private function score(string $criterion, float $score, float $max, ?string $rationale): array
    {
        return ['criterion' => $criterion, 'score' => $score, 'maxScore' => $max, 'rationale' => $rationale];
    }
}
