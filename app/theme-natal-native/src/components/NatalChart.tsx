import React, { useMemo } from 'react';
import Svg, {
  Defs, RadialGradient, Stop,
  Circle, G, Line, Path, Text as SvgText,
} from 'react-native-svg';

import { tokens } from '../theme/tokens';
import {
  SIGNS, PLANETS, HOUSES, ASC_LON,
  ELEMENT_COLOR,
  computeAspects,
  type Planet, type Aspect,
} from '../data/astrology';

const C = tokens.chart;

/* ---------- Geometry helpers ---------- */
function lonToRad(lon: number): number {
  return ((180 + ASC_LON - lon) * Math.PI) / 180;
}
function polar(r: number, lon: number): { x: number; y: number } {
  const a = lonToRad(lon);
  return { x: C.cx + r * Math.cos(a), y: C.cy + r * Math.sin(a) };
}

/** Annular sector path from lon1→lon2 (lon2 > lon1, sweep < 180°). */
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

/** Greedy collision-avoidance for planet glyphs (angular nudge only). */
function spreadPlanets(planets: Planet[], minSep = 7): Placed[] {
  const sorted = planets
    .map((p, i) => ({ p, i }))
    .sort((a, b) => a.p.lon - b.p.lon);

  const adjusted = new Map<string, number>();
  sorted.forEach(({ p }, k) => {
    if (k === 0) {
      adjusted.set(p.id, p.lon);
      return;
    }
    const prevId = sorted[k - 1].p.id;
    const prevLon = adjusted.get(prevId)!;
    const gap = p.lon - prevLon;
    adjusted.set(p.id, gap < minSep ? prevLon + minSep : p.lon);
  });

  return planets.map((p) => ({ ...p, displayLon: adjusted.get(p.id) ?? p.lon }));
}

/* ---------- Types ---------- */
export type Selection =
  | { kind: 'chart' }
  | { kind: 'sign'; id: string }
  | { kind: 'house'; id: string }
  | { kind: 'planet'; id: string }
  | { kind: 'aspect'; id: string; payload: Aspect }
  | { kind: 'aspectType'; id: string; payload: any };

export type NatalChartProps = {
  selected: Selection;
  onSelect: (s: Selection) => void;
};

/* ---------- Component ---------- */
export function NatalChart({ selected, onSelect }: NatalChartProps) {
  const aspects   = useMemo(() => computeAspects(PLANETS), []);
  const placement = useMemo(() => spreadPlanets(PLANETS, 7), []);

  const selKind = selected?.kind;
  const selId   = (selected as any)?.id;

  /* Tick marks (1° / 5° / 10°) on the inner edge of sign ring */
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

      {/* Outer rings */}
      <Circle cx={C.cx} cy={C.cy} r={C.rOuter}      fill="none" stroke="rgba(236,229,247,0.20)" strokeWidth={1} />
      <Circle cx={C.cx} cy={C.cy} r={C.rSignInner}  fill="none" stroke="rgba(236,229,247,0.12)" strokeWidth={1} />
      <Circle cx={C.cx} cy={C.cy} r={C.rHouseInner} fill="none" stroke="rgba(236,229,247,0.10)" strokeWidth={1} />

      {/* Zodiac sectors (pressable) */}
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

      {/* Tick marks */}
      <G>{ticks}</G>

      {/* Sign glyphs */}
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

      {/* House cusps */}
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

      {/* House numbers (pressable, with invisible larger hit area) */}
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

      {/* Center glow */}
      <Circle cx={C.cx} cy={C.cy} r={C.rAspect - 4} fill="url(#centerGlow)" />

      {/* Aspect lines */}
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
              {/* thick invisible line for easier tap */}
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

      {/* Axis labels (ASC / IC / DSC / MC) */}
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

      {/* Planets */}
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
