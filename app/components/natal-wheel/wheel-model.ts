/**
 * Carte du ciel — géométrie SVG + construction du modèle depuis l'API natal-chart.
 * La roue est orientée comme les cartes classiques : ASC à gauche (9h),
 * longitudes zodiacales croissantes dans le sens anti-horaire.
 */

import type { PlanetPosition } from '@/services/astrology';
import {
    SIGNS, PLANETS, ASPECTS_DEF, ASPECT_PLANET_KEYS, HOUSE_MEANINGS, ROMAN,
    type SignDef, type PlanetDef, type AspectDef,
} from './astro-content';

// ─── Géométrie (unités viewBox 1000×1000, centre 500,500) ─────────────────────

export const CHART = {
    cx: 500, cy: 500,
    rOuter:       480,
    rSignInner:   408,
    rTickOut:     408,
    rTickIn:      396,
    rHouseOuter:  396,
    rHouseInner:  290,
    rHouseNum:    312,
    rPlanet:      358,
    rPlanetTick:  392,
    rPlanetAnch:  300,
    rAspect:      290,
} as const;

export function normDeg(deg: number): number {
    return ((deg % 360) + 360) % 360;
}

/** Longitude zodiacale → angle écran (radians). ASC plein ouest, zodiaque anti-horaire. */
export function lonToRad(lon: number, ascLon: number): number {
    return ((180 + ascLon - lon) * Math.PI) / 180;
}

export function polar(r: number, lon: number, ascLon: number): { x: number; y: number } {
    const a = lonToRad(lon, ascLon);
    return { x: CHART.cx + r * Math.cos(a), y: CHART.cy + r * Math.sin(a) };
}

/** Secteur annulaire de lon1 → lon2 (balayage < 180°). */
export function sectorPath(r1: number, r2: number, lon1: number, lon2: number, ascLon: number): string {
    const p1 = polar(r2, lon1, ascLon);
    const p2 = polar(r2, lon2, ascLon);
    const p3 = polar(r1, lon2, ascLon);
    const p4 = polar(r1, lon1, ascLon);
    return `M ${p1.x} ${p1.y}
            A ${r2} ${r2} 0 0 0 ${p2.x} ${p2.y}
            L ${p3.x} ${p3.y}
            A ${r1} ${r1} 0 0 1 ${p4.x} ${p4.y} Z`;
}

// ─── Types du modèle ───────────────────────────────────────────────────────────

export type WheelPlanet = PlanetDef & {
    lon: number;
    /** Longitude d'affichage après anti-collision des glyphes */
    displayLon: number;
    sign: SignDef;
    houseNum: number;
};

export type WheelHouse = {
    num: number;
    roman: string;
    cusp: number;
    desc: string;
};

export type WheelAspect = {
    a: string; b: string;               // clés API
    aName: string; bName: string;
    aGlyph: string; bGlyph: string;
    def: AspectDef;
    orbActual: string;
};

export type WheelModel = {
    ascLon: number;
    mcLon: number;
    planets: WheelPlanet[];
    houses: WheelHouse[];
    aspects: WheelAspect[];
};

export type Selection =
    | { kind: 'chart' }
    | { kind: 'sign'; id: string }
    | { kind: 'house'; id: number }
    | { kind: 'planet'; id: string }
    | { kind: 'aspect'; id: string; aspect: WheelAspect }
    | { kind: 'aspectType'; id: string };

// ─── Helpers astro ─────────────────────────────────────────────────────────────

export function lonToSign(lon: number): { sign: SignDef; degInSign: number } {
    const L = normDeg(lon);
    const i = Math.floor(L / 30) % 12;
    return { sign: SIGNS[i], degInSign: L - i * 30 };
}

/** `18°01' Verseau` */
export function formatPos(lon: number): string {
    const { sign, degInSign } = lonToSign(lon);
    const d = Math.floor(degInSign);
    const m = Math.round((degInSign - d) * 60);
    return `${d}°${String(m).padStart(2, '0')}' ${sign.name}`;
}

/** Numéro de maison (1-12) d'une longitude, selon les cuspides. */
export function houseOf(lon: number, cusps: number[]): number {
    const L = normDeg(lon);
    for (let i = 0; i < 12; i++) {
        const a = cusps[i];
        const b = cusps[(i + 1) % 12];
        const inSector = a < b ? (L >= a && L < b) : (L >= a || L < b);
        if (inSector) return i + 1;
    }
    return 1;
}

/** Anti-collision angulaire des glyphes planétaires (décalage glouton). */
function spreadPlanets(entries: { key: string; lon: number }[], minSep = 8): Map<string, number> {
    const sorted = [...entries].sort((a, b) => a.lon - b.lon);
    const adjusted = new Map<string, number>();
    sorted.forEach((e, k) => {
        if (k === 0) {
            adjusted.set(e.key, e.lon);
            return;
        }
        const prevLon = adjusted.get(sorted[k - 1].key)!;
        const gap = e.lon - prevLon;
        adjusted.set(e.key, gap < minSep ? prevLon + minSep : e.lon);
    });
    return adjusted;
}

/** Aspects entre planètes classiques (1 aspect max par paire, Lilith/NN exclus). */
function computeAspects(planets: WheelPlanet[]): WheelAspect[] {
    const classical = planets.filter((p) => ASPECT_PLANET_KEYS.includes(p.key));
    const out: WheelAspect[] = [];
    for (let i = 0; i < classical.length; i++) {
        for (let j = i + 1; j < classical.length; j++) {
            const a = classical[i], b = classical[j];
            let diff = Math.abs(a.lon - b.lon) % 360;
            if (diff > 180) diff = 360 - diff;
            for (const def of ASPECTS_DEF) {
                const delta = Math.abs(diff - def.angle);
                if (delta <= def.orb) {
                    out.push({
                        a: a.key, b: b.key,
                        aName: a.name, bName: b.name,
                        aGlyph: a.glyph, bGlyph: b.glyph,
                        def,
                        orbActual: delta.toFixed(1),
                    });
                    break;
                }
            }
        }
    }
    return out;
}

// ─── Hit-testing ───────────────────────────────────────────────────────────────
// Le onPress des éléments react-native-svg n'est pas délivré de façon fiable
// sous la nouvelle architecture (Fabric). La roue est donc purement visuelle et
// les taps sont résolus géométriquement depuis un Pressable posé par-dessus.

/** Distance d'un point à un segment [a→b]. */
function distToSegment(
    px: number, py: number,
    ax: number, ay: number,
    bx: number, by: number,
): number {
    const dx = bx - ax, dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/**
 * Résout un tap (coordonnées locales de la vue carrée de la roue, en px)
 * vers l'élément touché. Priorité : glyphe planète > anneau signes >
 * anneau maisons > ligne d'aspect.
 */
export function hitTest(
    x: number,
    y: number,
    size: number,
    model: WheelModel,
): Selection | null {
    // Coordonnées viewBox (1000×1000)
    const scale = 1000 / size;
    const vx = x * scale;
    const vy = y * scale;

    const dx = vx - CHART.cx;
    const dy = vy - CHART.cy;
    const r = Math.hypot(dx, dy);

    // Angle écran → longitude zodiacale (inverse de lonToRad)
    const screenDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
    const lon = normDeg(180 + model.ascLon - screenDeg);

    // 1. Glyphes planètes (cercles r=25 en viewBox, tolérance élargie)
    let bestPlanet: WheelPlanet | null = null;
    let bestDist = 42;
    for (const p of model.planets) {
        const c = polar(CHART.rPlanet, p.displayLon, model.ascLon);
        const d = Math.hypot(vx - c.x, vy - c.y);
        if (d < bestDist) {
            bestDist = d;
            bestPlanet = p;
        }
    }
    if (bestPlanet) return { kind: 'planet', id: bestPlanet.key };

    // 2. Anneau des signes
    if (r >= CHART.rSignInner && r <= CHART.rOuter + 12) {
        return { kind: 'sign', id: SIGNS[Math.floor(lon / 30) % 12].id };
    }

    // 3. Anneau des maisons
    if (r >= CHART.rHouseInner && r < CHART.rSignInner) {
        return { kind: 'house', id: houseOf(lon, model.houses.map((h) => h.cusp)) };
    }

    // 4. Lignes d'aspect (au centre)
    if (r < CHART.rHouseInner) {
        let bestAspect: WheelAspect | null = null;
        let bestLineDist = 18;
        for (const a of model.aspects) {
            const pa = model.planets.find((p) => p.key === a.a)!;
            const pb = model.planets.find((p) => p.key === a.b)!;
            const p1 = polar(CHART.rPlanetAnch, pa.displayLon, model.ascLon);
            const p2 = polar(CHART.rPlanetAnch, pb.displayLon, model.ascLon);
            const d = distToSegment(vx, vy, p1.x, p1.y, p2.x, p2.y);
            if (d < bestLineDist) {
                bestLineDist = d;
                bestAspect = a;
            }
        }
        if (bestAspect) {
            return { kind: 'aspect', id: `${bestAspect.a}-${bestAspect.b}`, aspect: bestAspect };
        }
    }

    return null;
}

// ─── Construction du modèle ────────────────────────────────────────────────────

/**
 * Construit le modèle de la roue depuis la réponse API.
 * `houseCusps` : cuspides Placidus (index 0 = maison 1) ; fallback maisons
 * égales depuis l'ASC si absent (anciens caches).
 */
export function buildWheelModel(
    positions: Record<string, PlanetPosition>,
    houseCusps?: number[] | null,
): WheelModel {
    const ascLon = normDeg(positions.Ascendant?.Position ?? 0);
    const mcLon  = normDeg(positions.MC?.Position ?? ascLon + 270);

    const cusps = houseCusps && houseCusps.length === 12
        ? houseCusps.map(normDeg)
        : Array.from({ length: 12 }, (_, i) => normDeg(ascLon + i * 30));

    const houses: WheelHouse[] = cusps.map((cusp, i) => ({
        num: i + 1,
        roman: ROMAN[i],
        cusp,
        desc: HOUSE_MEANINGS[i],
    }));

    const present = PLANETS.filter((p) => positions[p.key]?.Position !== undefined);
    const displayLons = spreadPlanets(
        present.map((p) => ({ key: p.key, lon: normDeg(positions[p.key].Position) })),
    );

    const planets: WheelPlanet[] = present.map((p) => {
        const lon = normDeg(positions[p.key].Position);
        return {
            ...p,
            lon,
            displayLon: displayLons.get(p.key) ?? lon,
            sign: lonToSign(lon).sign,
            houseNum: houseOf(lon, cusps),
        };
    });

    return { ascLon, mcLon, planets, houses, aspects: computeAspects(planets) };
}
