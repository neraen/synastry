import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    StyleSheet,
    ActivityIndicator,
    Modal,
    TouchableOpacity,
    Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { GlassCard, GoldButton, GhostButton, CopyableText, TabHeader, FormattedText } from '@/components/ui';
import {
    getNatalChart,
    getNatalChartSummary,
    getNatalChartInterpretation,
    getPlanetInterpretation,
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
function PlanetCard({
    planet,
    data,
    tint,
    onPress,
}: {
    planet: string;
    data: any;
    tint: string;
    onPress: () => void;
}) {
    const symbol = PLANET_SYMBOLS[planet] || '✦';
    const isRetrograde = data.Retrograde === 'Yes';

    return (
        <Pressable onPress={onPress} style={styles.planetCardWrap}>
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
        </Pressable>
    );
}

// ─── Planet Detail Modal ────────────────────────────────────────────────────────
function PlanetDetailModal({
    visible,
    planet,
    data,
    tint,
    onClose,
}: {
    visible: boolean;
    planet: string | null;
    data: any | null;
    tint: string;
    onClose: () => void;
}) {
    const { t } = useTranslation();
    const [interpretation, setInterpretation] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const slideY = useRef(new Animated.Value(300)).current;

    useEffect(() => {
        if (visible) {
            Animated.spring(slideY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }).start();
        } else {
            slideY.setValue(300);
            setInterpretation(null);
            setError(null);
        }
    }, [visible]);

    useEffect(() => {
        if (!visible || !planet) return;
        setLoading(true);
        setError(null);
        getPlanetInterpretation(planet)
            .then((res) => {
                if (res.success && res.interpretation) {
                    setInterpretation(res.interpretation);
                } else {
                    setError(res.error ?? 'Erreur');
                }
            })
            .catch(() => setError('Erreur réseau'))
            .finally(() => setLoading(false));
    }, [visible, planet]);

    if (!planet || !data) return null;

    const symbol = PLANET_SYMBOLS[planet] || '✦';
    const isRetrograde = data.Retrograde === 'Yes';

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <TouchableOpacity style={modalStyles.backdrop} activeOpacity={1} onPress={onClose} />
            <Animated.View style={[modalStyles.sheet, { transform: [{ translateY: slideY }] }]}>
                {/* Handle */}
                <View style={modalStyles.handle} />

                {/* Header */}
                <View style={modalStyles.header}>
                    <View style={[modalStyles.symbolBubble, { backgroundColor: `${tint}20` }]}>
                        <Text style={[modalStyles.symbol, { color: tint }]}>{symbol}</Text>
                    </View>
                    <View style={modalStyles.headerText}>
                        <View style={modalStyles.nameRow}>
                            <Text style={modalStyles.planetName}>{getPlanetNameFr(planet)}</Text>
                            {isRetrograde && (
                                <View style={modalStyles.retroBadge}>
                                    <Text style={modalStyles.retroText}>℞</Text>
                                </View>
                            )}
                        </View>
                        <Text style={modalStyles.position}>{formatDegree(data.Position, data.Sign)}</Text>
                    </View>
                    <TouchableOpacity onPress={onClose} hitSlop={12} style={modalStyles.closeBtn}>
                        <Text style={modalStyles.closeIcon}>✕</Text>
                    </TouchableOpacity>
                </View>

                {/* Content */}
                <ScrollView style={modalStyles.content} showsVerticalScrollIndicator={false}>
                    {loading ? (
                        <View style={modalStyles.centered}>
                            <ActivityIndicator color={colors.primary} />
                        </View>
                    ) : error ? (
                        <Text style={modalStyles.errorText}>{error}</Text>
                    ) : interpretation ? (
                        <FormattedText text={interpretation} style={modalStyles.interpText} />
                    ) : null}
                    <View style={{ height: 32 }} />
                </ScrollView>
            </Animated.View>
        </Modal>
    );
}

// ─── Screen ────────────────────────────────────────────────────────────────────
export default function HoroscopeTab() {
    const router = useRouter();
    const { t } = useTranslation();
    const { isAuthenticated, user, isLoading: isAuthLoading } = useAuth();

    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingSummary, setIsLoadingSummary] = useState(false);
    const [isLoadingInterp, setIsLoadingInterp] = useState(false);
    const [error, setError] = useState<string>();
    const [chart, setChart] = useState<NatalChart | null>(null);
    const [summary, setSummary] = useState<string | null>(null);
    const [interpretation, setInterpretation] = useState<string | null>(null);

    // Planet detail modal
    const [selectedPlanet, setSelectedPlanet] = useState<string | null>(null);
    const [selectedData, setSelectedData] = useState<any | null>(null);
    const [selectedTint, setSelectedTint] = useState<string>(colors.primary);

    const openPlanetDetail = useCallback((planet: string, data: any, tint: string) => {
        setSelectedPlanet(planet);
        setSelectedData(data);
        setSelectedTint(tint);
    }, []);

    const closePlanetDetail = useCallback(() => {
        setSelectedPlanet(null);
        setSelectedData(null);
    }, []);

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
                loadSummary();
            } else {
                setError(response.error || t('horoscope.chartError'));
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : t('horoscope.unknownError'));
        } finally {
            setIsLoading(false);
        }
    }

    async function loadSummary() {
        setIsLoadingSummary(true);
        try {
            const response = await getNatalChartSummary();
            if (response.success && response.summary) {
                setSummary(response.summary);
            }
        } catch {
            // summary is optional — fail silently
        } finally {
            setIsLoadingSummary(false);
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
        } catch (err: any) {
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
                                {planetEntries.map(([planet, data], index) => {
                                    const tint = PLANET_TINTS[index % PLANET_TINTS.length];
                                    return (
                                        <PlanetCard
                                            key={planet}
                                            planet={planet}
                                            data={data}
                                            tint={tint}
                                            onPress={() => openPlanetDetail(planet, data, tint)}
                                        />
                                    );
                                })}
                            </View>
                        </View>
                    )}

                    {/* ── Interpretation ───────────────────────────────────────── */}
                    {chart && (
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>{t('horoscope.interpretation')}</Text>

                            {interpretation ? (
                                // Full interpretation (replaces summary after button tap)
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
                                // Summary card (default state)
                                <GlassCard opacity="low" radius="xl">
                                    {isLoadingSummary ? (
                                        <View style={styles.interpLoading}>
                                            <ActivityIndicator color={colors.primary} size="small" />
                                        </View>
                                    ) : summary ? (
                                        <FormattedText text={summary} style={styles.interpText} />
                                    ) : null}

                                    <View style={{ marginTop: summary ? spacing.xl : 0 }}>
                                        <GoldButton
                                            label={t('horoscope.showDetailedProfile')}
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

            <PlanetDetailModal
                visible={!!selectedPlanet}
                planet={selectedPlanet}
                data={selectedData}
                tint={selectedTint}
                onClose={closePlanetDetail}
            />
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
    planetCardWrap: {
        width: '47.5%',
    },
    planetCard: {
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

// ─── Modal Styles ──────────────────────────────────────────────────────────────
const modalStyles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(10, 6, 22, 0.72)',
    },
    sheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.surfaceContainerHigh,
        borderTopLeftRadius: radius.xl,
        borderTopRightRadius: radius.xl,
        paddingBottom: 40,
        maxHeight: '75%',
    },
    handle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: `${colors.onSurfaceMuted}40`,
        alignSelf: 'center',
        marginTop: spacing.md,
        marginBottom: spacing.lg,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.lg,
        gap: spacing.md,
    },
    symbolBubble: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    symbol: {
        fontFamily: fonts.display.bold,
        fontSize: 20,
        lineHeight: 24,
    },
    headerText: {
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    planetName: {
        fontFamily: fonts.display.semiBold,
        fontSize: 18,
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
        fontSize: 11,
        color: colors.error,
    },
    position: {
        fontFamily: fonts.body.regular,
        fontSize: 13,
        color: colors.onSurfaceMuted,
        marginTop: 2,
    },
    closeBtn: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: `${colors.onSurfaceMuted}18`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeIcon: {
        fontFamily: fonts.body.regular,
        fontSize: 12,
        color: colors.onSurfaceMuted,
    },
    content: {
        paddingHorizontal: spacing.xl,
    },
    centered: {
        paddingVertical: spacing.xxl,
        alignItems: 'center',
    },
    interpText: {
        fontFamily: fonts.body.regular,
        fontSize: 15,
        lineHeight: 26,
        color: colors.onSurface,
    },
    errorText: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        color: colors.error,
        lineHeight: 22,
    },
});