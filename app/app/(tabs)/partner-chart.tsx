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
import { GlassCard, FormattedText, Starfield, CelestialChip, TabHeader } from '@/components/ui';
import { FullPageLoader } from '@/components/loaders';
import { AstralHero } from '@/components/astral/AstralHero';
import { getPartnerSummary, PlanetPosition, SynthesisData, SynthesisAxis } from '@/services/astrology';
import { colors, spacing, radius, fonts } from '@/theme';

const AXIS_COLORS = [colors.primary, colors.secondary, colors.accent.pink];

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function PartnerChartScreen() {
    const router = useRouter();
    const { historyId } = useLocalSearchParams<{ historyId?: string }>();

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [partnerName, setPartnerName] = useState('');
    const [partnerGender, setPartnerGender] = useState<'female' | 'male' | null>(null);
    const [positions, setPositions] = useState<Record<string, PlanetPosition>>({});
    const [synthesis, setSynthesis] = useState<SynthesisData | null>(null);

    useEffect(() => {
        if (!historyId) return;
        const id = parseInt(historyId, 10);
        if (isNaN(id)) return;

        setIsLoading(true);
        getPartnerSummary(id)
            .then((res) => {
                if (res.success) {
                    setPartnerName(res.partnerName ?? '');
                    setPartnerGender(res.partnerGender ?? null);
                    setPositions(res.positions ?? {});
                    // synthesis is the new format; fallback to legacy summary field
                    const synth = res.synthesis ?? (res.summary
                        ? { portrait: res.summary, axes: [], notable_configs: [] }
                        : null);
                    setSynthesis(synth);
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
                    <TabHeader onBack={() => router.back()} />

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
                        <AstralHero positions={positions} outerPadding={20} gender={partnerGender} />
                    )}

                    {/* Portrait */}
                    {synthesis !== null && (
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>Portrait</Text>
                            <GlassCard opacity="low" radius="xl">
                                {synthesis ? (
                                    <FormattedText text={synthesis.portrait} style={styles.portraitText} />
                                ) : (
                                    <View style={styles.interpLoading}>
                                        <ActivityIndicator color={colors.primary} size="small" />
                                    </View>
                                )}
                            </GlassCard>
                        </View>
                    )}

                    {/* Axes */}
                    {synthesis?.axes && synthesis.axes.length > 0 && (
                        <View style={styles.axesSection}>
                            <Text style={styles.sectionLabel}>Axes du thème</Text>
                            {synthesis.axes.map((axis: SynthesisAxis, idx: number) => (
                                <View key={idx} style={[styles.axisCard, { borderLeftColor: AXIS_COLORS[idx % AXIS_COLORS.length] }]}>
                                    <Text style={styles.axisTitle}>{axis.title}</Text>
                                    <Text style={styles.axisDescription}>{axis.description}</Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Notable configs */}
                    {synthesis?.notable_configs && synthesis.notable_configs.length > 0 && (
                        <View style={styles.chipsWrap}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <View style={styles.chipsRow}>
                                    {synthesis.notable_configs.map((config: string, idx: number) => (
                                        <CelestialChip key={idx} label={config} selected={false} icon="✦" />
                                    ))}
                                </View>
                            </ScrollView>
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

    // Portrait
    portraitText: {
        fontFamily: fonts.display.regular,
        fontSize: 16,
        lineHeight: 28,
        color: colors.onSurface,
        fontStyle: 'italic',
    },
    interpLoading: {
        alignItems: 'center',
        paddingVertical: spacing.lg,
    },

    // Axes
    axesSection: {
        paddingHorizontal: spacing.xl,
        marginBottom: spacing.xl,
        gap: spacing.md,
    },
    axisCard: {
        borderLeftWidth: 3,
        borderLeftColor: colors.primary,
        paddingLeft: spacing.lg,
        paddingVertical: spacing.sm,
    },
    axisTitle: {
        fontFamily: fonts.body.semiBold,
        fontSize: 14,
        color: colors.onSurface,
        marginBottom: spacing.xs,
    },
    axisDescription: {
        fontFamily: fonts.body.regular,
        fontSize: 13,
        lineHeight: 20,
        color: colors.onSurfaceMuted,
    },

    // Notable configs chips
    chipsWrap: {
        marginBottom: spacing.xxl,
        paddingHorizontal: spacing.xl,
    },
    chipsRow: {
        flexDirection: 'row',
        gap: spacing.sm,
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
