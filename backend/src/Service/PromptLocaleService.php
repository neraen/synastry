<?php

namespace App\Service;

/**
 * Service for managing locale-specific prompt content
 */
class PromptLocaleService
{
    public const LOCALE_FR = 'fr';
    public const LOCALE_EN = 'en';
    public const DEFAULT_LOCALE = self::LOCALE_FR;

    // Planet names in each language
    private const PLANET_NAMES = [
        'fr' => [
            'Sun' => 'Soleil',
            'Moon' => 'Lune',
            'Mercury' => 'Mercure',
            'Venus' => 'Vénus',
            'Mars' => 'Mars',
            'Jupiter' => 'Jupiter',
            'Saturn' => 'Saturne',
            'Uranus' => 'Uranus',
            'Neptune' => 'Neptune',
            'Pluto' => 'Pluton',
            'Ascendant' => 'Ascendant',
            'MC' => 'Milieu du Ciel',
            'Midheaven' => 'Milieu du Ciel',
        ],
        'en' => [
            'Sun' => 'Sun',
            'Moon' => 'Moon',
            'Mercury' => 'Mercury',
            'Venus' => 'Venus',
            'Mars' => 'Mars',
            'Jupiter' => 'Jupiter',
            'Saturn' => 'Saturn',
            'Uranus' => 'Uranus',
            'Neptune' => 'Neptune',
            'Pluto' => 'Pluto',
            'Ascendant' => 'Ascendant',
            'MC' => 'Midheaven',
            'Midheaven' => 'Midheaven',
        ],
    ];

    // Sign names in each language
    private const SIGN_NAMES = [
        'fr' => [
            'Aries' => 'Bélier',
            'Taurus' => 'Taureau',
            'Gemini' => 'Gémeaux',
            'Cancer' => 'Cancer',
            'Leo' => 'Lion',
            'Virgo' => 'Vierge',
            'Libra' => 'Balance',
            'Scorpio' => 'Scorpion',
            'Sagittarius' => 'Sagittaire',
            'Capricorn' => 'Capricorne',
            'Aquarius' => 'Verseau',
            'Pisces' => 'Poissons',
        ],
        'en' => [
            'Aries' => 'Aries',
            'Taurus' => 'Taurus',
            'Gemini' => 'Gemini',
            'Cancer' => 'Cancer',
            'Leo' => 'Leo',
            'Virgo' => 'Virgo',
            'Libra' => 'Libra',
            'Scorpio' => 'Scorpio',
            'Sagittarius' => 'Sagittarius',
            'Capricorn' => 'Capricorn',
            'Aquarius' => 'Aquarius',
            'Pisces' => 'Pisces',
        ],
    ];

    // Prompt templates in each language
    private const PROMPT_INSTRUCTIONS = [
        'fr' => [
            'language_rule' => 'Réponds UNIQUEMENT en français.',
            'planet_rule' => 'Utilise TOUJOURS les noms français des planètes : Soleil, Lune, Mercure, Vénus, Mars, Jupiter, Saturne, Uranus, Neptune.',
            'sign_rule' => 'Utilise TOUJOURS les signes en français : Bélier, Taureau, Gémeaux, Cancer, Lion, Vierge, Balance, Scorpion, Sagittaire, Capricorne, Verseau, Poissons.',
            'tone' => 'Adopte un ton chaleureux et accessible, évite le jargon technique.',
            'retrograde_yes' => 'Oui',
            'retrograde_no' => 'Non',
            'sign_label' => 'Signe',
            'position_label' => 'Position',
            'retrograde_label' => 'Rétrograde',
        ],
        'en' => [
            'language_rule' => 'Respond ONLY in English.',
            'planet_rule' => 'ALWAYS use English planet names: Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune.',
            'sign_rule' => 'ALWAYS use English zodiac signs: Aries, Taurus, Gemini, Cancer, Leo, Virgo, Libra, Scorpio, Sagittarius, Capricorn, Aquarius, Pisces.',
            'tone' => 'Use a warm and accessible tone, avoid technical jargon.',
            'retrograde_yes' => 'Yes',
            'retrograde_no' => 'No',
            'sign_label' => 'Sign',
            'position_label' => 'Position',
            'retrograde_label' => 'Retrograde',
        ],
    ];

    private string $locale;

    public function __construct(string $locale = self::DEFAULT_LOCALE)
    {
        $this->locale = $this->normalizeLocale($locale);
    }

    /**
     * Set the current locale
     */
    public function setLocale(string $locale): self
    {
        $this->locale = $this->normalizeLocale($locale);
        return $this;
    }

    /**
     * Get the current locale
     */
    public function getLocale(): string
    {
        return $this->locale;
    }

    /**
     * Normalize a locale string to a supported locale
     */
    public function normalizeLocale(string $locale): string
    {
        $locale = strtolower(substr($locale, 0, 2));
        return in_array($locale, [self::LOCALE_FR, self::LOCALE_EN]) ? $locale : self::DEFAULT_LOCALE;
    }

    /**
     * Translate a planet name
     */
    public function translatePlanet(string $planet): string
    {
        return self::PLANET_NAMES[$this->locale][$planet] ?? $planet;
    }

    /**
     * Translate a sign name
     */
    public function translateSign(string $sign): string
    {
        return self::SIGN_NAMES[$this->locale][$sign] ?? $sign;
    }

    /**
     * Get a prompt instruction
     */
    public function getInstruction(string $key): string
    {
        return self::PROMPT_INSTRUCTIONS[$this->locale][$key] ?? '';
    }

    /**
     * Translate a full theme (planetary positions)
     */
    public function translateTheme(array $theme): array
    {
        $translated = [];
        $signLabel = $this->getInstruction('sign_label');
        $retroLabel = $this->getInstruction('retrograde_label');
        $retroYes = $this->getInstruction('retrograde_yes');
        $retroNo = $this->getInstruction('retrograde_no');

        foreach ($theme as $planet => $data) {
            $planetTranslated = $this->translatePlanet($planet);
            $translated[$planetTranslated] = [];

            if (isset($data['Sign'])) {
                $translated[$planetTranslated][$signLabel] = $this->translateSign($data['Sign']);
            }
            if (isset($data['Position'])) {
                $translated[$planetTranslated]['Position'] = $data['Position'];
            }
            if (isset($data['Retrograde'])) {
                $translated[$planetTranslated][$retroLabel] = $data['Retrograde'] === 'Yes' ? $retroYes : $retroNo;
            }
        }

        return $translated;
    }

    /**
     * Get the base instructions for AI prompts
     */
    public function getBaseInstructions(): string
    {
        return implode("\n", [
            $this->getInstruction('language_rule'),
            $this->getInstruction('planet_rule'),
            $this->getInstruction('sign_rule'),
            $this->getInstruction('tone'),
        ]);
    }

    /**
     * Get locale-specific natal chart summary prompt (short personality portrait)
     */
    public function getNatalChartSummaryPrompt(): array
    {
        if ($this->locale === self::LOCALE_EN) {
            return [
                'instruction' => <<<'PROMPT'
Write a 3-sentence personality portrait based on the Sun, Moon, and Ascendant.

RULES:
- NEVER write "Sun in X" or "Moon in X" — translate the placement directly into a behavioral trait. Example: instead of "Sun in Aquarius", write "detachment is her natural mode of relating to the world".
- Each sentence must describe something concrete: how the person acts, what drives them, what they avoid, what they need.
- No preamble ("this person is..."), no sign names, no planet names — just raw psychological description.
- Punchy, direct. Like a sharp observation from someone who has known them for years.
PROMPT,
                'label' => 'Natal chart of',
            ];
        }

        return [
            'instruction' => <<<'PROMPT'
Rédige un portrait de personnalité en 3 phrases à partir du Soleil, de la Lune et de l'Ascendant.

RÈGLES :
- Ne jamais écrire "Soleil en X" ou "Lune en X" — traduis directement le placement en trait comportemental. Exemple : au lieu de "Soleil en Verseau", écris "le détachement est son mode naturel d'être au monde".
- Chaque phrase doit décrire quelque chose de concret : comment la personne agit, ce qui la motive, ce qu'elle fuit, ce dont elle a besoin.
- Pas d'introduction ("cette personne est..."), pas de noms de signes, pas de noms de planètes — uniquement une description psychologique brute.
- Percutant, direct. Comme une observation tranchante de quelqu'un qui la connaît depuis des années.
PROMPT,
            'label' => 'Thème natal de',
        ];
    }

    /**
     * Get locale-specific horoscope prompt
     */
    public function getHoroscopePromptTemplate(): array
    {
        if ($this->locale === self::LOCALE_EN) {
            return [
                'intro' => 'Write a personalized daily horoscope grounded in the tradition of Robert Hand (Planets in Transit) and Liz Greene. Reason EXCLUSIVELY from the astrological data provided below — exact natal positions and today\'s transits. Every sentence must name the planet(s) involved and their concrete effect on this person\'s life.',
                'rules' => [
                    'Write ONLY in English.',
                    'ALWAYS use English planet names (Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto).',
                    'ALWAYS use English zodiac signs (Aries, Taurus, Gemini, Cancer, Leo, Virgo, Libra, Scorpio, Sagittarius, Capricorn, Aquarius, Pisces).',
                    'SLOW PLANETS in transit (Saturn, Jupiter, Uranus, Neptune, Pluto): describe the background theme of this period by citing the natal planet they are activating. Example: "Saturn is moving through your natal Sun in Pisces — the structures of your life are being tested."',
                    'FAST PLANETS in transit (Moon, Mercury, Venus, Mars, Sun): describe the specific energy of today. Example: "The Moon in Leo activates your natal Venus — emotions are looking for expression."',
                    'NEVER name the aspect type (trine, square, sextile, opposition, conjunction, orb) — translate directly into human impact in plain language.',
                    'Be honest: if the transits are tense (Saturn, Mars activating a sensitive natal point), say so plainly. If the day flows well, show which planets make it so.',
                    'Maximum 180 words total.',
                    'Each section (overview, love, energy, advice) must treat a distinct angle — do NOT repeat the same planet across multiple sections.',
                    'FORBIDDEN: "a period of transformation", "the energies are favorable", "the universe invites you", "potential", "an invitation to".',
                ],
                'format' => [
                    'title' => 'Title reflecting the real planetary energy of the day (max 8 words, name the planet)',
                    'overview' => 'Daily overview: 2-3 sentences each grounded in a specific transit. Name the planets.',
                    'love' => 'Love and relationships (1-2 sentences, cite the relevant planet and its natal position).',
                    'energy' => 'Energy and well-being (1-2 sentences, cite the relevant planet).',
                    'advice' => 'One concrete piece of advice derived from today\'s dominant transit.',
                ],
                'labels' => [
                    'natal_chart' => 'NATAL CHART',
                    'daily_transits' => 'TODAY\'S TRANSITS',
                    'important_aspects' => 'ACTIVE ASPECTS (transit planet → natal planet)',
                    'sun_in' => 'Natal Sun in',
                    'moon_in' => 'Natal Moon in',
                    'ascendant' => 'Ascendant',
                ],
            ];
        }

        // French (default)
        return [
            'intro' => 'Rédige un horoscope quotidien personnalisé ancré dans la tradition de Robert Hand (Planets in Transit) et Liz Greene. Raisonne EXCLUSIVEMENT à partir des données astrologiques fournies ci-dessous — positions natales exactes et transits du jour. Chaque phrase doit nommer la ou les planètes impliquées et leur effet concret sur la vie de cette personne.',
            'rules' => [
                'Écris UNIQUEMENT en français.',
                'Utilise TOUJOURS les noms français des planètes (Soleil, Lune, Mercure, Vénus, Mars, Jupiter, Saturne, Uranus, Neptune, Pluton).',
                'Utilise TOUJOURS les signes en français (Bélier, Taureau, Gémeaux, Cancer, Lion, Vierge, Balance, Scorpion, Sagittaire, Capricorne, Verseau, Poissons).',
                'PLANÈTES LENTES en transit (Saturne, Jupiter, Uranus, Neptune, Pluton) : décris la tendance de fond de la période en citant la planète natale qu\'elles activent. Exemple : "Saturne traverse ton Soleil natal en Poissons — les structures de ta vie sont éprouvées."',
                'PLANÈTES RAPIDES en transit (Lune, Mercure, Vénus, Mars, Soleil) : décris l\'énergie spécifique du jour. Exemple : "La Lune en Lion active ta Vénus natale — les émotions cherchent à s\'exprimer."',
                'NE CITE JAMAIS le type d\'aspect (trigone, carré, sextile, opposition, conjonction, orbe) — traduis directement en impact humain dans un langage courant.',
                'Sois honnête : si les transits sont tendus (Saturne, Mars activant un point natal sensible), dis-le clairement. Si la journée est fluide, montre quelles planètes la portent.',
                'Maximum 180 mots au total.',
                'Chaque section (overview, love, energy, advice) doit traiter un angle distinct — ne répète PAS la même planète dans plusieurs sections.',
                'INTERDIT : "une période de transformation", "les énergies sont favorables", "l\'univers t\'invite", "potentiel", "une invitation à".',
            ],
            'format' => [
                'title' => 'Titre reflétant l\'énergie planétaire réelle du jour (max 8 mots, nomme la planète dominante)',
                'overview' => 'Vue d\'ensemble : 2-3 phrases chacune ancrée dans un transit précis. Nomme les planètes.',
                'love' => 'Amour et relations (1-2 phrases, cite la planète concernée et sa position natale).',
                'energy' => 'Énergie et bien-être (1-2 phrases, cite la planète concernée).',
                'advice' => 'Un conseil concret découlant du transit dominant du jour.',
            ],
            'labels' => [
                'natal_chart' => 'THÈME NATAL',
                'daily_transits' => 'TRANSITS DU JOUR',
                'important_aspects' => 'ASPECTS ACTIFS (planète transit → planète natale)',
                'sun_in' => 'Soleil natal en',
                'moon_in' => 'Lune natale en',
                'ascendant' => 'Ascendant',
            ],
        ];
    }

    /**
     * Get locale-specific compatibility prompt
     */
    public function getCompatibilityPromptTemplate(): array
    {
        if ($this->locale === self::LOCALE_EN) {
            return [
                'intro' => 'You are an astrology compatibility scoring engine. Your goal is NOT to be nice or balanced. Your goal is to produce ACCURATE and CONTRASTED scores based on astrological facts.',
                'rules' => [
                    'Respond ONLY in English.',
                    'ALWAYS use English planet names: Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune.',
                    'ALWAYS use English zodiac signs: Aries, Taurus, Gemini, Cancer, Leo, Virgo, Libra, Scorpio, Sagittarius, Capricorn, Aquarius, Pisces.',
                    'You MUST avoid average scores. You MUST use the full range from 0 to 100.',
                    'A bad compatibility MUST score below 40. A strong compatibility MUST score above 80.',
                    'DO NOT cluster scores between 60-80. USE extreme differences when justified.',
                    'For EACH dimension: start from 50, then add or subtract: +20 = perfect harmony (trine, same sign), +10 = good (sextile, compatible elements), 0 = neutral, -5 = tension (square), -15 = strong conflict (opposition, incompatible elements).',
                    'You MUST justify EACH score with actual astrological aspects.',
                    'score_global MUST be the exact average of the 5 dimension scores.',
                    'Base your analysis strictly on the listed aspects, not on generalities.',
                ],
                'labels' => [
                    'chart_of' => 'CHART OF',
                    'aspects_between' => 'ASPECTS BETWEEN THE TWO CHARTS',
                    'specific_question' => 'SPECIFIC QUESTION',
                    'response_format' => 'RESPONSE FORMAT',
                ],
                'json_descriptions' => [
                    'score_global' => 'integer 0-100, exact average of the 5 dimension scores — NEVER rounded to a "comfortable" middle value. Low scores (20-40) are valid for incompatible charts, high scores (85-95) are valid for highly aligned charts.',
                    'headline' => 'catchy phrase in English reflecting the TRUE energy of this pair, max 12 words',
                    'resume' => '2-3 honest sentences describing the couple\'s energy, including tensions if present',
                    'forces' => 'one sentence: name the specific aspect (e.g. NAME1\'s Saturn trine NAME2\'s Venus) then explain concretely what it brings to the relationship — e.g. "NAME1\'s Saturn trine NAME2\'s Venus — brings lasting emotional stability, serious commitment and mutual loyalty"',
                    'tensions' => 'one sentence: name the specific aspect (e.g. NAME1\'s Mars square NAME2\'s Saturn) then explain concretely what difficulty it creates — e.g. "NAME1\'s Mars square NAME2\'s Saturn — creates friction between drive and restraint, recurring power struggles around ambition"',
                    'analyse' => '2-3 sentences grounded in the actual aspects, honest and specific',
                    'planetes' => 'e.g.: NAME1\'s Venus trine NAME2\'s Mars',
                    'impact' => 'concrete daily impact of this aspect (positive or challenging)',
                    'conseil' => 'practical advice for this specific couple based on their chart',
                ],
                'dimensions' => [
                    'amour' => 'love',
                    'communication' => 'communication',
                    'conflits' => 'conflicts',
                    'long_terme' => 'long_term',
                    'attirance' => 'attraction',
                ],
            ];
        }

        // French (default)
        return [
            'intro' => 'Tu es un moteur de scoring de compatibilité astrologique. Ton objectif n\'est PAS d\'être gentil ou équilibré. Ton objectif est de produire des scores PRÉCIS et CONTRASTÉS basés sur des faits astrologiques.',
            'rules' => [
                'Réponds UNIQUEMENT en français.',
                'Utilise TOUJOURS les noms français des planètes : Soleil, Lune, Mercure, Vénus, Mars, Jupiter, Saturne, Uranus, Neptune.',
                'Utilise TOUJOURS les signes en français : Bélier, Taureau, Gémeaux, Cancer, Lion, Vierge, Balance, Scorpion, Sagittaire, Capricorne, Verseau, Poissons.',
                'Tu DOIS utiliser toute la plage de 0 à 100. Des scores entre 53-65 pour tous les thèmes = ERREUR GRAVE.',
                'Chaque thème doit donner un résultat unique et contrasté. Certains couples méritent 85+, d\'autres 25-.',
                'INTERDICTION de produire 5 scores proches les uns des autres. Si tous tes scores sont entre 50-70, recommence.',
                'Utilise la méthode de scoring détaillée dans la section MÉTHODE DE SCORING du prompt.',
                'Analyse les maîtres de signes : identifie le maître du Soleil ET de l\'Ascendant de chaque personne, vérifie leurs aspects dans le thème de l\'autre.',
                'Tu DOIS justifier CHAQUE score avec un aspect astrologique réel et précis.',
                'Le score_global DOIT être la moyenne exacte des 5 scores de dimensions.',
                'Base ton analyse sur les aspects listés ET sur la compatibilité d\'éléments des signes.',
            ],
            'labels' => [
                'chart_of' => 'THÈME DE',
                'aspects_between' => 'ASPECTS ENTRE LES DEUX THÈMES',
                'specific_question' => 'QUESTION SPÉCIFIQUE',
                'response_format' => 'FORMAT DE RÉPONSE',
            ],
            'json_descriptions' => [
                'score_global' => 'entier 0-100, moyenne exacte des 5 scores de dimensions — JAMAIS arrondi à une valeur "confortable". Les scores bas (20-40) sont valides pour des thèmes incompatibles, les scores élevés (85-95) pour des thèmes très alignés.',
                'headline' => 'phrase accrocheuse en français reflétant la VRAIE énergie de ce couple, max 12 mots',
                'resume' => '2-3 phrases honnêtes décrivant l\'énergie du couple, incluant les tensions si présentes',
                'forces' => 'une phrase : nomme l\'aspect précis (ex: le Saturne de NOM1 en trigone avec la Vénus de NOM2) puis explique concrètement ce qu\'il apporte à la relation — ex: "le Saturne de NOM1 en trigone avec la Vénus de NOM2 — apporte une stabilité affective durable, un engagement sérieux et une loyauté mutuelle"',
                'tensions' => 'une phrase : nomme l\'aspect précis (ex: le Mars de NOM1 en carré avec le Saturne de NOM2) puis explique concrètement la difficulté qu\'il crée — ex: "le Mars de NOM1 en carré avec le Saturne de NOM2 — crée des frictions entre l\'élan et la retenue, des luttes de pouvoir récurrentes autour de l\'ambition"',
                'analyse' => '2-3 phrases ancrées dans les aspects réels, honnêtes et spécifiques',
                'planetes' => 'ex: la Vénus de NOM1 en trigone avec le Mars de NOM2',
                'impact' => 'impact concret au quotidien de cet aspect (positif ou difficile)',
                'conseil' => 'conseil pratique pour ce couple spécifique basé sur leur thème',
            ],
            'dimensions' => [
                'amour' => 'amour',
                'communication' => 'communication',
                'conflits' => 'conflits',
                'long_terme' => 'long_terme',
                'attirance' => 'attirance',
            ],
        ];
    }
}
