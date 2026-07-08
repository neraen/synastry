/**
 * Carte du ciel — roue astrologique (SVG), purement visuelle.
 * Les taps sont résolus par le parent via `hitTest()` (wheel-model) depuis un
 * Pressable superposé : le onPress des éléments react-native-svg n'est pas
 * délivré de façon fiable sous la nouvelle architecture (Fabric).
 *
 * ⚠️ Gradients : react-native-svg perd le canal alpha des stops `rgba(...)`
 * sur natif (centre qui rend à pleine opacité). Toujours utiliser
 * `stopColor` hex + `stopOpacity`.
 */

import React from 'react';
import Svg, {
    Defs, RadialGradient, Stop,
    Circle, G, Line, Path, Text as SvgText,
} from 'react-native-svg';

import { fonts } from '@/theme';
import { SIGNS, ELEMENT_COLOR, WHEEL_T } from './astro-content';
import { WheelSignGlyph } from './sign-glyphs';
import {
    CHART, polar, sectorPath, normDeg,
    type WheelModel, type Selection,
} from './wheel-model';

export type NatalWheelProps = {
    model: WheelModel;
    selected: Selection;
};

export function NatalWheel({ model, selected }: NatalWheelProps) {
    const { ascLon, mcLon, planets, houses, aspects } = model;
    const C = CHART;

    const selKind = selected?.kind;
    const selId = 'id' in selected ? selected.id : undefined;

    const pt = (r: number, lon: number) => polar(r, lon, ascLon);

    /* Graduations (1° / 5° / 10°) sur le bord interne de l'anneau des signes */
    const ticks: React.ReactNode[] = [];
    for (let d = 0; d < 360; d++) {
        const isMajor = d % 10 === 0;
        const isMid = d % 5 === 0 && !isMajor;
        const p1 = pt(C.rTickOut, d);
        const p2 = pt(isMajor ? C.rTickIn : isMid ? C.rTickOut - 6 : C.rTickOut - 3, d);
        ticks.push(
            <Line
                key={`t${d}`}
                x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                stroke="rgba(236,229,247,0.22)"
                strokeWidth={isMajor ? 1.2 : isMid ? 0.9 : 0.55}
            />
        );
    }

    /* Labels des angles (ASC / DSC / MC / IC) — ancrage adapté à la position réelle */
    const axisLabels = [
        { lon: ascLon,               text: 'ASC' },
        { lon: normDeg(ascLon + 180), text: 'DSC' },
        { lon: mcLon,                text: 'MC' },
        { lon: normDeg(mcLon + 180), text: 'IC' },
    ].map((a, i) => {
        const p = pt(C.rOuter + 8, a.lon);
        const anchor = p.x < C.cx - 30 ? 'end' : p.x > C.cx + 30 ? 'start' : 'middle';
        const dx = anchor === 'end' ? -10 : anchor === 'start' ? 10 : 0;
        const dy = anchor === 'middle' ? (p.y < C.cy ? -10 : 18) : 4;
        return (
            <SvgText
                key={`ax${i}`}
                x={p.x + dx} y={p.y + dy}
                textAnchor={anchor}
                fontSize={14}
                fontWeight="600"
                fontFamily={fonts.body.semiBold}
                fill="rgba(229,194,102,0.85)"
            >{a.text}</SvgText>
        );
    });

    return (
        <Svg viewBox="0 0 1000 1000">
            <Defs>
                {/* stopColor hex + stopOpacity — jamais de rgba dans les Stop */}
                <RadialGradient id="wheelBgGlow" cx="50%" cy="50%" r="50%">
                    <Stop offset="0%"   stopColor={WHEEL_T.violet} stopOpacity={0.10} />
                    <Stop offset="55%"  stopColor={WHEEL_T.violet} stopOpacity={0.04} />
                    <Stop offset="100%" stopColor={WHEEL_T.violet} stopOpacity={0} />
                </RadialGradient>
                <RadialGradient id="wheelCenterGlow" cx="50%" cy="50%" r="50%">
                    <Stop offset="0%"   stopColor={WHEEL_T.gold} stopOpacity={0.16} />
                    <Stop offset="60%"  stopColor={WHEEL_T.gold} stopOpacity={0.03} />
                    <Stop offset="100%" stopColor={WHEEL_T.gold} stopOpacity={0} />
                </RadialGradient>
            </Defs>

            <Circle cx={C.cx} cy={C.cy} r={C.rOuter + 6} fill="url(#wheelBgGlow)" />

            {/* Anneaux */}
            <Circle cx={C.cx} cy={C.cy} r={C.rOuter}      fill="none" stroke="rgba(236,229,247,0.20)" strokeWidth={1} />
            <Circle cx={C.cx} cy={C.cy} r={C.rSignInner}  fill="none" stroke="rgba(236,229,247,0.12)" strokeWidth={1} />
            <Circle cx={C.cx} cy={C.cy} r={C.rHouseInner} fill="none" stroke="rgba(236,229,247,0.10)" strokeWidth={1} />

            {/* Secteurs du zodiaque */}
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
                            d={sectorPath(C.rSignInner, C.rOuter, s.range[0], s.range[1], ascLon)}
                            fill={fill}
                            stroke={active ? 'rgba(229,194,102,0.55)' : 'rgba(255,255,255,0.06)'}
                            strokeWidth={active ? 1.5 : 0.6}
                        />
                    );
                })}
            </G>

            {/* Graduations */}
            <G>{ticks}</G>

            {/* Glyphes des signes (tracés SVG Claude design) */}
            <G>
                {SIGNS.map((s) => {
                    const mid = (s.range[0] + s.range[1]) / 2;
                    const p = pt((C.rOuter + C.rSignInner) / 2, mid);
                    const active = selKind === 'sign' && selId === s.id;
                    return (
                        <WheelSignGlyph
                            key={`${s.id}-g`}
                            id={s.id}
                            cx={p.x} cy={p.y}
                            size={36}
                            color={active ? WHEEL_T.gold : ELEMENT_COLOR[s.element]}
                            opacity={active ? 1 : 0.92}
                        />
                    );
                })}
            </G>

            {/* Cuspides des maisons (Placidus) */}
            <G>
                {houses.map((h, i) => {
                    const isAngle = i === 0 || i === 3 || i === 6 || i === 9;
                    const p1 = pt(C.rHouseInner, h.cusp);
                    const p2 = pt(C.rHouseOuter, h.cusp);
                    return (
                        <Line
                            key={`hcusp${h.num}`}
                            x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                            stroke={isAngle ? 'rgba(229,194,102,0.55)' : 'rgba(236,229,247,0.18)'}
                            strokeWidth={isAngle ? 1.5 : 0.8}
                            strokeDasharray={isAngle ? undefined : '4,4'}
                        />
                    );
                })}
            </G>

            {/* Numéros de maisons */}
            <G>
                {houses.map((h, i) => {
                    const next = houses[(i + 1) % 12].cusp;
                    const span = normDeg(next - h.cusp);
                    const mid = normDeg(h.cusp + span / 2);
                    const p = pt(C.rHouseNum, mid);
                    const active = selKind === 'house' && selId === h.num;
                    return (
                        <SvgText
                            key={`h${h.num}`}
                            x={p.x} y={p.y}
                            textAnchor="middle"
                            alignmentBaseline="central"
                            fontSize={17}
                            fontWeight="500"
                            fontFamily={fonts.display.regular}
                            fill={active ? WHEEL_T.gold : 'rgba(189,178,212,0.72)'}
                        >{h.roman}</SvgText>
                    );
                })}
            </G>

            {/* Halo central */}
            <Circle cx={C.cx} cy={C.cy} r={C.rAspect - 4} fill="url(#wheelCenterGlow)" />

            {/* Lignes d'aspect */}
            <G>
                {aspects.map((asp, i) => {
                    const pa = planets.find((x) => x.key === asp.a)!;
                    const pb = planets.find((x) => x.key === asp.b)!;
                    const p1 = pt(C.rPlanetAnch, pa.displayLon);
                    const p2 = pt(C.rPlanetAnch, pb.displayLon);
                    const id = `${asp.a}-${asp.b}`;
                    const active = selKind === 'aspect' && selId === id;
                    return (
                        <Line
                            key={`asp${i}`}
                            x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                            stroke={asp.def.color}
                            strokeWidth={active ? 2.4 : 1.5}
                            opacity={active ? 1 : 0.72}
                            strokeLinecap="round"
                        />
                    );
                })}
            </G>

            {/* Labels des angles */}
            <G>{axisLabels}</G>

            {/* Planètes & points (Lilith, Nœud Nord) */}
            <G>
                {planets.map((p) => {
                    const dispP = pt(C.rPlanet, p.displayLon);
                    const tickA = pt(C.rSignInner - 1, p.lon);
                    const tickB = pt(C.rSignInner - 12, p.lon);
                    const linkA = pt(C.rPlanetTick - 6, p.lon);
                    const linkB = pt(C.rPlanet + 16, p.displayLon);
                    const active = selKind === 'planet' && selId === p.key;
                    const shifted = Math.abs(p.displayLon - p.lon) > 0.5;

                    return (
                        <G key={p.key}>
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
                            <Circle cx={dispP.x} cy={dispP.y} r={25}
                                fill={active ? 'rgba(229,194,102,0.95)' : 'rgba(31,23,64,0.92)'}
                                stroke={active ? WHEEL_T.gold : 'rgba(229,194,102,0.65)'}
                                strokeWidth={active ? 2 : 1.4}
                            />
                            <SvgText
                                x={dispP.x} y={dispP.y + 1}
                                textAnchor="middle"
                                alignmentBaseline="central"
                                fontSize={p.glyph.length > 1 ? 15 : 23}
                                fontWeight={p.glyph.length > 1 ? '700' : undefined}
                                fontFamily={p.glyph.length > 1 ? fonts.body.semiBold : undefined}
                                fill={active ? '#1A1233' : WHEEL_T.gold}
                            >{p.glyph}</SvgText>
                        </G>
                    );
                })}
            </G>

            <Circle cx={C.cx} cy={C.cy} r={3} fill="rgba(229,194,102,0.6)" />
        </Svg>
    );
}
