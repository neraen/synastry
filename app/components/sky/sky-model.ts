/**
 * Ton Ciel — astronomie de position + modèle du ciel de naissance.
 *
 * Repère local utilisé partout (vecteurs unitaires) : x = Est, y = Nord, z = Zénith.
 * La caméra regarde vers (azimut, hauteur) ; la projection est stéréographique,
 * comme dans un planétarium (elle conserve la forme des constellations).
 */

import type { TFunction } from 'i18next';

import i18n from '@/i18n';
import { colors } from '@/theme';
import { PLANETS, SIGNS } from '@/components/natal-wheel/astro-content';
import { FIELD_STARS, NAMED_STARS, type CatalogStar } from './star-catalog';

const DEG = Math.PI / 180;
const OBLIQUITY = 23.4393 * DEG;
/** Jusqu'à cette magnitude, une étoile reçoit un halo et scintille. */
const GLOW_MAG = 3.2;

export type Vec3 = [number, number, number];

export const PLANET_KEYS = [
    'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
    'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
] as const;
export type PlanetKey = (typeof PLANET_KEYS)[number];

export type SkyBirth = {
    /** Instant de naissance en UTC */
    utc: Date;
    latitude: number;
    longitude: number;
    /** Longitudes écliptiques (degrés) ; latitude écliptique facultative */
    planets: Record<PlanetKey, { lon: number; lat?: number }>;
};

export type SkyPlanet = {
    index: number;
    key: PlanetKey;
    name: string;
    glyph: string;
    color: string;
    vec: Vec3;
    eclLon: number;
    eclLat: number;
    altitude: number;
    azimuth: number;
    signName: string;
    guardian: SkyStar;
};

export type SkyStar = {
    name: string;
    vec: Vec3;
    mag: number;
    tint: number;
    eclLon: number;
    eclLat: number;
};

/** Sommet de la constellation : une planète ou son étoile gardienne. */
export type ConstellationNode = {
    kind: 'planet' | 'star';
    vec: Vec3;
    eclLon: number;
    eclLat: number;
    color: string;
};

export type SkyModel = {
    planets: SkyPlanet[];
    brightStars: SkyStar[];
    /** Étoiles faibles à plat pour le worklet : x, y, z, rayon, teinte, alpha */
    faintFlat: number[];
    /** Étoiles brillantes à plat : x, y, z, rayon, teinte, phase de scintillement */
    brightFlat: number[];
    /** Planètes à plat : x, y, z */
    planetFlat: number[];
    constellation: ConstellationNode[];
    /** Sommets de la constellation à plat (ligne ouverte) : x, y, z */
    constellationFlat: number[];
    /** Temps sidéral local (degrés) et latitude du lieu : le repère de cette voûte */
    lst: number;
    latitude: number;
};

// ─── Temps ─────────────────────────────────────────────────────────────────────

export function julianDay(utc: Date): number {
    return utc.getTime() / 86400000 + 2440587.5;
}

export function dateFromJulianDay(jd: number): Date {
    return new Date((jd - 2440587.5) * 86400000);
}

/** Temps sidéral local en degrés (même formule que PlanetaryCalculator.php). */
export function localSiderealTime(utc: Date, longitude: number): number {
    const jd = julianDay(utc);
    const t = (jd - 2451545.0) / 36525.0;
    const theta = 280.46061837 + 360.98564736629 * (jd - 2451545.0)
        + 0.000387933 * t * t - (t * t * t) / 38710000.0;
    return (((theta + longitude) % 360) + 360) % 360;
}

// ─── Changements de coordonnées ────────────────────────────────────────────────

/** Écliptique (degrés) → équatorial (radians). */
function eclipticToEquatorial(lon: number, lat: number): { ra: number; dec: number } {
    const l = lon * DEG;
    const b = lat * DEG;
    const dec = Math.asin(Math.sin(b) * Math.cos(OBLIQUITY) + Math.cos(b) * Math.sin(OBLIQUITY) * Math.sin(l));
    const ra = Math.atan2(Math.sin(l) * Math.cos(OBLIQUITY) - Math.tan(b) * Math.sin(OBLIQUITY), Math.cos(l));
    return { ra, dec };
}

/** Équatorial (radians) → écliptique (degrés). */
function equatorialToEcliptic(ra: number, dec: number): { lon: number; lat: number } {
    const lat = Math.asin(Math.sin(dec) * Math.cos(OBLIQUITY) - Math.cos(dec) * Math.sin(OBLIQUITY) * Math.sin(ra));
    const lon = Math.atan2(Math.sin(ra) * Math.cos(OBLIQUITY) + Math.tan(dec) * Math.sin(OBLIQUITY), Math.cos(ra));
    return { lon: ((lon / DEG) + 360) % 360, lat: lat / DEG };
}

/** Équatorial (radians) → vecteur local Est/Nord/Zénith. */
function equatorialToLocal(ra: number, dec: number, lstDeg: number, latitudeDeg: number): Vec3 {
    const h = lstDeg * DEG - ra;
    const phi = latitudeDeg * DEG;
    return [
        -Math.cos(dec) * Math.sin(h),
        Math.cos(phi) * Math.sin(dec) - Math.sin(phi) * Math.cos(dec) * Math.cos(h),
        Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(h),
    ];
}

export function altitudeOf(v: Vec3): number {
    return Math.asin(Math.max(-1, Math.min(1, v[2]))) / DEG;
}

/** Azimut en degrés, 0 = Nord, 90 = Est. */
export function azimuthOf(v: Vec3): number {
    return ((Math.atan2(v[0], v[1]) / DEG) + 360) % 360;
}

function dot(a: Vec3, b: Vec3): number {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

// ─── Projection (utilisable sur le thread UI et côté JS) ───────────────────────

/** Échelle en pixels pour un champ horizontal `fov` (degrés) sur une largeur `width`. */
export function scaleFor(fov: number, width: number): number {
    'worklet';
    return width / 2 / Math.tan((fov * Math.PI) / 720);
}

/**
 * Projette un vecteur local à l'écran. `depth` > -0.5 : devant ou sur les côtés
 * de la caméra ; en dessous, le point est derrière et ne doit pas être dessiné.
 */
export function projectVec(
    x: number, y: number, z: number,
    az: number, alt: number, scale: number, cx: number, cy: number,
): { x: number; y: number; depth: number } {
    'worklet';
    const a = (alt * Math.PI) / 180;
    const zr = (az * Math.PI) / 180;
    const ca = Math.cos(a), sa = Math.sin(a), cz = Math.cos(zr), sz = Math.sin(zr);
    const depth = x * ca * sz + y * ca * cz + z * sa;
    const px = x * cz - y * sz;
    const py = -x * sa * sz - y * sa * cz + z * ca;
    const k = scale / (1 + Math.max(depth, -0.9));
    return { x: cx + px * k, y: cy - py * k, depth };
}

// ─── Aspect des étoiles ────────────────────────────────────────────────────────

function starRadius(mag: number): number {
    return Math.max(0.55, 2.7 - 0.42 * mag);
}

function starAlpha(mag: number): number {
    return Math.max(0.22, Math.min(1, 1.05 - 0.15 * mag));
}

/** Le catalogue porte les noms français ; ailleurs, la forme internationale est la même sans accents. */
function starName(name: string, language: string): string {
    return language.startsWith('fr') ? name : name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function toSkyStar(s: CatalogStar, lst: number, latitude: number, language: string): SkyStar {
    const ra = s.ra * DEG;
    const dec = s.dec * DEG;
    const ecl = equatorialToEcliptic(ra, dec);
    return {
        name: starName(s.name, language),
        vec: equatorialToLocal(ra, dec, lst, latitude),
        mag: s.mag,
        tint: s.tint,
        eclLon: ecl.lon,
        eclLat: ecl.lat,
    };
}

// ─── Modèle ────────────────────────────────────────────────────────────────────

/** `language` : langue des noms d'astres, de signes et d'étoiles (par défaut celle de l'app). */
export function buildSkyModel(birth: SkyBirth, language: string = i18n.language): SkyModel {
    const lst = localSiderealTime(birth.utc, birth.longitude);

    const brightStars = NAMED_STARS.map((s) => toSkyStar(s, lst, birth.latitude, language));
    const field = FIELD_STARS.map((s) => toSkyStar(s, lst, birth.latitude, language));
    // Calque animé (halo + scintillement) : étoiles nommées et anonymes les plus vives.
    const glowing = [...brightStars, ...field.filter((s) => s.mag <= GLOW_MAG)];
    const faint = field.filter((s) => s.mag > GLOW_MAG);

    const faintFlat: number[] = [];
    for (const s of faint) {
        faintFlat.push(s.vec[0], s.vec[1], s.vec[2], starRadius(s.mag), s.tint, starAlpha(s.mag));
    }
    const brightFlat: number[] = [];
    glowing.forEach((s, i) => {
        brightFlat.push(s.vec[0], s.vec[1], s.vec[2], starRadius(s.mag), s.tint, (i * 2.399) % (Math.PI * 2));
    });

    const placed = placePlanets(birth.planets, lst, birth.latitude, brightStars, i18n.getFixedT(language));

    return { ...placed, brightStars, faintFlat, brightFlat, lst, latitude: birth.latitude };
}

function signName(lon: number, t: TFunction): string {
    const sign = SIGNS[Math.floor((((lon % 360) + 360) % 360) / 30)];
    return t(`signs.${sign.id[0].toUpperCase()}${sign.id.slice(1)}`, { defaultValue: sign.name });
}

type PlacedPlanets = Pick<SkyModel, 'planets' | 'planetFlat' | 'constellation' | 'constellationFlat'>;

/**
 * Place dix astres sur la voûte d'un lieu et d'un instant donnés (temps sidéral
 * `lst`, latitude) et trace la constellation qui les relie à leurs étoiles gardiennes.
 */
function placePlanets(
    positions: Record<PlanetKey, { lon: number; lat?: number }>,
    lst: number,
    latitude: number,
    brightStars: SkyStar[],
    t: TFunction = i18n.t,
): PlacedPlanets {
    // Planètes, triées le long de l'écliptique pour tracer la constellation.
    // La chaîne commence après le plus grand vide, pour ne jamais le traverser.
    const byLon = [...PLANET_KEYS].sort((a, b) => positions[a].lon - positions[b].lon);
    let start = 0;
    let widest = -1;
    byLon.forEach((key, i) => {
        const prev = byLon[(i + byLon.length - 1) % byLon.length];
        const gap = (positions[key].lon - positions[prev].lon + 360) % 360;
        if (gap > widest) { widest = gap; start = i; }
    });
    const sorted = [...byLon.slice(start), ...byLon.slice(0, start)];
    const taken = new Set<string>();
    const byKey = new Map<PlanetKey, SkyPlanet>();

    for (const key of sorted) {
        const { lon, lat = 0 } = positions[key];
        const eq = eclipticToEquatorial(lon, lat);
        const vec = equatorialToLocal(eq.ra, eq.dec, lst, latitude);

        // Étoile gardienne : l'étoile brillante libre la plus proche, hors de la
        // bande écliptique immédiate pour que la figure prenne du relief.
        let guardian = brightStars[0];
        let best = -2;
        for (const s of brightStars) {
            if (taken.has(s.name) || Math.abs(s.eclLat) < 4) continue;
            const d = dot(vec, s.vec);
            if (d > best) { best = d; guardian = s; }
        }
        taken.add(guardian.name);

        const def = PLANETS.find((p) => p.key === key);
        byKey.set(key, {
            index: PLANET_KEYS.indexOf(key),
            key,
            name: t(`planets.${key}`, { defaultValue: def?.name ?? key }),
            glyph: def?.glyph ?? '•',
            color: colors.sky.planets[key],
            vec,
            eclLon: lon,
            eclLat: lat,
            altitude: altitudeOf(vec),
            azimuth: azimuthOf(vec),
            signName: signName(lon, t),
            guardian,
        });
    }

    const planets = PLANET_KEYS.map((k) => byKey.get(k) as SkyPlanet);
    const planetFlat: number[] = [];
    planets.forEach((p) => planetFlat.push(p.vec[0], p.vec[1], p.vec[2]));

    const constellation: ConstellationNode[] = [];
    for (const key of sorted) {
        const p = byKey.get(key) as SkyPlanet;
        constellation.push({ kind: 'planet', vec: p.vec, eclLon: p.eclLon, eclLat: p.eclLat, color: p.color });
        constellation.push({
            kind: 'star', vec: p.guardian.vec, eclLon: p.guardian.eclLon, eclLat: p.guardian.eclLat,
            color: colors.sky.starWhite,
        });
    }
    const constellationFlat: number[] = [];
    constellation.forEach((n) => constellationFlat.push(n.vec[0], n.vec[1], n.vec[2]));

    return { planets, planetFlat, constellation, constellationFlat };
}

// ─── Ciel à deux ───────────────────────────────────────────────────────────────

/** Rencontre : un de mes astres et un des siens côte à côte dans le ciel. */
const SLOW: PlanetKey[] = ['Uranus', 'Neptune', 'Pluto'];

export type Meeting = {
    mine: SkyPlanet;
    theirs: SkyPlanet;
    /** Écart en degrés */
    separation: number;
    azimuth: number;
    altitude: number;
};

/** Les astres d'une autre personne, replacés sur MA voûte de naissance. */
export type Companion = PlacedPlanets & {
    name: string;
    meetings: Meeting[];
};

/** En dessous de cet écart, deux astres « se rencontrent ». */
const MEETING_ORB = 8;
const MAX_MEETINGS = 6;

export function buildCompanion(
    model: SkyModel,
    name: string,
    positions: Record<PlanetKey, { lon: number; lat?: number }>,
): Companion {
    const placed = placePlanets(positions, model.lst, model.latitude, model.brightStars);

    const meetings: Meeting[] = [];
    for (const mine of model.planets) {
        for (const theirs of placed.planets) {
            const separation = Math.acos(Math.max(-1, Math.min(1, dot(mine.vec, theirs.vec)))) / DEG;
            // Deux planètes lentes se frôlent chez tous les gens du même âge : sans intérêt.
            if (SLOW.includes(mine.key) && SLOW.includes(theirs.key)) continue;
            if (separation > MEETING_ORB) continue;
            const mid: Vec3 = [
                mine.vec[0] + theirs.vec[0], mine.vec[1] + theirs.vec[1], mine.vec[2] + theirs.vec[2],
            ];
            const n = Math.hypot(mid[0], mid[1], mid[2]) || 1;
            const unit: Vec3 = [mid[0] / n, mid[1] / n, mid[2] / n];
            meetings.push({ mine, theirs, separation, azimuth: azimuthOf(unit), altitude: altitudeOf(unit) });
        }
    }
    meetings.sort((a, b) => a.separation - b.separation);

    return { ...placed, name, meetings: meetings.slice(0, MAX_MEETINGS) };
}

/** Astres féminins en français (« ta Lune », « sa Vénus »). */
const FEMININE: PlanetKey[] = ['Moon', 'Venus'];

/** « Ta Vénus et son Mars » */
export function meetingLabel(m: Meeting): string {
    return i18n.t('sky.meeting', {
        your: i18n.t(FEMININE.includes(m.mine.key) ? 'sky.yourF' : 'sky.yourM'),
        mine: m.mine.name,
        their: i18n.t(FEMININE.includes(m.theirs.key) ? 'sky.theirF' : 'sky.theirM'),
        theirs: m.theirs.name,
    });
}

// ─── Phrases ───────────────────────────────────────────────────────────────────

export function directionLabel(azimuth: number): string {
    const directions = i18n.t('sky.directions', { returnObjects: true }) as string[];
    return directions[Math.round(azimuth / 45) % 8];
}

/** Où se trouvait l'astre dans le ciel à la naissance, en une phrase. */
export function whereSentence(p: SkyPlanet): string {
    const dir = directionLabel(p.azimuth);
    const alt = Math.round(Math.abs(p.altitude));
    if (p.altitude >= 60) return i18n.t('sky.whereOverhead', { alt });
    if (p.altitude >= 8) return i18n.t('sky.whereSky', { dir, alt });
    if (p.altitude >= 0) return i18n.t('sky.whereHorizon', { dir });
    if (p.altitude >= -8) return i18n.t('sky.whereJustBelow', { dir });
    return i18n.t('sky.whereBelow', { dir, alt });
}
