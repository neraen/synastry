import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import {
    Screen,
    AppButton,
    AppHeading,
    AppText,
    AppCard,
    Spacer,
    LoadingState,
    InlineLoading,
    CopyableText,
} from '@/components/ui';
import {
    getNatalChart,
    getNatalChartInterpretation,
    NatalChart,
    getMainPlanets,
    getPlanetNameFr,
    formatDegree,
} from '@/services/astrology';
import { colors, spacing, borderRadius, shadows } from '@/theme';
import { aiDisclaimerText } from '@/constants/legalTexts';

const BG = require('@/assets/images/interface/background-starry.png');

const planetEmojis: Record<string, string> = {
    Sun: '☀️',
    Moon: '🌙',
    Mercury: '☿️',
    Venus: '♀️',
    Mars: '♂️',
    Jupiter: '♃',
    Saturn: '♄',
    Ascendant: '⬆️',
    MC: '🎯',
};

export default function HoroscopeTab() {
    const router = useRouter();
    const { isAuthenticated, user, isLoading: isAuthLoading } = useAuth();

    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingInterpretation, setIsLoadingInterpretation] = useState(false);
    const [error, setError] = useState<string>();
    const [chart, setChart] = useState<NatalChart | null>(null);
    const [interpretation, setInterpretation] = useState<string | null>(null);

    useEffect(() => {
        if (isAuthenticated && user?.hasBirthProfile) {
            loadChart();
        } else {
            setIsLoading(false);
        }
    }, [isAuthenticated, user]);

    async function loadChart() {
        try {
            setError(undefined);
            const response = await getNatalChart();
            if (response.success && response.chart) {
                setChart(response.chart);
                if (response.chart.interpretation) {
                    setInterpretation(response.chart.interpretation);
                }
            } else {
                setError(response.error || 'Erreur lors du chargement');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur inconnue');
        } finally {
            setIsLoading(false);
        }
    }

    async function loadInterpretation() {
        setIsLoadingInterpretation(true);
        try {
            const response = await getNatalChartInterpretation();
            if (response.success && response.interpretation) {
                setInterpretation(response.interpretation);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur inconnue');
        } finally {
            setIsLoadingInterpretation(false);
        }
    }

    if (isAuthLoading || isLoading) {
        return (
            <Screen backgroundImage={BG}>
                <LoadingState message="Chargement..." />
            </Screen>
        );
    }

    if (!isAuthenticated) {
        return (
            <Screen backgroundImage={BG}>
                <View style={styles.centerContent}>
                    <AppText style={styles.bigEmoji}>🔮</AppText>
                    <Spacer size="lg" />
                    <AppText variant="body" color="muted" align="center">
                        Connectez-vous pour voir votre thème natal
                    </AppText>
                    <Spacer size="lg" />
                    <AppButton
                        title="Se connecter"
                        onPress={() => router.push('/login')}
                        variant="primary"
                    />
                </View>
            </Screen>
        );
    }

    if (!user?.hasBirthProfile) {
        return (
            <Screen backgroundImage={BG}>
                <View style={styles.centerContent}>
                    <AppText style={styles.bigEmoji}>✨</AppText>
                    <Spacer size="lg" />
                    <AppText variant="body" color="muted" align="center">
                        Complétez votre profil pour voir votre thème natal
                    </AppText>
                    <Spacer size="lg" />
                    <AppButton
                        title="Compléter mon profil"
                        onPress={() => router.push('/birth-profile')}
                        variant="primary"
                    />
                </View>
            </Screen>
        );
    }

    const mainPlanets = chart ? getMainPlanets(chart.planetaryPositions) : {};

    return (
        <Screen variant="scroll" backgroundImage={BG}>
            <Spacer size="xl" />

            {/* Header */}
            <View style={styles.header}>
                <AppText style={styles.headerIcon}>🔮</AppText>
                <AppHeading variant="h1" align="center">
                    Mon Thème
                </AppHeading>
            </View>

            {error && (
                <>
                    <Spacer size="lg" />
                    <AppCard variant="outline" style={styles.errorCard}>
                        <AppText variant="body" color="error" align="center">
                            {error}
                        </AppText>
                    </AppCard>
                </>
            )}

            {chart && (
                <>
                    <Spacer size="xl" />

                    {/* Planets Grid */}
                    <View style={styles.planetsGrid}>
                        {Object.entries(mainPlanets).map(([planet, data]) => (
                            <View key={planet} style={styles.planetCard}>
                                <View style={styles.planetHeader}>
                                    <AppText style={styles.planetEmoji}>
                                        {planetEmojis[planet] || '✨'}
                                    </AppText>
                                    {data.Retrograde === 'Yes' && (
                                        <View style={styles.retrogradeTag}>
                                            <AppText variant="caption" style={styles.retrogradeText}>
                                                R
                                            </AppText>
                                        </View>
                                    )}
                                </View>
                                <Spacer size="xs" />
                                <AppText variant="bodyMedium" color="primary">
                                    {getPlanetNameFr(planet)}
                                </AppText>
                                <AppText variant="caption" color="accent">
                                    {formatDegree(data.Position, data.Sign)}
                                </AppText>
                            </View>
                        ))}
                    </View>

                    <Spacer size="2xl" />

                    {/* Interpretation */}
                    {interpretation ? (
                        <>
                            <AppCard variant="elevated" style={styles.interpretationCard}>
                                <CopyableText text={interpretation}>
                                    <AppText variant="body" color="secondary" style={styles.interpretationText}>
                                        {interpretation}
                                    </AppText>
                                </CopyableText>
                            </AppCard>
                            <Spacer size="xl" />
                            {/* AI Disclaimer */}
                            <View style={styles.disclaimerContainer}>
                                <AppText variant="caption" color="muted" align="center" style={styles.disclaimerText}>
                                    {aiDisclaimerText}
                                </AppText>
                            </View>
                        </>
                    ) : (
                        <AppCard variant="outline" style={styles.ctaCard}>
                            {isLoadingInterpretation ? (
                                <View style={styles.loadingContainer}>
                                    <InlineLoading />
                                    <Spacer size="md" />
                                    <AppText variant="body" color="muted" align="center">
                                        Analyse en cours...
                                    </AppText>
                                </View>
                            ) : (
                                <>
                                    <AppText variant="body" color="muted" align="center">
                                        Obtenez une interprétation personnalisée
                                    </AppText>
                                    <Spacer size="lg" />
                                    <AppButton
                                        title="Obtenir l'interprétation"
                                        onPress={loadInterpretation}
                                        variant="primary"
                                    />
                                </>
                            )}
                        </AppCard>
                    )}
                </>
            )}

            <Spacer size="3xl" />
        </Screen>
    );
}

const styles = StyleSheet.create({
    header: {
        alignItems: 'center',
    },
    headerIcon: {
        fontSize: 44,
        lineHeight: 56,
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
    },
    bigEmoji: {
        fontSize: 64,
        lineHeight: 80,
        textAlign: 'center',
    },
    errorCard: {
        borderColor: colors.status.error,
        padding: spacing.lg,
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
    planetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    planetEmoji: {
        fontSize: 28,
        lineHeight: 36,
        textAlign: 'center',
    },
    retrogradeTag: {
        backgroundColor: colors.status.errorSoft,
        borderRadius: borderRadius.badge,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        marginLeft: spacing.xs,
    },
    retrogradeText: {
        color: colors.status.error,
        fontWeight: '600',
        fontSize: 10,
    },
    interpretationCard: {
        padding: spacing.xl,
    },
    interpretationText: {
        lineHeight: 26,
    },
    ctaCard: {
        padding: spacing.xl,
        alignItems: 'center',
    },
    loadingContainer: {
        alignItems: 'center',
        paddingVertical: spacing.md,
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
