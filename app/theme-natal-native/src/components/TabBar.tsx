import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tokens } from '../theme/tokens';
import { SunIcon, StarIcon, HeartIcon, ChatIcon, BoltIcon } from './Icons';

type TabId = 'horo' | 'natal' | 'compa' | 'lyra' | 'cal';

export function TabBar({ active = 'natal' as TabId }: { active?: TabId }) {
  const insets = useSafeAreaInsets();

  const tabs: { id: TabId; render: (color: string) => React.ReactNode }[] = [
    { id: 'horo',  render: (c) => <SunIcon color={c} /> },
    { id: 'natal', render: (c) => <StarIcon color={c} filled /> },
    { id: 'compa', render: (c) => <HeartIcon color={c} /> },
    { id: 'lyra',  render: (c) => <ChatIcon color={c} /> },
    { id: 'cal',   render: (c) => <BoltIcon color={c} /> },
  ];

  return (
    <View style={[s.bar, { paddingBottom: 14 + insets.bottom }]}>
      {tabs.map((t) => {
        const isActive = t.id === active;
        const color = isActive ? tokens.color.gold : tokens.color.text2;
        return (
          <Pressable key={t.id} style={[s.tab, isActive && s.tabActive]}>
            {t.render(color)}
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    paddingHorizontal: 18,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: tokens.color.bg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
  },
  tab: {
    width: 44, height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: tokens.color.goldSoft,
  },
});
