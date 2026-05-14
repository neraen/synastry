import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

import { tokens } from '../theme/tokens';
import { ASPECTS_DEF } from '../data/astrology';
import type { Selection } from './NatalChart';

export function Legend({
  selected,
  onSelect,
}: {
  selected: Selection;
  onSelect: (s: Selection) => void;
}) {
  return (
    <View style={s.row} accessibilityRole="tablist">
      {ASPECTS_DEF.map((a) => {
        const active = selected?.kind === 'aspectType' && (selected as any).id === a.id;
        return (
          <Pressable
            key={a.id}
            onPress={() => onSelect({ kind: 'aspectType', id: a.id, payload: a })}
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
    borderRadius: tokens.radius.sm,
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderWidth: 1,
    borderColor: tokens.color.border,
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
    color: tokens.color.text2,
    fontFamily: tokens.font.sansMedium,
  },
});
