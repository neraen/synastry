/**
 * CompatibilityShareCard
 *
 * A visual preview card for compatibility sharing
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius } from '@/theme';
import { AppText, AppHeading } from './Text';
import { getZodiacSignFr } from '@/services/astrology';

interface CompatibilityShareCardProps {
    nameOne: string;
    nameTwo: string;
    score: number;
    sunOne?: string | null;
    sunTwo?: string | null;
    moonOne?: string | null;
    moonTwo?: string | null;
    summary?: string;
    style?: ViewStyle;
}

function getZodiacEmoji(sign: string | null | undefined): string {
    if (!sign) return '';
    const emojis: Record<string, string> = {
        'Aries': '\u2648',
        'Taurus': '\u2649',
        'Gemini': '\u264A',
        'Cancer': '\u264B',
        'Leo': '\u264C',
        'Virgo': '\u264D',
        'Libra': '\u264E',
        'Scorpio': '\u264F',
        'Sagittarius': '\u2650',
        'Capricorn': '\u2651',
        'Aquarius': '\u2652',
        'Pisces': '\u2653',
    };
    return emojis[sign] || '';
}

function getScoreColor(score: number): string {
    if (score >= 80) return '#4CC38A';
    if (score >= 60) return '#C99A64';
    if (score >= 40) return '#F5A623';
    return '#E5484D';
}

export function CompatibilityShareCard({
    nameOne,
    nameTwo,
    score,
    sunOne,
    sunTwo,
    moonOne,
    moonTwo,
    summary,
    style,
}: CompatibilityShareCardProps) {
    const scoreColor = getScoreColor(score);

    return (
        <View style={[styles.container, style]}>
            <LinearGradient
                colors={['#0A0A1A', '#1A0A2E', '#0F0F24']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
            >
                {/* Stars decoration */}
                <View style={styles.starsContainer}>
                    {[...Array(8)].map((_, i) => (
                        <View
                            key={i}
                            style={[
                                styles.star,
                                {
                                    left: `${10 + (i * 12)}%`,
                                    top: `${5 + (i % 3) * 8}%`,
                                    width: 2 + (i % 3),
                                    height: 2 + (i % 3),
                                }
                            ]}
                        />
                    ))}
                </View>

                {/* Title */}
                <AppText style={styles.title}>COMPATIBILITE COSMIQUE</AppText>

                {/* Names */}
                <AppHeading variant="h2" style={styles.names}>
                    {nameOne} {'\u2726'} {nameTwo}
                </AppHeading>

                {/* Score circle */}
                <View style={styles.scoreContainer}>
                    <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
                        <AppText style={{ ...styles.scoreText, color: scoreColor }}>
                            {Math.round(score)}%
                        </AppText>
                    </View>
                </View>

                {/* Zodiac info */}
                {(sunOne || sunTwo) && (
                    <View style={styles.zodiacRow}>
                        <AppText style={styles.zodiacLabel}>{'\u2609'}</AppText>
                        <AppText style={styles.zodiacText}>
                            {getZodiacSignFr(sunOne || '')} {'\u00d7'} {getZodiacSignFr(sunTwo || '')}
                        </AppText>
                    </View>
                )}
                {(moonOne || moonTwo) && (
                    <View style={styles.zodiacRow}>
                        <AppText style={{ ...styles.zodiacLabel, color: colors.brand.secondary }}>{'\u263D'}</AppText>
                        <AppText style={styles.zodiacText}>
                            {getZodiacSignFr(moonOne || '')} {'\u00d7'} {getZodiacSignFr(moonTwo || '')}
                        </AppText>
                    </View>
                )}

                {/* Summary */}
                {summary && (
                    <AppText style={styles.summary} numberOfLines={2}>
                        "{summary.slice(0, 100)}"
                    </AppText>
                )}

                {/* Footer */}
                <AppText style={styles.footer}>AstroMatch</AppText>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: borderRadius.card,
        overflow: 'hidden',
        aspectRatio: 1,
    },
    gradient: {
        flex: 1,
        padding: spacing.xl,
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    starsContainer: {
        ...StyleSheet.absoluteFillObject,
    },
    star: {
        position: 'absolute',
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        borderRadius: 10,
    },
    title: {
        fontSize: 12,
        letterSpacing: 4,
        color: colors.brand.primary,
        textTransform: 'uppercase',
    },
    names: {
        fontSize: 18,
        color: colors.text.primary,
        textAlign: 'center',
    },
    scoreContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: spacing.lg,
    },
    scoreCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 3,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
    scoreText: {
        fontSize: 32,
        fontWeight: 'bold',
    },
    zodiacRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: spacing.xs,
    },
    zodiacLabel: {
        fontSize: 16,
        color: colors.brand.primary,
        marginRight: spacing.sm,
    },
    zodiacText: {
        fontSize: 14,
        color: colors.text.secondary,
    },
    summary: {
        fontSize: 12,
        color: colors.text.muted,
        textAlign: 'center',
        fontStyle: 'italic',
        marginTop: spacing.md,
        paddingHorizontal: spacing.md,
    },
    footer: {
        fontSize: 10,
        color: colors.text.disabled,
        marginTop: spacing.sm,
    },
});

export default CompatibilityShareCard;
