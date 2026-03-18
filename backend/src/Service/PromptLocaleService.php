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
     * Get locale-specific horoscope prompt
     */
    public function getHoroscopePromptTemplate(): array
    {
        if ($this->locale === self::LOCALE_EN) {
            return [
                'intro' => 'You are writing a personalized daily horoscope.',
                'rules' => [
                    'Write ONLY in English.',
                    'ALWAYS use English planet names (Sun, Moon, Mercury, Venus, etc.)',
                    'ALWAYS use English zodiac signs (Aries, Taurus, Gemini, etc.)',
                    'Use a warm and encouraging tone, not too technical.',
                    'Maximum 180 words total.',
                    'Use positive language ("you might", "this is an opportunity to").',
                    'Give concrete and actionable advice.',
                ],
                'format' => [
                    'title' => 'Inspiring title (max 8 words)',
                    'overview' => 'Daily overview (2-3 encouraging sentences)',
                    'love' => 'Love and relationships (1-2 sentences)',
                    'energy' => 'Energy and well-being (1-2 sentences)',
                    'advice' => 'Practical advice of the day (1 sentence)',
                ],
                'labels' => [
                    'natal_chart' => 'NATAL CHART',
                    'daily_transits' => 'TODAY\'S TRANSITS',
                    'important_aspects' => 'IMPORTANT ASPECTS',
                    'sun_in' => 'Sun in',
                    'moon_in' => 'Moon in',
                    'ascendant' => 'Ascendant',
                ],
            ];
        }

        // French (default)
        return [
            'intro' => 'Tu rédiges un horoscope quotidien personnalisé et chaleureux.',
            'rules' => [
                'Écris UNIQUEMENT en français.',
                'Utilise TOUJOURS les noms français des planètes (Soleil, Lune, Mercure, Vénus, etc.)',
                'Utilise TOUJOURS les signes en français (Bélier, Taureau, Gémeaux, etc.)',
                'Ton chaleureux et encourageant, pas trop technique.',
                'Maximum 180 mots au total.',
                'Utilise un langage positif ("vous pourriez", "c\'est l\'occasion de").',
                'Donne des conseils concrets et applicables.',
            ],
            'format' => [
                'title' => 'Titre inspirant (max 8 mots)',
                'overview' => 'Vue d\'ensemble de la journée (2-3 phrases encourageantes)',
                'love' => 'Amour et relations (1-2 phrases)',
                'energy' => 'Énergie et bien-être (1-2 phrases)',
                'advice' => 'Conseil pratique du jour (1 phrase)',
            ],
            'labels' => [
                'natal_chart' => 'THÈME NATAL',
                'daily_transits' => 'TRANSITS DU JOUR',
                'important_aspects' => 'ASPECTS IMPORTANTS',
                'sun_in' => 'Soleil en',
                'moon_in' => 'Lune en',
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
                'intro' => 'You are a warm astrologer specializing in love compatibility (synastry).',
                'rules' => [
                    'Respond ONLY in English.',
                    'ALWAYS use English planet names: Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune.',
                    'ALWAYS use English zodiac signs: Aries, Taurus, Gemini, Cancer, Leo, Virgo, Libra, Scorpio, Sagittarius, Capricorn, Aquarius, Pisces.',
                    'Use a warm and accessible tone, not too technical.',
                    'When citing an aspect, briefly explain what it means for the couple.',
                    'Base your analysis on the listed aspects, not on generalities.',
                    'CRITICAL: The score_global MUST be the average of the 5 dimension scores. Each couple has unique aspects so scores MUST vary (NOT always the same value). Trines and sextiles increase scores, squares and oppositions decrease them.',
                ],
                'labels' => [
                    'chart_of' => 'CHART OF',
                    'aspects_between' => 'ASPECTS BETWEEN THE TWO CHARTS',
                    'specific_question' => 'SPECIFIC QUESTION',
                    'response_format' => 'RESPONSE FORMAT',
                ],
                'json_descriptions' => [
                    'score_global' => 'integer 0-100, MUST be calculated as the weighted average of the 5 dimension scores. Different couples MUST get different scores based on their unique aspects. A score below 50 indicates significant challenges, 50-70 is moderate, 70-85 is good, above 85 is excellent.',
                    'headline' => 'catchy phrase in English, max 12 words',
                    'resume' => '2-3 sentences describing the couple\'s energy warmly',
                    'forces' => 'strength based on a specific aspect',
                    'tensions' => 'potential challenge based on an aspect',
                    'analyse' => '2-3 accessible sentences',
                    'planetes' => 'e.g.: NAME1\'s Venus trine NAME2\'s Mars',
                    'impact' => 'concrete and positive daily impact',
                    'conseil' => 'practical and kind advice for the couple',
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
            'intro' => 'Tu es un astrologue bienveillant spécialisé en synastrie (compatibilité amoureuse).',
            'rules' => [
                'Réponds UNIQUEMENT en français.',
                'Utilise TOUJOURS les noms français des planètes : Soleil, Lune, Mercure, Vénus, Mars, Jupiter, Saturne, Uranus, Neptune.',
                'Utilise TOUJOURS les signes en français : Bélier, Taureau, Gémeaux, Cancer, Lion, Vierge, Balance, Scorpion, Sagittaire, Capricorne, Verseau, Poissons.',
                'Adopte un ton chaleureux et accessible, pas trop technique.',
                'Quand tu cites un aspect, explique simplement ce qu\'il signifie pour le couple.',
                'Base ton analyse sur les aspects listés, pas sur des généralités.',
                'CRITIQUE : Le score_global DOIT être la moyenne des 5 scores de dimensions. Chaque couple a des aspects uniques donc les scores DOIVENT varier (PAS toujours la même valeur). Les trigones et sextiles augmentent les scores, les carrés et oppositions les diminuent.',
            ],
            'labels' => [
                'chart_of' => 'THÈME DE',
                'aspects_between' => 'ASPECTS ENTRE LES DEUX THÈMES',
                'specific_question' => 'QUESTION SPÉCIFIQUE',
                'response_format' => 'FORMAT DE RÉPONSE',
            ],
            'json_descriptions' => [
                'score_global' => 'entier 0-100, DOIT être calculé comme la moyenne pondérée des 5 scores de dimensions. Chaque couple DOIT avoir un score différent basé sur leurs aspects uniques. Un score inférieur à 50 indique des défis importants, 50-70 est modéré, 70-85 est bon, au-dessus de 85 est excellent.',
                'headline' => 'phrase positive et accrocheuse en français, max 12 mots',
                'resume' => '2-3 phrases décrivant l\'énergie du couple de façon chaleureuse',
                'forces' => 'point fort basé sur un aspect spécifique',
                'tensions' => 'défi potentiel basé sur un aspect',
                'analyse' => '2-3 phrases accessibles',
                'planetes' => 'ex: la Vénus de NOM1 en trigone avec le Mars de NOM2',
                'impact' => 'impact concret et positif au quotidien',
                'conseil' => 'conseil pratique et bienveillant pour le couple',
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
