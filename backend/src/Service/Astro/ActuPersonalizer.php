<?php

namespace App\Service\Astro;

use App\Service\PlanetaryCalculator;

/**
 * Deterministic personalisation overlay for a collective {@see SkyEvent}.
 *
 * ZERO LLM. Given a user's natal chart, it maps each event onto:
 *   - the natal house it falls in (+ a life-domain phrase),
 *   - whether it hits a natal planet within a tight orb,
 *   - a relevance score used to sort/filter the feed,
 *   - a ready-to-display French hook, assembled from templates.
 *
 * The collective prose (stored on AstroEvent) is written once by the LLM; this
 * layer only adds the deterministic "for you" hooks on top, per the feature spec.
 */
class ActuPersonalizer
{
    /** Tight orb (deg) for "this hits your natal X". */
    private const HIT_ORB = 3.0;

    /** Natal points we test for hits (planets + the two angles). */
    private const NATAL_ANGLES = ['Ascendant', 'Midheaven'];

    private const ROMAN = [
        1 => 'I', 2 => 'II', 3 => 'III', 4 => 'IV', 5 => 'V', 6 => 'VI',
        7 => 'VII', 8 => 'VIII', 9 => 'IX', 10 => 'X', 11 => 'XI', 12 => 'XII',
    ];

    /** House => short life-domain phrase (mirrors the design's perso hooks). */
    private const HOUSE_DOMAIN = [
        1  => 'ton identité, ton image, ta façon d\'avancer',
        2  => 'tes ressources, ton argent, ce que tu possèdes',
        3  => 'tes échanges, ta pensée, ta façon de communiquer',
        4  => 'ton foyer, tes racines, ta vie intime',
        5  => 'ta créativité, tes plaisirs, ce que tu mets au monde par joie',
        6  => 'ton quotidien, ton travail, ton équilibre de vie',
        7  => 'tes relations, tes partenariats, le couple',
        8  => 'l\'intime, ce que tu partages en profondeur, les transformations',
        9  => 'ton horizon, le sens, les voyages et les études',
        10 => 'ta carrière, ta place dans le monde, ta vocation',
        11 => 'tes amitiés, tes projets collectifs, tes aspirations',
        12 => 'ton intériorité, ce qui se joue en coulisses, le repos',
    ];

    private const ANGULAR    = [1, 4, 7, 10];
    private const SUCCEDENT  = [2, 5, 8, 11];

    /** Base relevance weight per event type. */
    private const TYPE_WEIGHT = [
        SkyEvent::TYPE_SOLAR_ECLIPSE    => 1.0,
        SkyEvent::TYPE_LUNAR_ECLIPSE    => 1.0,
        SkyEvent::TYPE_FULL_MOON        => 0.6,
        SkyEvent::TYPE_NEW_MOON         => 0.6,
        SkyEvent::TYPE_RETROGRADE_START => 0.55,
        SkyEvent::TYPE_RETROGRADE_END   => 0.45,
        SkyEvent::TYPE_ASPECT           => 0.5,
        SkyEvent::TYPE_INGRESSION       => 0.4,
    ];

    /**
     * Build the per-user overlay for an event.
     *
     * @return array{
     *   house:int, houseRoman:string, domain:string,
     *   natalHit: array{planet:string, planetFr:string, signFr:string, orb:float}|null,
     *   relevance:float, isHighlight:bool, hook:string
     * }
     */
    public function personalize(SkyEvent $event, PlanetaryCalculator $natal): array
    {
        $natalPoints = $this->collectNatalPoints($natal);

        // Candidate longitudes: primary body, plus the second body for aspects.
        $candidates = [];
        if ($event->longitude !== null) {
            $candidates[] = ['planet' => $event->planet, 'lon' => $event->longitude];
        }
        if ($event->longitude2 !== null) {
            $candidates[] = ['planet' => $event->planet2, 'lon' => $event->longitude2];
        }

        // Pick the candidate with the strongest natal hit (fallback: the primary).
        $best = null;
        foreach ($candidates as $c) {
            $hit   = $this->bestHit($c['lon'], $natalPoints);
            $house = $natal->houseOfLongitude($c['lon']);
            $entry = ['lon' => $c['lon'], 'house' => $house, 'hit' => $hit];
            if ($best === null
                || ($hit !== null && ($best['hit'] === null || $hit['orb'] < $best['hit']['orb']))) {
                $best = $entry;
            }
        }

        if ($best === null) {
            // Event with no longitude (should not happen) — neutral overlay.
            return [
                'house' => 0, 'houseRoman' => '', 'domain' => '',
                'natalHit' => null, 'relevance' => self::TYPE_WEIGHT[$event->type] ?? 0.3,
                'isHighlight' => false, 'hook' => '',
            ];
        }

        $house = $best['house'];
        $hit   = $best['hit'];

        return [
            'house'       => $house,
            'houseRoman'  => self::ROMAN[$house] ?? (string) $house,
            'domain'      => self::HOUSE_DOMAIN[$house] ?? '',
            'natalHit'    => $hit,
            'relevance'   => $this->score($event, $house, $hit),
            'isHighlight' => $hit !== null,
            'hook'        => $this->buildHook($event, $house, $hit),
        ];
    }

    /** Convenience: overlay every event for one chart, sorted by relevance desc. */
    public function personalizeAll(array $events, PlanetaryCalculator $natal): array
    {
        $out = [];
        foreach ($events as $event) {
            $out[] = ['event' => $event, 'overlay' => $this->personalize($event, $natal)];
        }
        usort($out, fn ($a, $b) => $b['overlay']['relevance'] <=> $a['overlay']['relevance']);
        return $out;
    }

    // ── internals ─────────────────────────────────────────────────────────────

    /** @return array<string,array{lon:float,signFr:string}> */
    private function collectNatalPoints(PlanetaryCalculator $natal): array
    {
        $points = [];
        foreach ($natal->getAllPlanets() as $name => $data) {
            $points[$name] = ['lon' => $data['longitude'], 'signFr' => $data['sign_fr']];
        }
        $asc = $natal->getAscendant();
        $mc  = $natal->getMidheaven();
        $points['Ascendant'] = ['lon' => $asc['longitude'], 'signFr' => $asc['sign_fr']];
        $points['Midheaven'] = ['lon' => $mc['longitude'], 'signFr' => $mc['sign_fr']];
        return $points;
    }

    /**
     * Strongest natal contact for a longitude, within HIT_ORB.
     *
     * @param array<string,array{lon:float,signFr:string}> $natalPoints
     * @return array{planet:string, planetFr:string, signFr:string, orb:float}|null
     */
    private function bestHit(float $lon, array $natalPoints): ?array
    {
        $best = null;
        foreach ($natalPoints as $name => $data) {
            $orb = PlanetaryCalculator::separation($lon, $data['lon']);
            if ($orb <= self::HIT_ORB && ($best === null || $orb < $best['orb'])) {
                $best = [
                    'planet'   => $name,
                    'planetFr' => $this->planetFr($name),
                    'signFr'   => $data['signFr'],
                    'orb'      => round($orb, 2),
                ];
            }
        }
        return $best;
    }

    private function score(SkyEvent $event, int $house, ?array $hit): float
    {
        $s = self::TYPE_WEIGHT[$event->type] ?? 0.3;
        if ($hit !== null) {
            $s += (1.0 - $hit['orb'] / self::HIT_ORB) * 0.6;
        }
        if (in_array($house, self::ANGULAR, true)) {
            $s += 0.25;
        } elseif (in_array($house, self::SUCCEDENT, true)) {
            $s += 0.1;
        }
        return round($s, 3);
    }

    private function buildHook(SkyEvent $event, int $house, ?array $hit): string
    {
        $roman  = self::ROMAN[$house] ?? (string) $house;
        $domain = self::HOUSE_DOMAIN[$house] ?? '';
        $planetFr = $event->planet ? $this->planetFr($event->planet) : '';

        $lead = match ($event->type) {
            SkyEvent::TYPE_FULL_MOON     => "Cette pleine lune éclaire ta maison {$roman}",
            SkyEvent::TYPE_LUNAR_ECLIPSE => "Cette éclipse de Lune bascule dans ta maison {$roman}",
            SkyEvent::TYPE_NEW_MOON      => "Cette nouvelle lune s'ouvre dans ta maison {$roman}",
            SkyEvent::TYPE_SOLAR_ECLIPSE => "Cette éclipse de Soleil rebat les cartes de ta maison {$roman}",
            SkyEvent::TYPE_INGRESSION    => "{$planetFr} entre dans ta maison {$roman}",
            SkyEvent::TYPE_RETROGRADE_START => "{$planetFr} ralentit dans ta maison {$roman}",
            SkyEvent::TYPE_RETROGRADE_END   => "{$planetFr} repart de l'avant dans ta maison {$roman}",
            SkyEvent::TYPE_ASPECT        => "Ça résonne dans ta maison {$roman}",
            default                      => "Ça touche ta maison {$roman}",
        };

        $hook = $domain !== '' ? "{$lead} — {$domain}." : "{$lead}.";

        if ($hit !== null) {
            $hook .= " Et ça vient toucher ton {$hit['planetFr']} natal en {$hit['signFr']}.";
        }

        return $hook;
    }

    private function planetFr(string $name): string
    {
        return PlanetaryCalculator::PLANETS_FR[$name] ?? $name;
    }
}
