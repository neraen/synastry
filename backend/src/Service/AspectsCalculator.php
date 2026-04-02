<?php

namespace App\Service;

/**
 * Detects astrological aspects between two sets of planetary positions.
 */
class AspectsCalculator
{
    private const ASPECTS = [
        'conjunction' => ['target' => 0,   'orb' => 6, 'symbol' => '☌'],
        'opposition'  => ['target' => 180,  'orb' => 6, 'symbol' => '☍'],
        'trine'       => ['target' => 120,  'orb' => 6, 'symbol' => '△'],
        'square'      => ['target' => 90,   'orb' => 4, 'symbol' => '□'],
        'sextile'     => ['target' => 60,   'orb' => 4, 'symbol' => '⚹'],
    ];

    /**
     * Detect aspects between natal and transit positions.
     *
     * @param array $natalPositions   From PlanetaryCalculator::getPlanetaryPositionsForApi()
     * @param array $transitPositions From PlanetaryCalculator::getPlanetaryPositionsForApi()
     * @return array Aspects sorted by intensity desc (most exact first)
     */
    public function detectAspects(array $natalPositions, array $transitPositions): array
    {
        $aspects = [];

        foreach ($transitPositions as $transitPlanet => $transitData) {
            $transitLon = isset($transitData['Position']) ? (float)$transitData['Position'] : -1.0;
            if ($transitLon < 0) {
                continue;
            }

            foreach ($natalPositions as $natalPlanet => $natalData) {
                $natalLon = isset($natalData['Position']) ? (float)$natalData['Position'] : -1.0;
                if ($natalLon < 0) {
                    continue;
                }

                $aspect = $this->checkAspect($transitLon, $natalLon, $transitPlanet, $natalPlanet);
                if ($aspect !== null) {
                    $aspects[] = $aspect;
                }
            }
        }

        // Sort by intensity desc — most exact aspects first
        usort($aspects, fn($a, $b) => $b['intensity'] <=> $a['intensity']);

        return $aspects;
    }

    /**
     * Check if two longitudes form an aspect. Returns null if no aspect within orb.
     */
    private function checkAspect(
        float $lonA,
        float $lonB,
        string $transitPlanet,
        string $natalPlanet
    ): ?array {
        // Normalize difference into [0, 360)
        $diff = fmod(abs($lonA - $lonB), 360.0);
        // Reduce to [0, 180] — aspects are symmetric
        if ($diff > 180.0) {
            $diff = 360.0 - $diff;
        }

        foreach (self::ASPECTS as $type => $config) {
            $orbDiff = abs($diff - (float)$config['target']);
            if ($orbDiff <= (float)$config['orb']) {
                $intensity = round(1.0 - ($orbDiff / $config['orb']), 4);

                return [
                    'transit_planet' => $transitPlanet,
                    'natal_planet'   => $natalPlanet,
                    'aspect_type'    => $type,
                    'orb_exact'      => round($orbDiff, 4),
                    'intensity'      => $intensity,
                    'symbol'         => $config['symbol'],
                ];
            }
        }

        return null;
    }
}