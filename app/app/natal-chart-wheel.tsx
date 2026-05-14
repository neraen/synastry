/**
 * Thème Astral — Natal Chart Wheel
 * Interactive astrological birth chart, ported from the web prototype.
 */
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    StyleSheet,
    ActivityIndicator,
    useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Svg, {
    Circle,
    Line,
    Path,
    Text as SvgText,
    G,
    Defs,
    RadialGradient,
    Stop,
} from 'react-native-svg';
import { GlassCard } from '@/components/ui';
import { colors, spacing, radius, fonts } from '@/theme';
import { getNatalChart } from '@/services/astrology';
import { getBirthProfile } from '@/services/birthProfile';

// ─── Astrological data ────────────────────────────────────────────────────────

const SIGNS = [
    { id: 'aries',       name: 'Bélier',     glyph: '♈', element: 'Feu',   modality: 'Cardinal', ruler: 'Mars',    range: [0, 30]    as [number, number], desc: "Pionnier impulsif, le Bélier ouvre le zodiaque avec courage. Énergie d'initiative, besoin d'agir, parfois sans détour." },
    { id: 'taurus',      name: 'Taureau',    glyph: '♉', element: 'Terre', modality: 'Fixe',     ruler: 'Vénus',   range: [30, 60]   as [number, number], desc: "Sensuel, posé, attaché à la beauté et à la stabilité. Le Taureau construit lentement mais sûrement." },
    { id: 'gemini',      name: 'Gémeaux',    glyph: '♊', element: 'Air',   modality: 'Mutable',  ruler: 'Mercure', range: [60, 90]   as [number, number], desc: "Vif, curieux, communicant. Les Gémeaux relient les idées et les gens, en surface comme en profondeur." },
    { id: 'cancer',      name: 'Cancer',     glyph: '♋', element: 'Eau',   modality: 'Cardinal', ruler: 'Lune',    range: [90, 120]  as [number, number], desc: "Émotionnel, protecteur, attaché à ses racines. Le Cancer ressent avant de penser." },
    { id: 'leo',         name: 'Lion',       glyph: '♌', element: 'Feu',   modality: 'Fixe',     ruler: 'Soleil',  range: [120, 150] as [number, number], desc: "Rayonnant, généreux, créatif. Le Lion cherche à exprimer pleinement sa singularité." },
    { id: 'virgo',       name: 'Vierge',     glyph: '♍', element: 'Terre', modality: 'Mutable',  ruler: 'Mercure', range: [150, 180] as [number, number], desc: "Analytique, méthodique, au service. La Vierge affine, trie, perfectionne le réel." },
    { id: 'libra',       name: 'Balance',    glyph: '♎', element: 'Air',   modality: 'Cardinal', ruler: 'Vénus',   range: [180, 210] as [number, number], desc: "Diplomate, esthète, en quête d'harmonie. La Balance pèse, équilibre, relie à l'autre." },
    { id: 'scorpio',     name: 'Scorpion',   glyph: '♏', element: 'Eau',   modality: 'Fixe',     ruler: 'Pluton',  range: [210, 240] as [number, number], desc: "Intense, transformateur, magnétique. Le Scorpion descend dans les profondeurs pour renaître." },
    { id: 'sagittarius', name: 'Sagittaire', glyph: '♐', element: 'Feu',   modality: 'Mutable',  ruler: 'Jupiter', range: [240, 270] as [number, number], desc: "Aventurier, philosophe, optimiste. Le Sagittaire vise large, cherche du sens dans l'horizon." },
    { id: 'capricorn',   name: 'Capricorne', glyph: '♑', element: 'Terre', modality: 'Cardinal', ruler: 'Saturne', range: [270, 300] as [number, number], desc: "Structurant, ambitieux, patient. Le Capricorne construit dans la durée, avec discipline." },
    { id: 'aquarius',    name: 'Verseau',    glyph: '♒', element: 'Air',   modality: 'Fixe',     ruler: 'Uranus',  range: [300, 330] as [number, number], desc: "Visionnaire, indépendant, collectif. Le Verseau pense différemment et invente l'avenir." },
    { id: 'pisces',      name: 'Poissons',   glyph: '♓', element: 'Eau',   modality: 'Mutable',  ruler: 'Neptune', range: [330, 360] as [number, number], desc: "Sensible, mystique, fluide. Les Poissons dissolvent les frontières et accueillent l'invisible." },
];

const ELEMENT_COLOR: Record<string, string> = {
    'Feu':   '#E89B4C',
    'Terre': '#A3B86C',
    'Air':   '#7DB5E8',
    'Eau':   '#9B7BE8',
};

const ASPECTS_DEF = [
    { id: 'conjunction', name: 'Conjonction', short: 'Conj.',   angle: 0,   orb: 8, color: '#E5C266', glyph: '☌', desc: "Fusion d'énergies. Les planètes parlent d'une seule voix, pour le meilleur ou pour le pire." },
    { id: 'sextile',     name: 'Sextile',     short: 'Sextile', angle: 60,  orb: 4, color: '#5DA9F5', glyph: '⚹', desc: "Opportunité fluide. Une porte qui s'ouvre si tu fais le geste." },
    { id: 'square',      name: 'Carré',       short: 'Carré',   angle: 90,  orb: 6, color: '#E89B4C', glyph: '□', desc: "Tension structurante. Un défi qui pousse à la croissance par friction." },
    { id: 'trine',       name: 'Trigone',     short: 'Trigone', angle: 120, orb: 6, color: '#4ADE80', glyph: '△', desc: "Flot harmonieux. Un talent naturel, qui circule sans effort." },
    { id: 'opposition',  name: 'Opposition',  short: 'Oppos.',  angle: 180, orb: 8, color: '#E55A8C', glyph: '☍', desc: "Polarité face à face. Cherche l'équilibre entre deux pôles qui s'attirent et se repoussent." },
] as const;

const PLANET_INFO: Record<string, { name: string; glyph: string; desc: string }> = {
    Sun:     { name: 'Soleil',  glyph: '☉', desc: "Ton noyau, ta vitalité, ce qui t'anime profondément. Là où tu rayonnes." },
    Moon:    { name: 'Lune',    glyph: '☽', desc: "Ton monde intérieur, tes besoins émotionnels, ce qui t'apaise et te ressource." },
    Mercury: { name: 'Mercure', glyph: '☿', desc: "Ta manière de penser, d'apprendre, de communiquer. Le rythme de ton mental." },
    Venus:   { name: 'Vénus',   glyph: '♀', desc: "Ce que tu aimes, ce que tu attires, ton goût, ta relation à l'autre et au plaisir." },
    Mars:    { name: 'Mars',    glyph: '♂', desc: "Ton énergie d'action, ton désir, ta capacité à passer à l'acte et à affronter." },
    Jupiter: { name: 'Jupiter', glyph: '♃', desc: "Ton expansion, ta chance, là où tu vois grand et où tu trouves du sens." },
    Saturn:  { name: 'Saturne', glyph: '♄', desc: "Tes structures, tes leçons, ta discipline. Ce que tu construis dans la durée." },
    Uranus:  { name: 'Uranus',  glyph: '♅', desc: "Tes ruptures, ton originalité, ta liberté. Là où tu inventes et te libères." },
    Neptune: { name: 'Neptune', glyph: '♆', desc: "Tes rêves, ton imaginaire, ta sensibilité au subtil et au spirituel." },
    Pluto:   { name: 'Pluton',  glyph: '♇', desc: "Tes transformations profondes, ton pouvoir, ce qui meurt pour mieux renaître." },
};

const MAIN_PLANETS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];

const HOUSE_MEANINGS = [
    "Soi, identité, apparence. Comment tu te présentes au monde.",
    "Valeurs, ressources, matériel. Ce que tu possèdes et ce qui te nourrit.",
    "Mental, frères et sœurs, échanges proches. Ton environnement immédiat.",
    "Foyer, racines, famille. Ta base intime et émotionnelle.",
    "Créativité, plaisir, enfants. Ce que tu mets au monde par joie.",
    "Travail, santé, routine. Ton rapport au quotidien et au service.",
    "Couple, partenariats, autrui. Ce que tu vis à travers la relation.",
    "Transformation, intimité partagée, ressources de l'autre.",
    "Sens, voyages, études supérieures. Ta quête d'horizon.",
    "Vocation, carrière, statut social. Ce que tu vises haut.",
    "Amis, groupes, projets collectifs. Ton réseau et tes idéaux.",
    "Inconscient, retraite, spiritualité. Ce qui se prépare en coulisses.",
];

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlanetData {
    id: string;
    name: string;
    glyph: string;
    lon: number;
    retrograde: boolean;
    desc: string;
}

interface HouseData {
    num: number;
    id: string;
    roman: string;
    cusp: number;
    desc: string;
}

interface AspectData {
    planetA: string;
    planetB: string;
    nameA: string;
    nameB: string;
    glyphA: string;
    glyphB: string;
    type: string;
    typeName: string;
    color: string;
    orbActual: number;
    glyphAsp: string;
}

type Selection =
    | { kind: 'chart' }
    | { kind: 'planet'; id: string }
    | { kind: 'sign'; id: string }
    | { kind: 'house'; id: string }
    | { kind: 'aspect'; id: string; payload: AspectData }
    | { kind: 'aspectType'; id: string; payload: typeof ASPECTS_DEF[number] };

// ─── Chart geometry ───────────────────────────────────────────────────────────

const CX = 500, CY = 500;
const R_OUTER       = 480;   // outermost edge
const R_SIGN_INNER  = 408;   // inner edge of sign ring
const R_TICK_OUT    = 408;
const R_TICK_IN     = 396;
const R_HOUSE_OUTER = 396;   // top of houses area
const R_HOUSE_INNER = 290;   // bottom (where aspects start)
const R_HOUSE_NUM   = 312;   // where Roman numerals sit
const R_PLANET      = 358;   // planet glyph orbit
const R_PLANET_TICK = 392;   // little tick from glyph toward outer
const R_PLANET_ANCH = 300;   // anchor for aspect lines (inside aspects circle)
const R_ASPECT      = 290;   // aspect circle

function lonToRad(lon: number, ascLon: number): number {
    return ((180 + ascLon - lon) * Math.PI) / 180;
}

function polar(r: number, lon: number, ascLon: number): { x: number; y: number } {
    const a = lonToRad(lon, ascLon);
    return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
}

function sectorPath(r1: number, r2: number, lon1: number, lon2: number, ascLon: number): string {
    const p1 = polar(r2, lon1, ascLon);
    const p2 = polar(r2, lon2, ascLon);
    const p3 = polar(r1, lon2, ascLon);
    const p4 = polar(r1, lon1, ascLon);
    return `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} A ${r2} ${r2} 0 0 0 ${p2.x.toFixed(1)} ${p2.y.toFixed(1)} L ${p3.x.toFixed(1)} ${p3.y.toFixed(1)} A ${r1} ${r1} 0 0 1 ${p4.x.toFixed(1)} ${p4.y.toFixed(1)} Z`;
}

function spreadPlanets(planets: PlanetData[], minSep = 7): (PlanetData & { displayLon: number })[] {
    if (planets.length === 0) return [];
    const sorted = [...planets].sort((a, b) => a.lon - b.lon);
    const adjusted: number[] = [sorted[0].lon];
    for (let k = 1; k < sorted.length; k++) {
        const gap = sorted[k].lon - adjusted[k - 1];
        adjusted.push(gap < minSep ? adjusted[k - 1] + minSep : sorted[k].lon);
    }
    const displayMap = new Map<string, number>();
    sorted.forEach((p, i) => displayMap.set(p.id, adjusted[i]));
    return planets.map(p => ({ ...p, displayLon: displayMap.get(p.id) ?? p.lon }));
}

// ─── Astrology helpers ────────────────────────────────────────────────────────

function computeHouses(ascLon: number): HouseData[] {
    return Array.from({ length: 12 }, (_, i) => ({
        num: i + 1,
        id: `h${i + 1}`,
        roman: ROMAN[i],
        cusp: ((ascLon + i * 30) % 360 + 360) % 360,
        desc: HOUSE_MEANINGS[i],
    }));
}

function computeAspects(planets: PlanetData[]): AspectData[] {
    const out: AspectData[] = [];
    for (let i = 0; i < planets.length; i++) {
        for (let j = i + 1; j < planets.length; j++) {
            const a = planets[i], b = planets[j];
            let diff = Math.abs(a.lon - b.lon) % 360;
            if (diff > 180) diff = 360 - diff;
            for (const asp of ASPECTS_DEF) {
                const delta = Math.abs(diff - asp.angle);
                if (delta <= asp.orb) {
                    out.push({
                        planetA: a.id, planetB: b.id,
                        nameA: a.name, nameB: b.name,
                        glyphA: a.glyph, glyphB: b.glyph,
                        type: asp.id, typeName: asp.name,
                        color: asp.color, orbActual: delta,
                        glyphAsp: asp.glyph,
                    });
                    break;
                }
            }
        }
    }
    return out;
}

function lonToSign(lon: number) {
    const L = ((lon % 360) + 360) % 360;
    const i = Math.floor(L / 30);
    return { sign: SIGNS[i], degInSign: L - i * 30 };
}

function formatPos(lon: number): string {
    const { sign, degInSign } = lonToSign(lon);
    const d = Math.floor(degInSign);
    const m = Math.round((degInSign - d) * 60);
    return `${d}°${String(m).padStart(2, '0')}' ${sign.name}`;
}

function getPlanetHouse(lon: number, houses: HouseData[]): HouseData {
    for (let i = 0; i < houses.length; i++) {
        const h = houses[i];
        const next = houses[(i + 1) % 12];
        const inSec = h.cusp < next.cusp
            ? (lon >= h.cusp && lon < next.cusp)
            : (lon >= h.cusp || lon < next.cusp);
        if (inSec) return h;
    }
    return houses[0];
}

function formatBirthDate(dateStr: string): string {
    const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
        'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    const [year, month, day] = dateStr.split('-').map(Number);
    return `${day} ${months[month - 1]} ${year}`;
}

// ─── NatalChartSvg ────────────────────────────────────────────────────────────

// Dark fills that match the app background
const CHART_BG      = 'rgba(13,8,28,0.96)';   // inner circle — very dark
const RING_BG       = 'rgba(19,8,39,0.88)';   // house ring
const PLANET_FILL   = '#130827';              // planet bubble background
const GOLD          = '#E5C266';
const GOLD_SOFT     = 'rgba(229,194,102,0.55)';
const GOLD_DIM      = 'rgba(229,194,102,0.28)';

interface ChartSvgProps {
    planets: PlanetData[];
    ascLon: number;
    chartWidth: number;
    selected: Selection;
    onSelect: (s: Selection) => void;
}

function NatalChartSvg({ planets, ascLon, chartWidth, selected, onSelect }: ChartSvgProps) {
    const houses    = useMemo(() => computeHouses(ascLon), [ascLon]);
    const aspects   = useMemo(() => computeAspects(planets), [planets]);
    const placement = useMemo(() => spreadPlanets(planets, 7), [planets]);

    const selKind = selected.kind;
    const selId   = selected.kind !== 'chart' ? (selected as any).id as string : '';

    // Tick marks — 1°/5°/10°
    const ticks = useMemo(() => {
        const result = [];
        for (let d = 0; d < 360; d++) {
            const isMajor = d % 10 === 0;
            const isMid   = d % 5 === 0 && !isMajor;
            const r1 = R_TICK_OUT;
            const r2 = isMajor ? R_TICK_IN : isMid ? R_TICK_OUT - 6 : R_TICK_OUT - 3;
            const p1 = polar(r1, d, ascLon);
            const p2 = polar(r2, d, ascLon);
            result.push(
                <Line key={d}
                    x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                    stroke="rgba(236,229,247,0.22)"
                    strokeWidth={isMajor ? 1.2 : isMid ? 0.9 : 0.55}
                />
            );
        }
        return result;
    }, [ascLon]);

    return (
        <Svg viewBox="0 0 1000 1000" width={chartWidth} height={chartWidth}>
            <Defs>
                <RadialGradient id="bgGlow" cx="50%" cy="50%" r="50%">
                    <Stop offset="0%"   stopColor="rgba(155,92,255,0.10)" />
                    <Stop offset="55%"  stopColor="rgba(155,92,255,0.04)" />
                    <Stop offset="100%" stopColor="rgba(0,0,0,0)" />
                </RadialGradient>
                <RadialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
                    <Stop offset="0%"   stopColor="rgba(229,90,140,0.18)" />
                    <Stop offset="60%"  stopColor="rgba(229,90,140,0.03)" />
                    <Stop offset="100%" stopColor="rgba(0,0,0,0)" />
                </RadialGradient>
            </Defs>

            {/* Soft glow backdrop */}
            <Circle cx={CX} cy={CY} r={R_OUTER + 6} fill="url(#bgGlow)" />

            {/* Outer rings */}
            <Circle cx={CX} cy={CY} r={R_OUTER}       fill="none" stroke="rgba(236,229,247,0.20)" strokeWidth={1} />
            <Circle cx={CX} cy={CY} r={R_SIGN_INNER}  fill="none" stroke="rgba(236,229,247,0.12)" strokeWidth={1} />
            <Circle cx={CX} cy={CY} r={R_HOUSE_INNER} fill="none" stroke="rgba(236,229,247,0.10)" strokeWidth={1} />

            {/* Zodiac sign sectors */}
            <G>
                {SIGNS.map((s, i) => {
                    const active = selKind === 'sign' && selId === s.id;
                    const fill = active
                        ? "rgba(229,194,102,0.18)"
                        : i % 2 === 0
                            ? "rgba(255,255,255,0.025)"
                            : "rgba(255,255,255,0.045)";
                    return (
                        <Path key={s.id}
                            d={sectorPath(R_SIGN_INNER, R_OUTER, s.range[0], s.range[1], ascLon)}
                            fill={fill}
                            stroke={active ? "rgba(229,194,102,0.55)" : "rgba(255,255,255,0.06)"}
                            strokeWidth={active ? 1.5 : 0.6}
                            onPress={() => onSelect({ kind: 'sign', id: s.id })}
                        />
                    );
                })}
            </G>

            {/* Tick marks */}
            <G pointerEvents="none">{ticks}</G>

            {/* Sign glyphs */}
            <G pointerEvents="none">
                {SIGNS.map(s => {
                    const mid = (s.range[0] + s.range[1]) / 2;
                    const p = polar((R_OUTER + R_SIGN_INNER) / 2, mid, ascLon);
                    const active = selKind === 'sign' && selId === s.id;
                    const elemColor = ELEMENT_COLOR[s.element];
                    return (
                        <SvgText key={`sg-${s.id}`}
                            x={p.x} y={p.y}
                            textAnchor="middle"
                            alignmentBaseline="central"
                            fontSize={34}
                            fill={active ? GOLD : elemColor}
                            opacity={active ? 1 : 0.92}
                        >{s.glyph}</SvgText>
                    );
                })}
            </G>

            {/* House cusp lines */}
            <G pointerEvents="none">
                {houses.map((h, i) => {
                    const isAngle = i === 0 || i === 3 || i === 6 || i === 9;
                    const p1 = polar(R_HOUSE_INNER, h.cusp, ascLon);
                    const p2 = polar(R_HOUSE_OUTER, h.cusp, ascLon);
                    return (
                        <Line key={`hcusp-${i}`}
                            x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                            stroke={isAngle ? GOLD_SOFT : 'rgba(236,229,247,0.18)'}
                            strokeWidth={isAngle ? 1.5 : 0.8}
                            strokeDasharray={isAngle ? undefined : '4 4'}
                        />
                    );
                })}
            </G>

            {/* House numbers (tappable) */}
            <G>
                {houses.map(h => {
                    const mid = (h.cusp + 15) % 360;
                    const p = polar(R_HOUSE_NUM, mid, ascLon);
                    const active = selKind === 'house' && selId === h.id;
                    return (
                        <G key={h.id} onPress={() => onSelect({ kind: 'house', id: h.id })}>
                            {/* Invisible hit area */}
                            <Circle cx={p.x} cy={p.y} r={22} fill="rgba(0,0,0,0.01)" />
                            <SvgText
                                x={p.x} y={p.y}
                                textAnchor="middle"
                                alignmentBaseline="central"
                                fontSize={14}
                                fontWeight="500"
                                fill={active ? GOLD : 'rgba(189,178,212,0.65)'}
                            >{h.roman}</SvgText>
                        </G>
                    );
                })}
            </G>

            {/* Center glow */}
            <Circle cx={CX} cy={CY} r={R_ASPECT - 4} fill="url(#centerGlow)" pointerEvents="none" />

            {/* Aspect lines */}
            <G>
                {aspects.map((asp, i) => {
                    const pa = placement.find(x => x.id === asp.planetA);
                    const pb = placement.find(x => x.id === asp.planetB);
                    if (!pa || !pb) return null;
                    const p1 = polar(R_PLANET_ANCH, pa.displayLon, ascLon);
                    const p2 = polar(R_PLANET_ANCH, pb.displayLon, ascLon);
                    const aspId = `${asp.planetA}-${asp.planetB}`;
                    const active = selKind === 'aspect' && selId === aspId;
                    return (
                        <G key={`asp-${i}`} onPress={() => onSelect({ kind: 'aspect', id: aspId, payload: asp })}>
                            {/* Fat invisible hit zone */}
                            <Line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                                stroke="rgba(0,0,0,0.01)" strokeWidth={14} />
                            <Line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                                stroke={asp.color}
                                strokeWidth={active ? 2.4 : 1.5}
                                opacity={active ? 1 : 0.72}
                                strokeLinecap="round"
                                pointerEvents="none"
                            />
                        </G>
                    );
                })}
            </G>

            {/* Axis labels — ASC / IC / DSC / MC */}
            <G pointerEvents="none">
                {[
                    { lon: ascLon,               label: 'ASC', anchor: 'end',    dx: -16, dy: 0 },
                    { lon: (ascLon + 90) % 360,  label: 'IC',  anchor: 'middle', dx: 0,   dy: 16 },
                    { lon: (ascLon + 180) % 360, label: 'DSC', anchor: 'start',  dx: 16,  dy: 0 },
                    { lon: (ascLon + 270) % 360, label: 'MC',  anchor: 'middle', dx: 0,   dy: -16 },
                ].map((ax, i) => {
                    const p = polar(R_OUTER + 8, ax.lon, ascLon);
                    return (
                        <SvgText key={`ax-${i}`}
                            x={p.x + ax.dx} y={p.y + ax.dy}
                            textAnchor={ax.anchor as any}
                            alignmentBaseline="central"
                            fontSize={9.5}
                            fontWeight="600"
                            letterSpacing={1.2}
                            fill={GOLD}
                            opacity={0.85}
                        >{ax.label}</SvgText>
                    );
                })}
            </G>

            {/* Planets */}
            <G>
                {placement.map(p => {
                    const dispP  = polar(R_PLANET, p.displayLon, ascLon);
                    const linkA  = polar(R_PLANET_TICK - 6, p.lon, ascLon);
                    const linkB  = polar(R_PLANET + 16, p.displayLon, ascLon);
                    const active = selKind === 'planet' && selId === p.id;
                    return (
                        <G key={p.id}>
                            {/* tiny tick at exact longitude on the wheel */}
                            <Line
                                x1={polar(R_SIGN_INNER - 1, p.lon, ascLon).x} y1={polar(R_SIGN_INNER - 1, p.lon, ascLon).y}
                                x2={polar(R_SIGN_INNER - 12, p.lon, ascLon).x} y2={polar(R_SIGN_INNER - 12, p.lon, ascLon).y}
                                stroke="rgba(229,194,102,0.65)" strokeWidth={1.4}
                                pointerEvents="none"
                            />
                            {/* connector from glyph to tick */}
                            {Math.abs(p.displayLon - p.lon) > 0.5 && (
                                <Line x1={linkA.x} y1={linkA.y} x2={linkB.x} y2={linkB.y}
                                    stroke="rgba(229,194,102,0.35)" strokeWidth={0.8} strokeDasharray="2 2"
                                    pointerEvents="none"
                                />
                            )}

                            <G onPress={() => onSelect({ kind: 'planet', id: p.id })}>
                                <Circle cx={dispP.x} cy={dispP.y} r={22}
                                    fill={active ? "rgba(229,194,102,0.95)" : "rgba(31,23,64,0.92)"}
                                    stroke={active ? GOLD : "rgba(229,194,102,0.65)"}
                                    strokeWidth={active ? 2 : 1.4}
                                />
                                <SvgText
                                    x={dispP.x} y={dispP.y + 1}
                                    textAnchor="middle"
                                    alignmentBaseline="central"
                                    fontSize={22}
                                    fill={active ? '#1A1233' : GOLD}
                                >{p.glyph}</SvgText>
                            </G>
                        </G>
                    );
                })}
            </G>

            {/* Center dot */}
            <Circle cx={CX} cy={CY} r={3} fill="rgba(229,194,102,0.6)" pointerEvents="none" />
        </Svg>
    );
}

// ─── Aspect legend ────────────────────────────────────────────────────────────

function Legend({ selected, onSelect }: { selected: Selection; onSelect: (s: Selection) => void }) {
    return (
        <View style={styles.legend}>
            {ASPECTS_DEF.map(a => {
                const active = selected.kind === 'aspectType' && (selected as any).id === a.id;
                return (
                    <Pressable
                        key={a.id}
                        style={[styles.legBtn, active && styles.legBtnActive]}
                        onPress={() => onSelect({ kind: 'aspectType', id: a.id, payload: a })}
                    >
                        <View style={[styles.legSwatch, { backgroundColor: a.color }]} />
                        <Text style={[styles.legLabel, active && styles.legLabelActive]}>{a.short}</Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

// ─── Info panel ───────────────────────────────────────────────────────────────

interface InfoPanelProps {
    selected: Selection;
    planets: PlanetData[];
    houses: HouseData[];
    aspects: AspectData[];
}

function InfoPanel({ selected, planets, houses, aspects }: InfoPanelProps) {
    // ── Default / chart overview
    if (selected.kind === 'chart') {
        const sun  = planets.find(p => p.id === 'sun');
        const moon = planets.find(p => p.id === 'moon');
        const asc  = houses[0];
        return (
            <GlassCard opacity="medium" radius="xl">
                <Text style={styles.infoKicker}>Explorer</Text>
                <Text style={styles.infoTitle}>Touchez un élément</Text>
                <Text style={styles.infoBody}>
                    Planètes, signes, maisons ou lignes d'aspect — appuyez pour voir le détail.
                </Text>
                <View style={styles.pillRow}>
                    {sun  && <InfoPill label={`${sun.glyph} Soleil — ${lonToSign(sun.lon).sign.name}`} />}
                    {moon && <InfoPill label={`${moon.glyph} Lune — ${lonToSign(moon.lon).sign.name}`} />}
                    {asc  && <InfoPill label={`ASC — ${lonToSign(asc.cusp).sign.name}`} />}
                </View>
            </GlassCard>
        );
    }

    // ── Planet
    if (selected.kind === 'planet') {
        const p = planets.find(x => x.id === selected.id);
        if (!p) return null;
        const house = getPlanetHouse(p.lon, houses);
        const { sign } = lonToSign(p.lon);
        const myAspects = aspects.filter(a => a.planetA === p.id || a.planetB === p.id);
        return (
            <GlassCard opacity="medium" radius="xl">
                <View style={styles.infoHead}>
                    <View style={styles.infoGlyph}>
                        <Text style={styles.infoGlyphChar}>{p.glyph}</Text>
                    </View>
                    <View style={styles.infoMeta}>
                        <Text style={styles.infoKicker}>Planète</Text>
                        <Text style={styles.infoTitle}>{p.name}{p.retrograde ? ' ℞' : ''}</Text>
                        <Text style={styles.infoSubtitle}>{formatPos(p.lon)} · Maison {house.roman}</Text>
                    </View>
                </View>
                <Text style={styles.infoBody}>{p.desc}</Text>
                {myAspects.length > 0 && (
                    <View style={styles.pillRow}>
                        {myAspects.slice(0, 4).map((a, i) => {
                            const other = a.planetA === p.id ? a.nameB : a.nameA;
                            const og    = a.planetA === p.id ? a.glyphB : a.glyphA;
                            return (
                                <InfoPill key={i} label={`${a.glyphAsp} ${og} ${other}`} accentColor={a.color} />
                            );
                        })}
                    </View>
                )}
            </GlassCard>
        );
    }

    // ── Sign
    if (selected.kind === 'sign') {
        const s = SIGNS.find(x => x.id === selected.id);
        if (!s) return null;
        const planetsHere = planets.filter(p => p.lon >= s.range[0] && p.lon < s.range[1]);
        const ec = ELEMENT_COLOR[s.element];
        return (
            <GlassCard opacity="medium" radius="xl">
                <View style={styles.infoHead}>
                    <View style={[styles.infoGlyph, { backgroundColor: `${ec}15` }]}>
                        <Text style={[styles.infoGlyphChar, { color: ec }]}>{s.glyph}</Text>
                    </View>
                    <View style={styles.infoMeta}>
                        <Text style={styles.infoKicker}>Signe</Text>
                        <Text style={styles.infoTitle}>{s.name}</Text>
                        <Text style={styles.infoSubtitle}>{s.element} · {s.modality} · {s.ruler}</Text>
                    </View>
                </View>
                <Text style={styles.infoBody}>{s.desc}</Text>
                <View style={styles.pillRow}>
                    {planetsHere.length > 0
                        ? planetsHere.map(p => <InfoPill key={p.id} label={`${p.glyph} ${p.name}`} />)
                        : <InfoPill label="Aucune planète" />
                    }
                </View>
            </GlassCard>
        );
    }

    // ── House
    if (selected.kind === 'house') {
        const h = houses.find(x => x.id === selected.id);
        if (!h) return null;
        const next = houses[h.num % 12];
        const planetsHere = planets.filter(p => {
            const L = p.lon;
            return h.cusp < next.cusp
                ? (L >= h.cusp && L < next.cusp)
                : (L >= h.cusp || L < next.cusp);
        });
        const cuspInfo = lonToSign(h.cusp);
        return (
            <GlassCard opacity="medium" radius="xl">
                <View style={styles.infoHead}>
                    <View style={styles.infoGlyph}>
                        <Text style={[styles.infoGlyphChar, { fontFamily: fonts.display.bold, fontSize: 20 }]}>{h.roman}</Text>
                    </View>
                    <View style={styles.infoMeta}>
                        <Text style={styles.infoKicker}>Maison</Text>
                        <Text style={styles.infoTitle}>Maison {h.num}</Text>
                        <Text style={styles.infoSubtitle}>Cuspide — {cuspInfo.sign.name} {Math.floor(cuspInfo.degInSign)}°</Text>
                    </View>
                </View>
                <Text style={styles.infoBody}>{h.desc}</Text>
                {planetsHere.length > 0 && (
                    <View style={styles.pillRow}>
                        {planetsHere.map(p => <InfoPill key={p.id} label={`${p.glyph} ${p.name}`} />)}
                    </View>
                )}
            </GlassCard>
        );
    }

    // ── Aspect line
    if (selected.kind === 'aspect') {
        const asp = selected.payload;
        const def = ASPECTS_DEF.find(d => d.id === asp.type);
        if (!def) return null;
        return (
            <GlassCard opacity="medium" radius="xl">
                <View style={styles.infoHead}>
                    <View style={[styles.infoGlyph, { backgroundColor: `${asp.color}15` }]}>
                        <Text style={[styles.infoGlyphChar, { color: asp.color }]}>{def.glyph}</Text>
                    </View>
                    <View style={styles.infoMeta}>
                        <Text style={styles.infoKicker}>Aspect</Text>
                        <Text style={styles.infoTitle}>{asp.typeName}</Text>
                        <Text style={styles.infoSubtitle}>{asp.glyphA} {asp.nameA}  ·  {asp.glyphB} {asp.nameB}</Text>
                    </View>
                </View>
                <Text style={styles.infoBody}>{def.desc}</Text>
                <View style={styles.pillRow}>
                    <InfoPill label={`Angle ${def.angle}°`} />
                    <InfoPill label={`Orbe ${asp.orbActual.toFixed(1)}°`} />
                </View>
            </GlassCard>
        );
    }

    // ── Aspect type (from legend)
    if (selected.kind === 'aspectType') {
        const def = selected.payload;
        return (
            <GlassCard opacity="medium" radius="xl">
                <View style={styles.infoHead}>
                    <View style={[styles.infoGlyph, { backgroundColor: `${def.color}15` }]}>
                        <Text style={[styles.infoGlyphChar, { color: def.color }]}>{def.glyph}</Text>
                    </View>
                    <View style={styles.infoMeta}>
                        <Text style={styles.infoKicker}>Type d'aspect</Text>
                        <Text style={styles.infoTitle}>{def.name}</Text>
                        <Text style={styles.infoSubtitle}>Angle {def.angle}° · Orbe ±{def.orb}°</Text>
                    </View>
                </View>
                <Text style={styles.infoBody}>{def.desc}</Text>
            </GlassCard>
        );
    }

    return null;
}

// Small reusable pill
function InfoPill({ label, accentColor }: { label: string; accentColor?: string }) {
    return (
        <View style={[styles.pill, accentColor ? { borderColor: `${accentColor}55` } : undefined]}>
            <Text style={[styles.pillText, accentColor ? { color: accentColor } : undefined]}>{label}</Text>
        </View>
    );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function NatalChartWheelScreen() {
    const router = useRouter();
    const { width: screenWidth } = useWindowDimensions();
    // Full-width chart (Screen padding is 16px each side)
    const chartWidth = screenWidth - spacing.screenPadding * 2;

    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState<string | null>(null);
    const [planets, setPlanets]     = useState<PlanetData[]>([]);
    const [ascLon, setAscLon]       = useState(0);
    const [birthInfo, setBirthInfo] = useState<{ date: string; time?: string; city: string } | null>(null);
    const [selected, setSelected]   = useState<Selection>({ kind: 'chart' });

    const houses  = useMemo(() => computeHouses(ascLon), [ascLon]);
    const aspects = useMemo(() => computeAspects(planets), [planets]);

    useEffect(() => { loadData(); }, []);

    async function loadData() {
        try {
            setLoading(true);
            setError(null);
            const [chartRes, profileRes] = await Promise.all([
                getNatalChart(),
                getBirthProfile(),
            ]);
            if (!chartRes.success || !chartRes.chart) {
                setError('Impossible de charger le thème natal.');
                return;
            }
            const positions = chartRes.chart.planetaryPositions;
            const planetList: PlanetData[] = MAIN_PLANETS
                .filter(name => positions[name])
                .map(name => ({
                    id: name.toLowerCase(),
                    name: PLANET_INFO[name].name,
                    glyph: PLANET_INFO[name].glyph,
                    lon: positions[name].Position,
                    retrograde: positions[name].Retrograde === 'Yes',
                    desc: PLANET_INFO[name].desc,
                }));
            setPlanets(planetList);
            setAscLon(positions['Ascendant']?.Position ?? 0);
            if (profileRes.hasProfile && profileRes.profile) {
                const p = profileRes.profile;
                setBirthInfo({ date: p.birthDate, time: p.birthTime, city: p.birthCity });
            }
        } catch {
            setError('Erreur de connexion. Vérifiez votre réseau.');
        } finally {
            setLoading(false);
        }
    }

    const handleSelect = useCallback((s: Selection) => {
        setSelected(prev => {
            if (prev.kind !== 'chart' && s.kind !== 'chart') {
                if (prev.kind === s.kind && (prev as any).id === (s as any).id) {
                    return { kind: 'chart' };
                }
            }
            return s;
        });
    }, []);

    const contentNode = () => {
        if (loading) {
            return (
                <View style={styles.centered}>
                    <ActivityIndicator color={colors.primary} size="large" />
                    <Text style={styles.loadingText}>Calcul du thème natal…</Text>
                </View>
            );
        }
        if (error) {
            return (
                <View style={styles.centered}>
                    <Text style={styles.errorText}>{error}</Text>
                    <Pressable style={styles.retryBtn} onPress={loadData}>
                        <Text style={styles.retryText}>Réessayer</Text>
                    </Pressable>
                </View>
            );
        }
        return (
            <>
                {/* Birth meta */}
                {birthInfo && (
                    <View style={styles.metaRow}>
                        <View style={styles.metaItem}>
                            <Feather name="calendar" size={12} color={GOLD} />
                            <Text style={styles.metaText}>{formatBirthDate(birthInfo.date)}</Text>
                        </View>
                        {birthInfo.time && (
                            <View style={styles.metaItem}>
                                <Feather name="clock" size={12} color={GOLD} />
                                <Text style={styles.metaText}>{birthInfo.time}</Text>
                            </View>
                        )}
                        <View style={styles.metaItem}>
                            <Feather name="map-pin" size={12} color={GOLD} />
                            <Text style={styles.metaText}>{birthInfo.city}</Text>
                        </View>
                    </View>
                )}

                {/* Chart — full content width, no extra padding */}
                <View style={styles.chartWrap}>
                    <NatalChartSvg
                        planets={planets}
                        ascLon={ascLon}
                        chartWidth={chartWidth}
                        selected={selected}
                        onSelect={handleSelect}
                    />
                </View>

                {/* Aspect legend */}
                <Legend selected={selected} onSelect={handleSelect} />

                {/* Info panel */}
                <View style={styles.infoWrap}>
                    <InfoPanel selected={selected} planets={planets} houses={houses} aspects={aspects} />
                </View>

                <View style={{ height: 60 }} />
            </>
        );
    };

    return (
        <LinearGradient
            colors={['#0F0B1F', '#1A1133', '#231942']}
            style={styles.screen}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
        >
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    bounces
                >
                    {/* Header — back button only, left-aligned */}
                    <View style={styles.header}>
                        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
                            <Feather name="arrow-left" size={20} color={colors.onSurface} />
                        </Pressable>
                    </View>

                    {contentNode()}
                </ScrollView>
            </SafeAreaView>
        </LinearGradient>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    screen:        { flex: 1 },
    safeArea:      { flex: 1 },
    scroll:        { flex: 1 },
    scrollContent: { paddingHorizontal: spacing.screenPadding, flexGrow: 1 },
    centered:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: spacing.lg },

    // Header
    header:   { paddingTop: spacing.md, paddingBottom: spacing.md },
    backBtn:  { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

    // Badge chip
    chipRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
    chip:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: radius.full, backgroundColor: `${colors.primary}15` },
    chipDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
    chipText: { fontFamily: fonts.body.semiBold, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.primary },

    // Title
    pageTitle:    { fontFamily: fonts.display.bold, fontSize: 30, lineHeight: 38, color: colors.onSurface, marginBottom: spacing.sm },
    pageSubtitle: { fontFamily: fonts.body.regular, fontSize: 13, lineHeight: 20, color: colors.onSurfaceMuted, marginBottom: spacing.lg },

    // Birth meta chips
    metaRow:  { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginBottom: spacing.xl, marginTop: spacing.xs },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    metaText: { fontFamily: fonts.body.medium, fontSize: 13, color: colors.onSurface },

    // Chart
    chartWrap: { alignSelf: 'center', marginBottom: spacing.lg },

    // Legend
    legend:       { flexDirection: 'row', gap: 10, marginBottom: spacing.xl, paddingHorizontal: spacing.sm },
    legBtn:       { flex: 1, alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 4, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    legBtnActive: { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)' },
    legSwatch:    { width: 16, height: 3, borderRadius: 2 },
    legLabel:     { fontFamily: fonts.body.regular, fontSize: 11, color: colors.onSurfaceMuted },
    legLabelActive: { color: colors.onSurface },

    // Info panel
    infoWrap: { marginBottom: spacing.xxl },

    // Info panel internals
    infoHead:      { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
    infoGlyph:     { width: 50, height: 50, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: `${colors.primary}12`, flexShrink: 0 },
    infoGlyphChar: { fontSize: 24, color: colors.primary },
    infoMeta:      { flex: 1, minWidth: 0 },
    infoKicker:    { fontFamily: fonts.body.semiBold, fontSize: 9.5, letterSpacing: 1.6, textTransform: 'uppercase', color: colors.onSurfaceMuted, marginBottom: 3 },
    infoTitle:     { fontFamily: fonts.display.bold, fontSize: 20, lineHeight: 26, color: colors.onSurface },
    infoSubtitle:  { fontFamily: fonts.body.regular, fontSize: 12.5, color: colors.onSurfaceMuted, marginTop: 2, lineHeight: 18 },
    infoBody:      { fontFamily: fonts.body.regular, fontSize: 13.5, lineHeight: 21, color: colors.onSurfaceMuted },

    // Pills
    pillRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.md },
    pill:     { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    pillText: { fontFamily: fonts.body.medium, fontSize: 11, color: colors.onSurfaceMuted },

    // Feedback states
    loadingText: { fontFamily: fonts.body.regular, fontSize: 13, color: colors.onSurfaceMuted },
    errorText:   { fontFamily: fonts.body.regular, fontSize: 13, color: colors.onSurfaceMuted, textAlign: 'center', paddingHorizontal: spacing.xl },
    retryBtn:    { paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.full, backgroundColor: `${colors.primary}20`, marginTop: spacing.sm },
    retryText:   { fontFamily: fonts.body.semiBold, fontSize: 13, color: colors.primary },
});
