/**
 * Upcoming Transits Screen
 * AI-generated personalized transit predictions.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    Pressable,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, radius, fonts, typography } from '@/theme';
import { GlassCard } from '@/components/ui/GlassCard';
import { getUpcomingTransits, UpcomingTransit } from '@/services/astrology';

// ─── Intensity config ─────────────────────────────────────────────────────────

const intensityConfig = {
    high: { color: colors.primary, label: 'MAJEUR', dotSize: 12 },
    medium: { color: colors.secondary, label: 'MODÉRÉ', dotSize: 10 },
    low: { color: colors.onSurfaceMuted, label: 'LÉGER', dotSize: 8 },
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function TransitItem({ transit, isLast }: { transit: UpcomingTransit; isLast: boolean }) {
    const config = intensityConfig[transit.intensity] ?? intensityConfig.medium;

    return (
        <View style={styles.transitRow}>
            {/* Timeline column */}
            <View style={styles.timelineCol}>
                <View style={[styles.dot, { width: config.dotSize, height: config.dotSize, borderRadius: config.dotSize / 2, backgroundColor: config.color, shadowColor: config.color }]} />
                {!isLast && <View style={styles.line} />}
            </View>

            {/* Content */}
            <GlassCard opacity="low" radius="xl" style={styles.transitCard}>
                <View style={styles.transitHeader}>
                    <View style={[styles.intensityBadge, { backgroundColor: `${config.color}18` }]}>
                        <Text style={[styles.intensityLabel, { color: config.color }]}>{config.label}</Text>
                    </View>
                    <Text style={styles.transitDate}>{transit.date}</Text>
                </View>
                <Text style={styles.transitTitle}>{transit.title}</Text>
                <Text style={styles.transitDesc}>{transit.description}</Text>
            </GlassCard>
        </View>
    );
}

function LoadingSkeleton() {
    return (
        <View style={styles.skeletonWrap}>
            {[0, 1, 2].map((i) => (
                <View key={i} style={styles.transitRow}>
                    <View style={styles.timelineCol}>
                        <View style={[styles.dot, { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.surfaceContainerHigh }]} />
                        {i < 2 && <View style={styles.line} />}
                    </View>
                    <View style={[styles.skeletonCard, { height: 110 + i * 20 }]} />
                </View>
            ))}
        </View>
    );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function TransitsScreen() {
    const router = useRouter();
    const [transits, setTransits] = useState<UpcomingTransit[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);
        try {
            const res = await getUpcomingTransits();
            if (res.success && res.transits) {
                setTransits(res.transits);
            } else {
                setError(res.error ?? 'Erreur inconnue');
            }
        } catch {
            setError('Impossible de récupérer les transits.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    return (
        <View style={styles.root}>
            <SafeAreaView style={styles.safe} edges={['top']}>
                {/* Header */}
                <View style={styles.header}>
                    <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
                        <Feather name="arrow-left" size={20} color={colors.onSurfaceMuted} />
                    </Pressable>
                    <View style={styles.headerCenter}>
                        <Text style={styles.logoIcon}>✦</Text>
                        <Text style={styles.headerTitle}>Prochains Transits</Text>
                    </View>
                    <View style={{ width: 36 }} />
                </View>

                <ScrollView
                    contentContainerStyle={styles.scroll}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => load(true)}
                            tintColor={colors.primary}
                        />
                    }
                >
                    {/* Hero */}
                    <View style={styles.hero}>
                        <Text style={styles.heroTitle}>Alignements{'\n'}à venir</Text>
                        <Text style={styles.heroSubtitle}>
                            Les 3 transits les plus déterminants{'\n'}des 30 prochains jours, selon ton thème natal.
                        </Text>
                    </View>

                    {/* Badge */}
                    <View style={styles.aiBadgeWrap}>
                        <View style={styles.aiBadge}>
                            <View style={styles.aiBadgeDot} />
                            <Text style={styles.aiBadgeText}>ANALYSE PERSONNALISÉE PAR IA</Text>
                        </View>
                    </View>

                    {/* Content */}
                    {loading && <LoadingSkeleton />}

                    {!loading && error && (
                        <GlassCard opacity="low" radius="xl" style={styles.errorCard}>
                            <Feather name="alert-circle" size={32} color={colors.error} />
                            <Text style={styles.errorText}>{error}</Text>
                            <Pressable onPress={() => load()} style={styles.retryBtn}>
                                <Text style={styles.retryText}>Réessayer</Text>
                            </Pressable>
                        </GlassCard>
                    )}

                    {!loading && !error && transits.length > 0 && (
                        <View style={styles.timeline}>
                            {transits.map((t, i) => (
                                <TransitItem key={i} transit={t} isLast={i === transits.length - 1} />
                            ))}
                        </View>
                    )}

                    {/* Pull hint */}
                    {!loading && !error && (
                        <Text style={styles.pullHint}>↓ Tire pour actualiser</Text>
                    )}

                    <View style={{ height: 60 }} />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.surfaceLowest },
    safe: { flex: 1 },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.surfaceContainerHigh,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerCenter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    logoIcon: { fontSize: 12, color: colors.primary },
    headerTitle: {
        fontFamily: fonts.display.regular,
        fontSize: 18,
        color: colors.onSurface,
        letterSpacing: 0.3,
    },

    // Hero
    hero: {
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.xl,
        marginBottom: spacing.xl,
    },
    heroTitle: {
        fontFamily: fonts.display.bold,
        fontSize: 38,
        lineHeight: 46,
        color: colors.onSurface,
        letterSpacing: -0.5,
        marginBottom: spacing.md,
    },
    heroSubtitle: {
        fontFamily: fonts.body.regular,
        fontSize: 15,
        lineHeight: 22,
        color: colors.onSurfaceMuted,
    },

    // AI badge
    aiBadgeWrap: {
        paddingHorizontal: spacing.xl,
        marginBottom: spacing.xxl,
    },
    aiBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: spacing.sm,
        backgroundColor: colors.surfaceContainerHigh,
        borderRadius: radius.full,
        paddingHorizontal: spacing.md,
        paddingVertical: 6,
    },
    aiBadgeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.primary,
    },
    aiBadgeText: {
        fontFamily: fonts.body.semiBold,
        fontSize: 9,
        letterSpacing: 1.5,
        color: colors.onSurfaceMuted,
        textTransform: 'uppercase',
    },

    // Timeline
    timeline: {
        paddingHorizontal: spacing.xl,
    },
    transitRow: {
        flexDirection: 'row',
        gap: spacing.lg,
        marginBottom: spacing.xxl,
    },
    timelineCol: {
        alignItems: 'center',
        width: 12,
        paddingTop: spacing.lg,
    },
    dot: {
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 6,
        elevation: 4,
    },
    line: {
        flex: 1,
        width: 1,
        backgroundColor: colors.outline,
        opacity: 0.25,
        marginTop: spacing.sm,
    },
    transitCard: {
        flex: 1,
    },
    transitHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    intensityBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 3,
        borderRadius: radius.full,
    },
    intensityLabel: {
        fontFamily: fonts.body.semiBold,
        fontSize: 9,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
    },
    transitDate: {
        fontFamily: fonts.body.semiBold,
        fontSize: 10,
        letterSpacing: 1,
        color: colors.onSurfaceMuted,
        textTransform: 'uppercase',
    },
    transitTitle: {
        fontFamily: fonts.display.regular,
        fontSize: 17,
        color: colors.onSurface,
        marginBottom: spacing.sm,
        letterSpacing: 0.2,
    },
    transitDesc: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        lineHeight: 20,
        color: colors.onSurfaceMuted,
    },

    // Skeleton
    skeletonWrap: { paddingHorizontal: spacing.xl },
    skeletonCard: {
        flex: 1,
        borderRadius: radius.xl,
        backgroundColor: colors.surfaceLow,
        opacity: 0.5,
    },

    // Error
    errorCard: {
        marginHorizontal: spacing.xl,
        alignItems: 'center',
        gap: spacing.lg,
    },
    errorText: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        color: colors.onSurfaceMuted,
        textAlign: 'center',
        lineHeight: 20,
    },
    retryBtn: {
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: radius.full,
        backgroundColor: `${colors.primary}20`,
    },
    retryText: {
        fontFamily: fonts.body.semiBold,
        fontSize: 13,
        color: colors.primary,
        letterSpacing: 0.5,
    },

    // Pull hint
    pullHint: {
        fontFamily: fonts.body.regular,
        fontSize: 12,
        color: `${colors.onSurfaceMuted}60`,
        textAlign: 'center',
        marginTop: spacing.sm,
    },
});