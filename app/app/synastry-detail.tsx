/**
 * Synastry Detail Screen - Premium Glassmorphism Design
 * Compatibility result display with zodiac circles and score bars
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import {
    Screen,
    GlassCard,
    GradientButton,
    GoldButton,
    AppHeading,
    AppText,
    Spacer,
    LoadingState,
    CopyableText,
    ZodiacCircle,
    ZodiacPair,
    ProgressBar,
    ScoreRow,
    getZodiacSign,
    CompatibilityShareButton,
} from '@/components/ui';
import type { ZodiacSign } from '@/components/ui';
import {
    getSynastryHistoryDetail,
    SynastryHistoryDetail,
    formatDegree,
    getPlanetNameFr,
} from '@/services/astrology';
import { colors, spacing, radius, gradients, glow, fonts } from '@/theme';
import { aiDisclaimerText } from '@/constants/legalTexts';

// Zodiac data for display
const ZODIAC_INFO: Record<string, { symbol: string; nameFr: string }> = {
    aries:       { symbol: '♈', nameFr: 'Bélier' },
    taurus:      { symbol: '♉', nameFr: 'Taureau' },
    gemini:      { symbol: '♊', nameFr: 'Gémeaux' },
    cancer:      { symbol: '♋', nameFr: 'Cancer' },
    leo:         { symbol: '♌', nameFr: 'Lion' },
    virgo:       { symbol: '♍', nameFr: 'Vierge' },
    libra:       { symbol: '♎', nameFr: 'Balance' },
    scorpio:     { symbol: '♏', nameFr: 'Scorpion' },
    sagittarius: { symbol: '♐', nameFr: 'Sagittaire' },
    capricorn:   { symbol: '♑', nameFr: 'Capricorne' },
    aquarius:    { symbol: '♒', nameFr: 'Verseau' },
    pisces:      { symbol: '♓', nameFr: 'Poissons' },
};

function ZodiacGlassIcon({ sign }: { sign: string }) {
    const info = ZODIAC_INFO[sign] ?? { symbol: '✦', nameFr: sign };
    return (
        <View style={zodiacStyles.container}>
            <View style={zodiacStyles.circle}>
                {/* top sheen */}
                <View style={zodiacStyles.sheen} />
                <Text style={zodiacStyles.symbol}>{info.symbol}</Text>
            </View>
            <Text style={zodiacStyles.name}>{info.nameFr}</Text>
        </View>
    );
}

const zodiacStyles = StyleSheet.create({
    container: { alignItems: 'center', gap: 10 },
    circle: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: 'rgba(30, 19, 56, 0.70)',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 6,
    },
    sheen: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '45%',
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderTopLeftRadius: 44,
        borderTopRightRadius: 44,
    },
    symbol: {
        fontFamily: fonts.display.bold,
        fontSize: 36,
        color: colors.primary,
        lineHeight: 44,
    },
    name: {
        fontFamily: fonts.body.semiBold,
        fontSize: 11,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        color: colors.onSurfaceMuted,
    },
});

// Score color gradient based on value
function getScoreGradient(score: number): readonly string[] {
    if (score >= 80) return gradients.primary;
    if (score >= 60) return gradients.gold;
    if (score >= 40) return gradients.fire;
    return ['#EF4444', '#DC2626'];
}

// Gold gradient scale: dark gold (index 0) → bright gold (last index)
const DIMENSION_GOLD_GRADIENTS: readonly [string, string][] = [
    ['#2e1e00', '#5c3d00'],
    ['#5c3d00', '#866a00'],
    ['#866a00', '#ab8a10'],
    ['#ab8a10', '#cfa82a'],
    ['#cfa82a', '#e9c349'],
];

// Format date for display
function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

// Dimension icons
const dimensionIcons: Record<string, string> = {
    amour: '💕',
    love: '💕',
    communication: '🗣️',
    conflits: '⚡',
    conflicts: '⚡',
    long_terme: '💍',
    long_term: '💍',
    attirance: '🔥',
    attraction: '🔥',
};

export default function SynastryDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string>();
    const [history, setHistory] = useState<SynastryHistoryDetail | null>(null);

    // Animation
    const fadeAnim = useState(new Animated.Value(0))[0];
    const scaleAnim = useState(new Animated.Value(0.9))[0];

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
                    // Animate in
                    Animated.parallel([
                        Animated.timing(fadeAnim, {
                            toValue: 1,
                            duration: 600,
                            useNativeDriver: true,
                        }),
                        Animated.spring(scaleAnim, {
                            toValue: 1,
                            friction: 8,
                            useNativeDriver: true,
                        }),
                    ]).start();
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
            <Screen backgroundColor={colors.surfaceLowest}>
                <LoadingState message="Chargement de l'analyse..." />
            </Screen>
        );
    }

    if (error || !history) {
        return (
            <Screen variant="scroll" backgroundColor={colors.surfaceLowest}>
                <Spacer size="xl" />
                <GlassCard style={styles.errorCard}>
                    <AppText variant="body" color="error" align="center">
                        {error || 'Analyse introuvable'}
                    </AppText>
                </GlassCard>
                <Spacer size="lg" />
                <GradientButton
                    title="Retour"
                    onPress={() => router.back()}
                    variant="outline"
                />
            </Screen>
        );
    }

    const score = history.compatibilityScore ?? 0;
    const userSign = getZodiacSign(history.userPositions?.Sun?.Sign || 'aries');
    const partnerSign = getZodiacSign(history.partnerPositions?.Sun?.Sign || 'aries');

    // Parse dimensions from compatibility details if available
    const dimensions = history.compatibilityDetails?.dimensions || {};

    return (
        <Screen variant="scroll" backgroundColor={colors.surfaceLowest}>
            <Animated.View
                style={{
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }],
                }}
            >
                <Spacer size="lg" />

                {/* Title */}
                <AppHeading variant="h2" align="center" style={styles.title}>
                    Compatibilité
                </AppHeading>

                <Spacer size="xl" />

                {/* Zodiac Pair */}
                <View style={styles.zodiacSection}>
                    <ZodiacGlassIcon sign={userSign} />

                    <View style={styles.heartContainer}>
                        <View style={styles.heartGlow} />
                        <AppText style={styles.heart}>♡</AppText>
                    </View>

                    <ZodiacGlassIcon sign={partnerSign} />
                </View>

                <Spacer size="sm" />

                {/* Names */}
                <View style={styles.namesRow}>
                    <AppText variant="bodyMedium" color="secondary">
                        {user?.birthProfile?.firstName || 'Vous'}
                    </AppText>
                    <AppText variant="bodyMedium" color="muted">&</AppText>
                    <AppText variant="bodyMedium" color="secondary">
                        {history.partnerName}
                    </AppText>
                </View>

                <Spacer size="2xl" />

                {/* Main Score Card */}
                <GlassCard
                    variant="elevated"
                    glowColor={glow.primary}
                    padding="xl"
                    style={styles.mainCard}
                >
                    {/* Score */}
                    <View style={styles.scoreSection}>
                        <AppText variant="body" color="muted">
                            Compatibilité
                        </AppText>
                        <View style={styles.scoreRow}>
                            <AppHeading variant="display" style={styles.scoreValue}>
                                {Math.round(score)}
                            </AppHeading>
                            <AppText variant="h3" style={styles.scorePercent}>%</AppText>
                        </View>
                        <ProgressBar
                            value={score}
                            height={8}
                            gradientColors={['#866a00', '#e9c349']}
                            style={styles.mainProgressBar}
                        />
                    </View>

                    <Spacer size="xl" />

                    {/* Dimension Scores */}
                    {Object.keys(dimensions).length > 0 && (
                        <View style={styles.dimensionsSection}>
                            {Object.entries(dimensions).map(([key, data]: [string, any], index) => (
                                <ScoreRow
                                    key={key}
                                    label={key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ')}
                                    value={data.score || 0}
                                    icon={dimensionIcons[key]}
                                    gradientColors={DIMENSION_GOLD_GRADIENTS[Math.min(index, DIMENSION_GOLD_GRADIENTS.length - 1)]}
                                />
                            ))}
                        </View>
                    )}

                    {/* Headline if available */}
                    {history.compatibilityDetails?.headline && (
                        <>
                            <Spacer size="lg" />
                            <AppText
                                variant="bodyMedium"
                                color="primary"
                                align="center"
                                style={styles.headline}
                            >
                                "{history.compatibilityDetails.headline}"
                            </AppText>
                        </>
                    )}

                    <Spacer size="lg" />

                    {/* CTA */}
                    <GoldButton
                        label="NOUVELLE ANALYSE"
                        onPress={() => router.push('/synastry')}
                    />
                </GlassCard>

                <Spacer size="xl" />

                {/* Share Button */}
                <View style={styles.shareSection}>
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

                {/* Analysis Detail Card */}
                <GlassCard padding="lg">
                    <View style={styles.cardHeader}>
                        <AppText style={styles.cardIcon}>📖</AppText>
                        <AppText variant="label" color="accent">
                            ANALYSE DÉTAILLÉE
                        </AppText>
                    </View>

                    <Spacer size="md" />

                    <CopyableText text={history.analysis}>
                        <AppText variant="body" color="secondary" style={styles.analysisText}>
                            {history.analysis}
                        </AppText>
                    </CopyableText>
                </GlassCard>

                <Spacer size="xl" />

                {/* Strengths & Challenges */}
                {(history.compatibilityDetails?.forces || history.compatibilityDetails?.tensions) && (
                    <>
                        <View style={styles.twoColumns}>
                            {/* Strengths */}
                            {history.compatibilityDetails?.forces && (
                                <GlassCard padding="md" style={styles.halfCard}>
                                    <AppText style={styles.cardIcon}>💪</AppText>
                                    <AppText variant="label" color="primary" align="center">
                                        Forces
                                    </AppText>
                                    <Spacer size="sm" />
                                    {history.compatibilityDetails.forces.map((force: string, i: number) => (
                                        <AppText
                                            key={i}
                                            variant="caption"
                                            color="secondary"
                                            style={styles.listItem}
                                        >
                                            • {force}
                                        </AppText>
                                    ))}
                                </GlassCard>
                            )}

                            {/* Challenges */}
                            {history.compatibilityDetails?.tensions && (
                                <GlassCard padding="md" style={styles.halfCard}>
                                    <AppText style={styles.cardIcon}>⚠️</AppText>
                                    <AppText variant="label" color="primary" align="center">
                                        Défis
                                    </AppText>
                                    <Spacer size="sm" />
                                    {history.compatibilityDetails.tensions.map((tension: string, i: number) => (
                                        <AppText
                                            key={i}
                                            variant="caption"
                                            color="secondary"
                                            style={styles.listItem}
                                        >
                                            • {tension}
                                        </AppText>
                                    ))}
                                </GlassCard>
                            )}
                        </View>

                        <Spacer size="xl" />
                    </>
                )}

                {/* Advice */}
                {history.compatibilityDetails?.conseil && (
                    <>
                        <GlassCard padding="lg" variant="strong">
                            <View style={styles.cardHeader}>
                                <AppText style={styles.cardIcon}>💡</AppText>
                                <AppText variant="label" color="accent">
                                    CONSEIL
                                </AppText>
                            </View>
                            <Spacer size="sm" />
                            <AppText variant="body" color="secondary">
                                {history.compatibilityDetails.conseil}
                            </AppText>
                        </GlassCard>
                        <Spacer size="xl" />
                    </>
                )}

                {/* AI Disclaimer */}
                <View style={styles.disclaimer}>
                    <AppText variant="caption" color="muted" align="center">
                        {aiDisclaimerText}
                    </AppText>
                </View>

                <Spacer size="lg" />

                {/* Date */}
                <AppText variant="caption" color="muted" align="center">
                    Analyse du {formatDate(history.createdAt)}
                </AppText>

                <Spacer size="xl" />

                {/* Back Button */}
                <GradientButton
                    title="Retour à l'historique"
                    onPress={() => router.back()}
                    variant="outline"
                />

                <Spacer size="3xl" />
            </Animated.View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    title: {
        letterSpacing: 1,
    },
    zodiacSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    heartContainer: {
        marginHorizontal: spacing.lg,
        position: 'relative',
    },
    heartGlow: {
        position: 'absolute',
        top: -10,
        left: -10,
        right: -10,
        bottom: -10,
        borderRadius: 20,
        backgroundColor: glow.pink,
    },
    heart: {
        fontSize: 32,
    },
    namesRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: spacing.sm,
    },
    mainCard: {
        borderWidth: 1,
        borderColor: colors.surface.glassBorder,
    },
    scoreSection: {
        alignItems: 'center',
    },
    scoreRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    scoreValue: {
        fontSize: 72,
        fontFamily: fonts.display.bold,
        color: colors.primary,
        lineHeight: 80,
    },
    scorePercent: {
        fontFamily: fonts.display.bold,
        fontSize: 32,
        color: colors.primary,
        alignSelf: 'flex-end',
        marginBottom: 8,
        marginLeft: 4,
    },
    mainProgressBar: {
        width: '100%',
        marginTop: spacing.md,
    },
    dimensionsSection: {
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border.subtle,
    },
    headline: {
        fontStyle: 'italic',
    },
    shareSection: {
        paddingHorizontal: spacing.md,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    cardIcon: {
        fontSize: 18,
    },
    analysisText: {
        lineHeight: 24,
    },
    twoColumns: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    halfCard: {
        flex: 1,
    },
    listItem: {
        marginBottom: spacing.xs,
        lineHeight: 18,
    },
    disclaimer: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: colors.surface.default,
        borderRadius: radius.md,
    },
    errorCard: {
        borderColor: colors.status.error,
        borderWidth: 1,
    },
});
