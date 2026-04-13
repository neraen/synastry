import React, { useEffect, useState } from 'react';
import { View, ScrollView, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { GlassCard, GoldButton, TabHeader } from '@/components/ui';
import { colors, spacing, fonts } from '@/theme';
import { getCosmicHeadline } from '@/services/astrology';

const { width: W } = Dimensions.get('window');
const CARD_WIDTH = (W - spacing.xl * 2 - spacing.md) / 2;

// ─── Feature Card ──────────────────────────────────────────────────────────────

function FeatureCard({ icon, label, route }: {
    icon: keyof typeof Feather.glyphMap;
    label: string;
    route: string;
}) {
    const router = useRouter();
    return (
        <Pressable style={styles.featureCard} onPress={() => router.push(route as any)}>
            <GlassCard opacity="low" radius="xl" padding="none">
                <View style={styles.featureCardInner}>
                    <Feather name={icon} size={26} color="#c8bfff" />
                    <Text style={styles.featureLabel}>{label}</Text>
                </View>
            </GlassCard>
        </Pressable>
    );
}

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function Home() {
    const router = useRouter();
    const { t } = useTranslation();
    const [heroTitle, setHeroTitle] = useState<string | null>(null);
    const [heroSubtitle, setHeroSubtitle] = useState<string | null>(null);

    useEffect(() => {
        getCosmicHeadline()
            .then((res) => {
                if (res.success && res.headline) {
                    setHeroTitle(res.headline.title);
                    setHeroSubtitle(res.headline.subtitle);
                }
            })
            .catch(() => {});
    }, []);

    return (
        <View style={styles.screen}>
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <TabHeader />

                    {/* ── Hero ──────────────────────────────────────────────── */}
                    <View style={styles.hero}>
                        <Text style={styles.heroTitle}>{heroTitle ?? t('home.heroTitle')}</Text>
                        <Text style={styles.heroSubtitle}>{heroSubtitle ?? t('home.heroSubtitle')}</Text>
                    </View>

                    {/* ── Synastry CTA ──────────────────────────────────────── */}
                    <View style={styles.section}>
                        <GlassCard opacity="medium" radius="xxl">
                            <Text style={styles.ctaTitle}>{t('home.compatibilityCardTitle')}</Text>
                            <Text style={styles.ctaDesc}>{t('home.compatibilityCardDesc')}</Text>
                            <GoldButton
                                label={t('home.analyzeNewMatch')}
                                onPress={() => router.push('/(tabs)/compatibility')}
                                rightIcon
                                size="md"
                            />
                        </GlassCard>
                    </View>

                    {/* ── Feature grid ──────────────────────────────────────── */}
                    <View style={styles.section}>
                        <View style={styles.grid}>
                            <FeatureCard icon="sun"            label={t('home.dailyInsightsTitle')} route="/daily-horoscope" />
                            <FeatureCard icon="star"           label={t('home.birthChartTitle')}    route="/(tabs)/horoscope" />
                            <FeatureCard icon="clock"          label={t('home.mirrorTitle')}         route="/(tabs)/transits" />
                            <FeatureCard icon="message-circle" label={t('home.lyraTitle')}           route="/(tabs)/chat" />
                        </View>
                    </View>

                    <View style={{ height: 100 }} />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.surfaceLowest },
    safeArea: { flex: 1 },
    scroll: { flex: 1 },
    scrollContent: { flexGrow: 1 },

    hero: {
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.xl,
        marginBottom: spacing.xxxl,
    },
    heroTitle: {
        fontFamily: fonts.display.bold,
        fontSize: 45,
        lineHeight: 52,
        color: colors.onSurface,
        letterSpacing: -0.5,
    },
    heroSubtitle: {
        fontFamily: fonts.body.regular,
        fontSize: 16,
        color: colors.onSurfaceMuted,
        marginTop: spacing.md,
        lineHeight: 24,
    },

    section: {
        paddingHorizontal: spacing.xl,
        marginTop: spacing.xxl,
    },

    ctaTitle: {
        fontFamily: fonts.display.regular,
        fontSize: 22,
        lineHeight: 30,
        color: colors.onSurface,
        marginBottom: spacing.sm,
    },
    ctaDesc: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        lineHeight: 20,
        color: colors.onSurfaceMuted,
        marginBottom: spacing.xl,
    },

    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
    },
    featureCard: {
        width: CARD_WIDTH,
    },
    featureCardInner: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.md,
        paddingVertical: spacing.xxl,
        paddingHorizontal: spacing.md,
    },
    featureLabel: {
        fontFamily: fonts.body.medium,
        fontSize: 13,
        color: colors.onSurfaceMuted,
        textAlign: 'center',
    },
});