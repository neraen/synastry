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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { GlassCard, FormattedText, Starfield } from '@/components/ui';
import { FullPageLoader } from '@/components/loaders';
import { AstralHero } from '@/components/astral/AstralHero';
import { getPartnerSummary, PlanetPosition } from '@/services/astrology';
import { colors, spacing, radius, fonts } from '@/theme';

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function PartnerChartScreen() {
    const router = useRouter();
    const { historyId } = useLocalSearchParams<{ historyId?: string }>();

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

    // ── Loading ──
    if (isLoading) {
        return (
            <View style={{ flex: 1 }}>
                <FullPageLoader visible={true} variant="profile" label="Calcul du thème en cours…" />
            </View>
        );
    }

    return (
        <View style={styles.screen}>
            <Starfield />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Back button */}
                    <View style={styles.headerRow}>
                        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
                            <Feather name="arrow-left" size={20} color={colors.onSurface} />
                        </Pressable>
                    </View>

                    {/* Chip */}
                    <View style={styles.chipRow}>
                        <View style={styles.chip}>
                            <View style={styles.chipDot} />
                            <Text style={styles.chipText}>Portrait natal de</Text>
                        </View>
                    </View>

                    {/* Title */}
                    <Text style={styles.title}>{partnerName}</Text>
                    <Text style={styles.subtitle}>
                        Positions planétaires au moment exact de sa naissance.
                    </Text>

                    {/* Error */}
                    {error && (
                        <View style={styles.sectionPad}>
                            <GlassCard opacity="low" radius="xl">
                                <Text style={styles.errorText}>{error}</Text>
                            </GlassCard>
                        </View>
                    )}

                    {/* AstralHero */}
                    {Object.keys(positions).length > 0 && (
                        <AstralHero positions={positions} outerPadding={20} />
                    )}

                    {/* Personality summary */}
                    {summary !== null && (
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

    // Header
    headerRow: {
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.md,
        paddingBottom: spacing.sm,
    },
    backBtn: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: `${colors.onSurfaceMuted}18`,
        borderRadius: radius.full,
    },

    // Chip
    chipRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.xl,
        marginTop: spacing.xl,
        paddingHorizontal: spacing.xl,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: 6,
        borderRadius: radius.full,
        backgroundColor: colors.surfaceContainerHigh,
    },
    chipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
    chipText: {
        fontFamily: fonts.body.semiBold,
        fontSize: 10,
        letterSpacing: 1.5,
        color: colors.onSurfaceMuted,
        textTransform: 'uppercase',
    },

    // Title
    title: {
        fontFamily: fonts.display.bold,
        fontSize: 38,
        lineHeight: 46,
        color: colors.onSurface,
        letterSpacing: -0.5,
        marginBottom: spacing.md,
        paddingHorizontal: spacing.xl,
    },
    subtitle: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        lineHeight: 22,
        color: colors.onSurfaceMuted,
        maxWidth: 300,
        marginBottom: spacing.xl,
        paddingHorizontal: spacing.xl,
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

    // Summary
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
