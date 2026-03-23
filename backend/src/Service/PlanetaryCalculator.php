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
     * Construit le prompt LLM de compatibilité
     * @param string $locale Locale for the prompt (fr or en)
     */
    public function buildCompatibilityPrompt(PlanetaryCalculator $other, ?string $question = null, string $locale = 'fr'): string
    {
        $localeService = new PromptLocaleService($locale);
        $template = $localeService->getCompatibilityPromptTemplate();
        $labels = $template['labels'];
        $jsonDescriptions = $template['json_descriptions'];
        $dimensions = $template['dimensions'];
        $isEnglish = $locale === 'en';

        $chartA  = $this->getFullChart();
        $chartB  = $other->getFullChart();
        $aspects = $this->getSynastryAspects($other);

        $formatChart = function($chart) use ($localeService, $isEnglish) {
            $lines = [];
            foreach ($chart['planets'] as $key => $p) {
                $retro = $p['retrograde'] ? ' ℞' : '';
                $planetName = $localeService->translatePlanet($key);
                $signName = $localeService->translateSign($p['sign']);
                $atWord = $isEnglish ? 'at' : 'à';
                $lines[] = sprintf(
                    '  %-10s : %s %s %s %d°%02d\'%s',
                    $planetName,
                    self::PLANET_SYMBOLS[$key] ?? '',
                    $signName,
                    $atWord,
                    $p['degrees'],
                    $p['minutes'],
                    $retro
                );
            }
            $asc = $chart['ascendant'];
            $mc  = $chart['midheaven'];
            $ascSignName = $localeService->translateSign($asc['sign']);
            $mcSignName = $localeService->translateSign($mc['sign']);
            $ascLabel = $localeService->translatePlanet('Ascendant');
            $mcLabel = $localeService->translatePlanet('Midheaven');
            $atWord = $isEnglish ? 'at' : 'à';
            $lines[] = sprintf('  %-10s : %s %s %d°%02d\'', $ascLabel, $ascSignName, $atWord, $asc['degrees'], $asc['minutes']);
            $lines[] = sprintf('  %-10s : %s %s %d°%02d\'', $mcLabel, $mcSignName, $atWord, $mc['degrees'], $mc['minutes']);
            return implode("\n", $lines);
        };

        $formatAspects = function($aspects) use ($localeService, $isEnglish) {
            $noAspects = $isEnglish ? '  (No major aspects)' : '  (Aucun aspect majeur)';
            if (empty($aspects)) return $noAspects;
            $lines = [];
            $orbWord = $isEnglish ? 'orb' : 'orbe';
            foreach (array_slice($aspects, 0, 20) as $a) {
                $planetA = $localeService->translatePlanet($a['planet_a']);
                $planetB = $localeService->translatePlanet($a['planet_b']);
                $lines[] = sprintf(
                    '  %s %s %s (%s, %s %.1f°)',
                    $planetA,
                    $a['symbol'],
                    $planetB,
                    $a['name'],
                    $orbWord,
                    $a['orb']
                );
            }
            return implode("\n", $lines);
        };

        $nameA = $chartA['name'];
        $nameB = $chartB['name'];

        $questionSection = $question
            ? "\n═══════════ {$labels['specific_question']} ═══════════\n{$question}\n"
            : '';

        $intro = $template['intro'];
        $rules = implode("\n- ", $template['rules']);

        $chartOfA = "{$labels['chart_of']} {$nameA}";
        $chartOfB = "{$labels['chart_of']} {$nameB}";
        $aspectsBetween = $labels['aspects_between'];
        $responseFormat = $labels['response_format'];

        $jsonOnlyInstruction = $isEnglish
            ? "Respond ONLY with this valid JSON, no text before or after:"
            : "Réponds UNIQUEMENT avec ce JSON valide, sans texte avant ou après :";

        $exampleAspect = $isEnglish
            ? "{$nameA}'s Venus trine {$nameB}'s Mars"
            : "la Vénus de {$nameA} en trigone avec le Mars de {$nameB}";

        $scoringRules = $isEnglish
            ? "SCORING METHOD (MANDATORY):\nFor each dimension, start at 50 then apply:\n  +20 = perfect harmony (trine, same sign)\n  +10 = good (sextile, compatible elements)\n    0 = neutral\n  -10 = tension (square)\n  -20 = strong conflict (opposition, incompatible elements)\n\nDIMENSION PLANETS:\n  love         → Moon, Venus aspects\n  communication → Mercury aspects\n  attraction   → Mars, Venus aspects\n  long_term    → Sun, Ascendant aspects\n  conflicts    → Saturn aspects"
            : "MÉTHODE DE SCORING (OBLIGATOIRE) :\nPour chaque dimension, pars de 50 puis applique :\n  +20 = harmonie parfaite (trigone, même signe)\n  +10 = bon (sextile, éléments compatibles)\n    0 = neutre\n  -10 = tension (carré)\n  -20 = conflit fort (opposition, éléments incompatibles)\n\nPLANÈTES PAR DIMENSION :\n  amour         → aspects Lune, Vénus\n  communication → aspects Mercure\n  attirance     → aspects Mars, Vénus\n  long_terme    → aspects Soleil, Ascendant\n  conflits      → aspects Saturne";

        return <<<PROMPT
{$intro}

- {$rules}

{$scoringRules}

═══════════ {$chartOfA} ═══════════
{$formatChart($chartA)}

═══════════ {$chartOfB} ═══════════
{$formatChart($chartB)}

═══════════ {$aspectsBetween} ═══════════
{$formatAspects($aspects)}
{$questionSection}
═══════════ {$responseFormat} ═══════════
{$jsonOnlyInstruction}
{
  "score_global": <{$jsonDescriptions['score_global']}>,
  "headline": "<{$jsonDescriptions['headline']}>",
  "resume": "<{$jsonDescriptions['resume']}>",
  "forces": ["<{$jsonDescriptions['forces']}>", "<{$jsonDescriptions['forces']}>", "<{$jsonDescriptions['forces']}>"],
  "tensions": ["<{$jsonDescriptions['tensions']}>", "<{$jsonDescriptions['tensions']}>"],
  "dimensions": {
    "{$dimensions['amour']}":         { "score": <0-100>, "analyse": "<{$jsonDescriptions['analyse']}>" },
    "{$dimensions['communication']}": { "score": <0-100>, "analyse": "<{$jsonDescriptions['analyse']}>" },
    "{$dimensions['conflits']}":      { "score": <0-100>, "analyse": "<{$jsonDescriptions['analyse']}>" },
    "{$dimensions['long_terme']}":    { "score": <0-100>, "analyse": "<{$jsonDescriptions['analyse']}>" },
    "{$dimensions['attirance']}":     { "score": <0-100>, "analyse": "<{$jsonDescriptions['analyse']}>" }
  },
  "aspect_cle": {
    "planetes": "<ex: {$exampleAspect}>",
    "impact":   "<{$jsonDescriptions['impact']}>"
  },
  "conseil": "<{$jsonDescriptions['conseil']}>"
}
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

        $mc = $this->normDeg(rad2deg(atan2(cos($lstRad), -sin($lstRad) * cos($epsRad))));

        return $this->longitudeToSign($mc);
    }

    // -------------------------------------------------------------------------
    // Calcul des aspects
    // -------------------------------------------------------------------------

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
}
