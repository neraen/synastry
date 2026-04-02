import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { GlassCard, GoldButton, GhostButton, CopyableText, TabHeader, FormattedText } from '@/components/ui';
import {
    getNatalChart,
    getNatalChartInterpretation,
    NatalChart,
    getMainPlanets,
    getPlanetNameFr,
    formatDegree,
} from '@/services/astrology';
import { colors, spacing, radius, fonts } from '@/theme';

// ─── Planet display data ────────────────────────────────────────────────────────
const PLANET_SYMBOLS: Record<string, string> = {
    Sun:        '☀',
    Moon:       '☽',
    Mercury:    '☿',
    Venus:      '♀',
    Mars:       '♂',
    Jupiter:    '♃',
    Saturn:     '♄',
    Uranus:     '♅',
    Neptune:    '♆',
    Pluto:      '♇',
    Ascendant:  '↑',
    Midheaven:  'MC',
};

const PLANET_TINTS = [
    colors.primary,
    `${colors.primary}CC`,
    `${colors.primary}99`,
    colors.secondary,
    `${colors.secondary}CC`,
];

// ─── Planet Card ───────────────────────────────────────────────────────────────
function PlanetCard({ planet, data, tint }: { planet: string; data: any; tint: string }) {
    const symbol = PLANET_SYMBOLS[planet] || '✦';
    const isRetrograde = data.Retrograde === 'Yes';

    return (
        <GlassCard opacity="low" radius="xl" style={styles.planetCard}>
            <View style={[styles.symbolBubble, { backgroundColor: `${tint}1A` }]}>
                <Text style={[styles.planetSymbol, { color: tint }]}>{symbol}</Text>
            </View>
            <View style={styles.planetContent}>
                <View style={styles.planetNameRow}>
                    <Text style={styles.planetName}>{getPlanetNameFr(planet)}</Text>
                    {isRetrograde && (
                        <View style={styles.retroBadge}>
                            <Text style={styles.retroText}>℞</Text>
                        </View>
                    )}
                </View>
                <Text style={styles.planetPosition} numberOfLines={1}>
                    {formatDegree(data.Position, data.Sign)}
                </Text>
            </View>
        </GlassCard>
    );
}

// ─── Screen ────────────────────────────────────────────────────────────────────
export default function HoroscopeTab() {
    const router = useRouter();
    const { t } = useTranslation();
    const { isAuthenticated, user, isLoading: isAuthLoading } = useAuth();

    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingInterp, setIsLoadingInterp] = useState(false);
    const [error, setError] = useState<string>();
    const [chart, setChart] = useState<NatalChart | null>(null);
    const [interpretation, setInterpretation] = useState<string | null>(null);

    useEffect(() => {
        if (isAuthLoading) return;
        if (isAuthenticated && user?.hasBirthProfile) loadChart();
        else setIsLoading(false);
    }, [isAuthenticated, user, isAuthLoading]);

    async function loadChart(refresh = false) {
        try {
            setError(undefined);
            const response = await getNatalChart(refresh);
            if (response.success && response.chart) {
                setChart(response.chart);
                if (response.chart.interpretation) setInterpretation(response.chart.interpretation);
            } else {
                setError(response.error || t('horoscope.chartError'));
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : t('horoscope.unknownError'));
        } finally {
            setIsLoading(false);
        }
    }

    async function loadInterpretation() {
        setIsLoadingInterp(true);
        setError(undefined);
        try {
            const response = await getNatalChartInterpretation();
            if (response.success && response.interpretation) {
                setInterpretation(response.interpretation);
            } else {
                setError(response.error || t('horoscope.chartError'));
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : t('horoscope.unknownError'));
        } finally {
            setIsLoadingInterp(false);
        }
    }

    // ── Loading ──
    if (isAuthLoading || isLoading) {
        return (
            <View style={styles.screen}>
                <SafeAreaView style={styles.safeArea} edges={['top']}>
                    <View style={styles.centered}>
                        <ActivityIndicator color={colors.primary} size="large" />
                        <Text style={styles.loadingText}>{t('horoscope.loadingChart')}</Text>
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    // ── Not authenticated ──
    if (!isAuthenticated) {
        return (
            <View style={styles.screen}>
                <SafeAreaView style={styles.safeArea} edges={['top']}>
                    <View style={styles.centered}>
                        <Text style={styles.emptyIcon}>🔮</Text>
                        <Text style={styles.emptyText}>{t('horoscope.loginPrompt')}</Text>
                        <GoldButton label={t('horoscope.loginBtn')} onPress={() => router.push('/login')} />
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    // ── No birth profile ──
    if (!user?.hasBirthProfile) {
        return (
            <View style={styles.screen}>
                <SafeAreaView style={styles.safeArea} edges={['top']}>
                    <View style={styles.centered}>
                        <Text style={styles.emptyIcon}>✨</Text>
                        <Text style={styles.emptyText}>{t('horoscope.profilePrompt')}</Text>
                        <GoldButton label={t('horoscope.profileBtn')} onPress={() => router.push('/birth-profile')} />
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    const mainPlanets = chart ? getMainPlanets(chart.planetaryPositions) : {};
    const planetEntries = Object.entries(mainPlanets);

    return (
        <View style={styles.screen}>
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <TabHeader />

                    {/* ── Hero ────────────────────────────────────────────────── */}
                    <View style={styles.hero}>
                        <View style={styles.badge}>
                            <View style={styles.badgeDot} />
                            <Text style={styles.badgeText}>{t('horoscope.badge')}</Text>
                        </View>
                        <Text style={styles.heroTitle}>{t('horoscope.heroTitle')}</Text>
                        <Text style={styles.heroSubtitle}>
                            {t('horoscope.heroSubtitle')}
                        </Text>
                    </View>

                    {/* ── Error ───────────────────────────────────────────────── */}
                    {error && (
                        <View style={styles.sectionPad}>
                            <GlassCard opacity="low" radius="xl">
                                <Text style={styles.errorText}>{error}</Text>
                                <View style={{ marginTop: spacing.lg }}>
                                    <GhostButton label={t('horoscope.retry')} onPress={() => loadChart()} />
                                </View>
                            </GlassCard>
                        </View>
                    )}

                    {/* ── Planets grid ─────────────────────────────────────────── */}
                    {planetEntries.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>{t('horoscope.planetaryPositions')}</Text>
                            <View style={styles.grid}>
                                {planetEntries.map(([planet, data], index) => (
                                    <PlanetCard
                                        key={planet}
                                        planet={planet}
                                        data={data}
                                        tint={PLANET_TINTS[index % PLANET_TINTS.length]}
                                    />
                                ))}
                            </View>
                        </View>
                    )}

                    {/* ── Interpretation ───────────────────────────────────────── */}
                    {chart && (
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>{t('horoscope.interpretation')}</Text>

                            {interpretation ? (
                                <GlassCard opacity="low" radius="xl">
                                    <CopyableText text={interpretation}>
                                        <FormattedText text={interpretation} style={styles.interpText} />
                                    </CopyableText>
                                </GlassCard>
                            ) : isLoadingInterp ? (
                                <GlassCard opacity="low" radius="xl">
                                    <View style={styles.interpLoading}>
                                        <ActivityIndicator color={colors.primary} size="small" />
                                        <Text style={styles.interpLoadingText}>{t('horoscope.interpretationLoading')}</Text>
                                        <Text style={styles.interpLoadingHint}>
                                            {t('horoscope.interpretationLoadingHint')}
                                        </Text>
                                    </View>
                                </GlassCard>
                            ) : (
                                <GlassCard opacity="low" radius="xl">
                                    <Text style={styles.interpCta}>
                                        {t('horoscope.interpretationCta')}
                                    </Text>
                                    <View style={{ marginTop: spacing.xl }}>
                                        <GoldButton
                                            label={t('horoscope.getInterpretation')}
                                            onPress={loadInterpretation}
                                            rightIcon
                                        />
                                    </View>
                                </GlassCard>
                            )}
                        </View>
                    )}

                    {/* ── Actions ──────────────────────────────────────────────── */}
                    {chart && (
                        <View style={styles.actions}>
                            <GhostButton
                                label={t('horoscope.compatibilityAnalysis')}
                                onPress={() => router.push('/(tabs)/compatibility')}
                            />
                        </View>
                    )}

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
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.lg,
        paddingHorizontal: spacing.xl,
    },
    loadingText: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        color: colors.onSurfaceMuted,
    },
    emptyIcon: {
        fontSize: 56,
        textAlign: 'center',
    },
    emptyText: {
        fontFamily: fonts.body.regular,
        fontSize: 15,
        color: colors.onSurfaceMuted,
        textAlign: 'center',
        lineHeight: 22,
    },

    // Hero
    hero: {
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.xl,
        paddingBottom: spacing.xxxl,
    },
    badge: {
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
    badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
    badgeText: {
        fontFamily: fonts.body.semiBold,
        fontSize: 10,
        letterSpacing: 1.5,
        color: colors.onSurfaceMuted,
        textTransform: 'uppercase',
    },
    heroTitle: {
        fontFamily: fonts.display.bold,
        fontSize: 42,
        lineHeight: 50,
        color: colors.onSurface,
        letterSpacing: -0.5,
        marginBottom: spacing.md,
    },
    heroSubtitle: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        lineHeight: 22,
        color: colors.onSurfaceMuted,
        maxWidth: 300,
    },

    // Sections
    section: {
        paddingHorizontal: spacing.xl,
        marginBottom: spacing.xxl,
    },
    sectionPad: {
        paddingHorizontal: spacing.xl,
        marginBottom: spacing.xl,
    },
    sectionLabel: {
        fontFamily: fonts.body.semiBold,
        fontSize: 10,
        letterSpacing: 1.5,
        color: colors.onSurfaceMuted,
        textTransform: 'uppercase',
        marginBottom: spacing.md,
    },

    // Planet grid
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
    },
    planetCard: {
        width: '47.5%',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
    },
    symbolBubble: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
    },
    planetSymbol: {
        fontFamily: fonts.display.bold,
        fontSize: 18,
        lineHeight: 22,
    },
    planetContent: { alignItems: 'center' },
    planetNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        marginBottom: 2,
    },
    planetName: {
        fontFamily: fonts.body.semiBold,
        fontSize: 13,
        color: colors.onSurface,
    },
    retroBadge: {
        backgroundColor: `${colors.error}20`,
        borderRadius: radius.full,
        paddingHorizontal: 5,
        paddingVertical: 1,
    },
    retroText: {
        fontFamily: fonts.body.semiBold,
        fontSize: 10,
        color: colors.error,
    },
    planetPosition: {
        fontFamily: fonts.body.regular,
        fontSize: 11,
        color: colors.onSurfaceMuted,
        textAlign: 'center',
    },

    // Interpretation
    interpText: {
        fontFamily: fonts.body.regular,
        fontSize: 15,
        lineHeight: 26,
        color: colors.onSurface,
    },
    interpLoading: {
        alignItems: 'center',
        paddingVertical: spacing.lg,
        gap: spacing.md,
    },
    interpLoadingText: {
        fontFamily: fonts.body.medium,
        fontSize: 14,
        color: colors.onSurfaceMuted,
    },
    interpLoadingHint: {
        fontFamily: fonts.body.regular,
        fontSize: 12,
        color: `${colors.onSurfaceMuted}80`,
    },
    interpCta: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        lineHeight: 22,
        color: colors.onSurfaceMuted,
        textAlign: 'center',
    },

    // Actions
    actions: {
        paddingHorizontal: spacing.xl,
        alignItems: 'center',
        marginBottom: spacing.xxl,
    },

    // Error
    errorText: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        color: colors.error,
        textAlign: 'center',
        lineHeight: 20,
    },
});