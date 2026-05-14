import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tokens } from '../theme/tokens';
import { BIRTH } from '../data/astrology';
import { NatalChart, type Selection } from '../components/NatalChart';
import { InfoPanel } from '../components/InfoPanel';
import { Legend } from '../components/Legend';
import { TabBar } from '../components/TabBar';
import {
  SparkleIcon, HelpIcon, CakeIcon, ClockIcon, PinIcon,
} from '../components/Icons';

export function ThemeAstralScreen() {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<Selection>({ kind: 'chart' });

  const handleSelect = useCallback((s: Selection) => {
    setSelected((prev) => {
      const sameKind = prev?.kind === s.kind;
      const sameId   = (prev as any)?.id === (s as any)?.id;
      return sameKind && sameId ? { kind: 'chart' } : s;
    });
  }, []);

  // Chart sized to the viewport width with horizontal padding
  const chartSize = Math.min(Dimensions.get('window').width - 40, 480);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 130 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.topbar}>
          <View style={styles.brand}>
            <SparkleIcon color={tokens.color.gold} />
            <Text style={styles.brandText}>Lunestia</Text>
          </View>
          <View style={styles.hello}>
            <Text style={styles.helloText}>Bonjour, Clément</Text>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>C</Text>
            </View>
          </View>
        </View>

        {/* Section chip + help */}
        <View style={styles.chipRow}>
          <View style={styles.chip}>
            <View style={styles.chipDot} />
            <Text style={styles.chipText}>Thème astral</Text>
          </View>
          <Pressable style={styles.help} accessibilityLabel="Aide">
            <HelpIcon color={tokens.color.text2} />
          </Pressable>
        </View>

        {/* Title */}
        <Text style={styles.title}>Votre carte du ciel</Text>
        <Text style={styles.subtitle}>
          Touchez les planètes, signes, maisons ou lignes d'aspect pour explorer leur signification.
        </Text>

        {/* Birth meta */}
        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <CakeIcon color={tokens.color.gold} />
            <Text style={styles.metaText}>{BIRTH.date}</Text>
          </View>
          <View style={styles.metaItem}>
            <ClockIcon color={tokens.color.gold} />
            <Text style={styles.metaText}>{BIRTH.time}</Text>
          </View>
          <View style={styles.metaItem}>
            <PinIcon color={tokens.color.gold} />
            <Text style={styles.metaText}>{BIRTH.place}</Text>
          </View>
        </View>

        {/* Chart */}
        <View style={[styles.chartWrap, { width: chartSize, height: chartSize }]}>
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

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: tokens.color.bg,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },

  /* Header */
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginBottom: 10,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandText: {
    fontFamily: tokens.font.serif,
    fontSize: 22,
    color: tokens.color.text,
  },
  hello: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  helloText: { color: tokens.color.text2, fontSize: 14, fontFamily: tokens.font.sans },
  avatar: {
    width: 32, height: 32, borderRadius: 999,
    backgroundColor: tokens.color.card,
    borderWidth: 1, borderColor: tokens.color.borderStrong,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: tokens.color.text, fontSize: 13, fontFamily: tokens.font.sansSemi },

  /* Chip */
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
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  help: {
    width: 28, height: 28, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: tokens.color.border,
    alignItems: 'center', justifyContent: 'center',
  },

  /* Title */
  title: {
    fontFamily: tokens.font.serif,
    fontSize: 42,
    lineHeight: 46,
    color: '#EFE6FF',
    marginTop: 4, marginBottom: 8,
  },
  subtitle: {
    color: tokens.color.text2,
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 320,
    marginBottom: 16,
    fontFamily: tokens.font.sans,
  },

  /* Birth meta */
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  metaItem: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: tokens.radius.md,
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: 1, borderColor: tokens.color.border,
  },
  metaText: { color: tokens.color.text, fontSize: 12.5, fontFamily: tokens.font.sansSemi },

  /* Chart wrap */
  chartWrap: {
    alignSelf: 'center',
    marginVertical: 10,
  },
});
