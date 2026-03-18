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

const BG = require('@/assets/images/interface/background-starry.png');

// Planet emoji mapping for visual interest
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
    Pluto: '♇',
    Ascendant: '⬆️',
    Midheaven: '🎯',
};

export default function NatalChartScreen() {
    const router = useRouter();
    const { isAuthenticated, user, isLoading: isAuthLoading } = useAuth();

    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingInterpretation, setIsLoadingInterpretation] = useState(false);
    const [error, setError] = useState<string>();

    const [chart, setChart] = useState<NatalChart | null>(null);
    const [interpretation, setInterpretation] = useState<string | null>(null);

    // Redirect logic - only when auth is done loading
    useEffect(() => {
        if (isAuthLoading) return;

        if (!isAuthenticated) {
            router.replace('/login');
        } else if (user && !user.hasBirthProfile) {
            router.replace('/birth-profile');
        }
    }, [isAuthenticated, user, isAuthLoading, router]);

    // Load natal chart
    useEffect(() => {
        if (isAuthenticated && user?.hasBirthProfile) {
            loadChart();
        }
    }, [isAuthenticated, user]);

    async function loadChart(refresh = false) {
        try {
            setError(undefined);
            const response = await getNatalChart(refresh);

            if (response.success && response.chart) {
                setChart(response.chart);
                if (response.chart.interpretation) {
                    setInterpretation(response.chart.interpretation);
                }
            } else {
                setError(response.error || 'Erreur lors du chargement du thème');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur inconnue');
        } finally {
            setIsLoading(false);
        }
    }

    async function loadInterpretation() {
        setIsLoadingInterpretation(true);
        setError(undefined);

        try {
            const response = await getNatalChartInterpretation();

            if (response.success && response.interpretation) {
                setInterpretation(response.interpretation);
            } else {
                setError(response.error || "Erreur lors de l'interprétation");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur inconnue');
        } finally {
            setIsLoadingInterpretation(false);
        }
    }

    // Show loading while auth is loading or chart is loading
    if (isAuthLoading || isLoading) {
        return (
            <Screen backgroundImage={BG}>
                <LoadingState message="Calcul de votre thème natal..." />
            </Screen>
        );
    }

    // Don't render if user doesn't have birth profile (will redirect)
    if (!user?.hasBirthProfile) {
        return (
            <Screen backgroundImage={BG}>
                <LoadingState message="Redirection..." />
            </Screen>
        );
    }

    const mainPlanets = chart ? getMainPlanets(chart.planetaryPositions) : {};

    return (
        <Screen variant="scroll" backgroundImage={BG}>
            <Spacer size="xl" />

            {/* Header */}
            <View style={styles.header}>
                <AppHeading variant="h1" align="center">
                    Mon thème natal
                </AppHeading>
                <Spacer size="sm" />
                <AppText variant="body" color="muted" align="center">
                    Vos positions planétaires au moment de votre naissance
                </AppText>
            </View>

            {error && (
                <View style={styles.errorContainer}>
                    <AppCard variant="outline" style={styles.errorCard}>
                        <AppText variant="body" color="error" align="center">
                            {error}
                        </AppText>
                    </AppCard>
                </View>
            )}

            {chart && (
                <>
                    <Spacer size="2xl" />

                    {/* Section Title */}
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionLine} />
                        <AppText variant="label" color="accent" style={styles.sectionTitle}>
                            POSITIONS PLANÉTAIRES
                        </AppText>
                        <View style={styles.sectionLine} />
                    </View>

                    <Spacer size="lg" />

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
                                <Spacer size="xxs" />
                                <AppText variant="caption" color="accent">
                                    {formatDegree(data.Position, data.Sign)}
                                </AppText>
                            </View>
                        ))}
                    </View>

                    <Spacer size="2xl" />

                    {/* Interpretation Section */}
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionLine} />
                        <AppText variant="label" color="accent" style={styles.sectionTitle}>
                            INTERPRÉTATION
                        </AppText>
                        <View style={styles.sectionLine} />
                    </View>

                    <Spacer size="lg" />

                    {interpretation ? (
                        <AppCard variant="elevated" style={styles.interpretationCard}>
                            <CopyableText text={interpretation} style={styles.interpretationText}>
                                <AppText variant="body" color="secondary" style={styles.interpretationText}>
                                    {interpretation}
                                </AppText>
                            </CopyableText>
                        </AppCard>
                    ) : (
                        <AppCard variant="outline" style={styles.ctaCard}>
                            {isLoadingInterpretation ? (
                                <View style={styles.loadingInterpretation}>
                                    <InlineLoading />
                                    <Spacer size="md" />
                                    <AppText variant="body" color="muted" align="center">
                                        Analyse en cours...
                                    </AppText>
                                    <Spacer size="xs" />
                                    <AppText variant="caption" color="muted" align="center">
                                        Cela peut prendre quelques secondes
                                    </AppText>
                                </View>
                            ) : (
                                <>
                                    <AppText variant="body" color="muted" align="center">
                                        Obtenez une interprétation personnalisée de votre thème natal
                                    </AppText>
                                    <Spacer size="lg" />
                                    <AppButton
                                        title="Obtenir l'interprétation IA"
                                        onPress={loadInterpretation}
                                        variant="primary"
                                    />
                                </>
                            )}
                        </AppCard>
                    )}

                    <Spacer size="2xl" />

                    {/* Actions */}
                    <AppButton
                        title="Analyse de compatibilité"
                        onPress={() => router.push('/synastry')}
                        variant="outline"
                    />
                </>
            )}

            <Spacer size="lg" />
            <AppButton
                title="Retour"
                onPress={() => router.back()}
                variant="ghost"
            />

            <Spacer size="3xl" />
        </Screen>
    );
}

const styles = StyleSheet.create({
    header: {
        alignItems: 'center',
    },
    errorContainer: {
        marginTop: spacing.xl,
    },
    errorCard: {
        borderColor: colors.status.error,
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
        justifyContent: 'center',
    },
    planetEmoji: {
        fontSize: 28,
    },
    retrogradeTag: {
        backgroundColor: colors.status.errorSoft,
        borderRadius: borderRadius.badge,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs,
        marginLeft: spacing.sm,
    },
    retrogradeText: {
        color: colors.status.error,
        fontWeight: '600',
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
    loadingInterpretation: {
        alignItems: 'center',
        paddingVertical: spacing.md,
    },
});
