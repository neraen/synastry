<?php

namespace App\Service;

use App\Service\PromptLocaleService;

/**
 * PlanetaryCalculator.php
 *
 * Calcul des positions planétaires pour un thème natal astrologique.
 * Aucune dépendance externe — algorithmes basés sur Jean Meeus,
 * "Astronomical Algorithms" 2nd edition.
 *
 * Précision : ~1 arcminute (largement suffisant pour l'astrologie)
 *
 * Usage :
 *   $calc = new PlanetaryCalculator('1990-07-15', '14:30', 48.8566, 2.3522);
 *   $chart = $calc->getFullChart();
 */
class PlanetaryCalculator
{
    // -------------------------------------------------------------------------
    // Constantes astrologiques
    // -------------------------------------------------------------------------

    const SIGNS = [
        'Aries', 'Taurus', 'Gemini', 'Cancer',
        'Leo', 'Virgo', 'Libra', 'Scorpio',
        'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
    ];

    const SIGNS_FR = [
        'Bélier', 'Taureau', 'Gémeaux', 'Cancer',
        'Lion', 'Vierge', 'Balance', 'Scorpion',
        'Sagittaire', 'Capricorne', 'Verseau', 'Poissons',
    ];

    const SIGN_SYMBOLS = [
        '♈','♉','♊','♋','♌','♍',
        '♎','♏','♐','♑','♒','♓',
    ];

    const PLANET_SYMBOLS = [
        'Sun'     => '☉',
        'Moon'    => '☽',
        'Mercury' => '☿',
        'Venus'   => '♀',
        'Mars'    => '♂',
        'Jupiter' => '♃',
        'Saturn'  => '♄',
        'Uranus'  => '♅',
        'Neptune' => '♆',
        'Pluto'   => '♇',
        'Ascendant' => 'ASC',
        'Midheaven' => 'MC',
    ];

    const PLANETS_FR = [
        'Sun'     => 'Soleil',
        'Moon'    => 'Lune',
        'Mercury' => 'Mercure',
        'Venus'   => 'Vénus',
        'Mars'    => 'Mars',
        'Jupiter' => 'Jupiter',
        'Saturn'  => 'Saturne',
        'Uranus'  => 'Uranus',
        'Neptune' => 'Neptune',
        'Pluto'   => 'Pluton',
        'Ascendant' => 'Ascendant',
        'Midheaven' => 'Milieu du Ciel',
    ];

    // Aspects majeurs [angle cible, orbe max, nom, symbole]
    const ASPECTS = [
        'conjunction' => [0,   8, 'Conjonction', '☌'],
        'opposition'  => [180, 8, 'Opposition',  '☍'],
        'trine'       => [120, 8, 'Trigone',     '△'],
        'square'      => [90,  7, 'Carré',       '□'],
        'sextile'     => [60,  6, 'Sextile',     '⚹'],
        'quincunx'    => [150, 3, 'Quinconce',   '⚻'],
    ];

    // ── Deterministic compatibility scoring ──────────────────────────────────

    const SIGN_ELEMENTS = [
        'Aries'       => 'fire',  'Leo'         => 'fire',  'Sagittarius' => 'fire',
        'Taurus'      => 'earth', 'Virgo'       => 'earth', 'Capricorn'   => 'earth',
        'Gemini'      => 'air',   'Libra'       => 'air',   'Aquarius'    => 'air',
        'Cancer'      => 'water', 'Scorpio'     => 'water', 'Pisces'      => 'water',
    ];

    const SIGN_RULERS = [
        'Aries'       => 'Mars',    'Taurus'      => 'Venus',
        'Gemini'      => 'Mercury', 'Cancer'      => 'Moon',
        'Leo'         => 'Sun',     'Virgo'       => 'Mercury',
        'Libra'       => 'Venus',   'Scorpio'     => 'Mars',
        'Sagittarius' => 'Jupiter', 'Capricorn'   => 'Saturn',
        'Aquarius'    => 'Saturn',  'Pisces'      => 'Jupiter',
    ];

    // Modern rulers — used for natal chart analysis (ascendant_ruler, mc_ruler)
    // Kept separate from SIGN_RULERS to avoid breaking compatibility scoring
    const SIGN_RULERS_MODERN = [
        'Aries'       => 'Mars',    'Taurus'      => 'Venus',
        'Gemini'      => 'Mercury', 'Cancer'      => 'Moon',
        'Leo'         => 'Sun',     'Virgo'       => 'Mercury',
        'Libra'       => 'Venus',   'Scorpio'     => 'Pluto',
        'Sagittarius' => 'Jupiter', 'Capricorn'   => 'Saturn',
        'Aquarius'    => 'Uranus',  'Pisces'      => 'Neptune',
    ];

    const SIGN_MODALITIES = [
        'Aries' => 'cardinal', 'Cancer' => 'cardinal', 'Libra' => 'cardinal', 'Capricorn' => 'cardinal',
        'Taurus' => 'fixed', 'Leo' => 'fixed', 'Scorpio' => 'fixed', 'Aquarius' => 'fixed',
        'Gemini' => 'mutable', 'Virgo' => 'mutable', 'Sagittarius' => 'mutable', 'Pisces' => 'mutable',
    ];

    const SIGN_OFFSETS = [
        'Aries' => 0, 'Taurus' => 30, 'Gemini' => 60, 'Cancer' => 90,
        'Leo' => 120, 'Virgo' => 150, 'Libra' => 180, 'Scorpio' => 210,
        'Sagittarius' => 240, 'Capricorn' => 270, 'Aquarius' => 300, 'Pisces' => 330,
    ];

    // Weighted scoring for dominant element/modality
    const PLANET_WEIGHTS = [
        'Sun' => 3, 'Moon' => 3,
        'Mercury' => 2, 'Venus' => 2, 'Mars' => 2,
        'Jupiter' => 1, 'Saturn' => 1,
        'Uranus' => 0.5, 'Neptune' => 0.5, 'Pluto' => 0.5,
    ];

    // Dignity tables: planet => [domicile => [signs], exaltation => [signs], exil => [signs], chute => [signs]]
    const PLANET_DIGNITIES = [
        'Sun'     => ['domicile' => ['Leo'],       'exaltation' => ['Aries'],       'exil' => ['Aquarius'],    'chute' => ['Libra']],
        'Moon'    => ['domicile' => ['Cancer'],     'exaltation' => ['Taurus'],      'exil' => ['Capricorn'],   'chute' => ['Scorpio']],
        'Mercury' => ['domicile' => ['Gemini', 'Virgo'], 'exaltation' => ['Virgo'],  'exil' => ['Sagittarius', 'Pisces'], 'chute' => ['Pisces']],
        'Venus'   => ['domicile' => ['Taurus', 'Libra'], 'exaltation' => ['Pisces'], 'exil' => ['Aries', 'Scorpio'], 'chute' => ['Virgo']],
        'Mars'    => ['domicile' => ['Aries', 'Scorpio'], 'exaltation' => ['Capricorn'], 'exil' => ['Taurus', 'Libra'], 'chute' => ['Cancer']],
        'Jupiter' => ['domicile' => ['Sagittarius', 'Pisces'], 'exaltation' => ['Cancer'], 'exil' => ['Gemini', 'Virgo'], 'chute' => ['Capricorn']],
        'Saturn'  => ['domicile' => ['Capricorn', 'Aquarius'], 'exaltation' => ['Libra'], 'exil' => ['Cancer', 'Leo'], 'chute' => ['Aries']],
        'Uranus'  => ['domicile' => ['Aquarius'],  'exaltation' => ['Scorpio'],     'exil' => ['Leo'],         'chute' => ['Taurus']],
        'Neptune' => ['domicile' => ['Pisces'],     'exaltation' => ['Cancer'],      'exil' => ['Virgo'],       'chute' => ['Capricorn']],
        'Pluto'   => ['domicile' => ['Scorpio'],    'exaltation' => ['Leo'],         'exil' => ['Taurus'],      'chute' => ['Aquarius']],
    ];

    // Points per aspect type (positive = harmonious, negative = tense)
    const SCORING_ASPECT_POINTS = [
        'conjunction' => 22,
        'trine'       => 17,
        'sextile'     => 10,
        'square'      => -14,
        'opposition'  => -11,
        'quincunx'    => -4,
    ];

    // Planet pairs per dimension [planetA, planetB, weight].
    // Both directions are checked: user's planetA–partner's planetB
    // AND user's planetB–partner's planetA (for cross pairs where A≠B).
    const DIMENSION_PAIRS = [
        'amour' => [
            ['Moon',   'Moon',   1.5],
            ['Moon',   'Venus',  1.5],
            ['Venus',  'Venus',  1.2],
            ['Sun',    'Moon',   0.9],
            ['Venus',  'Sun',    0.7],
        ],
        'attirance' => [
            ['Venus',  'Mars',      1.8],
            ['Mars',   'Ascendant', 1.0],
            ['Venus',  'Ascendant', 1.0],
            ['Sun',    'Mars',      0.7],
            ['Moon',   'Mars',      0.7],
        ],
        'communication' => [
            ['Mercury', 'Mercury',   1.5],
            ['Mercury', 'Sun',       1.2],
            ['Mercury', 'Moon',      0.9],
            ['Mercury', 'Ascendant', 0.7],
        ],
        'long_terme' => [
            ['Saturn',  'Sun',       1.5],
            ['Saturn',  'Venus',     1.3],
            ['Saturn',  'Moon',      1.2],
            ['Saturn',  'Ascendant', 0.9],
            ['Jupiter', 'Sun',       0.7],
            ['Jupiter', 'Moon',      0.7],
        ],
        'conflits' => [
            ['Mars',   'Mars',   1.5],
            ['Saturn', 'Moon',   1.5],
            ['Saturn', 'Sun',    1.2],
            ['Uranus', 'Venus',  1.2],
            ['Uranus', 'Moon',   1.0],
            ['Mars',   'Moon',   0.9],
            ['Mars',   'Venus',  0.8],
        ],
    ];

    // -------------------------------------------------------------------------
    // Éléments orbitaux moyens (époque J2000.0)
    // -------------------------------------------------------------------------

    const ORBITAL_ELEMENTS = [
        'Mercury' => [
            'L0' => 252.250906, 'L1' => 149474.0722491,
            'a'  => 0.38709831,
            'e0' => 0.20563175, 'e1' => 0.000020407,
            'i0' => 7.004986,   'i1' => -0.0059516,
            'O0' => 48.330893,  'O1' => -0.1254229,
            'w0' => 77.456119,  'w1' => 0.1588643,
        ],
        'Venus'   => [
            'L0' => 181.979801, 'L1' => 58519.2130302,
            'a'  => 0.72332982,
            'e0' => 0.00677188, 'e1' => -0.000047766,
            'i0' => 3.394662,   'i1' => -0.0008568,
            'O0' => 76.679920,  'O1' => -0.2780080,
            'w0' => 131.563707, 'w1' => 0.0048646,
        ],
        'Mars'    => [
            'L0' => 355.433275, 'L1' => 19141.6964746,
            'a'  => 1.52371034,
            'e0' => 0.09340062, 'e1' => 0.000090479,
            'i0' => 1.849726,   'i1' => -0.0081477,
            'O0' => 49.558093,  'O1' => -0.2950250,
            'w0' => 336.060234, 'w1' => 0.4439016,
        ],
        'Jupiter' => [
            'L0' => 34.351519,  'L1' => 3036.3027748,
            'a'  => 5.20260319,
            'e0' => 0.04849485, 'e1' => 0.000163244,
            'i0' => 1.303270,   'i1' => -0.0019872,
            'O0' => 100.464441, 'O1' => 0.1766828,
            'w0' => 14.331309,  'w1' => 0.2155525,
        ],
        'Saturn'  => [
            'L0' => 50.077444,  'L1' => 1223.5110686,
            'a'  => 9.55490959,
            'e0' => 0.05550862, 'e1' => -0.000346818,
            'i0' => 2.488878,   'i1' => 0.0025515,
            'O0' => 113.665524, 'O1' => -0.2566649,
            'w0' => 93.056787,  'w1' => 0.8357151,
        ],
        'Uranus'  => [
            'L0' => 314.055005, 'L1' => 429.8640561,
            'a'  => 19.21844606,
            'e0' => 0.04629590, 'e1' => -0.000027337,
            'i0' => 0.773197,   'i1' => -0.0016869,
            'O0' => 74.005947,  'O1' => 0.0741461,
            'w0' => 173.005159, 'w1' => 0.0893206,
        ],
        'Neptune' => [
            'L0' => 304.348665, 'L1' => 219.8833092,
            'a'  => 30.11038687,
            'e0' => 0.00898809, 'e1' => 0.000006408,
            'i0' => 1.769952,   'i1' => 0.0002257,
            'O0' => 131.784057, 'O1' => -0.0061651,
            'w0' => 48.123691,  'w1' => 0.0291587,
        ],
        'Pluto'   => [
            'L0' => 238.92903833, 'L1' => 145.20780515,
            'a'  => 39.48211675,
            'e0' => 0.24882730,  'e1' => 0.00005170,
            'i0' => 17.14001206, 'i1' => 0.00004818,
            'O0' => 110.30393684,'O1' => -0.01183482,
            'w0' => 224.06891629,'w1' => -0.04062942,
        ],
    ];

    // -------------------------------------------------------------------------
    // Propriétés
    // -------------------------------------------------------------------------

    private float $julianDay;
    private float $T;          // Siècles juliens depuis J2000.0
    private float $latitude;   // Latitude géographique du lieu de naissance
    private float $longitude;  // Longitude géographique du lieu de naissance
    private string $name;

    // -------------------------------------------------------------------------
    // Constructeur
    // -------------------------------------------------------------------------

    /**
     * @param string $date      Date UTC  'YYYY-MM-DD'
     * @param string $time      Heure UTC 'HH:MM' ou 'HH:MM:SS'
     * @param float  $latitude  Latitude du lieu de naissance (ex: 48.8566)
     * @param float  $longitude Longitude du lieu de naissance (ex: 2.3522)
     * @param string $name      Prénom (pour le prompt LLM)
     */
    public function __construct(string $date, string $time, float $latitude, float $longitude, string $name = 'Personne')
    {
        $this->latitude  = $latitude;
        $this->longitude = $longitude;
        $this->name      = $name;

        $dt = \DateTime::createFromFormat('Y-m-d H:i', "$date $time", new \DateTimeZone('UTC'));
        if (!$dt) {
            $dt = \DateTime::createFromFormat('Y-m-d H:i:s', "$date $time", new \DateTimeZone('UTC'));
        }
        if (!$dt) {
            throw new \InvalidArgumentException("Date/heure invalide : $date $time");
        }

        $this->julianDay = $this->dateToJulianDay($dt);
        $this->T         = ($this->julianDay - 2451545.0) / 36525.0;
    }

    // -------------------------------------------------------------------------
    // API publique
    // -------------------------------------------------------------------------

    /**
     * Retourne le thème natal complet
     */
    public function getFullChart(): array
    {
        $planets   = $this->getAllPlanets();
        $ascendant = $this->getAscendant();
        $midheaven = $this->getMidheaven();

        return [
            'name'      => $this->name,
            'planets'   => $planets,
            'ascendant' => $ascendant,
            'midheaven' => $midheaven,
        ];
    }

    /**
     * Retourne les positions planétaires au format compatible avec le frontend existant
     * Format: ['Sun' => ['Position' => 24.5, 'Sign' => 'Leo', 'Retrograde' => 'No'], ...]
     */
    public function getPlanetaryPositionsForApi(): array
    {
        $planets = $this->getAllPlanets();
        $ascendant = $this->getAscendant();
        $midheaven = $this->getMidheaven();

        $result = [];

        foreach ($planets as $name => $data) {
            $result[$name] = [
                'Position' => $data['longitude'],
                'Sign' => $data['sign'],
                'Retrograde' => $data['retrograde'] ? 'Yes' : 'No',
            ];
        }

        // Ajouter l'ascendant
        $result['Ascendant'] = [
            'Position' => $ascendant['longitude'],
            'Sign' => $ascendant['sign'],
            'Retrograde' => 'No',
        ];

        // Ajouter le MC
        $result['MC'] = [
            'Position' => $midheaven['longitude'],
            'Sign' => $midheaven['sign'],
            'Retrograde' => 'No',
        ];

        return $result;
    }

    /**
     * Calcule les aspects de synastrie avec un autre thème
     */
    public function getSynastryAspects(PlanetaryCalculator $other): array
    {
        $pointsA = $this->getAllPoints();
        $pointsB = $other->getAllPoints();

        $aspects = [];
        foreach ($pointsA as $nameA => $lonA) {
            foreach ($pointsB as $nameB => $lonB) {
                $aspect = $this->detectAspect($lonA, $lonB, $nameA, $nameB);
                if ($aspect !== null) {
                    $aspects[] = $aspect;
                }
            }
        }

        usort($aspects, function($a, $b) {
            return $a['orb'] <=> $b['orb'];
        });

        return $aspects;
    }

    /**
     * Calculate deterministic compatibility scores vs another chart.
     * Returns overall score + per-dimension breakdown.
     *
     * Importance order: Sun sign > ASC > Venus/Mars/Moon > Mercury > ASC ruler > Saturn/Uranus
     */
    public function calculateCompatibilityScore(PlanetaryCalculator $other): array
    {
        $lookup = $this->buildAspectLookup($other);
        $chartA = $this->getFullChart();
        $chartB = $other->getFullChart();

        $sunSignA = $chartA['planets']['Sun']['sign']     ?? 'Aries';
        $sunSignB = $chartB['planets']['Sun']['sign']     ?? 'Aries';
        $ascSignA = $chartA['ascendant']['sign']          ?? 'Aries';
        $ascSignB = $chartB['ascendant']['sign']          ?? 'Aries';
        $mercSignA = $chartA['planets']['Mercury']['sign'] ?? '';
        $mercSignB = $chartB['planets']['Mercury']['sign'] ?? '';

        $sunElemBonus  = $this->elementCompat($sunSignA, $sunSignB);
        $ascElemBonus  = $this->elementCompat($ascSignA, $ascSignB);
        $ascRulerBonus = $this->ascRulerBonus($lookup, $ascSignA, $ascSignB);

        $airSigns = ['Gemini', 'Libra', 'Aquarius'];
        $airBonus = (in_array($mercSignA, $airSigns) || in_array($mercSignB, $airSigns)) ? 6 : 0;

        $amour         = $this->dimensionScore($lookup, self::DIMENSION_PAIRS['amour'],         $sunElemBonus * 0.8);
        $attirance     = $this->dimensionScore($lookup, self::DIMENSION_PAIRS['attirance'],     $ascElemBonus);
        $communication = $this->dimensionScore($lookup, self::DIMENSION_PAIRS['communication'], $airBonus + $ascRulerBonus * 0.3);
        $longTerme     = $this->dimensionScore($lookup, self::DIMENSION_PAIRS['long_terme'],    $sunElemBonus * 0.5 + $ascRulerBonus * 0.5);
        $conflits      = $this->dimensionScore($lookup, self::DIMENSION_PAIRS['conflits'],      0.0);

        $global = (int) round(($amour + $attirance + $communication + $longTerme + $conflits) / 5);

        return [
            'score_global' => $global,
            'dimensions'   => [
                'amour'         => $amour,
                'attirance'     => $attirance,
                'communication' => $communication,
                'long_terme'    => $longTerme,
                'conflits'      => $conflits,
            ],
        ];
    }

    /**
     * Construit le prompt LLM de compatibilité
     * @param string $locale Locale for the prompt (fr or en)
     */
    public function buildCompatibilityPrompt(PlanetaryCalculator $other, ?string $question = null, string $locale = 'fr'): string
    {
        $localeService = new PromptLocaleService($locale);
        $template = $localeService->getCompatibilityPromptTemplate();
        $labels = $template['labels'];
        $isEnglish = $locale === 'en';

        $chartA  = $this->getFullChart();
        $chartB  = $other->getFullChart();
        $aspects = $this->getSynastryAspects($other);

        $nameA = $chartA['name'];
        $nameB = $chartB['name'];

        // ── Format natal chart block ──
        $formatChart = function($chart) use ($localeService, $isEnglish) {
            $lines = [];
            foreach ($chart['planets'] as $key => $p) {
                $retro = $p['retrograde'] ? ' ℞' : '';
                $planetName = $localeService->translatePlanet($key);
                $signName = $localeService->translateSign($p['sign']);
                $lines[] = sprintf(
                    '%s — %s%s',
                    $planetName,
                    $signName,
                    $retro
                );
            }
            $asc = $chart['ascendant'];
            $mc  = $chart['midheaven'];
            $ascSignName = $localeService->translateSign($asc['sign']);
            $mcSignName = $localeService->translateSign($mc['sign']);
            $ascLabel = $localeService->translatePlanet('Ascendant');
            $mcLabel = $localeService->translatePlanet('Midheaven');
            $lines[] = sprintf('%s — %s', $ascLabel, $ascSignName);
            $lines[] = sprintf('%s — %s', $mcLabel, $mcSignName);
            return implode("\n", $lines);
        };

        // ── Format cross aspects with intensity label ──
        $formatAspects = function($aspects) use ($localeService, $isEnglish) {
            $noAspects = $isEnglish ? '(No major aspects)' : '(Aucun aspect majeur)';
            if (empty($aspects)) return $noAspects;
            $lines = [];
            foreach (array_slice($aspects, 0, 20) as $a) {
                $planetA = $localeService->translatePlanet($a['planet_a']);
                $planetB = $localeService->translatePlanet($a['planet_b']);
                $orb = $a['orb'];
                if ($isEnglish) {
                    $intensity = $orb <= 2.0 ? 'tight' : ($orb <= 5.0 ? 'medium' : 'wide');
                } else {
                    $intensity = $orb <= 2.0 ? 'serré' : ($orb <= 5.0 ? 'moyen' : 'large');
                }
                $lines[] = sprintf(
                    '%s %s %s — %s (%s)',
                    $planetA,
                    $a['symbol'],
                    $planetB,
                    $a['name'],
                    $intensity
                );
            }
            return implode("\n", $lines);
        };

        $questionSection = $question
            ? "\n═══════════ {$labels['specific_question']} ═══════════\n{$question}\n"
            : '';

        $chartOfA = "{$labels['chart_of']} {$nameA}";
        $chartOfB = "{$labels['chart_of']} {$nameB}";
        $aspectsBetween = $labels['aspects_between'];

        // ── Build the scoring methodology section ──
        $scoringMethod = $template['scoring_method'];

        return <<<PROMPT
{$scoringMethod}

═══════════ {$chartOfA} ═══════════
{$formatChart($chartA)}

═══════════ {$chartOfB} ═══════════
{$formatChart($chartB)}

═══════════ {$aspectsBetween} ═══════════
{$formatAspects($aspects)}
{$questionSection}
PROMPT;
    }

    /**
     * Build the v2 compatibility prompt using the new structured JSON format.
     * Same data sections as v1, but uses the v2 instruction template.
     */
    public function buildCompatibilityPromptV2(PlanetaryCalculator $other, ?string $question = null, string $locale = 'fr'): string
    {
        $localeService = new PromptLocaleService($locale);
        $template = $localeService->getSynastryPromptV2Template();
        $labels = $template['labels'];
        $isEnglish = $locale === 'en';

        $chartA  = $this->getFullChart();
        $chartB  = $other->getFullChart();
        $aspects = $this->getSynastryAspects($other);

        $nameA = $chartA['name'];
        $nameB = $chartB['name'];

        $formatChart = function($chart) use ($localeService) {
            $lines = [];
            foreach ($chart['planets'] as $key => $p) {
                $retro = $p['retrograde'] ? ' ℞' : '';
                $planetName = $localeService->translatePlanet($key);
                $signName = $localeService->translateSign($p['sign']);
                $lines[] = sprintf('%s — %s%s', $planetName, $signName, $retro);
            }
            $asc = $chart['ascendant'];
            $mc  = $chart['midheaven'];
            $lines[] = sprintf('%s — %s', $localeService->translatePlanet('Ascendant'), $localeService->translateSign($asc['sign']));
            $lines[] = sprintf('%s — %s', $localeService->translatePlanet('Midheaven'), $localeService->translateSign($mc['sign']));
            return implode("\n", $lines);
        };

        $formatAspects = function($aspects) use ($localeService, $isEnglish) {
            if (empty($aspects)) return $isEnglish ? '(No major aspects)' : '(Aucun aspect majeur)';
            $lines = [];
            foreach (array_slice($aspects, 0, 20) as $a) {
                $planetA = $localeService->translatePlanet($a['planet_a']);
                $planetB = $localeService->translatePlanet($a['planet_b']);
                $orb = $a['orb'];
                $intensity = $isEnglish
                    ? ($orb <= 2.0 ? 'tight' : ($orb <= 5.0 ? 'medium' : 'wide'))
                    : ($orb <= 2.0 ? 'serré' : ($orb <= 5.0 ? 'moyen' : 'large'));
                $lines[] = sprintf('%s %s %s — %s (%s)', $planetA, $a['symbol'], $planetB, $a['name'], $intensity);
            }
            return implode("\n", $lines);
        };

        $questionSection = $question
            ? "\n═══════════ {$labels['specific_question']} ═══════════\n{$question}\n"
            : '';

        $chartOfA = "{$labels['chart_of']} {$nameA}";
        $chartOfB = "{$labels['chart_of']} {$nameB}";
        $aspectsBetween = $labels['aspects_between'];
        $scoringMethod = $template['scoring_method'];

        return <<<PROMPT
{$scoringMethod}

═══════════ {$chartOfA} ═══════════
{$formatChart($chartA)}

═══════════ {$chartOfB} ═══════════
{$formatChart($chartB)}

═══════════ {$aspectsBetween} ═══════════
{$formatAspects($aspects)}
{$questionSection}
PROMPT;
    }

    // -------------------------------------------------------------------------
    // Calcul des planètes
    // -------------------------------------------------------------------------

    public function getAllPlanets(): array
    {
        return [
            'Sun'     => $this->getSun(),
            'Moon'    => $this->getMoon(),
            'Mercury' => $this->getPlanet('Mercury'),
            'Venus'   => $this->getPlanet('Venus'),
            'Mars'    => $this->getPlanet('Mars'),
            'Jupiter' => $this->getPlanet('Jupiter'),
            'Saturn'  => $this->getPlanet('Saturn'),
            'Uranus'  => $this->getPlanet('Uranus'),
            'Neptune' => $this->getPlanet('Neptune'),
            'Pluto'   => $this->getPlanet('Pluto'),
        ];
    }

    /**
     * Retourne toutes les longitudes (planètes + angles) pour le calcul d'aspects
     */
    public function getAllPoints(): array
    {
        $planets = $this->getAllPlanets();
        $points  = [];
        foreach ($planets as $name => $data) {
            $points[$name] = $data['longitude'];
        }
        $points['Ascendant'] = $this->getAscendant()['longitude'];
        $points['Midheaven'] = $this->getMidheaven()['longitude'];
        return $points;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SOLEIL
    // ─────────────────────────────────────────────────────────────────────────

    public function getSun(): array
    {
        $T  = $this->T;

        // Longitude géométrique moyenne
        $L0 = 280.46646 + 36000.76983 * $T + 0.0003032 * $T * $T;

        // Anomalie moyenne
        $M  = 357.52911 + 35999.05029 * $T - 0.0001537 * $T * $T;
        $M  = $this->normDeg($M);
        $Mr = deg2rad($M);

        // Équation du centre
        $C  = (1.914602 - 0.004817 * $T - 0.000014 * $T * $T) * sin($Mr)
            + (0.019993 - 0.000101 * $T) * sin(2 * $Mr)
            + 0.000289 * sin(3 * $Mr);

        // Longitude vraie + aberration
        $lon = $this->normDeg($L0 + $C - 0.00569 - 0.00478 * sin(deg2rad(125.04 - 1934.136 * $T)));

        return array_merge(
            $this->longitudeToSign($lon),
            ['retrograde' => false]  // Le Soleil n'est jamais rétrograde
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // LUNE
    // ─────────────────────────────────────────────────────────────────────────

    public function getMoon(): array
    {
        $T  = $this->T;

        // Éléments lunaires fondamentaux
        $Lp = 218.3164477 + 481267.88123421 * $T - 0.0015786 * $T * $T;
        $D  = 297.8501921 + 445267.1114034  * $T - 0.0018819 * $T * $T;
        $M  = 357.5291092 +  35999.0502909  * $T - 0.0001536 * $T * $T;
        $Mp = 134.9633964 + 477198.8675055  * $T + 0.0087414 * $T * $T;
        $F  =  93.2720950 + 483202.0175233  * $T - 0.0036539 * $T * $T;

        $Lp = $this->normDeg($Lp);
        $D  = deg2rad($this->normDeg($D));
        $M  = deg2rad($this->normDeg($M));
        $Mp = deg2rad($this->normDeg($Mp));
        $F  = deg2rad($this->normDeg($F));

        // Termes de longitude (principaux, Meeus Table 47.a)
        $sumL = 6288774 * sin($Mp)
            + 1274027 * sin(2*$D - $Mp)
            +  658314 * sin(2*$D)
            +  213618 * sin(2*$Mp)
            -  185116 * sin($M)
            -  114332 * sin(2*$F)
            +   58793 * sin(2*$D - 2*$Mp)
            +   57066 * sin(2*$D - $M - $Mp)
            +   53322 * sin(2*$D + $Mp)
            +   45758 * sin(2*$D - $M)
            -   40923 * sin($M - $Mp)
            -   34720 * sin($D)
            -   30383 * sin($M + $Mp)
            +   15327 * sin(2*$D - 2*$F)
            -   12528 * sin($Mp + 2*$F)
            +   10980 * sin($Mp - 2*$F)
            +   10675 * sin(4*$D - $Mp)
            +   10034 * sin(3*$Mp)
            +    8548 * sin(4*$D - 2*$Mp)
            -    7888 * sin(2*$D + $M - $Mp)
            -    6766 * sin(2*$D + $M)
            -    5163 * sin($D - $Mp);

        $lon = $this->normDeg($Lp + $sumL / 1000000.0);

        return array_merge(
            $this->longitudeToSign($lon),
            ['retrograde' => false]
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PLANÈTES (Mercure → Neptune) — méthode générique VSOP87 simplifiée
    // ─────────────────────────────────────────────────────────────────────────

    public function getPlanet(string $name): array
    {
        $el = self::ORBITAL_ELEMENTS[$name];
        $T  = $this->T;

        // Éléments orbitaux à l'époque
        $L     = $this->normDeg($el['L0'] + $el['L1'] * $T);
        $a     = $el['a'];
        $e     = $el['e0'] + $el['e1'] * $T;
        $i     = deg2rad($el['i0'] + $el['i1'] * $T);
        $omega = deg2rad($this->normDeg($el['O0'] + $el['O1'] * $T)); // nœud ascendant
        $w     = deg2rad($this->normDeg($el['w0'] + $el['w1'] * $T)); // longitude du périhélie

        // Anomalie moyenne
        $M  = deg2rad($this->normDeg($L - rad2deg($w)));

        // Anomalie excentrique (équation de Kepler, 6 itérations)
        $E  = $this->solveKepler($M, $e);

        // Coordonnées héliocentriques dans le plan de l'orbite
        $xv = $a * (cos($E) - $e);
        $yv = $a * sqrt(1 - $e * $e) * sin($E);

        $v  = atan2($yv, $xv); // anomalie vraie
        $r  = sqrt($xv * $xv + $yv * $yv); // distance héliocentrique

        // Passage en coordonnées écliptiques héliocentriques 3D
        $xh = $r * (cos($omega) * cos($v + $w - $omega) - sin($omega) * sin($v + $w - $omega) * cos($i));
        $yh = $r * (sin($omega) * cos($v + $w - $omega) + cos($omega) * sin($v + $w - $omega) * cos($i));
        $zh = $r * sin($v + $w - $omega) * sin($i);

        // Position du Soleil (pour conversion héliocentrique → géocentrique)
        $sunData = $this->getSunHeliocentricXYZ();
        $xs = $sunData['x'];
        $ys = $sunData['y'];

        // Coordonnées géocentriques écliptiques
        $xg = $xh + $xs;
        $yg = $yh + $ys;
        $zg = $zh;

        // Longitude écliptique géocentrique
        $lon = $this->normDeg(rad2deg(atan2($yg, $xg)));

        // Rétrograde : compare avec position J+1
        $retrograde = $this->isRetrograde($name);

        return array_merge(
            $this->longitudeToSign($lon),
            ['retrograde' => $retrograde]
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ASCENDANT
    // ─────────────────────────────────────────────────────────────────────────

    public function getAscendant(): array
    {
        $lst = $this->getLocalSiderealTime(); // degrés
        $eps = $this->getObliquity();         // degrés

        $lstRad = deg2rad($lst);
        $epsRad = deg2rad($eps);
        $latRad = deg2rad($this->latitude);

        // Formule standard de l'Ascendant (Jean Meeus)
        // tan(ASC) = -cos(RAMC) / (sin(ε)·tan(φ) + cos(ε)·sin(RAMC))
        $y   = -cos($lstRad);
        $x   = sin($epsRad) * tan($latRad) + cos($epsRad) * sin($lstRad);

        // atan2 donne le Descendant, on ajoute 180° pour obtenir l'Ascendant
        $asc = rad2deg(atan2($y, $x)) + 180.0;

        return $this->longitudeToSign($this->normDeg($asc));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MILIEU DU CIEL (MC)
    // ─────────────────────────────────────────────────────────────────────────

    public function getMidheaven(): array
    {
        $lst = $this->getLocalSiderealTime();
        $eps = $this->getObliquity();

        $lstRad = deg2rad($lst);
        $epsRad = deg2rad($eps);

        // Standard MC formula: tan(MC) = tan(RAMC) / cos(ε)
        // atan2 form: MC = atan2(sin(RAMC), cos(RAMC) * cos(ε))
        $mc = $this->normDeg(rad2deg(atan2(sin($lstRad), cos($lstRad) * cos($epsRad))));

        return $this->longitudeToSign($mc);
    }

    /**
     * Return the ecliptic longitude (degrees) of a single planet or point.
     * More efficient than getAllPoints() when only one planet is needed.
     */
    public function getPlanetLongitude(string $name): float
    {
        return match ($name) {
            'Sun'       => $this->getSun()['longitude'],
            'Moon'      => $this->getMoon()['longitude'],
            'Ascendant' => $this->getAscendant()['longitude'],
            default     => $this->getPlanet($name)['longitude'],
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // NŒUD NORD (vrai)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Retourne le Nœud Nord vrai (True Node) de la Lune.
     *
     * La formule de base donne le nœud moyen (mean node). Le nœud vrai
     * oscille autour du nœud moyen avec une amplitude de ~1.5°, ce qui
     * peut provoquer un décalage de signe aux frontières (ex. Scorpion vs
     * Sagittaire). On applique les principaux termes correctifs de Meeus
     * pour obtenir la position réelle.
     */
    public function getNorthNode(): array
    {
        $T = $this->T;

        // Nœud ascendant moyen (Meeus Eq. 47.7, simplifiée)
        $omega = 125.0445479
            - 1934.1362608 * $T
            + 0.0020754   * $T * $T;
        $omega = $this->normDeg($omega);

        // Arguments fondamentaux lunaires — identiques à getMoon()
        $D = $this->normDeg(297.8501921 + 445267.1114034 * $T - 0.0018819 * $T * $T);
        $M = $this->normDeg(357.5291092 +  35999.0502909 * $T - 0.0001536 * $T * $T);
        $F = $this->normDeg( 93.2720950 + 483202.0175233 * $T - 0.0036539 * $T * $T);

        // Correction nœud moyen → nœud vrai (principaux termes périodiques, en degrés)
        // Terme dominant : ~1.5° d'amplitude — critique aux frontières de signe
        // Signe positif : le nœud vrai est en avance sur le nœud moyen (rétrograde)
        $delta = +1.4979 * sin(deg2rad(2.0 * $F))
                 + 0.1226 * sin(deg2rad(2.0 * $D))
                 + 0.1150 * sin(deg2rad($M));

        $trueLon = $this->normDeg($omega + $delta);

        return array_merge(
            $this->longitudeToSign($trueLon),
            ['retrograde' => false]
        );
    }

    // -------------------------------------------------------------------------
    // Calcul des aspects
    // -------------------------------------------------------------------------

    // ── Compatibility scoring helpers ─────────────────────────────────────────

    /**
     * Build lookup[planetA][planetB] => aspect_type
     * planetA is always from $this (user), planetB from $other (partner).
     */
    private function buildAspectLookup(PlanetaryCalculator $other): array
    {
        $lookup = [];
        foreach ($this->getSynastryAspects($other) as $a) {
            $lookup[$a['planet_a']][$a['planet_b']] = $a['type'];
        }
        return $lookup;
    }

    /**
     * Score one dimension (0-100, starts at 50).
     * Checks user's pa vs partner's pb AND user's pb vs partner's pa.
     */
    private function dimensionScore(array $lookup, array $pairs, float $elementBonus): int
    {
        $delta = 0.0;
        foreach ($pairs as [$pa, $pb, $weight]) {
            $type = $lookup[$pa][$pb] ?? null;
            if ($type !== null) {
                $delta += (self::SCORING_ASPECT_POINTS[$type] ?? 0) * $weight;
            }
            if ($pa !== $pb) {
                $type = $lookup[$pb][$pa] ?? null;
                if ($type !== null) {
                    $delta += (self::SCORING_ASPECT_POINTS[$type] ?? 0) * $weight;
                }
            }
        }
        $delta += $elementBonus;
        return max(5, min(95, (int) round(50.0 + $delta)));
    }

    /**
     * Element compatibility bonus: +10 same element, +8 compatible pair, -8 incompatible.
     */
    private function elementCompat(string $signA, string $signB): int
    {
        $elemA = self::SIGN_ELEMENTS[$signA] ?? '';
        $elemB = self::SIGN_ELEMENTS[$signB] ?? '';
        if (!$elemA || !$elemB) return 0;
        if ($elemA === $elemB) return 10;
        $pair = [$elemA, $elemB];
        sort($pair);
        $key = implode('-', $pair);
        return ($key === 'air-fire' || $key === 'earth-water') ? 8 : -8;
    }

    /**
     * Bonus from ASC ruler planets forming aspects across the two charts.
     * Affects amour, communication, and long_terme dimensions.
     */
    private function ascRulerBonus(array $lookup, string $ascSignA, string $ascSignB): float
    {
        $bonus = 0.0;
        $personal = ['Sun', 'Moon', 'Venus', 'Mars', 'Mercury'];

        $rulerA = self::SIGN_RULERS[$ascSignA] ?? null;
        if ($rulerA) {
            foreach ($personal as $pp) {
                $type = $lookup[$rulerA][$pp] ?? null;
                if ($type !== null) {
                    $bonus += (self::SCORING_ASPECT_POINTS[$type] ?? 0) * 0.5;
                }
            }
        }

        $rulerB = self::SIGN_RULERS[$ascSignB] ?? null;
        if ($rulerB) {
            foreach ($personal as $pp) {
                $type = $lookup[$pp][$rulerB] ?? null;
                if ($type !== null) {
                    $bonus += (self::SCORING_ASPECT_POINTS[$type] ?? 0) * 0.5;
                }
            }
        }

        return $bonus;
    }

    // ─────────────────────────────────────────────────────────────────────────

    private function detectAspect(float $lonA, float $lonB, string $nameA, string $nameB): ?array
    {
        $diff = abs($lonA - $lonB);
        if ($diff > 180) $diff = 360 - $diff;

        foreach (self::ASPECTS as $key => $def) {
            list($target, $maxOrb, $name, $symbol) = $def;
            $orb = abs($diff - $target);
            if ($orb <= $maxOrb) {
                return [
                    'planet_a' => $nameA,
                    'planet_b' => $nameB,
                    'type'     => $key,
                    'name'     => $name,
                    'symbol'   => $symbol,
                    'orb'      => round($orb, 2),
                ];
            }
        }

        return null;
    }

    // -------------------------------------------------------------------------
    // Helpers astronomiques
    // -------------------------------------------------------------------------

    /**
     * Équation de Kepler : résolution de M = E - e*sin(E)
     * par méthode itérative de Newton-Raphson
     */
    private function solveKepler(float $M, float $e, int $iterations = 10): float
    {
        $E = $M; // première approximation
        for ($i = 0; $i < $iterations; $i++) {
            $dE = ($M - $E + $e * sin($E)) / (1 - $e * cos($E));
            $E += $dE;
            if (abs($dE) < 1e-10) break;
        }
        return $E;
    }

    /**
     * Position géocentrique du Soleil (vue depuis la Terre)
     * Nécessaire pour convertir les positions planétaires héliocentriques en géocentriques
     *
     * Formule de conversion : Planet_geo = Planet_helio + Sun_geo
     */
    private function getSunHeliocentricXYZ(): array
    {
        $T  = $this->T;
        $L0 = 280.46646 + 36000.76983 * $T;
        $M  = deg2rad($this->normDeg(357.52911 + 35999.05029 * $T));
        $e  = 0.016708634 - 0.000042037 * $T;

        $C  = (1.914602 - 0.004817 * $T) * sin($M)
            + 0.019993 * sin(2 * $M)
            + 0.000289 * sin(3 * $M);

        $lon = deg2rad($this->normDeg($L0 + $C));
        $r   = 1.000001018 * (1 - $e * $e) / (1 + $e * cos(deg2rad($this->normDeg(rad2deg($M) + $C))));

        // Position du Soleil vue depuis la Terre (coordonnées géocentriques)
        // Pour la conversion : Planet_geocentric = Planet_heliocentric + Sun_geocentric
        return [
            'x' => $r * cos($lon),
            'y' => $r * sin($lon),
        ];
    }

    /**
     * Détecte si une planète est en rétrograde
     * (compare la longitude J-1 et J+1)
     */
    private function isRetrograde(string $planetName): bool
    {
        $jdOrig = $this->julianDay;
        $T_orig  = $this->T;

        // J-1
        $this->julianDay = $jdOrig - 1;
        $this->T         = ($this->julianDay - 2451545.0) / 36525.0;
        $before = $this->getPlanetWithoutRetroCheck($planetName)['longitude'];

        // J+1
        $this->julianDay = $jdOrig + 1;
        $this->T         = ($this->julianDay - 2451545.0) / 36525.0;
        $after = $this->getPlanetWithoutRetroCheck($planetName)['longitude'];

        // Restauration
        $this->julianDay = $jdOrig;
        $this->T         = $T_orig;

        // Gestion du passage 0°/360°
        $diff = $after - $before;
        if ($diff > 180)  $diff -= 360;
        if ($diff < -180) $diff += 360;

        return $diff < 0;
    }

    /**
     * Version de getPlanet sans vérification rétrograde (évite récursion infinie)
     */
    private function getPlanetWithoutRetroCheck(string $name): array
    {
        $el = self::ORBITAL_ELEMENTS[$name];
        $T  = $this->T;

        $L     = $this->normDeg($el['L0'] + $el['L1'] * $T);
        $a     = $el['a'];
        $e     = $el['e0'] + $el['e1'] * $T;
        $i     = deg2rad($el['i0'] + $el['i1'] * $T);
        $omega = deg2rad($this->normDeg($el['O0'] + $el['O1'] * $T));
        $w     = deg2rad($this->normDeg($el['w0'] + $el['w1'] * $T));

        $M  = deg2rad($this->normDeg($L - rad2deg($w)));
        $E  = $this->solveKepler($M, $e);

        $xv = $a * (cos($E) - $e);
        $yv = $a * sqrt(1 - $e * $e) * sin($E);

        $v  = atan2($yv, $xv);
        $r  = sqrt($xv * $xv + $yv * $yv);

        $xh = $r * (cos($omega) * cos($v + $w - $omega) - sin($omega) * sin($v + $w - $omega) * cos($i));
        $yh = $r * (sin($omega) * cos($v + $w - $omega) + cos($omega) * sin($v + $w - $omega) * cos($i));

        $sunData = $this->getSunHeliocentricXYZ();
        $xg = $xh + $sunData['x'];
        $yg = $yh + $sunData['y'];

        $lon = $this->normDeg(rad2deg(atan2($yg, $xg)));

        return $this->longitudeToSign($lon);
    }

    /**
     * Obliquité de l'écliptique en degrés
     */
    private function getObliquity(): float
    {
        return 23.4392911 - 0.013004167 * $this->T
            - 0.000000164 * $this->T * $this->T
            + 0.000000504 * $this->T * $this->T * $this->T;
    }

    /**
     * Temps sidéral local (TSL) en degrés
     */
    private function getLocalSiderealTime(): float
    {
        $JD    = $this->julianDay;
        $T     = $this->T;

        // Temps sidéral de Greenwich à 0h UT (degrés)
        $theta = 280.46061837
            + 360.98564736629 * ($JD - 2451545.0)
            + 0.000387933 * $T * $T
            - ($T * $T * $T) / 38710000.0;

        // Ajout de la longitude géographique (positive vers l'est)
        return $this->normDeg($theta + $this->longitude);
    }

    // -------------------------------------------------------------------------
    // Utilitaires
    // -------------------------------------------------------------------------

    /**
     * Convertit une longitude écliptique (0-360°) en données astrologiques
     */
    private function longitudeToSign(float $longitude): array
    {
        $lon       = $this->normDeg($longitude);
        $signIndex = (int) floor($lon / 30);
        $posInSign = fmod($lon, 30);
        $degrees   = (int) floor($posInSign);
        $minutes   = (int) floor(($posInSign - $degrees) * 60);

        return [
            'sign'      => self::SIGNS[$signIndex],
            'sign_fr'   => self::SIGNS_FR[$signIndex],
            'symbol'    => self::SIGN_SYMBOLS[$signIndex],
            'degrees'   => $degrees,
            'minutes'   => $minutes,
            'longitude' => round($lon, 4),
        ];
    }

    /**
     * Normalise un angle dans [0°, 360°)
     */
    private function normDeg(float $deg): float
    {
        return fmod(fmod($deg, 360) + 360, 360);
    }

    /**
     * Convertit un DateTime en Jour Julien
     */
    private function dateToJulianDay(\DateTime $dt): float
    {
        $Y  = (int) $dt->format('Y');
        $M  = (int) $dt->format('m');
        $D  = (float) $dt->format('d')
            + (float) $dt->format('H') / 24.0
            + (float) $dt->format('i') / 1440.0
            + (float) $dt->format('s') / 86400.0;

        if ($M <= 2) {
            $Y--;
            $M += 12;
        }

        $A = (int) ($Y / 100);
        $B = 2 - $A + (int) ($A / 4); // Correction grégorienne

        return (int)(365.25 * ($Y + 4716))
            + (int)(30.6001 * ($M + 1))
            + $D + $B - 1524.5;
    }

    /**
     * Getter pour le nom
     */
    public function getName(): string
    {
        return $this->name;
    }

    // =========================================================================
    // NATAL CHART ANALYSIS — Full chart payload
    // =========================================================================

    /**
     * Returns the complete natal chart payload for GPT analysis.
     * This is additive — does not modify any existing method behavior.
     */
    public function getFullChartPayload(): array
    {
        $planets   = $this->getAllPlanets();
        $ascendant = $this->getAscendant();
        $midheaven = $this->getMidheaven();

        // Descendant = ASC + 180°, IC = MC + 180°
        $descendant = $this->longitudeToSign($this->normDeg($ascendant['longitude'] + 180));
        $ic         = $this->longitudeToSign($this->normDeg($midheaven['longitude'] + 180));

        // Houses (Equal House system)
        $houseCusps = $this->calculateHouseCusps();

        // Assign each planet to a house
        $planetsWithHouses = [];
        foreach ($planets as $name => $data) {
            $house = $this->assignToHouse($data['longitude'], $houseCusps);
            $dignity = $this->calculateDignity($name, $data['sign']);
            $planetsWithHouses[$name] = [
                'sign'    => $data['sign'],
                'house'   => $house,
                'degree'  => $data['degrees'] ?? (int) floor(fmod($data['longitude'], 30)),
                'dignity' => $dignity,
            ];
        }

        // Build houses array with signs and planets
        $houses = $this->buildHousesArray($houseCusps, $planets);

        // Lunar Nodes
        $northNodeLon = $this->getMeanNorthNode();
        $northNode    = $this->longitudeToSign($northNodeLon);
        $southNode    = $this->longitudeToSign($this->normDeg($northNodeLon + 180));
        $nodes = [
            'north' => [
                'sign'  => $northNode['sign'],
                'house' => $this->assignToHouse($northNodeLon, $houseCusps),
            ],
            'south' => [
                'sign'  => $southNode['sign'],
                'house' => $this->assignToHouse($this->normDeg($northNodeLon + 180), $houseCusps),
            ],
        ];

        // Angles
        $angles = [
            'ascendant'  => ['sign' => $ascendant['sign'],  'degree' => $ascendant['degrees']],
            'midheaven'  => ['sign' => $midheaven['sign'],  'degree' => $midheaven['degrees']],
            'descendant' => ['sign' => $descendant['sign'], 'degree' => $descendant['degrees']],
            'ic'         => ['sign' => $ic['sign'],         'degree' => $ic['degrees']],
        ];

        // Aspects between natal planets
        $natalAspects = $this->calculateNatalAspects($planets);

        // Rulers
        $ascRuler = $this->calculateRuler($ascendant['sign'], $planetsWithHouses);
        $mcRuler  = $this->calculateRuler($midheaven['sign'], $planetsWithHouses);

        // Dominants
        $dominantElement  = $this->calculateDominantElement($planetsWithHouses);
        $dominantModality = $this->calculateDominantModality($planetsWithHouses);
        $dominantPlanets  = $this->calculateDominantPlanets(
            $planetsWithHouses, $natalAspects, $ascendant['sign'], $midheaven['sign']
        );

        // Stelliums
        $stelliums = $this->detectStelliums($planetsWithHouses);

        // Chart pattern
        $chartPattern = $this->calculateChartPattern($planets);

        return [
            'planets'            => $planetsWithHouses,
            'angles'             => $angles,
            'houses'             => $houses,
            'nodes'              => $nodes,
            'aspects'            => $natalAspects,
            'ascendant_ruler'    => $ascRuler,
            'mc_ruler'           => $mcRuler,
            'dominant_element'   => $dominantElement,
            'dominant_modality'  => $dominantModality,
            'dominant_planets'   => $dominantPlanets,
            'stelliums'          => $stelliums,
            'chart_pattern'      => $chartPattern,
        ];
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Placidus House System
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Calculate house cusps using the Placidus system.
     * Matches the standard used by most western astrology sites (e.g. astro.com).
     *
     * Algorithm (Jean Meeus / standard Placidus):
     * - H10 = MC, H1 = ASC, H4 = IC, H7 = DC
     * - H11: RA(H11) = RAMC + DSA(H11) × 1/3
     * - H12: RA(H12) = RAMC + DSA(H12) × 2/3
     * - H2:  RA(H2)  = (RAMC+180°) + NSA(H2) × 1/3
     * - H3:  RA(H3)  = (RAMC+180°) + NSA(H3) × 2/3
     * - Opposite cusps: H5=H11+180°, H6=H12+180°, H8=H2+180°, H9=H3+180°
     *
     * Resolved iteratively since DSA/NSA depend on the cusp itself.
     *
     * @return float[] Array of 12 cusp longitudes (0-indexed: cusps[0] = house 1)
     */
    private function calculateHouseCusps(): array
    {
        $eps    = $this->getObliquity();
        $epsRad = deg2rad($eps);
        $latRad = deg2rad($this->latitude);
        $RAMC   = $this->getLocalSiderealTime(); // degrees

        $mc  = $this->getMidheaven()['longitude'];
        $asc = $this->getAscendant()['longitude'];

        // DSA (diurnal semi-arc) in degrees for a given ecliptic longitude
        $dsa = function(float $lon) use ($epsRad, $latRad): float {
            $dec = asin(sin(deg2rad($lon)) * sin($epsRad));
            $x   = max(-1.0, min(1.0, -tan($latRad) * tan($dec)));
            return rad2deg(acos($x));
        };

        // RA (degrees) → ecliptic longitude (degrees)
        // From cos(δ)cos(α)=cos(λ) and cos(δ)sin(α)=sin(λ)cos(ε):
        // λ = atan2(sin(α)/cos(ε), cos(α))
        $fromRA = function(float $ra) use ($epsRad): float {
            $r = deg2rad($ra);
            return $this->normDeg(rad2deg(atan2(sin($r) / cos($epsRad), cos($r))));
        };

        // Iterate to find an intermediate Placidus cusp.
        //
        // Derivation (HA = RAMC - RA, increases westward):
        //   MC  (H10): HA = 0              → RA = RAMC
        //   H11:       HA = −DSA/3         → RA = RAMC + DSA/3
        //   H12:       HA = −2·DSA/3       → RA = RAMC + 2·DSA/3
        //   ASC (H1):  HA = −DSA           → RA = RAMC + DSA
        //   H2:        HA = −DSA − NSA/3   → RA = RAMC + DSA + NSA/3
        //   H3:        HA = −DSA − 2·NSA/3 → RA = RAMC + DSA + 2·NSA/3
        //   IC  (H4):  HA = −180°          → RA = RAMC + DSA + NSA = RAMC + 180°
        //
        // Resolved iteratively since DSA/NSA depend on the cusp's own longitude.
        $iterate = function(float $initial, bool $upper, float $fraction)
            use ($RAMC, $dsa, $fromRA): float
        {
            $lon = $initial;
            for ($i = 0; $i < 50; $i++) {
                $d       = $dsa($lon);
                // Upper (H11/H12): RA = RAMC + DSA × fraction
                // Lower (H2/H3):   RA = RAMC + DSA + NSA × fraction
                $targetRA = $upper
                    ? $this->normDeg($RAMC + $d * $fraction)
                    : $this->normDeg($RAMC + $d + (180.0 - $d) * $fraction);
                $newLon   = $fromRA($targetRA);
                if (abs($newLon - $lon) < 0.0001) break;
                $lon = $newLon;
            }
            return $lon;
        };

        $h11 = $iterate($this->normDeg($mc + 30),  true,  1 / 3);
        $h12 = $iterate($this->normDeg($mc + 60),  true,  2 / 3);
        $h2  = $iterate($this->normDeg($asc + 30), false, 1 / 3);
        $h3  = $iterate($this->normDeg($asc + 60), false, 2 / 3);

        return [
            0  => $asc,                              // H1  (ASC)
            1  => $h2,                               // H2
            2  => $h3,                               // H3
            3  => $this->normDeg($mc + 180),         // H4  (IC)
            4  => $this->normDeg($h11 + 180),        // H5
            5  => $this->normDeg($h12 + 180),        // H6
            6  => $this->normDeg($asc + 180),        // H7  (DC)
            7  => $this->normDeg($h2 + 180),         // H8
            8  => $this->normDeg($h3 + 180),         // H9
            9  => $mc,                               // H10 (MC)
            10 => $h11,                              // H11
            11 => $h12,                              // H12
        ];
    }

    /**
     * Assign a longitude to a house number (1-12).
     */
    private function assignToHouse(float $longitude, array $cusps): int
    {
        $lon = $this->normDeg($longitude);
        for ($i = 11; $i >= 0; $i--) {
            $cusp     = $cusps[$i];
            $nextCusp = $cusps[($i + 1) % 12];

            if ($nextCusp <= $cusp) {
                // House wraps around 0°
                if ($lon >= $cusp || $lon < $nextCusp) {
                    return $i + 1;
                }
            } else {
                if ($lon >= $cusp && $lon < $nextCusp) {
                    return $i + 1;
                }
            }
        }
        return 1; // fallback
    }

    /**
     * Build houses array: each house with its sign and list of planets.
     */
    private function buildHousesArray(array $cusps, array $planets): array
    {
        $houses = [];
        for ($i = 0; $i < 12; $i++) {
            $cuspSign = $this->longitudeToSign($cusps[$i]);
            $housePlanets = [];
            foreach ($planets as $name => $data) {
                if ($this->assignToHouse($data['longitude'], $cusps) === $i + 1) {
                    $housePlanets[] = $name;
                }
            }
            $houses[$i + 1] = [
                'sign'    => $cuspSign['sign'],
                'planets' => $housePlanets,
            ];
        }
        return $houses;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Lunar Nodes
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Calculate Mean North Node longitude.
     * Based on Meeus, Chapter 47.
     */
    private function getMeanNorthNode(): float
    {
        $T = $this->T;
        // Mean longitude of the ascending node (Meeus)
        $omega = 125.0445479
            - 1934.1362891 * $T
            + 0.0020754 * $T * $T
            + $T * $T * $T / 467441.0
            - $T * $T * $T * $T / 60616000.0;

        return $this->normDeg($omega);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Dignities
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Calculate the dignity status of a planet in a sign.
     */
    private function calculateDignity(string $planet, string $sign): string
    {
        $dignities = self::PLANET_DIGNITIES[$planet] ?? null;
        if (!$dignities) {
            return 'neutral';
        }

        if (in_array($sign, $dignities['domicile'], true)) return 'domicile';
        if (in_array($sign, $dignities['exaltation'], true)) return 'exaltation';
        if (in_array($sign, $dignities['exil'], true)) return 'exil';
        if (in_array($sign, $dignities['chute'], true)) return 'chute';

        return 'neutral';
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Natal Aspects (between natal planets only)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Calculate aspects between all natal planets.
     * Returns aspects with applying boolean.
     */
    private function calculateNatalAspects(array $planets): array
    {
        $planetNames = array_keys($planets);
        $aspects = [];

        for ($i = 0; $i < count($planetNames); $i++) {
            for ($j = $i + 1; $j < count($planetNames); $j++) {
                $nameA = $planetNames[$i];
                $nameB = $planetNames[$j];
                $lonA  = $planets[$nameA]['longitude'];
                $lonB  = $planets[$nameB]['longitude'];

                $aspect = $this->detectAspect($lonA, $lonB, $nameA, $nameB);
                if ($aspect !== null) {
                    // Determine if aspect is applying (planets getting closer)
                    $applying = $this->isAspectApplying($nameA, $nameB, $aspect['type']);
                    $aspect['applying'] = $applying;
                    $aspects[] = $aspect;
                }
            }
        }

        usort($aspects, fn($a, $b) => $a['orb'] <=> $b['orb']);
        return $aspects;
    }

    /**
     * Determine if an aspect is applying (getting tighter) by comparing
     * the aspect orb today vs tomorrow.
     */
    private function isAspectApplying(string $planetA, string $planetB, string $aspectType): bool
    {
        $targetAngle = self::ASPECTS[$aspectType][0] ?? 0;

        $lonA = $this->getPlanetLongitude($planetA);
        $lonB = $this->getPlanetLongitude($planetB);
        $diff = abs($lonA - $lonB);
        if ($diff > 180) $diff = 360 - $diff;
        $currentOrb = abs($diff - $targetAngle);

        // Compute tomorrow's positions
        $jdOrig = $this->julianDay;
        $T_orig = $this->T;

        $this->julianDay = $jdOrig + 1;
        $this->T = ($this->julianDay - 2451545.0) / 36525.0;

        $lonA2 = $this->getPlanetLongitude($planetA);
        $lonB2 = $this->getPlanetLongitude($planetB);

        // Restore
        $this->julianDay = $jdOrig;
        $this->T = $T_orig;

        $diff2 = abs($lonA2 - $lonB2);
        if ($diff2 > 180) $diff2 = 360 - $diff2;
        $futureOrb = abs($diff2 - $targetAngle);

        return $futureOrb < $currentOrb;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Ruler calculations
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Find the ruler of a sign and its position.
     * Uses modern rulers.
     */
    private function calculateRuler(string $sign, array $planetsWithHouses): array
    {
        $rulerName = self::SIGN_RULERS_MODERN[$sign] ?? 'Sun';
        $rulerData = $planetsWithHouses[$rulerName] ?? null;

        return [
            'planet' => $rulerName,
            'sign'   => $rulerData['sign'] ?? 'Aries',
            'house'  => $rulerData['house'] ?? 1,
        ];
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Dominant calculations
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Calculate the dominant element by weighted scoring.
     */
    private function calculateDominantElement(array $planetsWithHouses): string
    {
        $scores = ['fire' => 0, 'earth' => 0, 'air' => 0, 'water' => 0];

        foreach ($planetsWithHouses as $name => $data) {
            $weight  = self::PLANET_WEIGHTS[$name] ?? 0;
            $element = self::SIGN_ELEMENTS[$data['sign']] ?? null;
            if ($element) {
                $scores[$element] += $weight;
            }
        }

        // Map to French
        $frMap = ['fire' => 'feu', 'earth' => 'terre', 'air' => 'air', 'water' => 'eau'];
        $winner = array_keys($scores, max($scores))[0];
        return $frMap[$winner];
    }

    /**
     * Calculate the dominant modality by weighted scoring.
     */
    private function calculateDominantModality(array $planetsWithHouses): string
    {
        $scores = ['cardinal' => 0, 'fixed' => 0, 'mutable' => 0];

        foreach ($planetsWithHouses as $name => $data) {
            $weight   = self::PLANET_WEIGHTS[$name] ?? 0;
            $modality = self::SIGN_MODALITIES[$data['sign']] ?? null;
            if ($modality) {
                $scores[$modality] += $weight;
            }
        }

        // Map to French
        $frMap = ['cardinal' => 'cardinal', 'fixed' => 'fixe', 'mutable' => 'mutable'];
        $winner = array_keys($scores, max($scores))[0];
        return $frMap[$winner];
    }

    /**
     * Calculate dominant planets based on 5 criteria.
     * Returns max 3 planets with score > 3, sorted by score desc.
     */
    private function calculateDominantPlanets(
        array $planetsWithHouses,
        array $aspects,
        string $ascSign,
        string $mcSign
    ): array {
        $ascRuler = self::SIGN_RULERS_MODERN[$ascSign] ?? null;
        $mcRuler  = self::SIGN_RULERS_MODERN[$mcSign] ?? null;

        $scores = [];
        foreach ($planetsWithHouses as $name => $data) {
            $score = 0;

            // 1. Dignity: domicile/exaltation +3, exil/chute -1
            if ($data['dignity'] === 'domicile' || $data['dignity'] === 'exaltation') {
                $score += 3;
            } elseif ($data['dignity'] === 'exil' || $data['dignity'] === 'chute') {
                $score -= 1;
            }

            // 2. Angular house (1, 4, 7, 10) +2
            if (in_array($data['house'], [1, 4, 7, 10], true)) {
                $score += 2;
            }

            // 3. Number of aspects (max +4)
            $aspectCount = 0;
            foreach ($aspects as $asp) {
                if ($asp['planet_a'] === $name || $asp['planet_b'] === $name) {
                    $aspectCount++;
                }
            }
            $score += min(4, $aspectCount);

            // 4. Ruler of ASC or MC +2
            if ($name === $ascRuler || $name === $mcRuler) {
                $score += 2;
            }

            // 5. Planet in house 1 +2
            if ($data['house'] === 1) {
                $score += 2;
            }

            $scores[$name] = $score;
        }

        arsort($scores);
        $dominant = [];
        foreach ($scores as $name => $score) {
            if ($score > 3 && count($dominant) < 3) {
                $dominant[] = $name;
            }
        }

        return $dominant;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Stellium detection
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Detect stelliums (3+ planets in same sign or same house).
     * Returns descriptive strings.
     */
    private function detectStelliums(array $planetsWithHouses): array
    {
        $stelliums = [];

        // Group by sign
        $bySign = [];
        foreach ($planetsWithHouses as $name => $data) {
            $bySign[$data['sign']][] = $name;
        }
        foreach ($bySign as $sign => $planets) {
            if (count($planets) >= 3) {
                $frSign = self::SIGNS_FR[array_search($sign, self::SIGNS)] ?? $sign;
                $frPlanets = array_map(fn($p) => self::PLANETS_FR[$p] ?? $p, $planets);
                $stelliums[] = "Stellium en {$frSign} (" . implode(', ', $frPlanets) . ")";
            }
        }

        // Group by house
        $byHouse = [];
        foreach ($planetsWithHouses as $name => $data) {
            $byHouse[$data['house']][] = $name;
        }
        foreach ($byHouse as $house => $planets) {
            if (count($planets) >= 3) {
                $frPlanets = array_map(fn($p) => self::PLANETS_FR[$p] ?? $p, $planets);
                $stelliums[] = "Stellium en maison {$house} (" . implode(', ', $frPlanets) . ")";
            }
        }

        return $stelliums;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Chart pattern
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Determine the chart pattern (Jones patterns).
     * Uses absolute longitudes sorted around the circle.
     */
    private function calculateChartPattern(array $planets): string
    {
        // Collect all planet longitudes
        $longitudes = [];
        foreach ($planets as $data) {
            $longitudes[] = $this->normDeg($data['longitude']);
        }
        sort($longitudes);
        $n = count($longitudes);
        if ($n < 2) return 'splash';

        // Calculate gaps between consecutive planets on the circle
        $gaps = [];
        for ($i = 0; $i < $n; $i++) {
            $next = ($i + 1) % $n;
            $gap = $longitudes[$next] - $longitudes[$i];
            if ($gap <= 0) $gap += 360;
            $gaps[] = $gap;
        }

        $largestGap = max($gaps);
        $occupiedArc = 360 - $largestGap;

        // Count how many gaps are > 60°
        $largeGaps = array_filter($gaps, fn($g) => $g > 60);
        $largeGapCount = count($largeGaps);

        // Count distinct signs
        $signs = [];
        foreach ($planets as $data) {
            $signs[$data['sign']] = true;
        }
        $distinctSigns = count($signs);

        // Classification in priority order per spec
        // 1. Bundle: occupied arc ≤ 120°
        if ($occupiedArc <= 120) {
            return 'bundle';
        }

        // 2. Bucket: largest gap ≥ 180° and one isolated planet
        if ($largestGap >= 180) {
            $isolated = $this->countIsolatedPlanets($longitudes, $gaps);
            if ($isolated === 1) {
                return 'bucket';
            }
            // 3. Bowl: largest gap ≥ 180° (no isolated planet)
            return 'bowl';
        }

        // 4. Seesaw: exactly 2 gaps > 60°
        if ($largeGapCount === 2) {
            return 'seesaw';
        }

        // 5. Locomotive: largest gap ≥ 120° and occupied arc ≤ 240°
        if ($largestGap >= 120 && $occupiedArc <= 240) {
            return 'locomotive';
        }

        // 6. Splash: planets in 7+ signs
        if ($distinctSigns >= 7) {
            return 'splash';
        }

        // 7. Default: splay
        return 'splay';
    }

    /**
     * Count how many planets are isolated on the other side of the largest gap.
     * A planet is "isolated" if it's separated by > 60° from all others.
     */
    private function countIsolatedPlanets(array $sortedLongitudes, array $gaps): int
    {
        // Find index of largest gap
        $maxGapIdx = array_keys($gaps, max($gaps))[0];
        $n = count($sortedLongitudes);

        // The "other side" of the gap starts at planet after the gap
        // Check each planet: is it separated from its neighbors by > 60°?
        $isolated = 0;
        for ($i = 0; $i < $n; $i++) {
            $prevGap = $gaps[($i - 1 + $n) % $n];
            $nextGap = $gaps[$i];
            if ($prevGap > 60 && $nextGap > 60) {
                $isolated++;
            }
        }

        return $isolated;
    }
}
