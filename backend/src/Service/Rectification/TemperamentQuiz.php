<?php

namespace App\Service\Rectification;

use App\Service\PlanetaryCalculator;

/**
 * The temperament quiz (spec §7.3, §7.5) — eight questions on appearance and
 * manner, mapped onto the Ascendant signs still in play.
 *
 * Its contribution is hard-capped at ten percent of the total evidence, and the
 * cap is the feature rather than a caveat. Self-reported temperament is the
 * weakest signal in the whole module: it is retrospective, it is flattering,
 * and everyone recognises themselves in every sign. Letting it compete with a
 * dated event would trade a measurement for a mood.
 *
 * So the quiz is offered only when the posterior is multimodal, and it can
 * separate two candidates the events left tied — never overturn one they
 * supported.
 */
final class TemperamentQuiz
{
    /**
     * Eight forced-choice questions. Each option points at the signs whose
     * classical Ascendant description it matches; several signs per option is
     * normal and healthy — the discrimination comes from the accumulation
     * across eight answers, not from any single one.
     *
     * @var list<array{key: string, question: string, options: list<array{key: string, label: string, signs: list<string>}>}>
     */
    public const QUESTIONS = [
        [
            'key'      => 'premiere_impression',
            'question' => 'Quand tu entres dans une pièce où tu ne connais personne…',
            'options'  => [
                ['key' => 'discret', 'label' => 'Je me fais discret·e', 'signs' => ['Cancer', 'Vierge', 'Poissons', 'Capricorne']],
                ['key' => 'observe', 'label' => "J'observe avant d'avancer", 'signs' => ['Scorpion', 'Capricorne', 'Verseau', 'Vierge']],
                ['key' => 'remarque', 'label' => 'On me remarque assez vite', 'signs' => ['Bélier', 'Lion', 'Sagittaire', 'Balance']],
            ],
        ],
        [
            'key'      => 'rythme',
            'question' => 'Ton rythme naturel, c’est plutôt…',
            'options'  => [
                ['key' => 'vif', 'label' => 'Vif, je démarre au quart de tour', 'signs' => ['Bélier', 'Gémeaux', 'Sagittaire', 'Verseau']],
                ['key' => 'posé', 'label' => 'Posé, je prends mon temps', 'signs' => ['Taureau', 'Cancer', 'Capricorne', 'Poissons']],
                ['key' => 'variable', 'label' => 'Très variable selon les jours', 'signs' => ['Gémeaux', 'Poissons', 'Balance', 'Scorpion']],
            ],
        ],
        [
            'key'      => 'silhouette',
            'question' => 'Ta silhouette, on la décrirait comme…',
            'options'  => [
                ['key' => 'fine', 'label' => 'Plutôt fine ou élancée', 'signs' => ['Gémeaux', 'Vierge', 'Verseau', 'Sagittaire']],
                ['key' => 'solide', 'label' => 'Plutôt solide ou charpentée', 'signs' => ['Taureau', 'Lion', 'Capricorne', 'Scorpion']],
                ['key' => 'ronde', 'label' => 'Plutôt douce ou ronde', 'signs' => ['Cancer', 'Poissons', 'Balance', 'Taureau']],
            ],
        ],
        [
            'key'      => 'regard',
            'question' => 'Ce qu’on remarque en premier chez toi…',
            'options'  => [
                ['key' => 'yeux', 'label' => 'Mon regard', 'signs' => ['Scorpion', 'Poissons', 'Cancer', 'Verseau']],
                ['key' => 'sourire', 'label' => 'Mon sourire', 'signs' => ['Balance', 'Sagittaire', 'Lion', 'Gémeaux']],
                ['key' => 'allure', 'label' => 'Mon allure générale', 'signs' => ['Capricorne', 'Taureau', 'Bélier', 'Vierge']],
            ],
        ],
        [
            'key'      => 'conflit',
            'question' => 'Face à un conflit…',
            'options'  => [
                ['key' => 'front', 'label' => 'J’y vais franchement', 'signs' => ['Bélier', 'Lion', 'Sagittaire', 'Scorpion']],
                ['key' => 'evite', 'label' => 'J’évite autant que possible', 'signs' => ['Poissons', 'Balance', 'Cancer', 'Taureau']],
                ['key' => 'analyse', 'label' => 'Je décortique avant d’agir', 'signs' => ['Vierge', 'Capricorne', 'Verseau', 'Gémeaux']],
            ],
        ],
        [
            'key'      => 'inconnu',
            'question' => 'Devant quelque chose de complètement nouveau…',
            'options'  => [
                ['key' => 'curieux', 'label' => 'Curiosité immédiate', 'signs' => ['Gémeaux', 'Sagittaire', 'Verseau', 'Bélier']],
                ['key' => 'prudent', 'label' => 'Prudence, je teste doucement', 'signs' => ['Taureau', 'Vierge', 'Capricorne', 'Cancer']],
                ['key' => 'intuitif', 'label' => 'Je sens si ça me va ou pas', 'signs' => ['Poissons', 'Scorpion', 'Cancer', 'Balance']],
            ],
        ],
        [
            'key'      => 'energie',
            'question' => 'Ton énergie au quotidien…',
            'options'  => [
                ['key' => 'constante', 'label' => 'Assez constante', 'signs' => ['Taureau', 'Capricorne', 'Lion', 'Vierge']],
                ['key' => 'pics', 'label' => 'Par pics, puis je m’effondre', 'signs' => ['Bélier', 'Gémeaux', 'Scorpion', 'Poissons']],
                ['key' => 'depend', 'label' => 'Dépend beaucoup des gens autour', 'signs' => ['Balance', 'Cancer', 'Poissons', 'Verseau']],
            ],
        ],
        [
            'key'      => 'reputation',
            'question' => 'Ce qu’on dit de toi le plus souvent…',
            'options'  => [
                ['key' => 'calme', 'label' => 'Que tu es calme, rassurant·e', 'signs' => ['Taureau', 'Cancer', 'Capricorne', 'Poissons']],
                ['key' => 'intense', 'label' => 'Que tu es intense', 'signs' => ['Scorpion', 'Lion', 'Bélier', 'Vierge']],
                ['key' => 'a_part', 'label' => 'Que tu es un peu à part', 'signs' => ['Verseau', 'Gémeaux', 'Sagittaire', 'Poissons']],
            ],
        ],
    ];

    /**
     * Score per Ascendant sign from a set of answers, normalised to [0, 1].
     *
     * @param array<string, string> $answers question key => option key
     *
     * @return array<string, float>
     */
    public static function signScores(array $answers): array
    {
        $scores = array_fill_keys(PlanetaryCalculator::SIGNS_FR, 0.0);
        $asked  = 0;

        foreach (self::QUESTIONS as $question) {
            $chosen = $answers[$question['key']] ?? null;
            if ($chosen === null) {
                continue;
            }

            foreach ($question['options'] as $option) {
                if ($option['key'] !== $chosen) {
                    continue;
                }

                ++$asked;
                foreach ($option['signs'] as $sign) {
                    $scores[$sign] += 1.0;
                }
            }
        }

        if ($asked === 0) {
            return $scores;
        }

        return array_map(static fn (float $s): float => $s / $asked, $scores);
    }

    /**
     * Bounded log-contribution for a candidate, from its Ascendant sign.
     *
     * The span between the best and worst sign is capped at
     * {@see RectificationConfig::TEMPERAMENT_QUIZ_MAX_SHARE} of one event's
     * maximum contribution, which is what makes "départage uniquement"
     * structural rather than a promise in a comment.
     *
     * @param array<string, float> $signScores
     */
    public static function logContributionFor(Candidate $candidate, array $signScores, float $latitude, float $longitude): float
    {
        if ($signScores === [] || max($signScores) <= 0.0) {
            return 0.0;
        }

        $points = $candidate->points($latitude, $longitude);
        $sign   = PlanetaryCalculator::SIGNS_FR[(int) floor($points['Ascendant'] / 30)];

        $score = $signScores[$sign] ?? 0.0;
        $mean  = array_sum($signScores) / count($signScores);

        $ceiling = RectificationConfig::TEMPERAMENT_QUIZ_MAX_SHARE
            * RectificationConfig::MAX_LOG_CONTRIBUTION;

        // Centred on the mean so an uninformative quiz contributes nothing.
        $spread = max($signScores) - $mean;
        if ($spread <= 0.0) {
            return 0.0;
        }

        return $ceiling * (($score - $mean) / $spread);
    }
}
