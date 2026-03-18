/**
 * ZodiacCircle Component
 * Circular gradient background with zodiac icon and glow effect
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ViewStyle,
    StyleProp,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, zodiac as zodiacColors } from '@/theme';

// Zodiac signs data
const ZODIAC_DATA = {
    aries: { symbol: '\u2648', name: 'Aries', nameFr: 'Bélier' },
    taurus: { symbol: '\u2649', name: 'Taurus', nameFr: 'Taureau' },
    gemini: { symbol: '\u264A', name: 'Gemini', nameFr: 'Gémeaux' },
    cancer: { symbol: '\u264B', name: 'Cancer', nameFr: 'Cancer' },
    leo: { symbol: '\u264C', name: 'Leo', nameFr: 'Lion' },
    virgo: { symbol: '\u264D', name: 'Virgo', nameFr: 'Vierge' },
    libra: { symbol: '\u264E', name: 'Libra', nameFr: 'Balance' },
    scorpio: { symbol: '\u264F', name: 'Scorpio', nameFr: 'Scorpion' },
    sagittarius: { symbol: '\u2650', name: 'Sagittarius', nameFr: 'Sagittaire' },
    capricorn: { symbol: '\u2651', name: 'Capricorn', nameFr: 'Capricorne' },
    aquarius: { symbol: '\u2652', name: 'Aquarius', nameFr: 'Verseau' },
    pisces: { symbol: '\u2653', name: 'Pisces', nameFr: 'Poissons' },
} as const;

export type ZodiacSign = keyof typeof ZODIAC_DATA;

interface ZodiacCircleProps {
    sign: ZodiacSign;
    size?: 'small' | 'medium' | 'large' | 'xlarge';
    showName?: boolean;
    showGlow?: boolean;
    style?: StyleProp<ViewStyle>;
    locale?: 'en' | 'fr';
}

const SIZES = {
    small: { circle: 48, icon: 20, name: 10 },
    medium: { circle: 64, icon: 28, name: 12 },
    large: { circle: 80, icon: 36, name: 14 },
    xlarge: { circle: 100, icon: 44, name: 16 },
};

export function ZodiacCircle({
    sign,
    size = 'medium',
    showName = false,
    showGlow = true,
    style,
    locale = 'fr',
}: ZodiacCircleProps) {
    const dimensions = SIZES[size];
    const zodiacInfo = ZODIAC_DATA[sign];
    const gradientColors = zodiacColors[sign] || colors.gradients.primary;
    const glowColor = gradientColors[0];

    return (
        <View style={[styles.container, style]}>
            {/* Glow effect */}
            {showGlow && (
                <View
                    style={[
                        styles.glow,
                        {
                            width: dimensions.circle + 20,
                            height: dimensions.circle + 20,
                            borderRadius: (dimensions.circle + 20) / 2,
                            backgroundColor: glowColor,
                        },
                    ]}
                />
            )}

            {/* Main circle with gradient */}
            <View
                style={[
                    styles.circleContainer,
                    {
                        width: dimensions.circle,
                        height: dimensions.circle,
                        borderRadius: dimensions.circle / 2,
                    },
                ]}
            >
                <LinearGradient
                    colors={gradientColors as [string, string]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                        styles.gradient,
                        { borderRadius: dimensions.circle / 2 },
                    ]}
                >
                    {/* Highlight overlay */}
                    <View style={styles.highlight} />

                    {/* Zodiac symbol */}
                    <Text
                        style={[
                            styles.symbol,
                            { fontSize: dimensions.icon },
                        ]}
                    >
                        {zodiacInfo.symbol}
                    </Text>
                </LinearGradient>
            </View>

            {/* Sign name */}
            {showName && (
                <Text
                    style={[
                        styles.name,
                        { fontSize: dimensions.name },
                    ]}
                >
                    {locale === 'fr' ? zodiacInfo.nameFr : zodiacInfo.name}
                </Text>
            )}
        </View>
    );
}

// Zodiac pair component for compatibility display
interface ZodiacPairProps {
    signOne: ZodiacSign;
    signTwo: ZodiacSign;
    size?: 'small' | 'medium' | 'large';
    showNames?: boolean;
    style?: StyleProp<ViewStyle>;
}

export function ZodiacPair({
    signOne,
    signTwo,
    size = 'large',
    showNames = true,
    style,
}: ZodiacPairProps) {
    return (
        <View style={[styles.pairContainer, style]}>
            <ZodiacCircle sign={signOne} size={size} showName={showNames} />

            {/* Heart connector */}
            <View style={styles.heartContainer}>
                <Text style={styles.heart}>{'\u2764\uFE0F'}</Text>
            </View>

            <ZodiacCircle sign={signTwo} size={size} showName={showNames} />
        </View>
    );
}

// Helper to get zodiac sign from sun position or name
export function getZodiacSign(input: string): ZodiacSign {
    const normalized = input.toLowerCase().trim();

    // Check direct match
    if (normalized in ZODIAC_DATA) {
        return normalized as ZodiacSign;
    }

    // Check French names
    const frenchMap: Record<string, ZodiacSign> = {
        'bélier': 'aries',
        'belier': 'aries',
        'taureau': 'taurus',
        'gémeaux': 'gemini',
        'gemeaux': 'gemini',
        'cancer': 'cancer',
        'lion': 'leo',
        'vierge': 'virgo',
        'balance': 'libra',
        'scorpion': 'scorpio',
        'sagittaire': 'sagittarius',
        'capricorne': 'capricorn',
        'verseau': 'aquarius',
        'poissons': 'pisces',
    };

    return frenchMap[normalized] || 'aries';
}

export { ZODIAC_DATA };

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        position: 'relative',
    },
    glow: {
        position: 'absolute',
        opacity: 0.3,
        top: -10,
        left: -10,
    },
    circleContainer: {
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    gradient: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    highlight: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '40%',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderTopLeftRadius: 100,
        borderTopRightRadius: 100,
    },
    symbol: {
        color: '#FFFFFF',
        fontWeight: '600',
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    name: {
        marginTop: 8,
        color: colors.text.secondary,
        fontWeight: '500',
    },
    pairContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    heartContainer: {
        marginHorizontal: 16,
        shadowColor: colors.accent.pink,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
    },
    heart: {
        fontSize: 28,
    },
});

export default ZodiacCircle;
