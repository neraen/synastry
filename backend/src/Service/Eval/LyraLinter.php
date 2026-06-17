<?php

namespace App\Service\Eval;

use App\Service\PlanetaryCalculator;

/**
 * Deterministic banned-term enforcement for generated prose, backed by
 * data/lyra_bannis.json. Extracted from OpenAiService so both the generation
 * pipeline (auto-correction) and the evaluation engine can share it.
 */
class LyraLinter
{
    private ?array $bannis = null;

    /**
     * @return array{termes:string[],expressions:string[],aspects:string[],regex:string[]}
     */
    public function loadBannis(): array
    {
        if ($this->bannis === null) {
            $path = __DIR__ . '/../../../data/lyra_bannis.json';
            $this->bannis = file_exists($path)
                ? (json_decode(file_get_contents($path), true) ?: [])
                : [];
        }
        return $this->bannis;
    }

    /**
     * Detect banned terms/expressions/aspects/regex in a generated reply.
     * Terms & aspects: whole-word on the normalised text. Expressions: substring
     * on the normalised text. Regex: applied to the RAW text (em dash, "maison N").
     *
     * @return string[] list of distinct violations (empty = clean)
     */
    public function lint(string $texte): array
    {
        $bannis = $this->loadBannis();
        $norm   = PlanetaryCalculator::normaliser($texte);
        $violations = [];

        foreach (array_merge($bannis['termes'] ?? [], $bannis['aspects'] ?? []) as $mot) {
            if ($mot === '') continue;
            if (preg_match('/\b' . preg_quote($mot, '/') . '\b/u', $norm)) {
                $violations[] = $mot;
            }
        }
        foreach ($bannis['expressions'] ?? [] as $exp) {
            if ($exp !== '' && str_contains($norm, $exp)) {
                $violations[] = $exp;
            }
        }
        foreach ($bannis['regex'] ?? [] as $re) {
            if (@preg_match('/' . $re . '/iu', $texte)) {
                $violations[] = $re;
            }
        }

        return array_values(array_unique($violations));
    }

    /**
     * Last-resort deterministic scrub: em dash -> comma, banned single words
     * removed (accent-insensitive). Multi-word expressions are left to the log.
     */
    public function scrub(string $texte): string
    {
        $bannis = $this->loadBannis();
        $texte  = str_replace('—', ',', $texte);

        $banSet = array_flip(array_merge($bannis['termes'] ?? [], $bannis['aspects'] ?? []));

        $texte = preg_replace_callback('/\p{L}+/u', function (array $m) use ($banSet) {
            $norm = PlanetaryCalculator::normaliser($m[0]);
            return isset($banSet[$norm]) ? '' : $m[0];
        }, $texte);

        $texte = preg_replace('/\s+([,.;:!?])/u', '$1', $texte); // tidy " ," -> ","
        $texte = preg_replace('/\s{2,}/u', ' ', $texte);

        return trim($texte);
    }
}
