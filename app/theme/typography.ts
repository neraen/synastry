/**
 * AstroMatch Typography System
 *
 * Premium, elegant, highly readable
 * Mobile-first with appropriate line heights
 */

import { TextStyle, Platform } from 'react-native';

// Font weights with cross-platform consistency
const fontWeights = {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
};

// Font scale (modular scale ~1.2)
const fontSizes = {
    xs: 11,
    sm: 13,
    base: 15,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
    '5xl': 40,
    '6xl': 48,
} as const;

// Line height multipliers
const lineHeights = {
    tight: 1.2,
    snug: 1.3,
    normal: 1.5,
    relaxed: 1.6,
    loose: 1.8,
} as const;

// Typography presets
export const typography = {
    // Display - Hero text, splash screens
    display: {
        fontSize: fontSizes['6xl'],
        fontWeight: fontWeights.bold,
        lineHeight: fontSizes['6xl'] * lineHeights.tight,
        letterSpacing: -0.5,
    } as TextStyle,

    // Headings
    h1: {
        fontSize: fontSizes['4xl'],
        fontWeight: fontWeights.extrabold,
        lineHeight: fontSizes['4xl'] * lineHeights.tight,
        letterSpacing: 0,
    } as TextStyle,

    h2: {
        fontSize: fontSizes['3xl'],
        fontWeight: fontWeights.bold,
        lineHeight: fontSizes['3xl'] * lineHeights.snug,
        letterSpacing: 0,
    } as TextStyle,

    h3: {
        fontSize: fontSizes['2xl'],
        fontWeight: fontWeights.bold,
        lineHeight: fontSizes['2xl'] * lineHeights.snug,
        letterSpacing: 0,
    } as TextStyle,

    // Title - Section headers, card titles
    title: {
        fontSize: fontSizes.xl,
        fontWeight: fontWeights.semibold,
        lineHeight: fontSizes.xl * lineHeights.snug,
        letterSpacing: 0,
    } as TextStyle,

    titleSmall: {
        fontSize: fontSizes.lg,
        fontWeight: fontWeights.semibold,
        lineHeight: fontSizes.lg * lineHeights.snug,
        letterSpacing: 0,
    } as TextStyle,

    // Body text
    body: {
        fontSize: fontSizes.base,
        fontWeight: fontWeights.regular,
        lineHeight: fontSizes.base * lineHeights.relaxed,
        letterSpacing: 0,
    } as TextStyle,

    bodyMedium: {
        fontSize: fontSizes.base,
        fontWeight: fontWeights.medium,
        lineHeight: fontSizes.base * lineHeights.relaxed,
        letterSpacing: 0,
    } as TextStyle,

    bodySmall: {
        fontSize: fontSizes.sm,
        fontWeight: fontWeights.regular,
        lineHeight: fontSizes.sm * lineHeights.relaxed,
        letterSpacing: 0,
    } as TextStyle,

    // Caption - Metadata, timestamps
    caption: {
        fontSize: fontSizes.xs,
        fontWeight: fontWeights.regular,
        lineHeight: fontSizes.xs * lineHeights.normal,
        letterSpacing: 0.2,
    } as TextStyle,

    captionMedium: {
        fontSize: fontSizes.xs,
        fontWeight: fontWeights.medium,
        lineHeight: fontSizes.xs * lineHeights.normal,
        letterSpacing: 0.2,
    } as TextStyle,

    // UI Elements
    button: {
        fontSize: fontSizes.md,
        fontWeight: fontWeights.extrabold,
        lineHeight: fontSizes.md * lineHeights.tight,
        letterSpacing: 0.5,
    } as TextStyle,

    buttonSmall: {
        fontSize: fontSizes.sm,
        fontWeight: fontWeights.bold,
        lineHeight: fontSizes.sm * lineHeights.tight,
        letterSpacing: 0.5,
    } as TextStyle,

    label: {
        fontSize: fontSizes.sm,
        fontWeight: fontWeights.medium,
        lineHeight: fontSizes.sm * lineHeights.normal,
        letterSpacing: 0,
    } as TextStyle,

    input: {
        fontSize: fontSizes.md,
        fontWeight: fontWeights.regular,
        lineHeight: fontSizes.md * lineHeights.normal,
        letterSpacing: 0,
    } as TextStyle,

    // Special
    score: {
        fontSize: fontSizes['6xl'],
        fontWeight: fontWeights.extrabold,
        lineHeight: fontSizes['6xl'] * lineHeights.tight,
        letterSpacing: -1,
    } as TextStyle,

    tag: {
        fontSize: fontSizes.xs,
        fontWeight: fontWeights.semibold,
        lineHeight: fontSizes.xs * lineHeights.tight,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    } as TextStyle,
} as const;

// Export helpers
export const fontSizeScale = fontSizes;
export const fontWeightScale = fontWeights;
export const lineHeightScale = lineHeights;

export type Typography = typeof typography;
export type TypographyVariant = keyof typeof typography;

export default typography;