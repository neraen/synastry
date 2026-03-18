import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import {
    Screen,
    AppButton,
    AppHeading,
    AppText,
    AppCard,
    Spacer,
    LoadingState,
    CopyableText,
    CompatibilityShareButton,
} from '@/components/ui';
import {
    getSynastryHistoryDetail,
    SynastryHistoryDetail,
    formatDegree,
    getPlanetNameFr,
} from '@/services/astrology';
import { colors, spacing, borderRadius, shadows } from '@/theme';
import { aiDisclaimerText } from '@/constants/legalTexts';

const BG = require('@/assets/images/interface/background-starry.png');

// Score color based on value
function getScoreColor(score: number | null): string {
    if (score === null) return colors.text.muted;
    if (score >= 80) return colors.status.success;
    if (score >= 60) return colors.brand.primary;
    if (score >= 40) return colors.status.warning;
    return colors.status.error;
}

// Format date for display
function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

// Planet emoji mapping
const planetEmojis: Record<string, string> = {
    Sun: '☀️',
    Moon: '🌙',
    Mercury: '☿️',
    Venus: '♀️',
    Mars: '♂️',
    Jupiter: '♃',
    Saturn: '♄',
    Uranus: '♅',
    Neptune: '♆',
    Ascendant: '⬆️',
    MC: '🎯',
};

export default function SynastryDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string>();
    const [history, setHistory] = useState<SynastryHistoryDetail | null>(null);

    // Redirect if not authenticated
    useEffect(() => {
        if (!isAuthLoading && !isAuthenticated) {
            router.replace('/login');
        }
    }, [isAuthenticated, isAuthLoading, router]);

    // Load detail
    useEffect(() => {
        async function loadDetail() {
            if (!id) {
                setError('ID manquant');
                setIsLoading(false);
                return;
            }

            try {
                const response = await getSynastryHistoryDetail(parseInt(id, 10));
                if (response.success && response.history) {
                    setHistory(response.history);
                } else {
                    setError(response.error || 'Erreur lors du chargement');
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Erreur inconnue');
            } finally {
                setIsLoading(false);
            }
        }

        if (isAuthenticated && id) {
            loadDetail();
        }
    }, [isAuthenticated, id]);

    if (isAuthLoading || isLoading) {
        return (
            <Screen backgroundImage={BG}>
                <LoadingState message="Chargement de l'analyse..." />
            </Screen>
        );
    }

    if (error || !history) {
        return (
            <Screen variant="scroll" backgroundImage={BG}>
                <Spacer size="xl" />
                <AppCard variant="outline" style={styles.errorCard}>
                    <AppText variant="body" color="error" align="center">
                        {error || 'Analyse introuvable'}
                    </AppText>
                </AppCard>
                <Spacer size="lg" />
                <AppButton
                    title="Retour"
                    onPress={() => router.back()}
                    variant="ghost"
                />
            </Screen>
        );
    }

    const score = history.compatibilityScore;

    return (
        <Screen variant="scroll" backgroundImage={BG}>
            <Spacer size="xl" />

            {/* Header with Score */}
            <View style={styles.header}>
                <View style={styles.coupleEmoji}>
                    <AppText style={styles.emoji}>👤</AppText>
                    <AppText style={styles.heartEmoji}>💕</AppText>
                    <AppText style={styles.emoji}>👤</AppText>
                </View>
                <Spacer size="md" />
                <AppHeading variant="h1" align="center">
                    {history.partnerName}
                </AppHeading>
                <Spacer size="xs" />
                <AppText variant="caption" color="muted" align="center">
                    {formatDate(history.createdAt)}
                </AppText>
            </View>

            <Spacer size="xl" />

            {/* Score Circle */}
            {score !== null && (
                <>
                    <View style={styles.scoreSection}>
                        <View
                            style={[
                                styles.scoreCircle,
                                { borderColor: getScoreColor(score) },
                            ]}
                        >
                            <AppHeading
                                variant="display"
                                style={{ color: getScoreColor(score) }}
                            >
                                {Math.round(score)}
                            </AppHeading>
                            <AppText variant="caption" color="muted">
                                / 100
                            </AppText>
                        </View>
                        <Spacer size="sm" />
                        <AppText variant="bodyMedium" color="accent" align="center">
                            Score de compatibilite
                        </AppText>
                    </View>
                    <Spacer size="lg" />

                    {/* Share Button */}
                    <View style={styles.shareButtonContainer}>
                        <CompatibilityShareButton
                            compatibilityId={history.id}
                            nameOne={user?.birthProfile?.firstName || 'Vous'}
                            nameTwo={history.partnerName}
                            score={score}
                            sunOne={history.userPositions?.Sun?.Sign}
                            sunTwo={history.partnerPositions?.Sun?.Sign}
                            moonOne={history.userPositions?.Moon?.Sign}
                            moonTwo={history.partnerPositions?.Moon?.Sign}
                            summary={history.analysis.slice(0, 200)}
                        />
                    </View>
                    <Spacer size="2xl" />
                </>
            )}

            {/* Analysis Section */}
            <View style={styles.sectionHeader}>
                <View style={styles.sectionLine} />
                <AppText variant="label" color="accent" style={styles.sectionTitle}>
                    ANALYSE
                </AppText>
                <View style={styles.sectionLine} />
            </View>

            <Spacer size="lg" />

            <AppCard variant="elevated" style={styles.analysisCard}>
                <CopyableText text={history.analysis} style={styles.analysisText}>
                    <AppText variant="body" color="secondary" style={styles.analysisText}>
                        {history.analysis}
                    </AppText>
                </CopyableText>
            </AppCard>

            <Spacer size="2xl" />

            {/* Positions Section */}
            {history.partnerPositions && (
                <>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionLine} />
                        <AppText variant="label" color="accent" style={styles.sectionTitle}>
                            POSITIONS DE {history.partnerName.toUpperCase()}
                        </AppText>
                        <View style={styles.sectionLine} />
                    </View>

                    <Spacer size="lg" />

                    <View style={styles.planetsGrid}>
                        {Object.entries(history.partnerPositions)
                            .filter(([planet]) => ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Ascendant'].includes(planet))
                            .map(([planet, data]) => (
                                <View key={planet} style={styles.planetCard}>
                                    <AppText style={styles.planetEmoji}>
                                        {planetEmojis[planet] || '✨'}
                                    </AppText>
                                    <Spacer size="xs" />
                                    <AppText variant="bodyMedium" color="primary">
                                        {getPlanetNameFr(planet)}
                                    </AppText>
                                    <Spacer size="xxs" />
                                    <AppText variant="caption" color="accent">
                                        {formatDegree(data.Position, data.Sign)}
                                    </AppText>
                                </View>
                            ))}
                    </View>

                    <Spacer size="2xl" />
                </>
            )}

            {/* Question if any */}
            {history.question && (
                <>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionLine} />
                        <AppText variant="label" color="accent" style={styles.sectionTitle}>
                            QUESTION POSÉE
                        </AppText>
                        <View style={styles.sectionLine} />
                    </View>

                    <Spacer size="lg" />

                    <AppCard variant="outline" style={styles.questionCard}>
                        <AppText variant="body" color="muted" style={styles.questionText}>
                            "{history.question}"
                        </AppText>
                    </AppCard>

                    <Spacer size="2xl" />
                </>
            )}

            {/* AI Disclaimer */}
            <View style={styles.disclaimerContainer}>
                <AppText variant="caption" color="muted" align="center" style={styles.disclaimerText}>
                    {aiDisclaimerText}
                </AppText>
            </View>

            <Spacer size="xl" />

            {/* Actions */}
            <AppButton
                title="Nouvelle analyse"
                onPress={() => router.push('/synastry')}
                variant="primary"
            />
            <Spacer size="md" />
            <AppButton
                title="Retour à l'historique"
                onPress={() => router.back()}
                variant="outline"
            />

            <Spacer size="3xl" />
        </Screen>
    );
}

const styles = StyleSheet.create({
    header: {
        alignItems: 'center',
    },
    coupleEmoji: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    emoji: {
        fontSize: 40,
    },
    heartEmoji: {
        fontSize: 24,
        marginHorizontal: spacing.sm,
    },
    errorCard: {
        borderColor: colors.status.error,
        padding: spacing.lg,
    },
    scoreSection: {
        alignItems: 'center',
    },
    scoreCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 4,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface.elevated,
    },
    shareButtonContainer: {
        paddingHorizontal: spacing.xl,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionLine: {
        flex: 1,
        height: 1,
        backgroundColor: colors.border.subtle,
    },
    sectionTitle: {
        paddingHorizontal: spacing.lg,
        letterSpacing: 1.5,
    },
    analysisCard: {
        padding: spacing.xl,
    },
    analysisText: {
        lineHeight: 26,
    },
    planetsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
        justifyContent: 'space-between',
    },
    planetCard: {
        backgroundColor: colors.surface.elevated,
        borderRadius: borderRadius.card,
        padding: spacing.lg,
        width: '47%',
        borderWidth: 1,
        borderColor: colors.border.subtle,
        alignItems: 'center',
        ...shadows.sm,
    },
    planetEmoji: {
        fontSize: 28,
    },
    questionCard: {
        padding: spacing.lg,
    },
    questionText: {
        fontStyle: 'italic',
    },
    disclaimerContainer: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: colors.surface.default,
        borderRadius: borderRadius.card,
    },
    disclaimerText: {
        fontStyle: 'italic',
        lineHeight: 18,
    },
});
