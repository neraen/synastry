/**
 * Carte du ciel — explorateur sous la roue.
 * Reprend le design de l'ancienne légende (rangée de boutons swatch + label)
 * mais en onglets de catégories : chaque onglet déplie les éléments du thème
 * (planètes, signes, maisons, aspects) sous forme de chips cliquables qui
 * ouvrent la même card que le tap sur la roue.
 */

import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

import { fonts } from '@/theme';
import { SIGNS, ELEMENT_COLOR, WHEEL_T } from './astro-content';
import { SignGlyphIcon } from './sign-glyphs';
import type { Selection, WheelModel } from './wheel-model';

type Category = 'planets' | 'signs' | 'houses' | 'aspects';

const TABS: { id: Category; label: string; color: string }[] = [
    { id: 'planets', label: 'Planètes', color: WHEEL_T.gold },
    { id: 'signs',   label: 'Signes',   color: WHEEL_T.violet },
    { id: 'houses',  label: 'Maisons',  color: '#c8bfff' },
    { id: 'aspects', label: 'Aspects',  color: WHEEL_T.aspTrine },
];

type Props = {
    model: WheelModel;
    selected: Selection;
    /** Sélection avec toggle (re-tap = retour à la card par défaut) — chips */
    onSelect: (s: Selection) => void;
    /** Sélection directe, sans toggle — changement d'onglet */
    onShow: (s: Selection) => void;
};

export function WheelExplorer({ model, selected, onSelect, onShow }: Props) {
    const [tab, setTab] = useState<Category | null>('planets');

    const selKind = selected?.kind;
    const selId = 'id' in selected ? selected.id : undefined;

    /** Premier élément d'une catégorie → affiché dès le changement d'onglet. */
    const firstSelection = (t: Category): Selection => {
        switch (t) {
            case 'planets':
                return model.planets.length > 0
                    ? { kind: 'planet', id: model.planets[0].key }
                    : { kind: 'chart' };
            case 'signs':
                return { kind: 'sign', id: SIGNS[0].id };
            case 'houses':
                return { kind: 'house', id: 1 };
            case 'aspects': {
                const a = model.aspects[0];
                return a
                    ? { kind: 'aspect', id: `${a.a}-${a.b}`, aspect: a }
                    : { kind: 'chart' };
            }
        }
    };

    const openTab = (t: Category) => {
        if (tab === t) {
            setTab(null);
            onShow({ kind: 'chart' });
            return;
        }
        setTab(t);
        onShow(firstSelection(t));
    };

    return (
        <View>
            {/* ── Onglets (design de l'ancienne légende) ──────────────────── */}
            <View style={s.row} accessibilityRole="tablist">
                {TABS.map((t) => {
                    const active = tab === t.id;
                    return (
                        <Pressable
                            key={t.id}
                            onPress={() => openTab(t.id)}
                            style={[s.leg, active && s.legActive]}
                            accessibilityRole="tab"
                            accessibilityState={{ selected: active }}
                        >
                            <View style={[s.swatch, { backgroundColor: t.color }]} />
                            <Text style={[s.legText, active && s.legTextActive]}>{t.label}</Text>
                        </Pressable>
                    );
                })}
            </View>

            {/* ── Chips de la catégorie active ────────────────────────────── */}
            {tab === 'planets' && (
                <View style={s.chips}>
                    {model.planets.map((p) => {
                        const active = selKind === 'planet' && selId === p.key;
                        return (
                            <Pressable
                                key={p.key}
                                style={[s.chip, active && s.chipActive]}
                                onPress={() => onSelect({ kind: 'planet', id: p.key })}
                            >
                                <Text style={[s.chipGlyph, { color: WHEEL_T.gold }]}>{p.glyph}</Text>
                                <Text style={[s.chipText, active && s.chipTextActive]}>{p.name}</Text>
                            </Pressable>
                        );
                    })}
                </View>
            )}

            {tab === 'signs' && (
                <View style={s.chips}>
                    {SIGNS.map((sg) => {
                        const active = selKind === 'sign' && selId === sg.id;
                        const hasPlanets = model.planets.some((p) => p.sign.id === sg.id);
                        return (
                            <Pressable
                                key={sg.id}
                                style={[s.chip, active && s.chipActive]}
                                onPress={() => onSelect({ kind: 'sign', id: sg.id })}
                            >
                                <SignGlyphIcon id={sg.id} size={13} color={ELEMENT_COLOR[sg.element]} />
                                <Text style={[s.chipText, active && s.chipTextActive]}>{sg.name}</Text>
                                {hasPlanets && <View style={s.chipDot} />}
                            </Pressable>
                        );
                    })}
                </View>
            )}

            {tab === 'houses' && (
                <View style={s.chips}>
                    {model.houses.map((h) => {
                        const active = selKind === 'house' && selId === h.num;
                        const count = model.planets.filter((p) => p.houseNum === h.num).length;
                        return (
                            <Pressable
                                key={h.num}
                                style={[s.chip, active && s.chipActive]}
                                onPress={() => onSelect({ kind: 'house', id: h.num })}
                            >
                                <Text style={[s.chipGlyph, s.chipRoman]}>{h.roman}</Text>
                                {count > 0 && <View style={s.chipDot} />}
                            </Pressable>
                        );
                    })}
                </View>
            )}

            {tab === 'aspects' && (
                <View style={s.chips}>
                    {model.aspects.length > 0 ? (
                        model.aspects.map((a) => {
                            const id = `${a.a}-${a.b}`;
                            const active = selKind === 'aspect' && selId === id;
                            return (
                                <Pressable
                                    key={id}
                                    style={[s.chip, { borderColor: a.def.color }, active && s.chipActive]}
                                    onPress={() => onSelect({ kind: 'aspect', id, aspect: a })}
                                >
                                    <Text style={[s.chipGlyph, { color: a.def.color }]}>
                                        {a.aGlyph} {a.def.glyph} {a.bGlyph}
                                    </Text>
                                    <Text style={[s.chipText, active && s.chipTextActive]}>
                                        {a.aName} · {a.bName}
                                    </Text>
                                </Pressable>
                            );
                        })
                    ) : (
                        <View style={s.chip}>
                            <Text style={s.chipText}>Aucun aspect majeur</Text>
                        </View>
                    )}
                </View>
            )}
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    row: {
        flexDirection: 'row',
        gap: 6,
        marginVertical: 8,
    },
    leg: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 4,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.025)',
        borderWidth: 1,
        borderColor: WHEEL_T.border,
        gap: 4,
    },
    legActive: {
        borderColor: 'rgba(255,255,255,0.22)',
        backgroundColor: 'rgba(255,255,255,0.06)',
    },
    swatch: {
        width: 22, height: 3, borderRadius: 2,
    },
    legText: {
        fontSize: 10.5,
        letterSpacing: 0.5,
        color: WHEEL_T.text2,
        fontFamily: fonts.body.medium,
    },
    legTextActive: {
        color: WHEEL_T.text,
        fontFamily: fonts.body.semiBold,
    },

    chips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 4,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderWidth: 1,
        borderColor: WHEEL_T.border,
    },
    chipActive: {
        backgroundColor: 'rgba(229,194,102,0.14)',
        borderColor: 'rgba(229,194,102,0.55)',
    },
    chipGlyph: {
        fontSize: 13,
        color: WHEEL_T.gold,
    },
    chipRoman: {
        fontFamily: fonts.display.regular,
        fontSize: 13,
        color: 'rgba(189,178,212,0.9)',
    },
    chipText: {
        fontSize: 11.5,
        color: WHEEL_T.text2,
        fontFamily: fonts.body.regular,
    },
    chipTextActive: {
        color: WHEEL_T.text,
        fontFamily: fonts.body.semiBold,
    },
    chipDot: {
        width: 5, height: 5, borderRadius: 3,
        backgroundColor: WHEEL_T.gold,
    },
});
