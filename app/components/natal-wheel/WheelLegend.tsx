/**
 * Carte du ciel — légende des 5 aspects (pressable → card « Type d'aspect »).
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

import { fonts } from '@/theme';
import { ASPECTS_DEF, WHEEL_T } from './astro-content';
import type { Selection } from './wheel-model';

export function WheelLegend({
    selected,
    onSelect,
}: {
    selected: Selection;
    onSelect: (s: Selection) => void;
}) {
    return (
        <View style={s.row} accessibilityRole="tablist">
            {ASPECTS_DEF.map((a) => {
                const active = selected?.kind === 'aspectType' && selected.id === a.id;
                return (
                    <Pressable
                        key={a.id}
                        onPress={() => onSelect({ kind: 'aspectType', id: a.id })}
                        style={[s.leg, active && s.legActive]}
                    >
                        <View style={[s.swatch, { backgroundColor: a.color }]} />
                        <Text style={s.legText}>{a.short}</Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

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
});
