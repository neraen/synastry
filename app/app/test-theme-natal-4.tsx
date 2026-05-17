/**
 * test-theme-natal-4 — Conversion pixel-perfect de theme-natal-native en React Native.
 * Toutes les sous-composantes sont inlinées ici pour que la page soit autonome.
 * Fonts mappées : DMSerifDisplay → NotoSerif_400Regular | PlusJakartaSans → Manrope_*
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, {
  Defs, RadialGradient, Stop,
  Circle, G, Line, Path,
  Text as SvgText,
  Polygon, Polyline, Rect,
} from 'react-native-svg';

/* ─────────────────────────────────────────────
   TOKENS
───────────────────────────────────────────── */
const tokens = {
  color: {
    bg:       '#120A24',
    bg2:      '#1A1233',
    card:     '#1F1740',
    card2:    '#261B4D',
    border:        'rgba(255,255,255,0.07)',
    borderStrong:  'rgba(255,255,255,0.12)',

    gold:     '#E5C266',
    goldDim:  '#B89549',
    goldSoft: 'rgba(229,194,102,0.16)',

    text:  '#ECE5F7',
    text2: '#BDB2D4',
    text3: '#8A82A6',

    violet: '#9B5CFF',
    pink:   '#E55A8C',
    green:  '#4ADE80',

    aspConj:    '#E5C266',
    aspTrine:   '#4ADE80',
    aspSextile: '#5DA9F5',
    aspSquare:  '#E89B4C',
    aspOppos:   '#E55A8C',
  },

  font: {
    serif:      'NotoSerif_400Regular',
    sans:       'Manrope_400Regular',
    sansMedium: 'Manrope_500Medium',
    sansSemi:   'Manrope_600SemiBold',
    sansBold:   'Manrope_700Bold',
  },

  radius: {
    sm: 10,
    md: 14,
    lg: 18,
    xl: 22,
    pill: 999,
  },

  chart: {
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
  },
} as const;

/* ─────────────────────────────────────────────
   ASTROLOGY DATA
───────────────────────────────────────────── */
type Sign = {
  id: string; name: string; glyph: string;
  element: 'Feu' | 'Terre' | 'Air' | 'Eau';
  modality: 'Cardinal' | 'Fixe' | 'Mutable';
  ruler: string; range: [number, number]; desc: string;
};
type Planet = { id: string; name: string; glyph: string; lon: number; desc: string; };
type House  = { id: string; num: number; roman: string; cusp: number; desc: string; };
type AspectDef = {
  id: string; name: string; short: string; angle: number; orb: number;
  color: string; glyph: string; desc: string;
};
type Aspect = {
  a: string; b: string;
  aName: string; bName: string;
  aGlyph: string; bGlyph: string;
  type: string; typeName: string; color: string; orbActual: string;
};

const SIGNS: Sign[] = [
  { id: 'aries',       name: 'Bélier',     glyph: '♈', element: 'Feu',   modality: 'Cardinal', ruler: 'Mars',    range: [0, 30],
    desc: "Pionnier impulsif, le Bélier ouvre le zodiaque avec courage. Énergie d'initiative, besoin d'agir, parfois sans détour." },
  { id: 'taurus',      name: 'Taureau',    glyph: '♉', element: 'Terre', modality: 'Fixe',     ruler: 'Vénus',   range: [30, 60],
    desc: "Sensuel, posé, attaché à la beauté et à la stabilité. Le Taureau construit lentement mais sûrement." },
  { id: 'gemini',      name: 'Gémeaux',    glyph: '♊', element: 'Air',   modality: 'Mutable',  ruler: 'Mercure', range: [60, 90],
    desc: "Vif, curieux, communicant. Les Gémeaux relient les idées et les gens, en surface comme en profondeur." },
  { id: 'cancer',      name: 'Cancer',     glyph: '♋', element: 'Eau',   modality: 'Cardinal', ruler: 'Lune',    range: [90, 120],
    desc: "Émotionnel, protecteur, attaché à ses racines. Le Cancer ressent avant de penser." },
  { id: 'leo',         name: 'Lion',       glyph: '♌', element: 'Feu',   modality: 'Fixe',     ruler: 'Soleil',  range: [120, 150],
    desc: "Rayonnant, généreux, créatif. Le Lion cherche à exprimer pleinement sa singularité." },
  { id: 'virgo',       name: 'Vierge',     glyph: '♍', element: 'Terre', modality: 'Mutable',  ruler: 'Mercure', range: [150, 180],
    desc: "Analytique, méthodique, au service. La Vierge affine, trie, perfectionne le réel." },
  { id: 'libra',       name: 'Balance',    glyph: '♎', element: 'Air',   modality: 'Cardinal', ruler: 'Vénus',   range: [180, 210],
    desc: "Diplomate, esthète, en quête d'harmonie. La Balance pèse, équilibre, relie à l'autre." },
  { id: 'scorpio',     name: 'Scorpion',   glyph: '♏', element: 'Eau',   modality: 'Fixe',     ruler: 'Pluton',  range: [210, 240],
    desc: "Intense, transformateur, magnétique. Le Scorpion descend dans les profondeurs pour renaître." },
  { id: 'sagittarius', name: 'Sagittaire', glyph: '♐', element: 'Feu',   modality: 'Mutable',  ruler: 'Jupiter', range: [240, 270],
    desc: "Aventurier, philosophe, optimiste. Le Sagittaire vise large, cherche du sens dans l'horizon." },
  { id: 'capricorn',   name: 'Capricorne', glyph: '♑', element: 'Terre', modality: 'Cardinal', ruler: 'Saturne', range: [270, 300],
    desc: "Structurant, ambitieux, patient. Le Capricorne construit dans la durée, avec discipline." },
  { id: 'aquarius',    name: 'Verseau',    glyph: '♒', element: 'Air',   modality: 'Fixe',     ruler: 'Uranus',  range: [300, 330],
    desc: "Visionnaire, indépendant, collectif. Le Verseau pense différemment et invente l'avenir." },
  { id: 'pisces',      name: 'Poissons',   glyph: '♓', element: 'Eau',   modality: 'Mutable',  ruler: 'Neptune', range: [330, 360],
    desc: "Sensible, mystique, fluide. Les Poissons dissolvent les frontières et accueillent l'invisible." },
];

const ELEMENT_COLOR: Record<Sign['element'], string> = {
  'Feu':   '#E89B4C',
  'Terre': '#A3B86C',
  'Air':   '#7DB5E8',
  'Eau':   '#9B7BE8',
};

const PLANETS: Planet[] = [
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

const ASC_LON = 105;

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
const HOUSES: House[] = Array.from({ length: 12 }, (_, i) => ({
  id:    `h${i + 1}`,
  num:   i + 1,
  roman: ROMAN[i],
  cusp:  (ASC_LON + i * 30) % 360,
  desc:  HOUSE_MEANINGS[i],
}));

const ASPECTS_DEF: AspectDef[] = [
  { id: 'conjunction', name: 'Conjonction', short: 'Conj.',   angle: 0,   orb: 8, color: tokens.color.aspConj,    glyph: '☌',
    desc: "Fusion d'énergies. Les planètes parlent d'une seule voix, pour le meilleur ou pour le pire." },
  { id: 'sextile',     name: 'Sextile',     short: 'Sextile', angle: 60,  orb: 4, color: tokens.color.aspSextile, glyph: '⚹',
    desc: "Opportunité fluide. Une porte qui s'ouvre si tu fais le geste." },
  { id: 'square',      name: 'Carré',       short: 'Carré',   angle: 90,  orb: 6, color: tokens.color.aspSquare,  glyph: '□',
    desc: "Tension structurante. Un défi qui pousse à la croissance par friction." },
  { id: 'trine',       name: 'Trigone',     short: 'Trigone', angle: 120, orb: 6, color: tokens.color.aspTrine,   glyph: '△',
    desc: "Flot harmonieux. Un talent naturel, qui circule sans effort." },
  { id: 'opposition',  name: 'Opposition',  short: 'Oppos.',  angle: 180, orb: 8, color: tokens.color.aspOppos,   glyph: '☍',
    desc: "Polarité face à face. Cherche l'équilibre entre deux pôles qui s'attirent et se repoussent." },
];

const BIRTH = { date: '12 février 1995', time: '15:40', place: 'Rennes, France' };

function computeAspects(planets: Planet[]): Aspect[] {
  const out: Aspect[] = [];
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
            type: asp.id, typeName: asp.name,
            color: asp.color,
            orbActual: delta.toFixed(1),
          });
          break;
        }
      }
    }
  }
  return out;
}

function lonToSign(lon: number): { sign: Sign; degInSign: number } {
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

function planetHouse(lon: number): House {
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

/* ─────────────────────────────────────────────
   ICONS
───────────────────────────────────────────── */
type P = { size?: number; color?: string };

const stroke = (color: string) => ({
  stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none',
});

const SparkleIcon = ({ size = 16, color = '#E5C266' }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 2l2.3 6.7L21 11l-6.7 2.3L12 20l-2.3-6.7L3 11l6.7-2.3L12 2z" fill={color} />
  </Svg>
);

const HelpIcon = ({ size = 14, color = '#BDB2D4' }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx="12" cy="12" r="10" {...stroke(color)} />
    <Path d="M9.09 9a3 3 0 1 1 5.83 1c0 2-3 2-3 4" {...stroke(color)} />
    <Circle cx="12" cy="17" r="0.6" fill={color} />
  </Svg>
);

const PinIcon = ({ size = 14, color = '#E5C266' }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" {...stroke(color)} />
    <Circle cx="12" cy="10" r="3" {...stroke(color)} />
  </Svg>
);

const CakeIcon = ({ size = 14, color = '#E5C266' }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Rect x="3" y="11" width="18" height="10" rx="2" {...stroke(color)} />
    <Path d="M3 15h18M8 11V8m4 3V8m4 3V8" {...stroke(color)} />
  </Svg>
);

const ClockIcon = ({ size = 14, color = '#E5C266' }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx="12" cy="12" r="10" {...stroke(color)} />
    <Polyline points="12 6 12 12 16 14" {...stroke(color)} />
  </Svg>
);

const SunIcon = ({ size = 22, color = '#BDB2D4' }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx="12" cy="12" r="4" {...stroke(color)} />
    <Path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" {...stroke(color)} />
  </Svg>
);

const StarIcon = ({ size = 22, color = '#E5C266', filled = true }: P & { filled?: boolean }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Polygon
      points="12,2 14.9,8.9 22,9.7 16.7,14.4 18.2,22 12,18.3 5.8,22 7.3,14.4 2,9.7 9.1,8.9"
      fill={filled ? color : 'none'} stroke={color} strokeWidth={2} strokeLinejoin="round"
    />
  </Svg>
);

const HeartIcon = ({ size = 22, color = '#BDB2D4' }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" {...stroke(color)} />
  </Svg>
);

const ChatIcon = ({ size = 22, color = '#BDB2D4' }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" {...stroke(color)} />
  </Svg>
);

const BoltIcon = ({ size = 22, color = '#BDB2D4' }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Polygon points="13,2 3,14 12,14 11,22 21,10 12,10" {...stroke(color)} />
  </Svg>
);

/* ─────────────────────────────────────────────
   NATAL CHART
───────────────────────────────────────────── */
const C = tokens.chart;

function lonToRad(lon: number): number {
  return ((180 + ASC_LON - lon) * Math.PI) / 180;
}
function polar(r: number, lon: number): { x: number; y: number } {
  const a = lonToRad(lon);
  return { x: C.cx + r * Math.cos(a), y: C.cy + r * Math.sin(a) };
}
function sectorPath(r1: number, r2: number, lon1: number, lon2: number): string {
  const p1 = polar(r2, lon1);
  const p2 = polar(r2, lon2);
  const p3 = polar(r1, lon2);
  const p4 = polar(r1, lon1);
  return `M ${p1.x} ${p1.y}
          A ${r2} ${r2} 0 0 0 ${p2.x} ${p2.y}
          L ${p3.x} ${p3.y}
          A ${r1} ${r1} 0 0 1 ${p4.x} ${p4.y} Z`;
}

type Placed = Planet & { displayLon: number };

function spreadPlanets(planets: Planet[], minSep = 7): Placed[] {
  const sorted = planets
    .map((p, i) => ({ p, i }))
    .sort((a, b) => a.p.lon - b.p.lon);
  const adjusted = new Map<string, number>();
  sorted.forEach(({ p }, k) => {
    if (k === 0) { adjusted.set(p.id, p.lon); return; }
    const prevId = sorted[k - 1].p.id;
    const prevLon = adjusted.get(prevId)!;
    const gap = p.lon - prevLon;
    adjusted.set(p.id, gap < minSep ? prevLon + minSep : p.lon);
  });
  return planets.map((p) => ({ ...p, displayLon: adjusted.get(p.id) ?? p.lon }));
}

type Selection =
  | { kind: 'chart' }
  | { kind: 'sign'; id: string }
  | { kind: 'house'; id: string }
  | { kind: 'planet'; id: string }
  | { kind: 'aspect'; id: string; payload: Aspect }
  | { kind: 'aspectType'; id: string; payload: any };

function NatalChart({ selected, onSelect }: { selected: Selection; onSelect: (s: Selection) => void }) {
  const aspects   = useMemo(() => computeAspects(PLANETS), []);
  const placement = useMemo(() => spreadPlanets(PLANETS, 7), []);

  const selKind = selected?.kind;
  const selId   = (selected as any)?.id;

  const ticks = [];
  for (let d = 0; d < 360; d++) {
    const isMajor = d % 10 === 0;
    const isMid   = d % 5 === 0 && !isMajor;
    const r1 = C.rTickOut;
    const r2 = isMajor ? C.rTickIn : isMid ? C.rTickOut - 6 : C.rTickOut - 3;
    const p1 = polar(r1, d);
    const p2 = polar(r2, d);
    ticks.push(
      <Line
        key={`t${d}`}
        x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
        stroke="rgba(236,229,247,0.22)"
        strokeWidth={isMajor ? 1.2 : isMid ? 0.9 : 0.55}
      />
    );
  }

  return (
    <Svg viewBox="0 0 1000 1000">
      <Defs>
        <RadialGradient id="bgGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0%"  stopColor="rgba(155,92,255,0.10)" />
          <Stop offset="55%" stopColor="rgba(155,92,255,0.04)" />
          <Stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </RadialGradient>
        <RadialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0%"  stopColor="rgba(229,194,102,0.16)" />
          <Stop offset="60%" stopColor="rgba(229,194,102,0.03)" />
          <Stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </RadialGradient>
      </Defs>

      <Circle cx={C.cx} cy={C.cy} r={C.rOuter + 6} fill="url(#bgGlow)" />

      <Circle cx={C.cx} cy={C.cy} r={C.rOuter}      fill="none" stroke="rgba(236,229,247,0.20)" strokeWidth={1} />
      <Circle cx={C.cx} cy={C.cy} r={C.rSignInner}  fill="none" stroke="rgba(236,229,247,0.12)" strokeWidth={1} />
      <Circle cx={C.cx} cy={C.cy} r={C.rHouseInner} fill="none" stroke="rgba(236,229,247,0.10)" strokeWidth={1} />

      <G>
        {SIGNS.map((s, i) => {
          const active = selKind === 'sign' && selId === s.id;
          const fill = active
            ? 'rgba(229,194,102,0.18)'
            : i % 2 === 0
              ? 'rgba(255,255,255,0.025)'
              : 'rgba(255,255,255,0.045)';
          return (
            <Path
              key={s.id}
              d={sectorPath(C.rSignInner, C.rOuter, s.range[0], s.range[1])}
              fill={fill}
              stroke={active ? 'rgba(229,194,102,0.55)' : 'rgba(255,255,255,0.06)'}
              strokeWidth={active ? 1.5 : 0.6}
              onPress={() => onSelect({ kind: 'sign', id: s.id })}
            />
          );
        })}
      </G>

      <G>{ticks}</G>

      <G>
        {SIGNS.map((s) => {
          const mid = (s.range[0] + s.range[1]) / 2;
          const p = polar((C.rOuter + C.rSignInner) / 2, mid);
          const active = selKind === 'sign' && selId === s.id;
          return (
            <SvgText
              key={s.id + '-g'}
              x={p.x} y={p.y}
              textAnchor="middle"
              alignmentBaseline="central"
              fontSize={34}
              fill={active ? tokens.color.gold : ELEMENT_COLOR[s.element]}
              opacity={active ? 1 : 0.92}
            >{s.glyph}</SvgText>
          );
        })}
      </G>

      <G>
        {HOUSES.map((h, i) => {
          const isAngle = i === 0 || i === 3 || i === 6 || i === 9;
          const p1 = polar(C.rHouseInner, h.cusp);
          const p2 = polar(C.rHouseOuter, h.cusp);
          return (
            <Line
              key={`hcusp${i}`}
              x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
              stroke={isAngle ? 'rgba(229,194,102,0.55)' : 'rgba(236,229,247,0.18)'}
              strokeWidth={isAngle ? 1.5 : 0.8}
              strokeDasharray={isAngle ? undefined : '4,4'}
            />
          );
        })}
      </G>

      <G>
        {HOUSES.map((h) => {
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
                fontFamily={tokens.font.serif}
                fill={active ? tokens.color.gold : 'rgba(189,178,212,0.65)'}
              >{h.roman}</SvgText>
            </G>
          );
        })}
      </G>

      <Circle cx={C.cx} cy={C.cy} r={C.rAspect - 4} fill="url(#centerGlow)" />

      <G>
        {aspects.map((asp, i) => {
          const pa = placement.find((x) => x.id === asp.a)!;
          const pb = placement.find((x) => x.id === asp.b)!;
          const p1 = polar(C.rPlanetAnch, pa.displayLon);
          const p2 = polar(C.rPlanetAnch, pb.displayLon);
          const id = `${asp.a}-${asp.b}`;
          const active = selKind === 'aspect' && selId === id;
          return (
            <G key={`asp${i}`} onPress={() => onSelect({ kind: 'aspect', id, payload: asp })}>
              <Line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                stroke="rgba(0,0,0,0.001)" strokeWidth={14} />
              <Line
                x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                stroke={asp.color}
                strokeWidth={active ? 2.4 : 1.5}
                opacity={active ? 1 : 0.72}
                strokeLinecap="round"
              />
            </G>
          );
        })}
      </G>

      <G>
        {[
          { lon: ASC_LON,                 text: 'ASC', anchor: 'end',    dx: -10, dy: 4 },
          { lon: (ASC_LON + 90) % 360,    text: 'IC',  anchor: 'middle', dx: 0,   dy: 18 },
          { lon: (ASC_LON + 180) % 360,   text: 'DSC', anchor: 'start',  dx: 10,  dy: 4 },
          { lon: (ASC_LON + 270) % 360,   text: 'MC',  anchor: 'middle', dx: 0,   dy: -10 },
        ].map((a, i) => {
          const p = polar(C.rOuter + 8, a.lon);
          return (
            <SvgText
              key={`ax${i}`}
              x={p.x + a.dx} y={p.y + a.dy}
              textAnchor={a.anchor as any}
              fontSize={14}
              fontWeight="600"
              fontFamily={tokens.font.sansSemi}
              fill="rgba(229,194,102,0.85)"
            >{a.text}</SvgText>
          );
        })}
      </G>

      <G>
        {placement.map((p) => {
          const dispP = polar(C.rPlanet, p.displayLon);
          const tickA = polar(C.rSignInner - 1, p.lon);
          const tickB = polar(C.rSignInner - 12, p.lon);
          const linkA = polar(C.rPlanetTick - 6, p.lon);
          const linkB = polar(C.rPlanet + 16, p.displayLon);
          const active = selKind === 'planet' && selId === p.id;
          const shifted = Math.abs(p.displayLon - p.lon) > 0.5;

          return (
            <G key={p.id}>
              <Line
                x1={tickA.x} y1={tickA.y} x2={tickB.x} y2={tickB.y}
                stroke="rgba(229,194,102,0.65)" strokeWidth={1.4}
              />
              {shifted && (
                <Line
                  x1={linkA.x} y1={linkA.y} x2={linkB.x} y2={linkB.y}
                  stroke="rgba(229,194,102,0.35)" strokeWidth={0.8} strokeDasharray="2,2"
                />
              )}
              <G onPress={() => onSelect({ kind: 'planet', id: p.id })}>
                <Circle cx={dispP.x} cy={dispP.y} r={22}
                  fill={active ? 'rgba(229,194,102,0.95)' : 'rgba(31,23,64,0.92)'}
                  stroke={active ? tokens.color.gold : 'rgba(229,194,102,0.65)'}
                  strokeWidth={active ? 2 : 1.4}
                />
                <SvgText
                  x={dispP.x} y={dispP.y + 1}
                  textAnchor="middle"
                  alignmentBaseline="central"
                  fontSize={22}
                  fill={active ? '#1A1233' : tokens.color.gold}
                >{p.glyph}</SvgText>
              </G>
            </G>
          );
        })}
      </G>

      <Circle cx={C.cx} cy={C.cy} r={3} fill="rgba(229,194,102,0.6)" />
    </Svg>
  );
}

/* ─────────────────────────────────────────────
   LEGEND
───────────────────────────────────────────── */
function Legend({ selected, onSelect }: { selected: Selection; onSelect: (s: Selection) => void }) {
  return (
    <View style={ls.row} accessibilityRole="tablist">
      {ASPECTS_DEF.map((a) => {
        const active = selected?.kind === 'aspectType' && (selected as any).id === a.id;
        return (
          <Pressable
            key={a.id}
            onPress={() => onSelect({ kind: 'aspectType', id: a.id, payload: a })}
            style={[ls.leg, active && ls.legActive]}
          >
            <View style={[ls.swatch, { backgroundColor: a.color }]} />
            <Text style={ls.legText}>{a.short}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const ls = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, marginVertical: 8 },
  leg: {
    flex: 1, alignItems: 'center',
    paddingVertical: 8, paddingHorizontal: 4,
    borderRadius: tokens.radius.sm,
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderWidth: 1, borderColor: tokens.color.border, gap: 4,
  },
  legActive: { borderColor: 'rgba(255,255,255,0.22)', backgroundColor: 'rgba(255,255,255,0.06)' },
  swatch: { width: 22, height: 3, borderRadius: 2 },
  legText: { fontSize: 10.5, letterSpacing: 0.5, color: tokens.color.text2, fontFamily: tokens.font.sansMedium },
});

/* ─────────────────────────────────────────────
   INFO PANEL
───────────────────────────────────────────── */
const aspectGlyphFor = (typeName: string) => {
  switch (typeName) {
    case 'Conjonction': return '☌';
    case 'Trigone':     return '△';
    case 'Carré':       return '□';
    case 'Sextile':     return '⚹';
    case 'Opposition':  return '☍';
    default: return '·';
  }
};

const Pill = ({ children, color }: { children: React.ReactNode; color?: string }) => (
  <View style={[is.pill, color ? { borderColor: color } : null]}>
    <Text style={is.pillText}>{children}</Text>
  </View>
);

function InfoPanel({ selected }: { selected: Selection }) {
  if (!selected || selected.kind === 'chart') {
    return (
      <View style={is.info}>
        <Text style={is.kicker}>Explore</Text>
        <Text style={is.title}>Touche un élément</Text>
        <Text style={is.sub}>
          Planètes, signes, maisons ou lignes d'aspect — touche pour voir le détail.
        </Text>
        <View style={is.pillRow}>
          <Pill>☉ Soleil — <Text style={is.pillStrong}>Verseau</Text></Pill>
          <Pill>☽ Lune — <Text style={is.pillStrong}>Gémeaux</Text></Pill>
          <Pill>ASC — <Text style={is.pillStrong}>Cancer</Text></Pill>
        </View>
      </View>
    );
  }

  if (selected.kind === 'aspectType') {
    const def = selected.payload as AspectDef;
    return (
      <View style={is.info}>
        <View style={is.head}>
          <View style={[is.glyphBox, { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.10)' }]}>
            <Text style={[is.glyphTxt, { color: def.color }]}>{def.glyph}</Text>
          </View>
          <View style={is.meta}>
            <Text style={is.kicker}>Type d'aspect</Text>
            <Text style={is.title}>{def.name}</Text>
            <Text style={is.sub}>Angle de {def.angle}° · Orbe ±{def.orb}°</Text>
          </View>
        </View>
        <Text style={is.body}>{def.desc}</Text>
      </View>
    );
  }

  if (selected.kind === 'planet') {
    const p = PLANETS.find((x) => x.id === selected.id)!;
    const house = planetHouse(p.lon);
    const myAspects = computeAspects(PLANETS).filter((a) => a.a === p.id || a.b === p.id);
    return (
      <View style={is.info}>
        <View style={is.head}>
          <View style={is.glyphBox}>
            <Text style={[is.glyphTxt, { color: tokens.color.gold }]}>{p.glyph}</Text>
          </View>
          <View style={is.meta}>
            <Text style={is.kicker}>Planète</Text>
            <Text style={is.title}>{p.name}</Text>
            <Text style={is.sub}>{formatPos(p.lon)} · Maison {house.roman}</Text>
          </View>
        </View>
        <Text style={is.body}>{p.desc}</Text>
        {myAspects.length > 0 && (
          <View style={is.pillRow}>
            {myAspects.slice(0, 5).map((a, i) => {
              const otherName  = a.a === p.id ? a.bName  : a.aName;
              const otherGlyph = a.a === p.id ? a.bGlyph : a.aGlyph;
              return (
                <View key={i} style={[is.pill, { borderColor: a.color }]}>
                  <Text style={[is.pillText, { color: a.color }]}>{aspectGlyphFor(a.typeName)} </Text>
                  <Text style={is.pillText}>{otherGlyph} {otherName}</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  }

  if (selected.kind === 'sign') {
    const sg = SIGNS.find((x) => x.id === selected.id)!;
    const planetsInSign = PLANETS.filter((p) => p.lon >= sg.range[0] && p.lon < sg.range[1]);
    return (
      <View style={is.info}>
        <View style={is.head}>
          <View style={[is.glyphBox, { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.10)' }]}>
            <Text style={[is.glyphTxt, { color: ELEMENT_COLOR[sg.element] }]}>{sg.glyph}</Text>
          </View>
          <View style={is.meta}>
            <Text style={is.kicker}>Signe</Text>
            <Text style={is.title}>{sg.name}</Text>
            <Text style={is.sub}>{sg.element} · {sg.modality} · Régi par {sg.ruler}</Text>
          </View>
        </View>
        <Text style={is.body}>{sg.desc}</Text>
        {planetsInSign.length > 0 ? (
          <View style={is.pillRow}>
            {planetsInSign.map((p) => (
              <Pill key={p.id}>{p.glyph} <Text style={is.pillStrong}>{p.name}</Text></Pill>
            ))}
          </View>
        ) : (
          <View style={is.pillRow}><Pill>Aucune planète personnelle</Pill></View>
        )}
      </View>
    );
  }

  if (selected.kind === 'house') {
    const h = HOUSES.find((x) => x.id === selected.id)!;
    const next = HOUSES[h.num % 12].cusp;
    const planetsHere = PLANETS.filter((p) =>
      h.cusp < next ? (p.lon >= h.cusp && p.lon < next) : (p.lon >= h.cusp || p.lon < next)
    );
    const cuspSign = lonToSign(h.cusp);
    return (
      <View style={is.info}>
        <View style={is.head}>
          <View style={is.glyphBox}>
            <Text style={[is.glyphTxt, { color: tokens.color.gold, fontFamily: tokens.font.serif, fontSize: 28 }]}>{h.roman}</Text>
          </View>
          <View style={is.meta}>
            <Text style={is.kicker}>Maison</Text>
            <Text style={is.title}>Maison {h.num}</Text>
            <Text style={is.sub}>Cuspide en {cuspSign.sign.name} {Math.floor(cuspSign.degInSign)}°</Text>
          </View>
        </View>
        <Text style={is.body}>{h.desc}</Text>
        {planetsHere.length > 0 && (
          <View style={is.pillRow}>
            {planetsHere.map((p) => (
              <Pill key={p.id}>{p.glyph} <Text style={is.pillStrong}>{p.name}</Text></Pill>
            ))}
          </View>
        )}
      </View>
    );
  }

  if (selected.kind === 'aspect') {
    const a = selected.payload as Aspect;
    const def = ASPECTS_DEF.find((d) => d.id === a.type)!;
    return (
      <View style={is.info}>
        <View style={is.head}>
          <View style={[is.glyphBox, { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.10)' }]}>
            <Text style={[is.glyphTxt, { color: def.color }]}>{def.glyph}</Text>
          </View>
          <View style={is.meta}>
            <Text style={is.kicker}>Aspect</Text>
            <Text style={is.title}>{a.typeName}</Text>
            <Text style={is.sub}>{a.aGlyph} {a.aName} — {a.bGlyph} {a.bName}</Text>
          </View>
        </View>
        <Text style={is.body}>{def.desc}</Text>
        <View style={is.pillRow}>
          <Pill>Angle <Text style={is.pillStrong}>{def.angle}°</Text></Pill>
          <Pill>Orbe <Text style={is.pillStrong}>{a.orbActual}°</Text></Pill>
        </View>
      </View>
    );
  }

  return null;
}

const is = StyleSheet.create({
  info: {
    marginTop: 8, padding: 18, paddingBottom: 20,
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.color.card,
    borderWidth: 1, borderColor: tokens.color.borderStrong,
    minHeight: 150,
  },
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 14 },
  glyphBox: {
    width: 52, height: 52, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(229,194,102,0.10)',
    borderWidth: 1, borderColor: 'rgba(229,194,102,0.20)',
  },
  glyphTxt: { fontSize: 28 },
  meta: { flex: 1, marginLeft: 14 },
  kicker: {
    fontSize: 11, letterSpacing: 1.6,
    color: tokens.color.text3, marginBottom: 4,
    fontFamily: tokens.font.sansSemi, textTransform: 'uppercase',
  },
  title: { fontFamily: tokens.font.serif, fontSize: 26, color: tokens.color.text, lineHeight: 30 },
  sub: { fontSize: 13, color: tokens.color.text2, marginTop: 4, fontFamily: tokens.font.sans },
  body: { fontSize: 14.5, lineHeight: 22, color: tokens.color.text2, fontFamily: tokens.font.sans },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  pill: {
    flexDirection: 'row',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: tokens.radius.pill,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: tokens.color.border,
  },
  pillText: { fontSize: 11.5, color: tokens.color.text2, fontFamily: tokens.font.sans },
  pillStrong: { color: tokens.color.text, fontFamily: tokens.font.sansSemi },
});

/* ─────────────────────────────────────────────
   TAB BAR
───────────────────────────────────────────── */
type TabId = 'horo' | 'natal' | 'compa' | 'lyra' | 'cal';

function TabBar({ active = 'natal' as TabId }: { active?: TabId }) {
  const insets = useSafeAreaInsets();

  const tabs: { id: TabId; render: (color: string) => React.ReactNode }[] = [
    { id: 'horo',  render: (c) => <SunIcon color={c} /> },
    { id: 'natal', render: (c) => <StarIcon color={c} filled /> },
    { id: 'compa', render: (c) => <HeartIcon color={c} /> },
    { id: 'lyra',  render: (c) => <ChatIcon color={c} /> },
    { id: 'cal',   render: (c) => <BoltIcon color={c} /> },
  ];

  return (
    <View style={[ts.bar, { paddingBottom: 14 + insets.bottom }]}>
      {tabs.map((t) => {
        const isActive = t.id === active;
        const color = isActive ? tokens.color.gold : tokens.color.text2;
        return (
          <Pressable key={t.id} style={[ts.tab, isActive && ts.tabActive]}>
            {t.render(color)}
          </Pressable>
        );
      })}
    </View>
  );
}

const ts = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    paddingHorizontal: 18, paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: tokens.color.bg,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)',
  },
  tab: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: tokens.color.goldSoft },
});

/* ─────────────────────────────────────────────
   SCREEN
───────────────────────────────────────────── */
export default function TestThemeNatal4() {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<Selection>({ kind: 'chart' });

  const handleSelect = useCallback((s: Selection) => {
    setSelected((prev) => {
      const sameKind = prev?.kind === s.kind;
      const sameId   = (prev as any)?.id === (s as any)?.id;
      return sameKind && sameId ? { kind: 'chart' } : s;
    });
  }, []);

  const chartSize = Math.min(Dimensions.get('window').width - 40, 480);

  return (
    <View style={[ss.root, { paddingTop: insets.top }]}>
      <ScrollView
        style={ss.scroll}
        contentContainerStyle={[ss.scrollContent, { paddingBottom: 130 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={ss.topbar}>
          <View style={ss.brand}>
            <SparkleIcon color={tokens.color.gold} />
            <Text style={ss.brandText}>Lunestia</Text>
          </View>
          <View style={ss.hello}>
            <Text style={ss.helloText}>Bonjour, Clément</Text>
            <View style={ss.avatar}>
              <Text style={ss.avatarText}>C</Text>
            </View>
          </View>
        </View>

        {/* Section chip + help */}
        <View style={ss.chipRow}>
          <View style={ss.chip}>
            <View style={ss.chipDot} />
            <Text style={ss.chipText}>Thème astral</Text>
          </View>
          <Pressable style={ss.help} accessibilityLabel="Aide">
            <HelpIcon color={tokens.color.text2} />
          </Pressable>
        </View>

        {/* Title */}
        <Text style={ss.title}>Votre carte du ciel</Text>
        <Text style={ss.subtitle}>
          Touchez les planètes, signes, maisons ou lignes d'aspect pour explorer leur signification.
        </Text>

        {/* Birth meta */}
        <View style={ss.meta}>
          <View style={ss.metaItem}>
            <CakeIcon color={tokens.color.gold} />
            <Text style={ss.metaText}>{BIRTH.date}</Text>
          </View>
          <View style={ss.metaItem}>
            <ClockIcon color={tokens.color.gold} />
            <Text style={ss.metaText}>{BIRTH.time}</Text>
          </View>
          <View style={ss.metaItem}>
            <PinIcon color={tokens.color.gold} />
            <Text style={ss.metaText}>{BIRTH.place}</Text>
          </View>
        </View>

        {/* Chart */}
        <View style={[ss.chartWrap, { width: chartSize, height: chartSize }]}>
          <NatalChart selected={selected} onSelect={handleSelect} />
        </View>

        {/* Aspect legend */}
        <Legend selected={selected} onSelect={handleSelect} />

        {/* Info panel */}
        <InfoPanel selected={selected} />
      </ScrollView>

      <TabBar active="natal" />
    </View>
  );
}

/* ─────────────────────────────────────────────
   STYLES
───────────────────────────────────────────── */
const ss = StyleSheet.create({
  root: { flex: 1, backgroundColor: tokens.color.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 4 },

  topbar: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12, marginBottom: 10,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandText: { fontFamily: tokens.font.serif, fontSize: 22, color: tokens.color.text },
  hello: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  helloText: { color: tokens.color.text2, fontSize: 14, fontFamily: tokens.font.sans },
  avatar: {
    width: 32, height: 32, borderRadius: 999,
    backgroundColor: tokens.color.card,
    borderWidth: 1, borderColor: tokens.color.borderStrong,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: tokens.color.text, fontSize: 13, fontFamily: tokens.font.sansSemi },

  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: tokens.radius.pill,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: tokens.color.border,
  },
  chipDot: { width: 8, height: 8, borderRadius: 999, backgroundColor: tokens.color.gold },
  chipText: {
    fontSize: 12, color: tokens.color.text,
    fontFamily: tokens.font.sansSemi,
    letterSpacing: 1.4, textTransform: 'uppercase',
  },
  help: {
    width: 28, height: 28, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: tokens.color.border,
    alignItems: 'center', justifyContent: 'center',
  },

  title: {
    fontFamily: tokens.font.serif, fontSize: 42, lineHeight: 46,
    color: '#EFE6FF', marginTop: 4, marginBottom: 8,
  },
  subtitle: {
    color: tokens.color.text2, fontSize: 15, lineHeight: 22,
    maxWidth: 320, marginBottom: 16, fontFamily: tokens.font.sans,
  },

  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  metaItem: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: tokens.radius.md,
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: 1, borderColor: tokens.color.border,
  },
  metaText: { color: tokens.color.text, fontSize: 12.5, fontFamily: tokens.font.sansSemi },

  chartWrap: { alignSelf: 'center', marginVertical: 10 },
});
