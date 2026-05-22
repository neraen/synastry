/**
 * LoaderZodiacScreen — Showcase du loader Zodiac Dial.
 * Accessible depuis les pages de test du profil.
 */
import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LoaderZodiac } from '@/components/loaders';
import { fonts, spacing } from '@/theme';

const T = {
  bg:      '#120A24',
  goldDim: '#B89549',
  text:    '#ECE5F7',
  text2:   '#BDB2D4',
} as const;

export default function LoaderZodiacScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.scrollContent, { paddingBottom: 48 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Topbar */}
        <View style={s.topbar}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
            <Feather name="arrow-left" size={20} color={T.text} />
          </Pressable>
        </View>

        {/* Title */}
        <Text style={s.title}>Loader Zodiac</Text>
        <Text style={s.subtitle}>
          Cadran zodiacal animé — anneau extérieur 9 s, contre-rotation 14 s.
        </Text>

        {/* Section 1 — Plein écran 210px */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Plein écran — 200px</Text>
          <View style={s.showcase}>
            <LoaderZodiac size={210} label="Tracé de la carte…" />
          </View>
        </View>

        {/* Section 2 — Carte 120px */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Carte — 120px</Text>
          <View style={s.showcase}>
            <LoaderZodiac size={120} />
          </View>
        </View>

        {/* Section 3 — Bouton 64px */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Bouton — 64px</Text>
          <View style={s.showcase}>
            <LoaderZodiac size={64} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: T.bg,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.xl,
  },
  topbar: {
    paddingVertical: spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.display.regular,
    fontSize: 34,
    lineHeight: 40,
    color: '#EFE6FF',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: fonts.body.regular,
    fontSize: 14,
    lineHeight: 21,
    color: T.text2,
    marginBottom: 40,
  },
  section: {
    marginBottom: 48,
  },
  sectionLabel: {
    fontFamily: fonts.body.semiBold,
    fontSize: 10,
    letterSpacing: 1.5,
    color: T.goldDim,
    textTransform: 'uppercase',
    marginBottom: spacing.xl,
  },
  showcase: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
});
