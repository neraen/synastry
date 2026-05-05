import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    Pressable,
    Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
    GlassCard,
    GoldButton,
    GhostButton,
    CopyableText,
    FormattedText,
    ScoreRow,
} from '@/components/ui';
import {
    getSynastryHistoryDetail,
    SynastryResponse,
} from '@/services/astrology';
import { colors, spacing, radius, fonts } from '@/theme';

// ─── Dimension config ──────────────────────────────────────────────────────────

const DIM_LABELS: Record<string, { label: string; icon: keyof typeof Feather.glyphMap }> = {
    amour:         { label: 'Amour',         icon: 'heart' },
    love:          { label: 'Amour',         icon: 'heart' },
    communication: { label: 'Communication', icon: 'message-circle' },
    attirance:     { label: 'Attirance',     icon: 'zap' },
    attraction:    { label: 'Attraction',    icon: 'zap' },
    long_terme:    { label: 'Long terme',    icon: 'anchor' },
    long_term:     { label: 'Long-term',     icon: 'anchor' },
    conflits:      { label: 'Conflits',      icon: 'activity' },
    conflicts:     { label: 'Conflicts',     icon: 'activity' },
};

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function CompatibilityResultScreen() {
    const router = useRouter();
    const { t } = useTranslation();
    const { id } = useLocalSearchParams<{ id?: string }>();

    const [isLoading, setIsLoading] = useState(true);
    const [result, setResult] = useState<SynastryResponse | null>(null);
    const [isSharing, setIsSharing] = useState(false);

    const historyId = id ? Number(id) : null;

    useEffect(() => {
        if (!historyId) return;
        getSynastryHistoryDetail(historyId)
            .then((res) => {
                if (res.success && res.history) {
                    const h = res.history;
                    setResult({
                        success: true,
                        historyId: h.id,
                        partner: { name: h.partnerName, positions: h.partnerPositions ?? {} },
                        analysis: h.analysis,
                        compatibilityScore: h.compatibilityScore ?? undefined,
                        compatibilityDetails: h.compatibilityDetails ?? undefined,
                    });
                }
            })
            .catch(() => {})
            .finally(() => setIsLoading(false));
    }, [historyId]);

    const handleShare = async () => {
        if (!historyId || isSharing || !result) return;
        setIsSharing(true);
        try {
            const score = Math.round(result.compatibilityScore || 0);
            const partnerName = result.partner?.name ?? '';
            const sub = headline || (score >= 80
                ? t('synastry.deepConnection')
                : score >= 60
                    ? t('synastry.niceHarmony')
                    : t('synastry.complementarity'));
            const message = `✦ ${score}% de compatibilité avec ${partnerName}\n\n« ${sub} »\n\nAnalyse ta compatibilité astrologique sur Lunestia 🌙`;
            await Share.share({ message });
        } catch {
            // user cancelled — silent
        } finally {
            setIsSharing(false);
        }
    };

    // ── Loading ──
    if (isLoading) {
        return (
            <View style={styles.screen}>
                <SafeAreaView style={styles.safeArea} edges={['top']}>
                    <View style={styles.headerRow}>
                        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
                            <Feather name="arrow-left" size={22} color={colors.onSurface} />
                        </Pressable>
                    </View>
                    <View style={styles.centered}>
                        <ActivityIndicator color={colors.primary} size="large" />
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    if (!result) {
        return (
            <View style={styles.screen}>
                <SafeAreaView style={styles.safeArea} edges={['top']}>
                    <View style={styles.headerRow}>
                        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
                            <Feather name="arrow-left" size={22} color={colors.onSurface} />
                        </Pressable>
                    </View>
                    <View style={styles.centered}>
                        <Text style={styles.errorText}>Résultat introuvable.</Text>
                        <GhostButton label="Retour" onPress={() => router.back()} />
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    const score = Math.round(result.compatibilityScore || 0);
    const headline = result.compatibilityDetails?.headline;
    const dimensions = result.compatibilityDetails?.dimensions || {};
    const dimEntries = Object.entries(dimensions);

    return (
        <View style={styles.screen}>
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                    {/* Back button */}
                    <View style={styles.headerRow}>
                        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
                            <Feather name="arrow-left" size={22} color={colors.onSurface} />
                        </Pressable>
                    </View>

                    {/* Hero */}
                    <View style={styles.hero}>
                        <Text style={styles.heroPct}>{score}%</Text>
                        <Text style={styles.heroSub}>
                            {headline || (score >= 80
                                ? t('synastry.deepConnection')
                                : score >= 60
                                    ? t('synastry.niceHarmony')
                                    : t('synastry.complementarity'))}
                        </Text>
                        <Text style={styles.heroCaption}>
                            {t('synastry.compatibilityWith', { name: (result.partner?.name || '').toUpperCase() })}
                        </Text>
                    </View>

                    {/* Dimension bars */}
                    {dimEntries.length > 0 && (
                        <View style={styles.sectionPad}>
                            <GlassCard opacity="low" radius="xl">
                                <Text style={styles.dimTitle}>{t('synastry.dimensionsByTitle')}</Text>
                                <View style={{ height: spacing.md }} />
                                {dimEntries.map(([key, data]: [string, any]) => {
                                    const dim = DIM_LABELS[key] || { label: key, icon: 'star' as const };
                                    return (
                                        <ScoreRow
                                            key={key}
                                            label={dim.label}
                                            value={Math.round(data?.score || 0)}
                                            icon={dim.icon}
                                            gradientColors={['#a78bfa', '#ddd6fe']}
                                        />
                                    );
                                })}
                            </GlassCard>
                        </View>
                    )}

                    {/* Celestial Insights */}
                    <View style={[styles.sectionPad, { marginTop: spacing.xxl }]}>
                        <GlassCard opacity="low" radius="xl">
                            <View style={styles.insightHeader}>
                                <View style={styles.insightIconWrap}>
                                    <Feather name="star" size={16} color={colors.primary} />
                                </View>
                                <Text style={styles.insightLabel}>{t('synastry.celestialAnalysis')}</Text>
                            </View>
                            <CopyableText text={result.analysis || ''}>
                                <FormattedText text={result.analysis || ''} style={styles.insightText} />
                            </CopyableText>
                        </GlassCard>
                    </View>

                    {/* Actions */}
                    <View style={[styles.sectionPad, { marginTop: spacing.xxl }]}>
                        <View style={styles.chips}>
                            <Pressable
                                style={({ pressed }) => [styles.chip, pressed && { opacity: 0.7 }]}
                                onPress={handleShare}
                                disabled={isSharing}
                            >
                                {isSharing
                                    ? <ActivityIndicator size="small" color={colors.primary} />
                                    : <Feather name="share-2" size={15} color={colors.primary} />
                                }
                                <Text style={styles.chipText}>Partager</Text>
                            </Pressable>

                            <Pressable
                                style={({ pressed }) => [styles.chip, pressed && { opacity: 0.7 }]}
                                onPress={() => router.push(`/partner-chart?historyId=${historyId}`)}
                            >
                                <Feather name="star" size={15} color={colors.primary} />
                                <Text style={styles.chipText}>
                                    Thème de {result.partner?.name ?? 'partenaire'}
                                </Text>
                            </Pressable>
                        </View>

                        <GoldButton
                            label={t('synastry.newAnalysisBtn')}
                            onPress={() => router.push('/(tabs)/compatibility')}
                            rightIcon
                        />
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
    scrollContent: { flexGrow: 1 },

    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.lg,
        paddingHorizontal: spacing.xl,
    },
    errorText: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        color: colors.error,
        textAlign: 'center',
    },

    // Header
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
        paddingTop: spacing.xl,
        paddingBottom: spacing.xxxl,
        alignItems: 'center',
    },
    heroPct: {
        fontFamily: fonts.display.medium,
        fontSize: 72,
        lineHeight: 80,
        color: colors.primary,
        letterSpacing: -2,
        textAlign: 'center',
    },
    heroSub: {
        fontFamily: fonts.display.regular,
        fontSize: 24,
        color: colors.onSurface,
        fontStyle: 'italic',
        marginTop: spacing.sm,
        textAlign: 'center',
    },
    heroCaption: {
        fontFamily: fonts.body.semiBold,
        fontSize: 10,
        letterSpacing: 2,
        color: colors.onSurfaceMuted,
        textTransform: 'uppercase',
        marginTop: spacing.sm,
        textAlign: 'center',
    },

    sectionPad: { paddingHorizontal: spacing.xl },

    dimTitle: {
        fontFamily: fonts.body.semiBold,
        fontSize: 10,
        letterSpacing: 2,
        color: colors.onSurfaceMuted,
        textTransform: 'uppercase',
    },

    insightHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    insightIconWrap: {
        width: 32,
        height: 32,
        borderRadius: radius.md,
        backgroundColor: `${colors.secondaryContainer}4D`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    insightLabel: {
        fontFamily: fonts.body.semiBold,
        fontSize: 10,
        letterSpacing: 2,
        color: colors.onSurfaceMuted,
        textTransform: 'uppercase',
    },
    insightText: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        lineHeight: 22,
        color: `${colors.onSurface}E6`,
    },

    // Action chips
    chips: {
        flexDirection: 'row',
        gap: spacing.md,
        marginBottom: spacing.lg,
        flexWrap: 'wrap',
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: `${colors.primary}15`,
        borderRadius: radius.full,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderWidth: 1,
        borderColor: `${colors.primary}30`,
    },
    chipText: {
        fontFamily: fonts.body.semiBold,
        fontSize: 13,
        color: colors.primary,
    },
});
