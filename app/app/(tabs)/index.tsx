import React, { useEffect, useState } from 'react';
import { View, ScrollView, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { GlassCard, GoldButton, TabHeader } from '@/components/ui';
import { colors, spacing, radius, fonts } from '@/theme';
import { getCosmicHeadline } from '@/services/astrology';

const { width: W } = Dimensions.get('window');
const CARD_WIDTH = (W - spacing.xl * 2 - spacing.md) / 2;


// ─── Feature Card ──────────────────────────────────────────────────────────────

interface FeatureCardProps {
    glyph: string;
    title: string;
    description: string;
    route: string;
    accentColor?: string;
}

function FeatureCard({ glyph, title, description, route, accentColor = colors.primary }: FeatureCardProps) {
    const router = useRouter();
    return (
        <Pressable style={styles.featureCard} onPress={() => router.push(route as any)}>
            <GlassCard opacity="low" radius="xl" padding="none"
                style={[styles.featureCardInner, { backgroundColor: `${accentColor}08` }]}>
                {/* Decorative background glyph */}
                <Text style={[styles.featureBgGlyph, { color: accentColor }]}>{glyph}</Text>
                {/* Arrow */}
                <View style={styles.featureArrowWrap}>
                    <Feather name="arrow-up-right" size={14} color={`${colors.onSurfaceMuted}50`} />
                </View>
                {/* Text anchored bottom-left */}
                <View style={styles.featureTextWrap}>
                    <Text style={[styles.featureLabel, { color: accentColor }]}>{description}</Text>
                    <Text style={styles.featureTitle}>{title}</Text>
                </View>
            </GlassCard>
        </Pressable>
    );
}

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function Home() {
    const router = useRouter();
    const { user } = useAuth();
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

    const displayName = user?.firstName || user?.email?.split('@')[0] || '';

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

                    {/* ── Quick analyze CTA ─────────────────────────────────── */}
                    <View style={styles.ctaSection}>
                        <GlassCard opacity="medium" radius="xxl">
                            <View style={styles.ctaBadge}>
                                <View style={styles.ctaBadgeDot} />
                                <Text style={styles.ctaBadgeText}>{t('home.heroBadge')}</Text>
                            </View>
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

                    {/* ── Features grid ─────────────────────────────────────── */}
                    <View style={styles.featuresSection}>
                        <Text style={styles.featuresLabel}>{t('home.featuresLabel')}</Text>
                        <View style={styles.featuresGrid}>
                            <FeatureCard
                                glyph="☽"
                                title={t('home.dailyInsightsTitle')}
                                description={t('home.featureLabelHoroscope')}
                                route="/daily-horoscope"
                                accentColor={colors.primary}
                            />
                            <FeatureCard
                                glyph="☀"
                                title={t('home.birthChartTitle')}
                                description={t('home.featureLabelNatal')}
                                route="/(tabs)/horoscope"
                                accentColor={colors.secondary}
                            />
                            <FeatureCard
                                glyph="⟡"
                                title={t('home.mirrorTitle')}
                                description={t('home.featureLabelMirror')}
                                route="/(tabs)/transits"
                                accentColor={colors.primary}
                            />
                            <FeatureCard
                                glyph="✦"
                                title={t('home.lyraTitle')}
                                description={t('home.featureLabelLyra')}
                                route="/(tabs)/chat"
                                accentColor={colors.secondary}
                            />
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

    // Hero
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

    // CTA card
    ctaSection: {
        paddingHorizontal: spacing.xl,
    },
    ctaBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: spacing.sm,
        backgroundColor: colors.surfaceContainerHigh,
        borderRadius: radius.full,
        paddingHorizontal: spacing.md,
        paddingVertical: 6,
        marginBottom: spacing.xl,
    },
    ctaBadgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
    ctaBadgeText: {
        fontFamily: fonts.body.semiBold,
        fontSize: 10,
        letterSpacing: 1.5,
        color: colors.onSurfaceMuted,
        textTransform: 'uppercase',
    },
    ctaTitle: {
        fontFamily: fonts.display.regular,
        fontSize: 24,
        lineHeight: 32,
        color: colors.onSurface,
        letterSpacing: 0.3,
        marginBottom: spacing.md,
    },
    ctaDesc: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        lineHeight: 20,
        color: colors.onSurfaceMuted,
        marginBottom: spacing.xl,
    },

    // Features grid
    featuresSection: {
        paddingHorizontal: spacing.xl,
        marginTop: spacing.xxxl,
    },
    featuresLabel: {
        fontFamily: fonts.body.semiBold,
        fontSize: 11,
        letterSpacing: 1.5,
        color: colors.onSurfaceMuted,
        textTransform: 'uppercase',
        marginBottom: spacing.lg,
    },
    featuresGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
    },

    // Feature card — editorial style: large background glyph, text anchored bottom
    featureCard: {
        width: CARD_WIDTH,
    },
    featureCardInner: {
        height: 148,
        overflow: 'hidden',
    },
    featureBgGlyph: {
        position: 'absolute',
        top: -8,
        right: -6,
        fontSize: 96,
        opacity: 0.18,
    },
    featureArrowWrap: {
        position: 'absolute',
        top: spacing.md,
        right: spacing.md,
    },
    featureTextWrap: {
        position: 'absolute',
        bottom: spacing.lg,
        left: spacing.lg,
        right: spacing.md,
    },
    featureLabel: {
        fontFamily: fonts.body.medium,
        fontSize: 10,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        marginBottom: 4,
        opacity: 0.8,
    },
    featureTitle: {
        fontFamily: fonts.display.bold,
        fontSize: 16,
        color: colors.onSurface,
        lineHeight: 20,
    },
});