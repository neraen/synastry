import React, { useEffect, useState } from 'react';
import { View, ScrollView, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { GlassCard, GoldButton, TabHeader, ProgressBar, CelestialChip } from '@/components/ui';
import { FullPageLoader } from '@/components/loaders';
import { colors, spacing, fonts, radius } from '@/theme';
import { getCosmicHeadline, getHomeInsights, WeeklyEnergy, CurrentPeriod } from '@/services/astrology';
import { cacheGet, cacheSet, cacheInvalidatePrefix } from '@/services/cache';

const { width: W } = Dimensions.get('window');
const CARD_WIDTH = (W - spacing.xl * 2 - spacing.md) / 2;

// ─── Tonality dot ──────────────────────────────────────────────────────────────

const TONALITY_COLOR: Record<string, string> = {
    positive: '#6fcf97',
    neutre: colors.onSurfaceMuted,
    tendu: '#eb5757',
};

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
    const { user } = useAuth();
    const [heroTitle, setHeroTitle] = useState<string | null>(null);
    const [heroSubtitle, setHeroSubtitle] = useState<string | null>(null);
    const [weeklyEnergy, setWeeklyEnergy] = useState<WeeklyEnergy | null>(null);
    const [currentPeriod, setCurrentPeriod] = useState<CurrentPeriod | null>(null);
    const [insightsLoading, setInsightsLoading] = useState(false);
    const [insightsError, setInsightsError] = useState(false);
    const hasBirthProfile = user?.hasBirthProfile ?? false;

    // Detect birth profile changes (date or city) to bust stale personalized caches
    const prevBirthProfileKey = React.useRef<string | null>(null);
    const birthProfileKey = user?.birthProfile
        ? `${user.birthProfile.birthDate}_${user.birthProfile.birthCity}`
        : null;
    React.useEffect(() => {
        if (
            prevBirthProfileKey.current !== null &&
            birthProfileKey !== null &&
            prevBirthProfileKey.current !== birthProfileKey &&
            user?.id
        ) {
            cacheInvalidatePrefix(`u${user.id}_`);
            setWeeklyEnergy(null);
            setCurrentPeriod(null);
        }
        prevBirthProfileKey.current = birthProfileKey;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [birthProfileKey]);

    useEffect(() => {
        // Cosmic headline is global (not user-specific), safe without user scope
        (async () => {
            const cached = await cacheGet<{ title: string; subtitle: string }>('cosmic_headline');
            if (cached) {
                setHeroTitle(cached.title);
                setHeroSubtitle(cached.subtitle);
                return;
            }
            try {
                const res = await getCosmicHeadline();
                if (res.success && res.headline) {
                    setHeroTitle(res.headline.title);
                    setHeroSubtitle(res.headline.subtitle);
                    await cacheSet('cosmic_headline', { title: res.headline.title, subtitle: res.headline.subtitle }, 24 * 3600);
                }
            } catch {}
        })();
    }, []);

    useEffect(() => {
        if (!hasBirthProfile || !user?.id) return;
        (async () => {
            // Scoped by user ID so two accounts on the same device don't share data
            const cacheKey = `u${user.id}_home_insights`;
            const cached = await cacheGet<{ weeklyEnergy: WeeklyEnergy; currentPeriod: CurrentPeriod }>(cacheKey);
            if (cached) {
                setWeeklyEnergy(cached.weeklyEnergy ?? null);
                setCurrentPeriod(cached.currentPeriod ?? null);
                return;
            }
            setInsightsLoading(true);
            setInsightsError(false);
            try {
                const res = await getHomeInsights();
                if (res.success) {
                    setWeeklyEnergy(res.weeklyEnergy ?? null);
                    setCurrentPeriod(res.currentPeriod ?? null);
                    if (res.weeklyEnergy && res.currentPeriod) {
                        await cacheSet(cacheKey, { weeklyEnergy: res.weeklyEnergy, currentPeriod: res.currentPeriod }, 12 * 3600);
                    }
                } else {
                    setInsightsError(true);
                }
            } catch {
                setInsightsError(true);
            } finally {
                setInsightsLoading(false);
            }
        })();
    // Re-run if birth profile was invalidated (weeklyEnergy reset to null triggers re-fetch)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasBirthProfile, user?.id, weeklyEnergy === null ? birthProfileKey : null]);

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

                    {/* ── Weekly Energy ─────────────────────────────────────── */}
                    {hasBirthProfile && (
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>{t('home.weeklyEnergyLabel', 'Énergie de la semaine')}</Text>
                            {weeklyEnergy ? (
                                <GlassCard opacity="low" radius="xl">
                                    <Text style={styles.insightTitle}>{weeklyEnergy.titre}</Text>
                                    <Text style={styles.insightBody}>{weeklyEnergy.resume}</Text>
                                    <View style={styles.intensiteRow}>
                                        <Text style={styles.intensiteLabel}>{t('home.intensityLabel', 'Intensité')}</Text>
                                        <Text style={styles.intensiteValue}>{weeklyEnergy.intensite}/10</Text>
                                    </View>
                                    <ProgressBar value={weeklyEnergy.intensite * 10} style={styles.progressBar} />
                                    <View style={styles.chipRow}>
                                        {weeklyEnergy.domaines.map((d) => (
                                            <CelestialChip key={d} label={d} />
                                        ))}
                                    </View>
                                    {weeklyEnergy.conseil ? (
                                        <View style={styles.conseilBox}>
                                            <Feather name="zap" size={14} color={colors.primary} />
                                            <Text style={styles.conseilText}>{weeklyEnergy.conseil}</Text>
                                        </View>
                                    ) : null}
                                </GlassCard>
                            ) : null}
                        </View>
                    )}

                    {/* ── Current Period ────────────────────────────────────── */}
                    {hasBirthProfile && (
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>{t('home.currentPeriodLabel', 'Ta période actuelle')}</Text>
                            {currentPeriod ? (
                                <GlassCard opacity="low" radius="xl">
                                    <View style={styles.periodHeader}>
                                        <Text style={styles.insightTitle}>{currentPeriod.titre}</Text>
                                        <View style={[styles.tonalityDot, { backgroundColor: TONALITY_COLOR[currentPeriod.tonalite] ?? colors.onSurfaceMuted }]} />
                                    </View>
                                    {currentPeriod.contenu.map((para, i) => (
                                        <Text key={i} style={[styles.insightBody, i > 0 && { marginTop: spacing.md }]}>
                                            {para}
                                        </Text>
                                    ))}
                                </GlassCard>
                            ) : null}
                        </View>
                    )}

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
            <FullPageLoader visible={insightsLoading} variant="default" label="Alignement des astres…" />
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

    sectionLabel: {
        fontFamily: fonts.body.medium,
        fontSize: 11,
        letterSpacing: 1.5,
        color: colors.onSurfaceMuted,
        textTransform: 'uppercase',
        marginBottom: spacing.md,
    },

    insightTitle: {
        fontFamily: fonts.display.regular,
        fontSize: 20,
        lineHeight: 26,
        color: colors.onSurface,
        marginBottom: spacing.md,
    },
    insightBody: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        lineHeight: 22,
        color: colors.onSurfaceMuted,
        marginBottom: spacing.md,
    },

    intensiteRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: spacing.md,
        marginBottom: spacing.sm,
    },
    intensiteLabel: {
        fontFamily: fonts.body.medium,
        fontSize: 12,
        color: colors.onSurfaceMuted,
    },
    intensiteValue: {
        fontFamily: fonts.body.semiBold,
        fontSize: 12,
        color: colors.onSurface,
    },
    progressBar: {
        marginBottom: spacing.lg,
    },

    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },

    conseilBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
        backgroundColor: `${colors.primary}12`,
        borderRadius: radius.md,
        padding: spacing.md,
    },
    conseilText: {
        flex: 1,
        fontFamily: fonts.body.regular,
        fontSize: 13,
        lineHeight: 20,
        color: colors.onSurface,
    },

    periodHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    tonalityDot: {
        width: 8,
        height: 8,
        borderRadius: radius.full,
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
