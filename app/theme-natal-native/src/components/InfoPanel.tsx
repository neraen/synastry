import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { tokens } from '../theme/tokens';
import {
  PLANETS, SIGNS, HOUSES, ASPECTS_DEF,
  ELEMENT_COLOR,
  computeAspects, lonToSign, formatPos, planetHouse,
  type Aspect, type AspectDef,
} from '../data/astrology';
import type { Selection } from './NatalChart';

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
  <View style={[s.pill, color ? { borderColor: color } : null]}>
    <Text style={s.pillText}>{children}</Text>
  </View>
);

export function InfoPanel({ selected }: { selected: Selection }) {
  /* Default / chart summary */
  if (!selected || selected.kind === 'chart') {
    return (
      <View style={s.info}>
        <Text style={s.kicker}>Explore</Text>
        <Text style={s.title}>Touche un élément</Text>
        <Text style={s.sub}>
          Planètes, signes, maisons ou lignes d'aspect — touche pour voir le détail.
        </Text>
        <View style={s.pillRow}>
          <Pill>☉ Soleil — <Text style={s.pillStrong}>Verseau</Text></Pill>
          <Pill>☽ Lune — <Text style={s.pillStrong}>Gémeaux</Text></Pill>
          <Pill>ASC — <Text style={s.pillStrong}>Cancer</Text></Pill>
        </View>
      </View>
    );
  }

  /* Aspect type (from legend tap) */
  if (selected.kind === 'aspectType') {
    const def = selected.payload as AspectDef;
    return (
      <View style={s.info}>
        <View style={s.head}>
          <View style={[s.glyphBox, { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.10)' }]}>
            <Text style={[s.glyphTxt, { color: def.color }]}>{def.glyph}</Text>
          </View>
          <View style={s.meta}>
            <Text style={s.kicker}>Type d'aspect</Text>
            <Text style={s.title}>{def.name}</Text>
            <Text style={s.sub}>Angle de {def.angle}° · Orbe ±{def.orb}°</Text>
          </View>
        </View>
        <Text style={s.body}>{def.desc}</Text>
      </View>
    );
  }

  /* Planet */
  if (selected.kind === 'planet') {
    const p = PLANETS.find((x) => x.id === selected.id)!;
    const house = planetHouse(p.lon);
    const myAspects = computeAspects(PLANETS).filter((a) => a.a === p.id || a.b === p.id);

    return (
      <View style={s.info}>
        <View style={s.head}>
          <View style={s.glyphBox}>
            <Text style={[s.glyphTxt, { color: tokens.color.gold }]}>{p.glyph}</Text>
          </View>
          <View style={s.meta}>
            <Text style={s.kicker}>Planète</Text>
            <Text style={s.title}>{p.name}</Text>
            <Text style={s.sub}>{formatPos(p.lon)} · Maison {house.roman}</Text>
          </View>
        </View>
        <Text style={s.body}>{p.desc}</Text>
        {myAspects.length > 0 && (
          <View style={s.pillRow}>
            {myAspects.slice(0, 5).map((a, i) => {
              const otherName  = a.a === p.id ? a.bName  : a.aName;
              const otherGlyph = a.a === p.id ? a.bGlyph : a.aGlyph;
              return (
                <View key={i} style={[s.pill, { borderColor: a.color }]}>
                  <Text style={[s.pillText, { color: a.color }]}>{aspectGlyphFor(a.typeName)} </Text>
                  <Text style={s.pillText}>{otherGlyph} {otherName}</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  }

  /* Sign */
  if (selected.kind === 'sign') {
    const sg = SIGNS.find((x) => x.id === selected.id)!;
    const planetsInSign = PLANETS.filter((p) => p.lon >= sg.range[0] && p.lon < sg.range[1]);
    return (
      <View style={s.info}>
        <View style={s.head}>
          <View style={[s.glyphBox, { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.10)' }]}>
            <Text style={[s.glyphTxt, { color: ELEMENT_COLOR[sg.element] }]}>{sg.glyph}</Text>
          </View>
          <View style={s.meta}>
            <Text style={s.kicker}>Signe</Text>
            <Text style={s.title}>{sg.name}</Text>
            <Text style={s.sub}>{sg.element} · {sg.modality} · Régi par {sg.ruler}</Text>
          </View>
        </View>
        <Text style={s.body}>{sg.desc}</Text>
        {planetsInSign.length > 0 ? (
          <View style={s.pillRow}>
            {planetsInSign.map((p) => (
              <Pill key={p.id}>{p.glyph} <Text style={s.pillStrong}>{p.name}</Text></Pill>
            ))}
          </View>
        ) : (
          <View style={s.pillRow}><Pill>Aucune planète personnelle</Pill></View>
        )}
      </View>
    );
  }

  /* House */
  if (selected.kind === 'house') {
    const h = HOUSES.find((x) => x.id === selected.id)!;
    const next = HOUSES[h.num % 12].cusp;
    const planetsHere = PLANETS.filter((p) =>
      h.cusp < next ? (p.lon >= h.cusp && p.lon < next) : (p.lon >= h.cusp || p.lon < next)
    );
    const cuspSign = lonToSign(h.cusp);
    return (
      <View style={s.info}>
        <View style={s.head}>
          <View style={s.glyphBox}>
            <Text style={[s.glyphTxt, { color: tokens.color.gold, fontFamily: tokens.font.serif, fontSize: 28 }]}>{h.roman}</Text>
          </View>
          <View style={s.meta}>
            <Text style={s.kicker}>Maison</Text>
            <Text style={s.title}>Maison {h.num}</Text>
            <Text style={s.sub}>Cuspide en {cuspSign.sign.name} {Math.floor(cuspSign.degInSign)}°</Text>
          </View>
        </View>
        <Text style={s.body}>{h.desc}</Text>
        {planetsHere.length > 0 && (
          <View style={s.pillRow}>
            {planetsHere.map((p) => (
              <Pill key={p.id}>{p.glyph} <Text style={s.pillStrong}>{p.name}</Text></Pill>
            ))}
          </View>
        )}
      </View>
    );
  }

  /* Aspect (a specific pair) */
  if (selected.kind === 'aspect') {
    const a = selected.payload as Aspect;
    const def = ASPECTS_DEF.find((d) => d.id === a.type)!;
    return (
      <View style={s.info}>
        <View style={s.head}>
          <View style={[s.glyphBox, { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.10)' }]}>
            <Text style={[s.glyphTxt, { color: def.color }]}>{def.glyph}</Text>
          </View>
          <View style={s.meta}>
            <Text style={s.kicker}>Aspect</Text>
            <Text style={s.title}>{a.typeName}</Text>
            <Text style={s.sub}>{a.aGlyph} {a.aName} — {a.bGlyph} {a.bName}</Text>
          </View>
        </View>
        <Text style={s.body}>{def.desc}</Text>
        <View style={s.pillRow}>
          <Pill>Angle <Text style={s.pillStrong}>{def.angle}°</Text></Pill>
          <Pill>Orbe <Text style={s.pillStrong}>{a.orbActual}°</Text></Pill>
        </View>
      </View>
    );
  }

  return null;
}

/* ---------- Styles ---------- */
const s = StyleSheet.create({
  info: {
    marginTop: 8,
    padding: 18,
    paddingBottom: 20,
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.color.card,
    borderWidth: 1,
    borderColor: tokens.color.borderStrong,
    minHeight: 150,
  },
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 14 },
  glyphBox: {
    width: 52, height: 52, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(229,194,102,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(229,194,102,0.20)',
  },
  glyphTxt: { fontSize: 28 },
  meta: { flex: 1, marginLeft: 14 },
  kicker: {
    fontSize: 11, letterSpacing: 1.6,
    color: tokens.color.text3, marginBottom: 4,
    fontFamily: tokens.font.sansSemi, textTransform: 'uppercase',
  },
  title: {
    fontFamily: tokens.font.serif,
    fontSize: 26, color: tokens.color.text, lineHeight: 30,
  },
  sub: {
    fontSize: 13, color: tokens.color.text2, marginTop: 4,
    fontFamily: tokens.font.sans,
  },
  body: {
    fontSize: 14.5, lineHeight: 22, color: tokens.color.text2,
    fontFamily: tokens.font.sans,
  },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  pill: {
    flexDirection: 'row',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: tokens.radius.pill,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: tokens.color.border,
  },
  pillText: {
    fontSize: 11.5, color: tokens.color.text2,
    fontFamily: tokens.font.sans,
  },
  pillStrong: { color: tokens.color.text, fontFamily: tokens.font.sansSemi },
});
