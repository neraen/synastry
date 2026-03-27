import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import {
    GlassCard,
    GoldButton,
    TabHeader,
    FormattedText,
    ScoreRow,
    CopyableText,
} from '@/components/ui';
import {
    getSynastryHistoryDetail,
    SynastryHistoryDetail,
} from '@/services/astrology';
import { colors, spacing, radius, fonts } from '@/theme';
import { aiDisclaimerText } from '@/constants/legalTexts';

// ─── Dimension config ──────────────────────────────────────────────────────────
const DIM_LABELS: Record<string, { label: string; icon: string }> = {
    amour:         { label: 'Amour',         icon: '💕' },
    love:          { label: 'Amour',         icon: '💕' },
    communication: { label: 'Communication', icon: '🗣️' },
    attirance:     { label: 'Attirance',     icon: '🔥' },
    attraction:    { label: 'Attraction',    icon: '🔥' },
    long_terme:    { label: 'Long terme',    icon: '💍' },
    long_term:     { label: 'Long-term',     icon: '💍' },
    conflits:      { label: 'Conflits',      icon: '⚡' },
    conflicts:     { label: 'Conflicts',     icon: '⚡' },
};

function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'long', year: 'numeric',
    });
}

export default function SynastryDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string>();
    const [history, setHistory] = useState<SynastryHistoryDetail | null>(null);

    useEffect(() => {
        if (!isAuthLoading && !isAuthenticated) router.replace('/login');
    }, [isAuthenticated, isAuthLoading, router]);

    useEffect(() => {
        if (!isAuthenticated || !id) return;
        getSynastryHistoryDetail(parseInt(id, 10))
            .then(res => {
                if (res.success && res.history) setHistory(res.history);
                else setError(res.error || 'Erreur lors du chargement');
            })
            .catch(err => setError(err instanceof Error ? err.message : 'Erreur inconnue'))
            .finally(() => setIsLoading(false));
    }, [isAuthenticated, id]);

    if (isAuthLoading || isLoading) {
        return (
            <View style={styles.screen}>
                <SafeAreaView style={styles.safeArea}>
                    <View style={styles.centered}>
                        <ActivityIndicator color={colors.primary} size="large" />
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    if (error || !history) {
        return (
            <View style={styles.screen}>
                <SafeAreaView style={styles.safeArea}>
                    <TabHeader onBack={() => router.back()} />
                    <View style={styles.centered}>
                        <Text style={styles.errorText}>{error || 'Analyse introuvable'}</Text>
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    const score = Math.round(history.compatibilityScore ?? 0);
    const headline = history.compatibilityDetails?.headline;
    const dimensions = history.compatibilityDetails?.dimensions || {};
    const dimEntries = Object.entries(dimensions);

    return (
        <View style={styles.screen}>
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    <TabHeader onBack={() => router.back()} />

                    {/* Hero */}
                    <View style={styles.hero}>
                        <Text style={styles.heroPct}>{score}%</Text>
                        <Text style={styles.heroSub}>
                            {headline || (score >= 80 ? 'Connexion profonde' : score >= 60 ? 'Belle harmonie' : 'Complémentarité')}
                        </Text>
                        <Text style={styles.heroCaption}>
                            COMPATIBILITÉ AVEC {history.partnerName.toUpperCase()}
                        </Text>
                        <Text style={styles.heroDate}>
                            Analyse du {formatDate(history.createdAt)}
                        </Text>
                    </View>

                    {/* Dimension bars */}
                    {dimEntries.length > 0 && (
                        <View style={styles.sectionPad}>
                            <GlassCard opacity="low" radius="xl">
                                <Text style={styles.dimTitle}>COMPATIBILITÉ PAR DIMENSION</Text>
                                <View style={{ height: spacing.md }} />
                                {dimEntries.map(([key, data]: [string, any]) => {
                                    const dim = DIM_LABELS[key] || { label: key, icon: '✦' };
                                    return (
                                        <ScoreRow
                                            key={key}
                                            label={dim.label}
                                            value={Math.round(data?.score || 0)}
                                            icon={dim.icon}
                                        />
                                    );
                                })}
                            </GlassCard>
                        </View>
                    )}

                    {/* Analyse céleste */}
                    <View style={[styles.sectionPad, { marginTop: spacing.xxl }]}>
                        <GlassCard opacity="low" radius="xl">
                            <View style={styles.insightHeader}>
                                <View style={styles.insightIconWrap}>
                                    <Feather name="star" size={16} color={colors.primary} />
                                </View>
                                <Text style={styles.insightLabel}>ANALYSE CÉLESTE</Text>
                            </View>
                            <CopyableText text={history.analysis}>
                                <FormattedText text={history.analysis} style={styles.insightText} />
                            </CopyableText>
                            {(history.compatibilityDetails?.forces?.length || history.compatibilityDetails?.tensions?.length) ? (
                                <View style={styles.forcesRow}>
                                    {history.compatibilityDetails?.forces?.slice(0, 2).map((f: string, i: number) => (
                                        <View key={i} style={styles.forceChip}>
                                            <Text style={styles.forceChipText}>✦ {f}</Text>
                                        </View>
                                    ))}
                                </View>
                            ) : null}
                        </GlassCard>
                    </View>

                    {/* Actions */}
                    <View style={[styles.sectionPad, styles.actionsSection]}>
                        <GoldButton label="NOUVELLE ANALYSE" onPress={() => router.replace('/(tabs)/compatibility')} rightIcon />
                    </View>

                    <View style={{ height: 100 }} />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.surfaceLowest },
    safeArea: { flex: 1 },
    scrollContent: { flexGrow: 1 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    hero: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.xxxl, alignItems: 'center' },
    heroPct: {
        fontFamily: fonts.display.medium, fontSize: 72, lineHeight: 80,
        color: colors.primary, letterSpacing: -2, textAlign: 'center',
    },
    heroSub: {
        fontFamily: fonts.display.regular, fontSize: 24, color: colors.onSurface,
        fontStyle: 'italic', marginTop: spacing.sm, textAlign: 'center',
    },
    heroCaption: {
        fontFamily: fonts.body.semiBold, fontSize: 10, letterSpacing: 2,
        color: colors.onSurfaceMuted, textTransform: 'uppercase',
        marginTop: spacing.sm, textAlign: 'center',
    },
    heroDate: {
        fontFamily: fonts.body.regular, fontSize: 12,
        color: `${colors.onSurfaceMuted}80`, marginTop: spacing.xs,
    },

    sectionPad: { paddingHorizontal: spacing.xl },
    dimTitle: {
        fontFamily: fonts.body.semiBold, fontSize: 10, letterSpacing: 2,
        color: colors.onSurfaceMuted, textTransform: 'uppercase',
    },

    insightHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
    insightIconWrap: {
        width: 32, height: 32, borderRadius: radius.md,
        backgroundColor: `${colors.secondaryContainer}4D`,
        alignItems: 'center', justifyContent: 'center',
    },
    insightLabel: {
        fontFamily: fonts.body.semiBold, fontSize: 10, letterSpacing: 2,
        color: colors.onSurfaceMuted, textTransform: 'uppercase',
    },
    insightText: {
        fontFamily: fonts.body.regular, fontSize: 14, lineHeight: 22,
        color: `${colors.onSurface}E6`,
    },
    forcesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg },
    forceChip: {
        backgroundColor: `${colors.primary}1A`, borderRadius: radius.full,
        paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    },
    forceChipText: { fontFamily: fonts.body.medium, fontSize: 12, color: colors.primary },

    actionsSection: { marginTop: spacing.xxl },

    disclaimer: { paddingHorizontal: spacing.xl, marginTop: spacing.xxl },
    disclaimerText: {
        fontFamily: fonts.body.regular, fontSize: 11, lineHeight: 18,
        color: `${colors.onSurfaceMuted}80`, fontStyle: 'italic', textAlign: 'center',
    },
    errorText: { fontFamily: fonts.body.regular, fontSize: 14, color: colors.error, textAlign: 'center' },
});