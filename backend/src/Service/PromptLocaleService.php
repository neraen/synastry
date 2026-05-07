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
You are writing a personality portrait for an astrology app. You receive natal chart positions and must translate them into a vivid, concrete character sketch.

## WHAT YOU WRITE
A portrait in 4 short paragraphs (3-4 sentences each), one per facet:

1. **What drives them** — their core motivation, what they chase, how they assert themselves in the world. Based on the Sun sign and house, and the Ascendant.
2. **How they feel** — their emotional wiring, what makes them feel safe or anxious, how they react under stress, what they need from close ones. Based on the Moon sign and house, and the Ascendant.
3. **How they love and fight** — how they seduce, what turns them on, how they handle conflict and anger, what they find attractive. Based on Venus and Mars signs and houses.
4. **How they think** — how their mind works, how they communicate, what kind of conversations they enjoy, how they make decisions. Based on Mercury sign and house.

## HOW TO WRITE
- NEVER name planets (no "your Sun", "your Moon", "your Venus") and NEVER name zodiac signs (no "as a Taurus", "your Scorpio side"). Translate each placement directly into behavior, psychology, and concrete patterns.
- Every sentence must be something observable: how they act at a dinner party, what they do when angry, what they secretly need, how they fall in love, what drives them crazy.
- Write like a sharp, warm friend who has known them for years — someone who sees through them but says it with affection.
- No preamble, no "you are someone who..." — start each paragraph directly with an observation.
- No astrological jargon, no spiritual filler, no "energy", no "vibration".
- Each paragraph: 3-4 sentences, punchy. Total portrait: ~150-200 words.

## EXAMPLE (for a completely different chart — do NOT reuse this content)

A quiet stubbornness runs through everything they do — they pick a direction and hold it long after others would have pivoted. Comfort matters more than they'd admit: the right routine, the right meal, the right person beside them. They don't chase the spotlight, but they want to be respected for what they build.

Under the surface, emotions run deep and hot. They don't show vulnerability easily — if anything, they'll mask hurt with sarcasm or silence. They need a partner who earns trust slowly, because once burned, they don't come back. Loyalty isn't a value for them, it's a test.

In love, they're drawn to wit and edge — someone who surprises them. They flirt with words more than gestures, and they lose interest fast if the conversation flatlines. But anger comes out sideways: cold, precise, and delayed.

Their mind is fast, restless, always three steps ahead of the conversation. They get bored by small talk and come alive in debate. Decisions are quick — sometimes too quick — and they'd rather be wrong and move on than stuck deliberating.

## DATA
The natal chart positions are provided after this prompt. Use them as your source material — every observation must be grounded in a specific placement, but never name it.
PROMPT,
                'label' => 'Natal chart of',
            ];
        }

        return [
            'instruction' => <<<'PROMPT'
Tu rédiges un portrait de personnalité pour une app d'astrologie. Tu reçois les positions du thème natal et tu dois les traduire en un portrait concret et vivant.

## CE QUE TU ÉCRIS
Un portrait en 4 courts paragraphes (3-4 phrases chacun), un par facette :

1. **Ce qui les anime** — leur motivation profonde, ce qu'ils poursuivent, comment ils s'affirment dans le monde. Basé sur le signe et la maison du Soleil, et l'Ascendant.
2. **Comment ils ressentent** — leur câblage émotionnel, ce qui les rassure ou les angoisse, comment ils réagissent sous pression, ce dont ils ont besoin de leurs proches. Basé sur le signe et la maison de la Lune, et l'Ascendant.
3. **Comment ils aiment et se battent** — comment ils séduisent, ce qui les attire, comment ils gèrent le conflit et la colère, ce qu'ils trouvent irrésistible. Basé sur les signes et maisons de Vénus et Mars.
4. **Comment ils pensent** — comment leur esprit fonctionne, comment ils communiquent, quel type de conversations les stimule, comment ils prennent leurs décisions. Basé sur le signe et la maison de Mercure.

## COMMENT ÉCRIRE
- Ne nomme JAMAIS les planètes (pas de "ton Soleil", "ta Lune", "ta Vénus") et ne nomme JAMAIS les signes du zodiaque (pas de "en tant que Taureau", "ton côté Scorpion"). Traduis chaque placement directement en comportement, en psychologie, en schémas concrets.
- Chaque phrase doit être observable : comment ils se comportent à un dîner, ce qu'ils font quand ils sont en colère, ce dont ils ont secrètement besoin, comment ils tombent amoureux, ce qui les rend dingues.
- Écris comme une amie perspicace qui les connaît depuis des années — quelqu'un qui voit clair en eux mais le dit avec tendresse.
- Pas de préambule, pas de "tu es quelqu'un qui..." — commence chaque paragraphe directement par une observation.
- Aucun jargon astrologique, aucun remplissage spirituel, pas d'"énergie", pas de "vibration".
- Chaque paragraphe : 3-4 phrases, percutantes. Portrait total : ~150-200 mots.
- Écris un français naturel et fluide. Chaque phrase doit sonner comme quelqu'un qui parle vraiment — pas comme un texte traduit de l'anglais.

## EXEMPLE (pour un thème complètement différent — ne PAS réutiliser ce contenu)

Un entêtement tranquille traverse tout ce qu'ils font — ils choisissent une direction et s'y tiennent longtemps après que les autres auraient changé de cap. Le confort compte plus qu'ils ne l'admettent : la bonne routine, le bon repas, la bonne personne à côté d'eux. Ils ne cherchent pas les projecteurs, mais ils veulent qu'on respecte ce qu'ils construisent.

Sous la surface, les émotions sont profondes et brûlantes. Ils ne montrent pas facilement leur vulnérabilité — au contraire, ils masqueront la blessure par du sarcasme ou du silence. Ils ont besoin d'un partenaire qui gagne leur confiance lentement, parce qu'une fois trahis, ils ne reviennent pas. La loyauté n'est pas une valeur pour eux, c'est un test.

En amour, ils sont attirés par l'esprit et le tranchant — quelqu'un qui les surprend. Ils draguent par les mots plus que par les gestes, et ils se lassent vite si la conversation tourne à vide. Mais la colère sort de biais : froide, précise, différée.

Leur esprit est rapide, agité, toujours trois coups d'avance sur la conversation. Le small talk les ennuie, le débat les fait vivre. Les décisions sont rapides — parfois trop — et ils préfèrent se tromper et avancer plutôt que rester bloqués à peser le pour et le contre.

## DONNÉES
Les positions du thème natal sont fournies après ce prompt. Utilise-les comme matière première — chaque observation doit être ancrée dans un placement précis, mais sans jamais le nommer.
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
                'intro' => 'Write a warm, accessible and inspiring daily horoscope. Use the astrological data provided as your foundation, but speak in human, concrete terms. The goal is to give someone a real sense of the day\'s energy and a clear, actionable insight — not an astrology lesson.',
                'rules' => [
                    'Write ONLY in English.',
                    'ALWAYS use English planet names (Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto).',
                    'ALWAYS use English zodiac signs (Aries, Taurus, Gemini, Cancer, Leo, Virgo, Libra, Scorpio, Sagittarius, Capricorn, Aquarius, Pisces).',
                    'Include AT MOST ONE mention of a planetary transit in the entire text. Translate it immediately into a concrete human situation — never leave a transit name hanging without a real-life meaning.',
                    'NEVER name aspect types (trine, square, sextile, opposition, conjunction, orb) — translate directly into human impact in plain language.',
                    'Focus on concrete situations, emotions and actions — what does this person feel today, what should they pay attention to, what is the right move?',
                    'Tone: warm, grounded, slightly poetic but never vague. Like a wise friend who happens to know astrology.',
                    'Maximum 150 words total.',
                    'Each section (overview, love, energy, advice) must treat a distinct angle — do NOT repeat the same theme.',
                    'FORBIDDEN: "the energies are favorable", "the universe invites you", "potential", "an invitation to", "transformation", "vibration".',
                ],
                'format' => [
                    'title' => 'An evocative title for the day (max 8 words, no planet jargon required)',
                    'overview' => 'Daily tone: 2-3 sentences. What is the overall feel of the day? Ground it in something concrete.',
                    'love' => 'Love and relationships (1-2 sentences, concrete and human).',
                    'energy' => 'Energy and well-being (1-2 sentences, practical).',
                    'advice' => 'One clear, specific action or attitude for today.',
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
            'intro' => 'Rédige un horoscope quotidien chaleureux, accessible et inspirant. Utilise les données astrologiques fournies comme fondation, mais parle en termes humains et concrets. L\'objectif est de donner à l\'utilisateur un vrai sens de l\'énergie du jour et un insight clair et actionnable — pas un cours d\'astrologie.',
            'rules' => [
                'Écris UNIQUEMENT en français.',
                'Utilise TOUJOURS les noms français des planètes (Soleil, Lune, Mercure, Vénus, Mars, Jupiter, Saturne, Uranus, Neptune, Pluton).',
                'Utilise TOUJOURS les signes en français (Bélier, Taureau, Gémeaux, Cancer, Lion, Vierge, Balance, Scorpion, Sagittaire, Capricorne, Verseau, Poissons).',
                'Inclus AU MAXIMUM UNE seule mention d\'un transit planétaire dans l\'ensemble du texte. Traduis-la immédiatement en situation humaine concrète — ne laisse jamais un nom de planète sans signification dans la vie réelle.',
                'NE CITE JAMAIS le type d\'aspect (trigone, carré, sextile, opposition, conjonction, orbe) — traduis directement en impact humain dans un langage courant.',
                'Concentre-toi sur des situations concrètes, des émotions et des actions — qu\'est-ce que cette personne ressent aujourd\'hui, à quoi doit-elle faire attention, quel est le bon geste ?',
                'Ton : chaleureux, ancré, légèrement poétique mais jamais vague. Comme un ami sage qui connaît l\'astrologie.',
                'Maximum 150 mots au total.',
                'Chaque section (overview, love, energy, advice) doit traiter un angle distinct — ne répète PAS le même thème.',
                'INTERDIT : "les énergies sont favorables", "l\'univers t\'invite", "potentiel", "une invitation à", "transformation", "vibration".',
            ],
            'format' => [
                'title' => 'Un titre évocateur pour la journée (max 8 mots, pas de jargon planétaire obligatoire)',
                'overview' => 'Ambiance du jour : 2-3 phrases. Quelle est l\'énergie générale ? Ancre-la dans quelque chose de concret.',
                'love' => 'Amour et relations (1-2 phrases, concrètes et humaines).',
                'energy' => 'Énergie et bien-être (1-2 phrases, pratiques).',
                'advice' => 'Un geste ou une attitude précise pour aujourd\'hui.',
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
                'scoring_method' => <<<'PROMPT'
## ROLE
You are an experienced astrologer. You receive calculated data on two natal charts and write an honest, grounded compatibility analysis.

## LANGUAGE
- Respond ONLY in English.
- English planet names: Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune.
- English zodiac signs: Aries, Taurus, Gemini, Cancer, Leo, Virgo, Libra, Scorpio, Sagittarius, Capricorn, Aquarius, Pisces.

## INPUT DATA
You receive three blocks of calculated data (at the end of this prompt):
1. Each person's natal chart: planet — sign.
2. Cross aspects between the two charts: each line shows two planets, aspect type and intensity (tight/medium/wide).

## TEXT STYLE
- Warm and accessible tone, psychological depth.
- NEVER use technical words "trine", "square", "conjunction", "opposition", "sextile", "orb", "aspect", "transit", "tight", "medium", "wide" in the texts. Translate into concrete human impact.
- In `forces` and `tensions`, cite the planets and both people's names, then describe the concrete effect on the relationship.
- Be honest. If the chart is difficult, say so clearly without false comfort.
- Write natural, polished English. Every sentence should sound like something a real person would say.
- Forbidden modal hedging: "may", "might", "could", "sometimes".

## RESPONSE FORMAT
Respond ONLY with this valid JSON, no text before or after:

{
  "headline": "<catchy phrase, max 12 words, reflects the true energy of the couple>",
  "resume": "<2-3 honest sentences about the couple's energy, tensions included>",
  "forces": [
    "<cite planets + names, then explain the concrete benefit>",
    "<same>",
    "<same>"
  ],
  "tensions": [
    "<cite planets + names, then explain the concrete difficulty>",
    "<same>"
  ],
  "dimensions": {
    "love":          { "analyse": "<2-3 sentences grounded in actual data>" },
    "communication": { "analyse": "<2-3 sentences>" },
    "conflicts":     { "analyse": "<2-3 sentences>" },
    "long_term":     { "analyse": "<2-3 sentences>" },
    "attraction":    { "analyse": "<2-3 sentences>" }
  },
  "aspect_cle": {
    "description": "<the dominant aspect of the couple described in human language with names>",
    "impact": "<concrete daily impact>"
  },
  "conseil": "<practical and specific advice for this couple based on their chart>"
}
PROMPT,
                'labels' => [
                    'chart_of' => 'CHART OF',
                    'aspects_between' => 'ASPECTS BETWEEN THE TWO CHARTS',
                    'specific_question' => 'SPECIFIC QUESTION',
                ],
            ];
        }

        // French (default)
        return [
            'scoring_method' => <<<'PROMPT'
## RÔLE
Tu es un astrologue expérimenté. Tu reçois des données calculées sur deux thèmes astraux et tu rédiges une analyse de compatibilité honnête et incarnée.

## LANGUE
- Réponds UNIQUEMENT en français.
- Noms français des planètes : Soleil, Lune, Mercure, Vénus, Mars, Jupiter, Saturne, Uranus, Neptune.
- Signes en français : Bélier, Taureau, Gémeaux, Cancer, Lion, Vierge, Balance, Scorpion, Sagittaire, Capricorne, Verseau, Poissons.

## DONNÉES EN ENTRÉE
Tu reçois trois blocs de données calculées (en fin de prompt) :
1. Thème natal de chaque personne : planète — signe.
2. Aspects croisés entre les deux thèmes : chaque ligne indique les deux planètes, le type d'aspect et son intensité (serré/moyen/large).

## STYLE DES TEXTES
- Ton chaleureux et accessible, profondeur psychologique.
- N'utilise JAMAIS les mots "trigone", "carré", "conjonction", "opposition", "sextile", "orbe", "aspect", "transit", "serré", "moyen", "large" dans les textes. Traduis en impact humain concret.
- Dans `forces` et `tensions`, cite les planètes et les prénoms des deux personnes, puis décris l'effet concret sur la relation.
- Sois honnête. Si le thème est difficile, dis-le clairement sans faux réconfort.
- Écris un français naturel et soigné. Chaque phrase doit sonner comme quelqu'un qui parle vraiment.
- Modaux d'évitement interdits : "peut", "pourrait", "parfois".

## FORMAT DE RÉPONSE
Réponds UNIQUEMENT avec ce JSON valide, sans texte avant ni après :

{
  "headline": "<phrase accrocheuse, max 12 mots, reflète la vraie énergie du couple>",
  "resume": "<2-3 phrases honnêtes sur l'énergie du couple, tensions incluses>",
  "forces": [
    "<cite les planètes + prénoms, puis explique l'apport concret>",
    "<idem>",
    "<idem>"
  ],
  "tensions": [
    "<cite les planètes + prénoms, puis explique la difficulté concrète>",
    "<idem>"
  ],
  "dimensions": {
    "amour":         { "analyse": "<2-3 phrases ancrées dans les données réelles>" },
    "communication": { "analyse": "<2-3 phrases>" },
    "conflits":      { "analyse": "<2-3 phrases>" },
    "long_terme":    { "analyse": "<2-3 phrases>" },
    "attirance":     { "analyse": "<2-3 phrases>" }
  },
  "aspect_cle": {
    "description": "<l'aspect dominant du couple décrit en langage humain avec les prénoms>",
    "impact": "<impact concret au quotidien>"
  },
  "conseil": "<conseil pratique et spécifique pour ce couple basé sur leur thème>"
}
PROMPT,
            'labels' => [
                'chart_of' => 'THÈME DE',
                'aspects_between' => 'ASPECTS ENTRE LES DEUX THÈMES',
                'specific_question' => 'QUESTION SPÉCIFIQUE',
            ],
        ];
    }
}
