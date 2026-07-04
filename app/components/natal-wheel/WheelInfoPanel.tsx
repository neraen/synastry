/**
 * Carte du ciel — card explicative sous la roue.
 * Contenu statique FR composé : planète + signe + maison ; aspect = type + paire.
 * Les chips d'aspects de la card planète sont pressables (→ sélectionne l'aspect).
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

import { fonts } from '@/theme';
import { SIGNS, ASPECTS_DEF, ELEMENT_COLOR, WHEEL_T } from './astro-content';
import { formatPos, lonToSign, type Selection, type WheelModel } from './wheel-model';

const Pill = ({ children, borderColor }: { children: React.ReactNode; borderColor?: string }) => (
    <View style={[s.pill, borderColor ? { borderColor } : null]}>
        <Text style={s.pillText}>{children}</Text>
    </View>
);

type Props = {
    model: WheelModel;
    selected: Selection;
    onSelect: (sel: Selection) => void;
};

export function WheelInfoPanel({ model, selected, onSelect }: Props) {
    /* Défaut / résumé du thème */
    if (!selected || selected.kind === 'chart') {
        const sun = model.planets.find((p) => p.key === 'Sun');
        const moon = model.planets.find((p) => p.key === 'Moon');
        const ascSign = lonToSign(model.ascLon).sign;
        return (
            <View style={s.info}>
                <Text style={s.kicker}>Explore</Text>
                <Text style={s.title}>Touche un élément</Text>
                <Text style={s.sub}>
                    Planètes, signes, maisons ou lignes d'aspect — touche pour voir le détail.
                </Text>
                <View style={s.pillRow}>
                    {sun && <Pill>☉ Soleil — <Text style={s.pillStrong}>{sun.sign.name}</Text></Pill>}
                    {moon && <Pill>☽ Lune — <Text style={s.pillStrong}>{moon.sign.name}</Text></Pill>}
                    <Pill>ASC — <Text style={s.pillStrong}>{ascSign.name}</Text></Pill>
                </View>
            </View>
        );
    }

    /* Type d'aspect (tap sur la légende) */
    if (selected.kind === 'aspectType') {
        const def = ASPECTS_DEF.find((d) => d.id === selected.id)!;
        return (
            <View style={s.info}>
                <View style={s.head}>
                    <View style={[s.glyphBox, s.glyphBoxNeutral]}>
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

    /* Planète ou point (Lilith, Nœud Nord) */
    if (selected.kind === 'planet') {
        const p = model.planets.find((x) => x.key === selected.id);
        if (!p) return null;
        const house = model.houses[p.houseNum - 1];
        const myAspects = p.isPoint
            ? []
            : model.aspects.filter((a) => a.a === p.key || a.b === p.key);

        return (
            <View style={s.info}>
                <View style={s.head}>
                    <View style={s.glyphBox}>
                        <Text style={[s.glyphTxt, { color: WHEEL_T.gold }]}>{p.glyph}</Text>
                    </View>
                    <View style={s.meta}>
                        <Text style={s.kicker}>{p.isPoint ? 'Point' : 'Planète'}</Text>
                        <Text style={s.title}>{p.name}</Text>
                        <Text style={s.sub}>{formatPos(p.lon)} · Maison {house.roman}</Text>
                    </View>
                </View>
                <Text style={s.body}>{p.desc}</Text>
                <Text style={s.bodyDetail}>
                    <Text style={s.bodyStrong}>En {p.sign.name} — </Text>{p.sign.desc}
                </Text>
                <Text style={s.bodyDetail}>
                    <Text style={s.bodyStrong}>Maison {house.roman} — </Text>{house.desc}
                </Text>
                {myAspects.length > 0 && (
                    <View style={s.pillRow}>
                        {myAspects.slice(0, 5).map((a) => {
                            const otherName = a.a === p.key ? a.bName : a.aName;
                            const otherGlyph = a.a === p.key ? a.bGlyph : a.aGlyph;
                            const id = `${a.a}-${a.b}`;
                            return (
                                <Pressable
                                    key={id}
                                    style={[s.pill, { borderColor: a.def.color }]}
                                    onPress={() => onSelect({ kind: 'aspect', id, aspect: a })}
                                >
                                    <Text style={[s.pillText, { color: a.def.color }]}>{a.def.glyph} </Text>
                                    <Text style={s.pillText}>{otherGlyph} {otherName}</Text>
                                </Pressable>
                            );
                        })}
                    </View>
                )}
            </View>
        );
    }

    /* Signe */
    if (selected.kind === 'sign') {
        const sg = SIGNS.find((x) => x.id === selected.id);
        if (!sg) return null;
        const planetsInSign = model.planets.filter((p) => p.sign.id === sg.id);
        return (
            <View style={s.info}>
                <View style={s.head}>
                    <View style={[s.glyphBox, s.glyphBoxNeutral]}>
                        <Text style={[s.glyphTxt, { color: ELEMENT_COLOR[sg.element] }]}>{sg.glyph}</Text>
                    </View>
                    <View style={s.meta}>
                        <Text style={s.kicker}>Signe</Text>
                        <Text style={s.title}>{sg.name}</Text>
                        <Text style={s.sub}>{sg.element} · {sg.modality} · Régi par {sg.ruler}</Text>
                    </View>
                </View>
                <Text style={s.body}>{sg.desc}</Text>
                <View style={s.pillRow}>
                    {planetsInSign.length > 0 ? (
                        planetsInSign.map((p) => (
                            <Pill key={p.key}>{p.glyph} <Text style={s.pillStrong}>{p.name}</Text></Pill>
                        ))
                    ) : (
                        <Pill>Aucune planète personnelle</Pill>
                    )}
                </View>
            </View>
        );
    }

    /* Maison */
    if (selected.kind === 'house') {
        const h = model.houses.find((x) => x.num === selected.id);
        if (!h) return null;
        const planetsHere = model.planets.filter((p) => p.houseNum === h.num);
        const cuspSign = lonToSign(h.cusp);
        return (
            <View style={s.info}>
                <View style={s.head}>
                    <View style={s.glyphBox}>
                        <Text style={[s.glyphTxt, s.glyphRoman]}>{h.roman}</Text>
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
                            <Pill key={p.key}>{p.glyph} <Text style={s.pillStrong}>{p.name}</Text></Pill>
                        ))}
                    </View>
                )}
            </View>
        );
    }

    /* Aspect (une paire précise) */
    if (selected.kind === 'aspect') {
        const a = selected.aspect;
        const def = a.def;
        return (
            <View style={s.info}>
                <View style={s.head}>
                    <View style={[s.glyphBox, s.glyphBoxNeutral]}>
                        <Text style={[s.glyphTxt, { color: def.color }]}>{def.glyph}</Text>
                    </View>
                    <View style={s.meta}>
                        <Text style={s.kicker}>Aspect</Text>
                        <Text style={s.title}>{def.name}</Text>
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

// ─── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    info: {
        marginTop: 8,
        padding: 18,
        paddingBottom: 20,
        borderRadius: 22,
        backgroundColor: WHEEL_T.card,
        borderWidth: 1,
        borderColor: WHEEL_T.borderStrong,
        minHeight: 150,
    },
    head: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    glyphBox: {
        width: 52, height: 52, borderRadius: 14,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(229,194,102,0.10)',
        borderWidth: 1,
        borderColor: 'rgba(229,194,102,0.20)',
    },
    glyphBoxNeutral: {
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderColor: 'rgba(255,255,255,0.10)',
    },
    glyphTxt: { fontSize: 28, color: WHEEL_T.gold },
    glyphRoman: { fontFamily: fonts.display.regular, fontSize: 24 },
    meta: { flex: 1, marginLeft: 14 },
    kicker: {
        fontSize: 11, letterSpacing: 1.6,
        color: WHEEL_T.text3, marginBottom: 4,
        fontFamily: fonts.body.semiBold, textTransform: 'uppercase',
    },
    title: {
        fontFamily: fonts.display.regular,
        fontSize: 26, color: WHEEL_T.text, lineHeight: 30,
    },
    sub: {
        fontSize: 13, color: WHEEL_T.text2, marginTop: 4,
        fontFamily: fonts.body.regular,
    },
    body: {
        fontSize: 14.5, lineHeight: 22, color: WHEEL_T.text2,
        fontFamily: fonts.body.regular,
    },
    bodyDetail: {
        fontSize: 13.5, lineHeight: 20, color: WHEEL_T.text2,
        fontFamily: fonts.body.regular,
        marginTop: 10,
    },
    bodyStrong: {
        color: WHEEL_T.text,
        fontFamily: fonts.body.semiBold,
    },
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
    pill: {
        flexDirection: 'row',
        paddingHorizontal: 10, paddingVertical: 5,
        borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderWidth: 1,
        borderColor: WHEEL_T.border,
    },
    pillText: {
        fontSize: 11.5, color: WHEEL_T.text2,
        fontFamily: fonts.body.regular,
    },
    pillStrong: { color: WHEEL_T.text, fontFamily: fonts.body.semiBold },
});
