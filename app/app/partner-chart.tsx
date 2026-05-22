import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    StyleSheet,
    ActivityIndicator,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard, FormattedText, Starfield } from '@/components/ui';
import {
    getPartnerSummary,
    getPlanetNameFr,
    getZodiacSignFr,
    formatDegree,
    PlanetPosition,
} from '@/services/astrology';
import { getSignAvatar } from '@/utils/signAvatar';
import { colors, spacing, radius, fonts } from '@/theme';

// ─── Constants ─────────────────────────────────────────────────────────────────

const PLANET_SYMBOLS: Record<string, string> = {
    Sun:       '☀',
    Moon:      '☽',
    Mercury:   '☿',
    Venus:     '♀',
    Mars:      '♂',
    Jupiter:   '♃',
    Saturn:    '♄',
    Ascendant: '↑',
};

const PLANET_TINTS = [
    colors.primary,
    `${colors.primary}CC`,
    `${colors.primary}99`,
    colors.secondary,
    `${colors.secondary}CC`,
];

const MAIN_PLANETS = ['Sun', 'Moon', 'Ascendant', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];

// ─── Planet Card ───────────────────────────────────────────────────────────────

function PlanetCard({
    planet,
    data,
    tint,
}: {
    planet: string;
    data: PlanetPosition;
    tint: string;
}) {
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
                    {data.Position != null
                        ? formatDegree(data.Position, data.Sign)
                        : getZodiacSignFr(data.Sign)}
                </Text>
            </View>
        </GlassCard>
    );
}

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function PartnerChartScreen() {
    const router = useRouter();
    const { historyId, partnerBirthDate } = useLocalSearchParams<{ historyId?: string; partnerBirthDate?: string }>();

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [partnerName, setPartnerName] = useState('');
    const [positions, setPositions] = useState<Record<string, PlanetPosition>>({});
    const [summary, setSummary] = useState<string | null>(null);

    useEffect(() => {
        if (!historyId) return;
        const id = parseInt(historyId, 10);
        if (isNaN(id)) return;

        setIsLoading(true);
        getPartnerSummary(id)
            .then((res) => {
                if (res.success) {
                    setPartnerName(res.partnerName ?? '');
                    setPositions(res.positions ?? {});
                    setSummary(res.summary ?? null);
                } else {
                    setError(res.error ?? 'Erreur de chargement');
                }
            })
            .catch(() => setError('Erreur réseau'))
            .finally(() => setIsLoading(false));
    }, [historyId]);

    const mainPlanets = MAIN_PLANETS.filter((p) => positions[p]);
    const planetEntries = mainPlanets.map((p) => [p, positions[p]] as [string, PlanetPosition]);

    // ── Loading ──
    if (isLoading) {
        return (
            <View style={styles.screen}>
                <Starfield />
                <SafeAreaView style={styles.safeArea} edges={['top']}>
                    <View style={styles.headerRow}>
                        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
                            <Feather name="arrow-left" size={22} color={colors.onSurface} />
                        </Pressable>
                    </View>
                    <View style={styles.centered}>
                        <ActivityIndicator color={colors.primary} size="large" />
                        <Text style={styles.loadingText}>Calcul du thème en cours…</Text>
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    const signAvatar = getSignAvatar(partnerBirthDate);
    const initial = partnerName.charAt(0).toUpperCase();

    return (
        <View style={styles.screen}>
            <Starfield />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Back button row */}
                    <View style={styles.headerRow}>
                        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
                            <Feather name="arrow-left" size={22} color={colors.onSurface} />
                        </Pressable>
                    </View>

                    {/* ── Hero ─────────────────────────────────────────────────── */}
                    <View style={styles.hero}>
                        <View style={styles.avatarWrap}>
                            <LinearGradient
                                colors={[colors.primary, colors.primaryContainer]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.avatarRing}
                            >
                                <View style={styles.avatarInner}>
                                    {signAvatar ? (
                                        <Image source={signAvatar} style={styles.avatarImage} />
                                    ) : (
                                        <Text style={styles.avatarInitial}>{initial}</Text>
                                    )}
                                </View>
                            </LinearGradient>
                        </View>

                        <View style={styles.badge}>
                            <View style={styles.badgeDot} />
                            <Text style={styles.badgeText}>Thème natal de</Text>
                        </View>
                        <Text style={styles.heroTitle}>{partnerName}</Text>
                        <Text style={styles.heroSubtitle}>
                            Positions planétaires et portrait de personnalité
                        </Text>
                    </View>

                    {/* ── Error ─────────────────────────────────────────────────── */}
                    {error && (
                        <View style={styles.sectionPad}>
                            <GlassCard opacity="low" radius="xl">
                                <Text style={styles.errorText}>{error}</Text>
                            </GlassCard>
                        </View>
                    )}

                    {/* ── Planet grid ───────────────────────────────────────────── */}
                    {planetEntries.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>Positions planétaires</Text>
                            <View style={styles.grid}>
                                {planetEntries.map(([planet, data], index) => {
                                    const tint = PLANET_TINTS[index % PLANET_TINTS.length];
                                    return (
                                        <View key={planet} style={styles.planetCardWrap}>
                                            <PlanetCard planet={planet} data={data} tint={tint} />
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    )}

                    {/* ── Personality summary ───────────────────────────────────── */}
                    {(summary || isLoading) && (
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>Personnalité</Text>
                            <GlassCard opacity="low" radius="xl">
                                {summary ? (
                                    <FormattedText text={summary} style={styles.interpText} />
                                ) : (
                                    <View style={styles.interpLoading}>
                                        <ActivityIndicator color={colors.primary} size="small" />
                                    </View>
                                )}
                            </GlassCard>
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

    // Header row (back button)
    headerRow: {
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.md,
        paddingBottom: spacing.sm,
    },
    backBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surfaceContainerHigh,
        borderRadius: radius.full,
    },

    // Hero
    hero: {
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.lg,
        paddingBottom: spacing.xxxl,
        alignItems: 'flex-start',
    },
    avatarWrap: {
        marginBottom: spacing.xl,
    },
    avatarRing: {
        width: 88,
        height: 88,
        borderRadius: 44,
        padding: 3,
    },
    avatarInner: {
        flex: 1,
        borderRadius: 41,
        backgroundColor: colors.surfaceLowest,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    avatarImage: {
        width: 82,
        height: 82,
        borderRadius: 41,
    },
    avatarInitial: {
        fontFamily: fonts.display.bold,
        fontSize: 32,
        color: colors.primary,
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
