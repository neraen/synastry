/**
 * Thème Natal Design — design prototype
 * Ported from theme-natal-native/ standalone app.
 * Uses static mock data; no API call.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
    Dimensions,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, {
    Circle,
    Defs,
    G,
    Line,
    Path,
    RadialGradient,
    Stop,
    Text as SvgText,
} from 'react-native-svg';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { fonts } from '@/theme';

// ─── Design tokens (faithful to theme-natal-native) ───────────────────────────

const T = {
    color: {
        bg:          '#120A24',
        bg2:         '#1A1233',
        card:        '#1F1740',
        border:      'rgba(255,255,255,0.07)',
        borderStrong:'rgba(255,255,255,0.12)',
        gold:        '#E5C266',
        goldSoft:    'rgba(229,194,102,0.16)',
        text:        '#ECE5F7',
        text2:       '#BDB2D4',
        text3:       '#8A82A6',
        aspConj:     '#E5C266',
        aspTrine:    '#4ADE80',
        aspSextile:  '#5DA9F5',
        aspSquare:   '#E89B4C',
        aspOppos:    '#E55A8C',
    },
    radius: { sm: 10, md: 14, lg: 18, xl: 22, pill: 999 },
    chart: {
        cx: 500, cy: 500,
        rOuter:      480,
        rSignInner:  408,
        rTickOut:    408,
        rTickIn:     396,
        rHouseOuter: 396,
        rHouseInner: 290,
        rHouseNum:   312,
        rPlanet:     358,
        rPlanetTick: 392,
        rPlanetAnch: 300,
        rAspect:     290,
    },
} as const;

// ─── Astrological static data ─────────────────────────────────────────────────

type SignElement = 'Feu' | 'Terre' | 'Air' | 'Eau';

const ELEMENT_COLOR: Record<SignElement, string> = {
    Feu:   '#E89B4C',
    Terre: '#A3B86C',
    Air:   '#7DB5E8',
    Eau:   '#9B7BE8',
};

const SIGNS = [
    { id: 'aries',       name: 'Bélier',     glyph: '♈', element: 'Feu'   as SignElement, modality: 'Cardinal', ruler: 'Mars',    range: [0,30]    as [number,number], desc: "Pionnier impulsif, le Bélier ouvre le zodiaque avec courage. Énergie d'initiative, besoin d'agir, parfois sans détour." },
    { id: 'taurus',      name: 'Taureau',    glyph: '♉', element: 'Terre' as SignElement, modality: 'Fixe',     ruler: 'Vénus',   range: [30,60]   as [number,number], desc: "Sensuel, posé, attaché à la beauté et à la stabilité. Le Taureau construit lentement mais sûrement." },
    { id: 'gemini',      name: 'Gémeaux',    glyph: '♊', element: 'Air'   as SignElement, modality: 'Mutable',  ruler: 'Mercure', range: [60,90]   as [number,number], desc: "Vif, curieux, communicant. Les Gémeaux relient les idées et les gens, en surface comme en profondeur." },
    { id: 'cancer',      name: 'Cancer',     glyph: '♋', element: 'Eau'   as SignElement, modality: 'Cardinal', ruler: 'Lune',    range: [90,120]  as [number,number], desc: "Émotionnel, protecteur, attaché à ses racines. Le Cancer ressent avant de penser." },
    { id: 'leo',         name: 'Lion',       glyph: '♌', element: 'Feu'   as SignElement, modality: 'Fixe',     ruler: 'Soleil',  range: [120,150] as [number,number], desc: "Rayonnant, généreux, créatif. Le Lion cherche à exprimer pleinement sa singularité." },
    { id: 'virgo',       name: 'Vierge',     glyph: '♍', element: 'Terre' as SignElement, modality: 'Mutable',  ruler: 'Mercure', range: [150,180] as [number,number], desc: "Analytique, méthodique, au service. La Vierge affine, trie, perfectionne le réel." },
    { id: 'libra',       name: 'Balance',    glyph: '♎', element: 'Air'   as SignElement, modality: 'Cardinal', ruler: 'Vénus',   range: [180,210] as [number,number], desc: "Diplomate, esthète, en quête d'harmonie. La Balance pèse, équilibre, relie à l'autre." },
    { id: 'scorpio',     name: 'Scorpion',   glyph: '♏', element: 'Eau'   as SignElement, modality: 'Fixe',     ruler: 'Pluton',  range: [210,240] as [number,number], desc: "Intense, transformateur, magnétique. Le Scorpion descend dans les profondeurs pour renaître." },
    { id: 'sagittarius', name: 'Sagittaire', glyph: '♐', element: 'Feu'   as SignElement, modality: 'Mutable',  ruler: 'Jupiter', range: [240,270] as [number,number], desc: "Aventurier, philosophe, optimiste. Le Sagittaire vise large, cherche du sens dans l'horizon." },
    { id: 'capricorn',   name: 'Capricorne', glyph: '♑', element: 'Terre' as SignElement, modality: 'Cardinal', ruler: 'Saturne', range: [270,300] as [number,number], desc: "Structurant, ambitieux, patient. Le Capricorne construit dans la durée, avec discipline." },
    { id: 'aquarius',    name: 'Verseau',    glyph: '♒', element: 'Air'   as SignElement, modality: 'Fixe',     ruler: 'Uranus',  range: [300,330] as [number,number], desc: "Visionnaire, indépendant, collectif. Le Verseau pense différemment et invente l'avenir." },
    { id: 'pisces',      name: 'Poissons',   glyph: '♓', element: 'Eau'   as SignElement, modality: 'Mutable',  ruler: 'Neptune', range: [330,360] as [number,number], desc: "Sensible, mystique, fluide. Les Poissons dissolvent les frontières et accueillent l'invisible." },
];

const PLANETS = [
    { id: 'sun',     name: 'Soleil',  glyph: '☉', lon: 304.45, desc: "Ton noyau, ta vitalité, ce qui t'anime profondément. Là où tu rayonnes." },
    { id: 'moon',    name: 'Lune',    glyph: '☽', lon: 88.57,  desc: "Ton monde intérieur, tes besoins émotionnels, ce qui t'apaise et te ressource." },
    { id: 'mercury', name: 'Mercure', glyph: '☿', lon: 318.02, desc: "Ta manière de penser, d'apprendre, de communiquer. Le rythme de ton mental." },
    { id: 'venus',   name: 'Vénus',   glyph: '♀', lon: 306.27, desc: "Ce que tu aimes, ce que tu attires, ton goût, ta relation à l'autre et au plaisir." },
    { id: 'mars',    name: 'Mars',    glyph: '♂', lon: 297.27, desc: "Ton énergie d'action, ton désir, ta capacité à passer à l'acte et à affronter." },
    { id: 'jupiter', name: 'Jupiter', glyph: '♃', lon: 222.67, desc: "Ton expansion, ta chance, là où tu vois grand et où tu trouves du sens." },
    { id: 'saturn',  name: 'Saturne', glyph: '♄', lon: 168.0,  desc: "Tes structures, tes leçons, ta discipline. Ce que tu construis dans la durée." },
    { id: 'uranus',  name: 'Uranus',  glyph: '♅', lon: 35.0,   desc: "Tes ruptures, ton originalité, ta liberté. Là où tu inventes et te libères." },
    { id: 'neptune', name: 'Neptune', glyph: '♆', lon: 355.0,  desc: "Tes rêves, ton imaginaire, ta sensibilité au subtil et au spirituel." },
    { id: 'pluto',   name: 'Pluton',  glyph: '♇', lon: 295.0,  desc: "Tes transformations profondes, ton pouvoir, ce qui meurt pour mieux renaître." },
];

const ASC_LON = 105; // Cancer 15°

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

const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];

const HOUSES = Array.from({ length: 12 }, (_, i) => ({
    id: `h${i + 1}`,
    num: i + 1,
    roman: ROMAN[i],
    cusp: (ASC_LON + i * 30) % 360,
    desc: HOUSE_MEANINGS[i],
}));

const ASPECTS_DEF = [
    { id: 'conjunction', name: 'Conjonction', short: 'Conj.',   angle: 0,   orb: 8, color: T.color.aspConj,    glyph: '☌', desc: "Fusion d'énergies. Les planètes parlent d'une seule voix, pour le meilleur ou pour le pire." },
    { id: 'sextile',     name: 'Sextile',     short: 'Sextile', angle: 60,  orb: 4, color: T.color.aspSextile, glyph: '⚹', desc: "Opportunité fluide. Une porte qui s'ouvre si tu fais le geste." },
    { id: 'square',      name: 'Carré',       short: 'Carré',   angle: 90,  orb: 6, color: T.color.aspSquare,  glyph: '□', desc: "Tension structurante. Un défi qui pousse à la croissance par friction." },
    { id: 'trine',       name: 'Trigone',     short: 'Trigone', angle: 120, orb: 6, color: T.color.aspTrine,   glyph: '△', desc: "Flot harmonieux. Un talent naturel, qui circule sans effort." },
    { id: 'opposition',  name: 'Opposition',  short: 'Oppos.',  angle: 180, orb: 8, color: T.color.aspOppos,   glyph: '☍', desc: "Polarité face à face. Cherche l'équilibre entre deux pôles qui s'attirent et se repoussent." },
] as const;

type AspectId = typeof ASPECTS_DEF[number]['id'];

interface AspectResult {
    a: string; b: string;
    aName: string; bName: string;
    aGlyph: string; bGlyph: string;
    type: AspectId;
    typeName: string;
    color: string;
    orbActual: string;
    glyph: string;
}

function computeAspects(planets: typeof PLANETS): AspectResult[] {
    const out: AspectResult[] = [];
    for (let i = 0; i < planets.length; i++) {
        for (let j = i + 1; j < planets.length; j++) {
            const a = planets[i], b = planets[j];
            let diff = Math.abs(a.lon - b.lon) % 360;
            if (diff > 180) diff = 360 - diff;
            for (const asp of ASPECTS_DEF) {
                const delta = Math.abs(diff - asp.angle);
                if (delta <= asp.orb) {
                    out.push({
                        a: a.id, b: b.id,
                        aName: a.name, bName: b.name,
                        aGlyph: a.glyph, bGlyph: b.glyph,
                        type: asp.id as AspectId,
                        typeName: asp.name,
                        color: asp.color,
                        orbActual: delta.toFixed(1),
                        glyph: asp.glyph,
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
    return `${d}°${String(m).padStart(2,'0')}' ${sign.name}`;
}

function planetHouse(lon: number) {
    for (let i = 0; i < 12; i++) {
        const h = HOUSES[i];
        const next = HOUSES[(i + 1) % 12].cusp;
        const inSec = h.cusp < next
            ? (lon >= h.cusp && lon < next)
            : (lon >= h.cusp || lon < next);
        if (inSec) return h;
    }
    return HOUSES[0];
}

function spreadPlanets(planets: typeof PLANETS, minSep = 7) {
    const sorted = [...planets].sort((a, b) => a.lon - b.lon);
    const adjusted = new Map<string, number>();
    sorted.forEach(({ id, lon }, k) => {
        if (k === 0) { adjusted.set(id, lon); return; }
        const prevId = sorted[k - 1].id;
        const prevLon = adjusted.get(prevId)!;
        adjusted.set(id, lon - prevLon < minSep ? prevLon + minSep : lon);
    });
    return planets.map(p => ({ ...p, displayLon: adjusted.get(p.id) ?? p.lon }));
}

// ─── Chart geometry helpers ───────────────────────────────────────────────────

const C = T.chart;

function lonToRad(lon: number): number {
    return ((180 + ASC_LON - lon) * Math.PI) / 180;
}

function polar(r: number, lon: number) {
    const a = lonToRad(lon);
    return { x: C.cx + r * Math.cos(a), y: C.cy + r * Math.sin(a) };
}

function sectorPath(r1: number, r2: number, lon1: number, lon2: number): string {
    const p1 = polar(r2, lon1);
    const p2 = polar(r2, lon2);
    const p3 = polar(r1, lon2);
    const p4 = polar(r1, lon1);
    return `M ${p1.x} ${p1.y} A ${r2} ${r2} 0 0 0 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${r1} ${r1} 0 0 1 ${p4.x} ${p4.y} Z`;
}

// ─── Selection type ───────────────────────────────────────────────────────────

type Selection =
    | { kind: 'chart' }
    | { kind: 'sign';       id: string }
    | { kind: 'house';      id: string }
    | { kind: 'planet';     id: string }
    | { kind: 'aspect';     id: string; payload: AspectResult }
    | { kind: 'aspectType'; id: string; payload: typeof ASPECTS_DEF[number] };

// ─── NatalChartSvg ────────────────────────────────────────────────────────────

function NatalChartSvg({ selected, onSelect }: { selected: Selection; onSelect: (s: Selection) => void }) {
    const aspects   = useMemo(() => computeAspects(PLANETS), []);
    const placement = useMemo(() => spreadPlanets(PLANETS, 7), []);

    const selKind = selected.kind;
    const selId   = selected.kind !== 'chart' ? (selected as any).id as string : '';

    const ticks = useMemo(() => {
        const result = [];
        for (let d = 0; d < 360; d++) {
            const isMajor = d % 10 === 0;
            const isMid   = d % 5 === 0 && !isMajor;
            const r1 = C.rTickOut;
            const r2 = isMajor ? C.rTickIn : isMid ? C.rTickOut - 6 : C.rTickOut - 3;
            const p1 = polar(r1, d);
            const p2 = polar(r2, d);
            result.push(
                <Line key={d}
                    x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                    stroke="rgba(236,229,247,0.22)"
                    strokeWidth={isMajor ? 1.2 : isMid ? 0.9 : 0.55}
                />
            );
        }
        return result;
    }, []);

    return (
        <Svg viewBox="0 0 1000 1000">
            <Defs>
                <RadialGradient id="bgGlow2" cx="50%" cy="50%" r="50%">
                    <Stop offset="0%"   stopColor="rgba(155,92,255,0.10)" />
                    <Stop offset="55%"  stopColor="rgba(155,92,255,0.04)" />
                    <Stop offset="100%" stopColor="rgba(0,0,0,0)" />
                </RadialGradient>
                <RadialGradient id="centerGlow2" cx="50%" cy="50%" r="50%">
                    <Stop offset="0%"   stopColor="rgba(229,194,102,0.16)" />
                    <Stop offset="60%"  stopColor="rgba(229,194,102,0.03)" />
                    <Stop offset="100%" stopColor="rgba(0,0,0,0)" />
                </RadialGradient>
            </Defs>

            <Circle cx={C.cx} cy={C.cy} r={C.rOuter + 6} fill="url(#bgGlow2)" />

            {/* Ring outlines */}
            <Circle cx={C.cx} cy={C.cy} r={C.rOuter}      fill="none" stroke="rgba(236,229,247,0.20)" strokeWidth={1} />
            <Circle cx={C.cx} cy={C.cy} r={C.rSignInner}  fill="none" stroke="rgba(236,229,247,0.12)" strokeWidth={1} />
            <Circle cx={C.cx} cy={C.cy} r={C.rHouseInner} fill="none" stroke="rgba(236,229,247,0.10)" strokeWidth={1} />

            {/* Zodiac sectors */}
            <G>
                {SIGNS.map((s, i) => {
                    const active = selKind === 'sign' && selId === s.id;
                    const fill = active
                        ? 'rgba(229,194,102,0.18)'
                        : i % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'rgba(255,255,255,0.045)';
                    return (
                        <Path key={s.id}
                            d={sectorPath(C.rSignInner, C.rOuter, s.range[0], s.range[1])}
                            fill={fill}
                            stroke={active ? 'rgba(229,194,102,0.55)' : 'rgba(255,255,255,0.06)'}
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
                    const p = polar((C.rOuter + C.rSignInner) / 2, mid);
                    const active = selKind === 'sign' && selId === s.id;
                    return (
                        <SvgText key={`sg-${s.id}`}
                            x={p.x} y={p.y}
                            textAnchor="middle"
                            alignmentBaseline="central"
                            fontSize={34}
                            fill={active ? T.color.gold : ELEMENT_COLOR[s.element]}
                            opacity={active ? 1 : 0.92}
                        >{s.glyph}</SvgText>
                    );
                })}
            </G>

            {/* House cusp lines */}
            <G pointerEvents="none">
                {HOUSES.map((h, i) => {
                    const isAngle = i === 0 || i === 3 || i === 6 || i === 9;
                    const p1 = polar(C.rHouseInner, h.cusp);
                    const p2 = polar(C.rHouseOuter, h.cusp);
                    return (
                        <Line key={`hcusp-${i}`}
                            x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                            stroke={isAngle ? 'rgba(229,194,102,0.55)' : 'rgba(236,229,247,0.18)'}
                            strokeWidth={isAngle ? 1.5 : 0.8}
                            strokeDasharray={isAngle ? undefined : '4 4'}
                        />
                    );
                })}
            </G>

            {/* House numbers */}
            <G>
                {HOUSES.map(h => {
                    const mid = (h.cusp + 15) % 360;
                    const p = polar(C.rHouseNum, mid);
                    const active = selKind === 'house' && selId === h.id;
                    return (
                        <G key={h.id} onPress={() => onSelect({ kind: 'house', id: h.id })}>
                            <Circle cx={p.x} cy={p.y} r={22} fill="rgba(0,0,0,0.001)" />
                            <SvgText
                                x={p.x} y={p.y}
                                textAnchor="middle"
                                alignmentBaseline="central"
                                fontSize={14}
                                fontWeight="500"
                                fill={active ? T.color.gold : 'rgba(189,178,212,0.65)'}
                            >{h.roman}</SvgText>
                        </G>
                    );
                })}
            </G>

            {/* Center glow */}
            <Circle cx={C.cx} cy={C.cy} r={C.rAspect - 4} fill="url(#centerGlow2)" pointerEvents="none" />

            {/* Aspect lines */}
            <G>
                {aspects.map((asp, i) => {
                    const pa = placement.find(x => x.id === asp.a);
                    const pb = placement.find(x => x.id === asp.b);
                    if (!pa || !pb) return null;
                    const p1 = polar(C.rPlanetAnch, pa.displayLon);
                    const p2 = polar(C.rPlanetAnch, pb.displayLon);
                    const aspId = `${asp.a}-${asp.b}`;
                    const active = selKind === 'aspect' && selId === aspId;
                    return (
                        <G key={`asp-${i}`} onPress={() => onSelect({ kind: 'aspect', id: aspId, payload: asp })}>
                            <Line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                                stroke="rgba(0,0,0,0.001)" strokeWidth={14} />
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

            {/* Axis labels */}
            <G pointerEvents="none">
                {[
                    { lon: ASC_LON,                text: 'ASC', anchor: 'end',    dx: -10, dy: 4 },
                    { lon: (ASC_LON + 90) % 360,   text: 'IC',  anchor: 'middle', dx: 0,   dy: 18 },
                    { lon: (ASC_LON + 180) % 360,  text: 'DSC', anchor: 'start',  dx: 10,  dy: 4 },
                    { lon: (ASC_LON + 270) % 360,  text: 'MC',  anchor: 'middle', dx: 0,   dy: -10 },
                ].map((ax, i) => {
                    const p = polar(C.rOuter + 8, ax.lon);
                    return (
                        <SvgText key={`ax-${i}`}
                            x={p.x + ax.dx} y={p.y + ax.dy}
                            textAnchor={ax.anchor as any}
                            fontSize={14}
                            fontWeight="600"
                            fill="rgba(229,194,102,0.85)"
                        >{ax.text}</SvgText>
                    );
                })}
            </G>

            {/* Planets */}
            <G>
                {placement.map(p => {
                    const dispP  = polar(C.rPlanet, p.displayLon);
                    const tickA  = polar(C.rSignInner - 1, p.lon);
                    const tickB  = polar(C.rSignInner - 12, p.lon);
                    const linkA  = polar(C.rPlanetTick - 6, p.lon);
                    const linkB  = polar(C.rPlanet + 16, p.displayLon);
                    const active = selKind === 'planet' && selId === p.id;
                    const shifted = Math.abs(p.displayLon - p.lon) > 0.5;
                    return (
                        <G key={p.id}>
                            <Line x1={tickA.x} y1={tickA.y} x2={tickB.x} y2={tickB.y}
                                stroke="rgba(229,194,102,0.65)" strokeWidth={1.4}
                                pointerEvents="none"
                            />
                            {shifted && (
                                <Line x1={linkA.x} y1={linkA.y} x2={linkB.x} y2={linkB.y}
                                    stroke="rgba(229,194,102,0.35)" strokeWidth={0.8} strokeDasharray="2 2"
                                    pointerEvents="none"
                                />
                            )}
                            <G onPress={() => onSelect({ kind: 'planet', id: p.id })}>
                                <Circle cx={dispP.x} cy={dispP.y} r={22}
                                    fill={active ? 'rgba(229,194,102,0.95)' : 'rgba(31,23,64,0.92)'}
                                    stroke={active ? T.color.gold : 'rgba(229,194,102,0.65)'}
                                    strokeWidth={active ? 2 : 1.4}
                                />
                                <SvgText
                                    x={dispP.x} y={dispP.y + 1}
                                    textAnchor="middle"
                                    alignmentBaseline="central"
                                    fontSize={22}
                                    fill={active ? '#1A1233' : T.color.gold}
                                >{p.glyph}</SvgText>
                            </G>
                        </G>
                    );
                })}
            </G>

            <Circle cx={C.cx} cy={C.cy} r={3} fill="rgba(229,194,102,0.6)" pointerEvents="none" />
        </Svg>
    );
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function Legend({ selected, onSelect }: { selected: Selection; onSelect: (s: Selection) => void }) {
    return (
        <View style={s.legendRow}>
            {ASPECTS_DEF.map(a => {
                const active = selected.kind === 'aspectType' && (selected as any).id === a.id;
                return (
                    <Pressable key={a.id}
                        style={[s.legBtn, active && s.legBtnActive]}
                        onPress={() => onSelect({ kind: 'aspectType', id: a.id, payload: a })}
                    >
                        <View style={[s.legSwatch, { backgroundColor: a.color }]} />
                        <Text style={s.legLabel}>{a.short}</Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

// ─── Info panel ───────────────────────────────────────────────────────────────

function InfoPanel({ selected }: { selected: Selection }) {
    const aspects = useMemo(() => computeAspects(PLANETS), []);

    if (!selected || selected.kind === 'chart') {
        return (
            <View style={s.info}>
                <Text style={s.infoKicker}>Explorer</Text>
                <Text style={s.infoTitle}>Touche un élément</Text>
                <Text style={s.infoBody}>
                    Planètes, signes, maisons ou lignes d'aspect — touche pour voir le détail.
                </Text>
                <View style={s.pillRow}>
                    <InfoPill>☉ Soleil — <Text style={s.pillStrong}>Verseau</Text></InfoPill>
                    <InfoPill>☽ Lune — <Text style={s.pillStrong}>Gémeaux</Text></InfoPill>
                    <InfoPill>ASC — <Text style={s.pillStrong}>Cancer</Text></InfoPill>
                </View>
            </View>
        );
    }

    if (selected.kind === 'aspectType') {
        const def = selected.payload;
        return (
            <View style={s.info}>
                <View style={s.infoHead}>
                    <View style={[s.glyphBox, { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.10)' }]}>
                        <Text style={[s.glyphTxt, { color: def.color }]}>{def.glyph}</Text>
                    </View>
                    <View style={s.infoMeta}>
                        <Text style={s.infoKicker}>Type d'aspect</Text>
                        <Text style={s.infoTitle}>{def.name}</Text>
                        <Text style={s.infoSub}>Angle {def.angle}° · Orbe ±{def.orb}°</Text>
                    </View>
                </View>
                <Text style={s.infoBody}>{def.desc}</Text>
            </View>
        );
    }

    if (selected.kind === 'planet') {
        const p = PLANETS.find(x => x.id === selected.id)!;
        const house = planetHouse(p.lon);
        const myAspects = aspects.filter(a => a.a === p.id || a.b === p.id);
        return (
            <View style={s.info}>
                <View style={s.infoHead}>
                    <View style={s.glyphBox}>
                        <Text style={[s.glyphTxt, { color: T.color.gold }]}>{p.glyph}</Text>
                    </View>
                    <View style={s.infoMeta}>
                        <Text style={s.infoKicker}>Planète</Text>
                        <Text style={s.infoTitle}>{p.name}</Text>
                        <Text style={s.infoSub}>{formatPos(p.lon)} · Maison {house.roman}</Text>
                    </View>
                </View>
                <Text style={s.infoBody}>{p.desc}</Text>
                {myAspects.length > 0 && (
                    <View style={s.pillRow}>
                        {myAspects.slice(0, 5).map((a, i) => {
                            const otherName  = a.a === p.id ? a.bName  : a.aName;
                            const otherGlyph = a.a === p.id ? a.bGlyph : a.aGlyph;
                            return (
                                <View key={i} style={[s.pill, { borderColor: a.color }]}>
                                    <Text style={[s.pillText, { color: a.color }]}>{a.glyph} </Text>
                                    <Text style={s.pillText}>{otherGlyph} {otherName}</Text>
                                </View>
                            );
                        })}
                    </View>
                )}
            </View>
        );
    }

    if (selected.kind === 'sign') {
        const sg = SIGNS.find(x => x.id === selected.id)!;
        const planetsInSign = PLANETS.filter(p => p.lon >= sg.range[0] && p.lon < sg.range[1]);
        const ec = ELEMENT_COLOR[sg.element];
        return (
            <View style={s.info}>
                <View style={s.infoHead}>
                    <View style={[s.glyphBox, { backgroundColor: `${ec}18`, borderColor: `${ec}30` }]}>
                        <Text style={[s.glyphTxt, { color: ec }]}>{sg.glyph}</Text>
                    </View>
                    <View style={s.infoMeta}>
                        <Text style={s.infoKicker}>Signe</Text>
                        <Text style={s.infoTitle}>{sg.name}</Text>
                        <Text style={s.infoSub}>{sg.element} · {sg.modality} · {sg.ruler}</Text>
                    </View>
                </View>
                <Text style={s.infoBody}>{sg.desc}</Text>
                <View style={s.pillRow}>
                    {planetsInSign.length > 0
                        ? planetsInSign.map(p => <InfoPill key={p.id}>{p.glyph} <Text style={s.pillStrong}>{p.name}</Text></InfoPill>)
                        : <InfoPill>Aucune planète personnelle</InfoPill>
                    }
                </View>
            </View>
        );
    }

    if (selected.kind === 'house') {
        const h = HOUSES.find(x => x.id === selected.id)!;
        const next = HOUSES[h.num % 12];
        const planetsHere = PLANETS.filter(p =>
            h.cusp < next.cusp
                ? (p.lon >= h.cusp && p.lon < next.cusp)
                : (p.lon >= h.cusp || p.lon < next.cusp)
        );
        const cuspSign = lonToSign(h.cusp);
        return (
            <View style={s.info}>
                <View style={s.infoHead}>
                    <View style={s.glyphBox}>
                        <Text style={[s.glyphTxt, { color: T.color.gold, fontSize: 20 }]}>{h.roman}</Text>
                    </View>
                    <View style={s.infoMeta}>
                        <Text style={s.infoKicker}>Maison</Text>
                        <Text style={s.infoTitle}>Maison {h.num}</Text>
                        <Text style={s.infoSub}>Cuspide en {cuspSign.sign.name} {Math.floor(cuspSign.degInSign)}°</Text>
                    </View>
                </View>
                <Text style={s.infoBody}>{h.desc}</Text>
                {planetsHere.length > 0 && (
                    <View style={s.pillRow}>
                        {planetsHere.map(p => <InfoPill key={p.id}>{p.glyph} <Text style={s.pillStrong}>{p.name}</Text></InfoPill>)}
                    </View>
                )}
            </View>
        );
    }

    if (selected.kind === 'aspect') {
        const a = selected.payload;
        const def = ASPECTS_DEF.find(d => d.id === a.type)!;
        return (
            <View style={s.info}>
                <View style={s.infoHead}>
                    <View style={[s.glyphBox, { backgroundColor: `${def.color}18`, borderColor: `${def.color}30` }]}>
                        <Text style={[s.glyphTxt, { color: def.color }]}>{def.glyph}</Text>
                    </View>
                    <View style={s.infoMeta}>
                        <Text style={s.infoKicker}>Aspect</Text>
                        <Text style={s.infoTitle}>{a.typeName}</Text>
                        <Text style={s.infoSub}>{a.aGlyph} {a.aName} — {a.bGlyph} {a.bName}</Text>
                    </View>
                </View>
                <Text style={s.infoBody}>{def.desc}</Text>
                <View style={s.pillRow}>
                    <InfoPill>Angle <Text style={s.pillStrong}>{def.angle}°</Text></InfoPill>
                    <InfoPill>Orbe <Text style={s.pillStrong}>{a.orbActual}°</Text></InfoPill>
                </View>
            </View>
        );
    }

    return null;
}

function InfoPill({ children }: { children: React.ReactNode }) {
    return (
        <View style={s.pill}>
            <Text style={s.pillText}>{children}</Text>
        </View>
    );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ThemeNatalDesignScreen() {
    const router   = useRouter();
    const insets   = useSafeAreaInsets();
    const [selected, setSelected] = useState<Selection>({ kind: 'chart' });

    const chartSize = Math.min(Dimensions.get('window').width - 40, 480);

    const handleSelect = useCallback((next: Selection) => {
        setSelected(prev => {
            const sameKind = prev.kind === next.kind;
            const sameId   = (prev as any).id === (next as any).id;
            return sameKind && sameId ? { kind: 'chart' } : next;
        });
    }, []);

    return (
        <View style={[s.root, { paddingTop: insets.top }]}>
            <ScrollView
                style={s.scroll}
                contentContainerStyle={[s.scrollContent, { paddingBottom: 48 + insets.bottom }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Back button */}
                <View style={s.topbar}>
                    <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
                        <Feather name="arrow-left" size={20} color={T.color.text} />
                    </Pressable>

                    <View style={s.brand}>
                        <Text style={s.brandStar}>✦</Text>
                        <Text style={s.brandText}>Lunestia</Text>
                    </View>

                    <View style={s.backBtn} />
                </View>

                {/* Chip */}
                <View style={s.chipRow}>
                    <View style={s.chip}>
                        <View style={s.chipDot} />
                        <Text style={s.chipText}>Thème astral</Text>
                    </View>
                </View>

                {/* Title */}
                <Text style={s.title}>Votre carte du ciel</Text>
                <Text style={s.subtitle}>
                    Touchez les planètes, signes, maisons ou lignes d'aspect pour explorer leur signification.
                </Text>

                {/* Birth meta */}
                <View style={s.meta}>
                    {[
                        { icon: 'calendar' as const, text: '12 février 1995' },
                        { icon: 'clock'    as const, text: '15:40' },
                        { icon: 'map-pin'  as const, text: 'Rennes, France' },
                    ].map(item => (
                        <View key={item.text} style={s.metaItem}>
                            <Feather name={item.icon} size={12} color={T.color.gold} />
                            <Text style={s.metaText}>{item.text}</Text>
                        </View>
                    ))}
                </View>

                {/* Chart */}
                <View style={[s.chartWrap, { width: chartSize, height: chartSize }]}>
                    <NatalChartSvg selected={selected} onSelect={handleSelect} />
                </View>

                {/* Legend */}
                <Legend selected={selected} onSelect={handleSelect} />

                {/* Info panel */}
                <InfoPanel selected={selected} />
            </ScrollView>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: T.color.bg },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingTop: 4 },

    /* Topbar */
    topbar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        marginBottom: 10,
    },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    brand:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
    brandStar: { fontSize: 14, color: T.color.gold },
    brandText: {
        fontFamily: fonts.display.regular,
        fontSize: 20,
        color: T.color.text,
    },

    /* Chip */
    chipRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
    chip: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 14, paddingVertical: 9,
        borderRadius: T.radius.pill,
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderWidth: 1, borderColor: T.color.border,
    },
    chipDot: { width: 8, height: 8, borderRadius: 999, backgroundColor: T.color.gold },
    chipText: {
        fontFamily: fonts.body.semiBold,
        fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase',
        color: T.color.text,
    },

    /* Title */
    title: {
        fontFamily: fonts.display.regular,
        fontSize: 38, lineHeight: 44,
        color: '#EFE6FF',
        marginTop: 4, marginBottom: 8,
    },
    subtitle: {
        fontFamily: fonts.body.regular,
        fontSize: 14, lineHeight: 21,
        color: T.color.text2,
        maxWidth: 320,
        marginBottom: 16,
    },

    /* Birth meta */
    meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
    metaItem: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 12, paddingVertical: 8,
        borderRadius: T.radius.md,
        backgroundColor: 'rgba(255,255,255,0.035)',
        borderWidth: 1, borderColor: T.color.border,
    },
    metaText: { fontFamily: fonts.body.medium, fontSize: 12.5, color: T.color.text },

    /* Chart */
    chartWrap: { alignSelf: 'center', marginVertical: 10 },

    /* Legend */
    legendRow: { flexDirection: 'row', gap: 6, marginVertical: 8 },
    legBtn: {
        flex: 1, alignItems: 'center', gap: 4,
        paddingVertical: 8, paddingHorizontal: 4,
        borderRadius: T.radius.sm,
        backgroundColor: 'rgba(255,255,255,0.025)',
        borderWidth: 1, borderColor: T.color.border,
    },
    legBtnActive: { borderColor: 'rgba(255,255,255,0.22)', backgroundColor: 'rgba(255,255,255,0.06)' },
    legSwatch: { width: 22, height: 3, borderRadius: 2 },
    legLabel:  { fontFamily: fonts.body.medium, fontSize: 10.5, letterSpacing: 0.5, color: T.color.text2 },

    /* Info panel */
    info: {
        marginTop: 8,
        padding: 18, paddingBottom: 20,
        borderRadius: T.radius.xl,
        backgroundColor: T.color.card,
        borderWidth: 1, borderColor: T.color.borderStrong,
        minHeight: 150,
    },
    infoHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 14 },
    glyphBox: {
        width: 52, height: 52, borderRadius: 14,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(229,194,102,0.10)',
        borderWidth: 1, borderColor: 'rgba(229,194,102,0.20)',
    },
    glyphTxt: { fontSize: 28, color: T.color.gold },
    infoMeta: { flex: 1 },
    infoKicker: {
        fontFamily: fonts.body.semiBold,
        fontSize: 10.5, letterSpacing: 1.6,
        color: T.color.text3, marginBottom: 4,
        textTransform: 'uppercase',
    },
    infoTitle: {
        fontFamily: fonts.display.regular,
        fontSize: 24, color: T.color.text, lineHeight: 28,
    },
    infoSub: {
        fontFamily: fonts.body.regular,
        fontSize: 12.5, color: T.color.text2, marginTop: 4,
    },
    infoBody: {
        fontFamily: fonts.body.regular,
        fontSize: 14, lineHeight: 22, color: T.color.text2,
    },

    /* Pills */
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
    pill: {
        flexDirection: 'row',
        paddingHorizontal: 10, paddingVertical: 5,
        borderRadius: T.radius.pill,
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderWidth: 1, borderColor: T.color.border,
    },
    pillText: { fontFamily: fonts.body.regular, fontSize: 11.5, color: T.color.text2 },
    pillStrong: { fontFamily: fonts.body.semiBold, color: T.color.text },
});
