/**
 * CompatibilityShareCard
 *
 * Visual preview card for compatibility sharing — matches the premium design system
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radius, fonts } from '@/theme';
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

const ZODIAC_SYMBOLS: Record<string, string> = {
    Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋',
    Leo: '♌', Virgo: '♍', Libra: '♎', Scorpio: '♏',
    Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
};

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
    const roundedScore = Math.round(score);

    return (
        <View style={[styles.container, style]}>
            <LinearGradient
                colors={[colors.surfaceLowest, colors.surfaceLow, colors.surfaceContainer]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
            >
                {/* Ambient glow */}
                <View style={styles.glowTop} />
                <View style={styles.glowBottom} />

                {/* Badge */}
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>COMPATIBILITÉ COSMIQUE</Text>
                </View>

                {/* Names */}
                <Text style={styles.names} numberOfLines={1}>
                    {nameOne} ✦ {nameTwo}
                </Text>

                {/* Score */}
                <View style={styles.scoreContainer}>
                    <Text style={styles.scoreValue}>{roundedScore}</Text>
                    <Text style={styles.scorePercent}>%</Text>
                </View>

                {/* Zodiac row */}
                {(sunOne || sunTwo) && (
                    <View style={styles.zodiacRow}>
                        <Text style={styles.zodiacSymbol}>
                            {ZODIAC_SYMBOLS[sunOne ?? ''] ?? '☀'}
                        </Text>
                        <Text style={styles.zodiacDivider}>×</Text>
                        <Text style={styles.zodiacSymbol}>
                            {ZODIAC_SYMBOLS[sunTwo ?? ''] ?? '☀'}
                        </Text>
                    </View>
                )}

                {/* Summary */}
                {summary && (
                    <Text style={styles.summary} numberOfLines={2}>
                        "{summary.slice(0, 90)}"
                    </Text>
                )}

                {/* Footer */}
                <Text style={styles.footer}>AstroMatch</Text>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: radius.xl,
        overflow: 'hidden',
        aspectRatio: 1,
        borderWidth: 1,
        borderColor: 'rgba(233, 195, 73, 0.15)',
    },
    gradient: {
        flex: 1,
        padding: spacing.xl,
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    glowTop: {
        position: 'absolute',
        top: -40,
        left: '20%',
        right: '20%',
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(233, 195, 73, 0.08)',
    },
    glowBottom: {
        position: 'absolute',
        bottom: -30,
        left: '10%',
        right: '10%',
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(200, 191, 255, 0.06)',
    },
    badge: {
        backgroundColor: 'rgba(233, 195, 73, 0.12)',
        borderRadius: radius.full,
        paddingHorizontal: spacing.md,
        paddingVertical: 4,
    },
    badgeText: {
        fontFamily: fonts.body.semiBold,
        fontSize: 9,
        letterSpacing: 2,
        color: colors.primary,
        textTransform: 'uppercase',
    },
    names: {
        fontFamily: fonts.display.bold,
        fontSize: 18,
        color: colors.onSurface,
        textAlign: 'center',
        letterSpacing: 0.3,
    },
    scoreContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    scoreValue: {
        fontFamily: fonts.display.bold,
        fontSize: 64,
        lineHeight: 70,
        color: colors.primary,
    },
    scorePercent: {
        fontFamily: fonts.display.regular,
        fontSize: 28,
        color: colors.primary,
        marginBottom: 8,
        marginLeft: 2,
    },
    zodiacRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    zodiacSymbol: {
        fontSize: 22,
        color: colors.secondary,
    },
    zodiacDivider: {
        fontFamily: fonts.display.regular,
        fontSize: 14,
        color: colors.onSurfaceMuted,
    },
    summary: {
        fontFamily: fonts.body.regular,
        fontSize: 11,
        fontStyle: 'italic',
        color: colors.onSurfaceMuted,
        textAlign: 'center',
        lineHeight: 16,
        paddingHorizontal: spacing.md,
    },
    footer: {
        fontFamily: fonts.display.regular,
        fontSize: 10,
        letterSpacing: 1.5,
        color: `${colors.primary}66`,
        textTransform: 'uppercase',
    },
});

export default CompatibilityShareCard;