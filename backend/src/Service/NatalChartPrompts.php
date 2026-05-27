<?php

namespace App\Service;

/**
 * Builds prompts for each section of the natal chart analysis.
 * 
 * Section → Data mapping:
 * - synthesis: full chart payload
 * - identity:  Sun, Ascendant, ascendant_ruler
 * - emotions:  Moon, house 4
 * - mental:    Mercury, house 3
 * - relationships: Venus, Mars, house 7, Descendant
 * - ambition:  MC, Jupiter, Saturn, house 10
 * - mission:   Nodes, Saturn
 * - aspects:   top 6 tightest aspects
 */
class NatalChartPrompts
{
    private const VALID_SECTIONS = [
        'synthesis', 'identity', 'emotions', 'mental',
        'relationships', 'ambition', 'mission', 'aspects',
    ];

    /**
     * Shared astrologer persona injected into every prompt.
     *
     * @param bool $thirdPerson  When true, describes the person in third person (il/elle)
     *                           instead of addressing them directly (tu).
     */
    public static function buildSystemPrompt(bool $thirdPerson = false): string
    {
        if ($thirdPerson) {
            return <<<'SYSTEM'
Tu es un astrologue psychologique expérimenté dans la tradition de Liz Greene, Howard Sasportas et Robert Hand.
Tu décris cette personne à la troisième personne : utilise son prénom ou « il »/« elle ». Jamais « tu ». Profondeur psychologique, pas de spiritualité de comptoir.

STRUCTURE DU TEXTE :
- Paragraphes courts (2-3 phrases max chacun), séparés par une ligne vide.
- Une seule idée par paragraphe.
- Commence chaque paragraphe par la phrase la plus forte.
- Phrases courtes et directes. Sujet + verbe + fait astrologique.

INTERDIT :
- "peut être difficile mais…", "c'est une invitation à…", "il/elle a le potentiel de…"
- Adverbes : "peut", "pourrait", "parfois"
- Langage New Age : "l'univers", "vibration", "énergie", "chemin de l'âme"
- "vies passées", "âme choisie", "karma" au sens ésotérique
- Prédictions concrètes ou datées
- Énumération mécanique : ne liste pas les positions une par une, synthétise
- Le pronom « tu » sous toutes ses formes
SYSTEM;
        }

        return <<<'SYSTEM'
Tu es un astrologue psychologique expérimenté dans la tradition de Liz Greene, Howard Sasportas et Robert Hand.
Tu parles directement au consultant (« tu »). Profondeur psychologique, pas de spiritualité de comptoir.

STRUCTURE DU TEXTE :
- Paragraphes courts (2-3 phrases max chacun), séparés par une ligne vide.
- Une seule idée par paragraphe.
- Commence chaque paragraphe par la phrase la plus forte.
- Phrases courtes et directes. Sujet + verbe + fait astrologique.

INTERDIT :
- "peut être difficile mais…", "c'est une invitation à…", "tu as le potentiel de…"
- Adverbes : "peut", "pourrait", "parfois"
- Langage New Age : "l'univers", "vibration", "énergie", "chemin de l'âme"
- "vies passées", "âme choisie", "karma" au sens ésotérique
- Prédictions concrètes ou datées
- Énumération mécanique : ne liste pas les positions une par une, synthétise
SYSTEM;
    }

    /**
     * Validate a section name.
     */
    public static function isValidSection(string $section): bool
    {
        return in_array($section, self::VALID_SECTIONS, true);
    }

    /**
     * Build the synthesis prompt — produces the initial portrait + axes.
     * Expected JSON output: { axes: [{title, description}], portrait: string, notable_configs: string[] }
     *
     * @param bool $thirdPerson  When true, instructs the AI to use third person (il/elle/prénom).
     */
    public static function buildSynthesisPrompt(array $chartPayload, string $name, bool $thirdPerson = false): string
    {
        $chartJson   = json_encode($chartPayload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        $personRule  = $thirdPerson
            ? "- Utilise la 3e personne ({$name} / il / elle), JAMAIS « tu »"
            : "- Parle directement à la personne avec « tu »";

        return <<<PROMPT
Thème natal complet de {$name} :
{$chartJson}

Tu dois produire une synthèse initiale de ce thème natal en JSON valide.

Structure attendue :
{
  "axes": [
    {"title": "Titre de l'axe 1", "description": "2-3 phrases maximum"},
    {"title": "Titre de l'axe 2", "description": "2-3 phrases maximum"},
    {"title": "Titre de l'axe 3", "description": "2-3 phrases maximum"}
  ],
  "portrait": "Un portrait astrologique de 4-5 paragraphes. Direct, percutant, personnalisé. Pas de liste de positions. Décris la personne comme si tu la voyais.",
  "notable_configs": ["Config remarquable 1", "Config remarquable 2"]
}

RÈGLES :
- Les 3 axes doivent être les tensions/dynamiques structurantes du thème (pas juste Soleil/Lune/Ascendant)
- Le portrait doit donner l'impression que tu décris une personne réelle que tu connais
- Les notable_configs sont des configurations remarquables (stellium, T-carré, grand trigone, planète dominante isolée, etc.)
{$personRule}
- Réponds UNIQUEMENT en JSON valide, sans texte avant ou après
PROMPT;
    }

    /**
     * Build a section prompt (identity, emotions, mental, relationships, ambition, mission).
     */
    public static function buildSectionPrompt(
        string $section,
        array $chartPayload,
        array $synthesisResult,
        string $name
    ): string {
        $filteredData = self::filterChartForSection($section, $chartPayload);
        $dataJson = json_encode($filteredData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        $synthesisJson = json_encode($synthesisResult, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        $sectionInstructions = self::getSectionInstructions($section);

        return <<<PROMPT
Tu analyses le thème natal de {$name}.

Voici la synthèse initiale (pour cohérence) :
{$synthesisJson}

Données pertinentes pour cette section :
{$dataJson}

{$sectionInstructions}

RÈGLES :
- 3 à 5 paragraphes maximum
- Chaque paragraphe doit être ancré dans des positions précises du thème
- Reste cohérent avec la synthèse initiale
- Pas de formules vagues. Sois précis et direct.
- Pas de JSON — écris en texte libre avec des paragraphes séparés par des lignes vides
PROMPT;
    }

    /**
     * Build the aspects prompt — returns structured JSON.
     */
    public static function buildAspectsPrompt(array $chartPayload, array $synthesisResult, string $name): string
    {
        // Take top 6 tightest aspects
        $aspects = $chartPayload['aspects'] ?? [];
        $topAspects = array_slice($aspects, 0, 6);
        $aspectsJson = json_encode($topAspects, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        $synthesisJson = json_encode($synthesisResult, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        return <<<PROMPT
Tu analyses les aspects majeurs du thème natal de {$name}.

Synthèse initiale (pour cohérence) :
{$synthesisJson}

Aspects à interpréter (triés par orbe croissant — les plus exacts en premier) :
{$aspectsJson}

Pour chaque aspect, produis une interprétation en JSON :
{
  "aspects": [
    {
      "planets": "Planète A — Planète B",
      "type": "conjonction|opposition|trigone|carré|sextile|quinconce",
      "orb": 0.00,
      "interpretation": "2-3 phrases d'interprétation psychologique. Ancrée dans le vécu, pas dans la théorie."
    }
  ]
}

RÈGLES :
- Interprète chaque aspect dans le contexte du thème global (pas en isolation)
- Nomme les signes impliqués dans l'interprétation
- Réponds UNIQUEMENT en JSON valide, sans texte avant ou après
PROMPT;
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    /**
     * Filter the chart payload to only include data relevant to a section.
     */
    private static function filterChartForSection(string $section, array $chart): array
    {
        $planets = $chart['planets'] ?? [];
        $houses  = $chart['houses'] ?? [];
        $angles  = $chart['angles'] ?? [];
        $nodes   = $chart['nodes'] ?? [];

        return match ($section) {
            'identity' => [
                'planets' => array_intersect_key($planets, array_flip(['Sun'])),
                'angles'  => array_intersect_key($angles, array_flip(['ascendant'])),
                'ascendant_ruler' => $chart['ascendant_ruler'] ?? null,
                'dominant_element' => $chart['dominant_element'] ?? null,
                'dominant_modality' => $chart['dominant_modality'] ?? null,
                'dominant_planets' => $chart['dominant_planets'] ?? [],
                'chart_pattern' => $chart['chart_pattern'] ?? null,
            ],
            'emotions' => [
                'planets' => array_intersect_key($planets, array_flip(['Moon'])),
                'houses'  => array_intersect_key($houses, array_flip([4])),
                'dominant_element' => $chart['dominant_element'] ?? null,
            ],
            'mental' => [
                'planets' => array_intersect_key($planets, array_flip(['Mercury'])),
                'houses'  => array_intersect_key($houses, array_flip([3])),
            ],
            'relationships' => [
                'planets' => array_intersect_key($planets, array_flip(['Venus', 'Mars'])),
                'angles'  => array_intersect_key($angles, array_flip(['descendant'])),
                'houses'  => array_intersect_key($houses, array_flip([7])),
            ],
            'ambition' => [
                'planets' => array_intersect_key($planets, array_flip(['Jupiter', 'Saturn'])),
                'angles'  => array_intersect_key($angles, array_flip(['midheaven'])),
                'houses'  => array_intersect_key($houses, array_flip([10])),
                'mc_ruler' => $chart['mc_ruler'] ?? null,
            ],
            'mission' => [
                'nodes'   => $nodes,
                'planets' => array_intersect_key($planets, array_flip(['Saturn'])),
                'stelliums' => $chart['stelliums'] ?? [],
            ],
            default => $chart,
        };
    }

    /**
     * Get section-specific writing instructions.
     */
    private static function getSectionInstructions(string $section): string
    {
        return match ($section) {
            'identity' => <<<'INST'
SECTION : IDENTITÉ FONDAMENTALE
Analyse la structure de personnalité fondamentale à travers :
- Le Soleil : moteur central, ce que cette personne EST au fond
- L'Ascendant : la manière dont elle se présente au monde, le filtre
- Le maître de l'Ascendant : où va l'énergie vitale, dans quel domaine de vie
- L'élément et la modalité dominants : le mode de fonctionnement global
- Le pattern du thème : comment l'énergie se distribue (concentrée, dispersée, etc.)
INST,
            'emotions' => <<<'INST'
SECTION : VIE ÉMOTIONNELLE
Analyse le monde intérieur à travers :
- La Lune : besoins émotionnels profonds, rapport à la sécurité, la mère/figure maternante
- La maison 4 : le foyer intérieur, les racines, ce qui constitue la base de sécurité
- L'élément dominant : comment les émotions sont traitées (feu = action, terre = corps, air = mental, eau = absorption)
INST,
            'mental' => <<<'INST'
SECTION : ARCHITECTURE MENTALE
Analyse le fonctionnement intellectuel à travers :
- Mercure : comment cette personne pense, communique, traite l'information
- La maison 3 : l'environnement mental, la communication quotidienne, les échanges
- Le signe de Mercure et sa dignité : la qualité du raisonnement
INST,
            'relationships' => <<<'INST'
SECTION : RELATIONS ET AMOUR
Analyse les dynamiques relationnelles à travers :
- Vénus : ce qui est désiré en amour, les valeurs, l'esthétique
- Mars : le désir, l'énergie sexuelle, la manière de poursuivre ce qu'on veut
- Le Descendant : le type de partenaire projeté/attiré
- La maison 7 : le terrain des relations engagées
- La tension Venus/Mars : l'écart entre ce qu'on veut (Vénus) et comment on le cherche (Mars)
INST,
            'ambition' => <<<'INST'
SECTION : AMBITION ET VOCATION
Analyse les dynamiques de réalisation à travers :
- Le MC (Milieu du Ciel) : l'image publique, la vocation, la direction de vie
- Jupiter : où l'expansion est naturelle, la confiance, la croissance
- Saturne : la discipline, les limitations constructives, la maturité
- La maison 10 : le domaine de la carrière et de la reconnaissance sociale
- Le maître du MC : où l'énergie professionnelle se dirige concrètement
INST,
            'mission' => <<<'INST'
SECTION : MISSION DE VIE
Analyse l'axe d'évolution à travers :
- Le Nœud Nord : la direction de croissance, ce vers quoi cette personne doit aller
- Le Nœud Sud : les acquis, les automatismes, ce qui est confortable mais limitant
- Saturne : les leçons structurantes, les responsabilités à assumer
- Les stelliums éventuels : les zones de concentration d'énergie qui orientent le destin

ATTENTION : Pas de langage karmique ou ésotérique. Les nœuds sont un axe de développement psychologique, pas un "chemin d'âme". Reste ancré dans le concret.
INST,
            default => '',
        };
    }
}
