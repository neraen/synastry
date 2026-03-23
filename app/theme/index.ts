/**
 * AstroMatch Design System
 * SINGLE SOURCE OF TRUTH
 *
 * No color, font, spacing, or shadow value should ever be hardcoded anywhere else.
 */

import { TextStyle, ViewStyle } from 'react-native';

// =============================================================================
// COLORS
// =============================================================================

const colors = {
    // Surface hierarchy (dark to light)
    surfaceLowest: '#130827',
    surfaceLow: '#1e1338',
    surfaceContainer: '#231942',
    surfaceContainerHigh: '#2f2444',
    surfaceContainerHighest: '#3a2f50',
    surfaceBright: '#3d3660',
    surfaceVariant: '#2a2040',

    // Accent
    primary: '#e9c349',
    primaryContainer: '#866a00',
    secondary: '#c8bfff',
    secondaryContainer: '#440fdb',
    onSurface: '#ebdcff',
    onSurfaceMuted: '#a89ec0',
    outline: '#474556',
    error: '#cf6679',
    // Accent colors
    accent: {
        primary: '#c8bfff',
        secondary: '#440fdb',
        pink: '#ec4899',
    },

    // ==========================================================================
    // LEGACY COMPATIBILITY (maps old nested structure to new flat tokens)
    // TODO: Migrate components to use flat tokens, then remove this section
    // ==========================================================================
    brand: {
        primary: '#e9c349',
        secondary: '#c8bfff',
        accent: '#440fdb',
    },
    background: {
        primary: '#180d2c',
        secondary: '#231942',
        tertiary: '#2f2444',
        elevated: '#3a2f50',
    },
    text: {
        primary: '#ebdcff',
        secondary: '#c8bfff',
        muted: '#a89ec0',
        disabled: '#474556',
        inverse: '#180d2c',
        onAccent: '#180d2c',
    },
    border: {
        default: '#474556',
        subtle: '#2a2040',
        strong: '#a89ec0',
        focus: '#e9c349',
    },
    status: {
        success: '#4ade80',
        warning: '#e9c349',
        error: '#cf6679',
        info: '#c8bfff',
        errorSoft: 'rgba(207, 102, 121, 0.15)',
    },
    glow: {
        gold: 'rgba(233, 195, 73, 0.15)',
        purple: 'rgba(147, 51, 234, 0.15)',
    },
    input: {
        background: '#231942',
        border: '#474556',
        focus: '#e9c349',
        placeholder: '#a89ec0',
    },
    gradients: {
        primary: ['#6D28D9', '#9333EA', '#C084FC'] as const,
        gold: ['#e9c349', '#866a00'] as const,
        cosmic: ['#440fdb', '#9333EA'] as const,
        love: ['#ec4899', '#f472b6'] as const,
    },
    // Legacy surface nested structure
    surface: {
        default: '#180d2c',
        elevated: '#2f2444',
        glass: 'rgba(42, 32, 64, 0.4)',
        glassBorder: 'rgba(255, 255, 255, 0.1)',
        glassStrong: 'rgba(42, 32, 64, 0.7)',
        glassHighlight: 'rgba(255, 255, 255, 0.2)',
    },
    overlay: {
        default: 'rgba(0, 0, 0, 0.5)',
        heavy: 'rgba(0, 0, 0, 0.8)',
        light: 'rgba(0, 0, 0, 0.3)',
    },
    palette: {
        purple: ['#6D28D9', '#9333EA', '#C084FC'] as const,
        gold: ['#e9c349', '#fbbf24', '#866a00'] as const,
    },
} as const;

// =============================================================================
// GRADIENTS
// =============================================================================

const gradients = {
    primaryGold: ['#e9c349', '#866a00'] as const,
} as const;

// =============================================================================
// TYPOGRAPHY
// =============================================================================

// Font family definitions (exported for direct access)
const fonts = {
    display: {
        regular: 'NotoSerif_400Regular',
        medium: 'NotoSerif_500Medium',
        bold: 'NotoSerif_700Bold',
    },
    body: {
        regular: 'Manrope_400Regular',
        medium: 'Manrope_500Medium',
        semiBold: 'Manrope_600SemiBold',
        bold: 'Manrope_700Bold',
    },
} as const;

const fontDisplay = fonts.display.bold;
const fontDisplayMedium = fonts.display.medium;
const fontBody = fonts.body.regular;
const fontBodyMedium = fonts.body.medium;
const fontBodySemiBold = fonts.body.semiBold;

const typography = {
    displayLg: {
        fontSize: 56,
        lineHeight: 64,
        fontFamily: fontDisplay,
        letterSpacing: -1,
    } as TextStyle,

    displayMd: {
        fontSize: 45,
        lineHeight: 52,
        fontFamily: fontDisplay,
        letterSpacing: -0.5,
    } as TextStyle,

    headlineLg: {
        fontSize: 32,
        lineHeight: 40,
        fontFamily: fontDisplay,
        letterSpacing: 0,
    } as TextStyle,

    headlineMd: {
        fontSize: 28,
        lineHeight: 36,
        fontFamily: fontDisplayMedium,
        letterSpacing: 0.5,
    } as TextStyle,

    titleLg: {
        fontSize: 22,
        lineHeight: 28,
        fontFamily: fontBodyMedium,
        fontWeight: '500' as const,
        letterSpacing: 0.05 * 22,
    } as TextStyle,

    titleMd: {
        fontSize: 16,
        lineHeight: 24,
        fontFamily: fontBodySemiBold,
        fontWeight: '600' as const,
        letterSpacing: 0.05 * 16,
    } as TextStyle,

    bodyLg: {
        fontSize: 16,
        lineHeight: 24,
        fontFamily: fontBody,
        fontWeight: '400' as const,
    } as TextStyle,

    bodyMd: {
        fontSize: 14,
        lineHeight: 20,
        fontFamily: fontBody,
        fontWeight: '400' as const,
    } as TextStyle,

    labelMd: {
        fontSize: 12,
        lineHeight: 16,
        fontFamily: fontBodySemiBold,
        fontWeight: '600' as const,
        letterSpacing: 1.5,
        textTransform: 'uppercase' as const,
    } as TextStyle,

    labelSm: {
        fontSize: 11,
        lineHeight: 16,
        fontFamily: fontBodyMedium,
        fontWeight: '500' as const,
        letterSpacing: 1,
    } as TextStyle,

    // ==========================================================================
    // LEGACY COMPATIBILITY (maps old typography names to new)
    // ==========================================================================
    display: {
        fontSize: 56,
        lineHeight: 64,
        fontFamily: fontDisplay,
        letterSpacing: -1,
    } as TextStyle,
    h1: {
        fontSize: 32,
        lineHeight: 40,
        fontFamily: fontDisplay,
        letterSpacing: 0,
    } as TextStyle,
    h2: {
        fontSize: 28,
        lineHeight: 36,
        fontFamily: fontDisplayMedium,
        letterSpacing: 0.5,
    } as TextStyle,
    h3: {
        fontSize: 22,
        lineHeight: 28,
        fontFamily: fontBodyMedium,
        fontWeight: '500' as const,
    } as TextStyle,
    title: {
        fontSize: 22,
        lineHeight: 28,
        fontFamily: fontBodyMedium,
        fontWeight: '500' as const,
    } as TextStyle,
    titleSmall: {
        fontSize: 16,
        lineHeight: 24,
        fontFamily: fontBodySemiBold,
        fontWeight: '600' as const,
    } as TextStyle,
    body: {
        fontSize: 16,
        lineHeight: 24,
        fontFamily: fontBody,
        fontWeight: '400' as const,
    } as TextStyle,
    bodyMedium: {
        fontSize: 14,
        lineHeight: 20,
        fontFamily: fontBodyMedium,
        fontWeight: '500' as const,
    } as TextStyle,
    bodySmall: {
        fontSize: 14,
        lineHeight: 20,
        fontFamily: fontBody,
        fontWeight: '400' as const,
    } as TextStyle,
    caption: {
        fontSize: 11,
        lineHeight: 16,
        fontFamily: fontBody,
        fontWeight: '400' as const,
    } as TextStyle,
    captionMedium: {
        fontSize: 11,
        lineHeight: 16,
        fontFamily: fontBodyMedium,
        fontWeight: '500' as const,
    } as TextStyle,
    label: {
        fontSize: 12,
        lineHeight: 16,
        fontFamily: fontBodySemiBold,
        fontWeight: '600' as const,
        letterSpacing: 1.5,
    } as TextStyle,
    input: {
        fontSize: 16,
        lineHeight: 24,
        fontFamily: fontBody,
        fontWeight: '400' as const,
    } as TextStyle,
    button: {
        fontSize: 14,
        lineHeight: 20,
        fontFamily: fontBodySemiBold,
        fontWeight: '600' as const,
        letterSpacing: 0.5,
    } as TextStyle,
    buttonSmall: {
        fontSize: 12,
        lineHeight: 16,
        fontFamily: fontBodySemiBold,
        fontWeight: '600' as const,
    } as TextStyle,
    score: {
        fontSize: 56,
        lineHeight: 64,
        fontFamily: fontDisplay,
        letterSpacing: -1,
    } as TextStyle,
    tag: {
        fontSize: 11,
        lineHeight: 16,
        fontFamily: fontBodySemiBold,
        fontWeight: '600' as const,
        letterSpacing: 1,
        textTransform: 'uppercase' as const,
    } as TextStyle,
} as const;

// =============================================================================
// SPACING
// =============================================================================

const spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    xxxl: 48,
    section: 64,
    // Legacy compatibility
    '2xl': 32,
    '3xl': 48,
    '4xl': 56,
    '5xl': 64,
    xxs: 2,
    cardPadding: 16,
    inputPadding: 12,
    sectionGap: 32,
    screenPadding: 16,
} as const;

// =============================================================================
// BORDER RADIUS
// =============================================================================

const radius = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    full: 999,
    // Legacy compatibility
    card: 16,
    cardLarge: 24,
    button: 999,
    input: 12,
    tag: 4,
    badge: 999,
} as const;

// Legacy borderRadius alias
const borderRadius = radius;

// =============================================================================
// SHADOWS
// =============================================================================

const shadows = {
    ambientGlow: {
        shadowColor: colors.onSurface,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.06,
        shadowRadius: 40,
        elevation: 8,
    } as ViewStyle,
    // Legacy compatibility
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    } as ViewStyle,
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 4,
    } as ViewStyle,
    lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
    } as ViewStyle,
    glow: {
        gold: {
            shadowColor: '#e9c349',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 6,
        } as ViewStyle,
        purple: {
            shadowColor: '#9333EA',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 6,
        } as ViewStyle,
    },
} as const;

// =============================================================================
// GLASSMORPHISM
// =============================================================================

const glass = {
    low: {
        backgroundColor: 'rgba(42, 32, 64, 0.4)',
        backdropBlur: 20,
    },
    medium: {
        backgroundColor: 'rgba(42, 32, 64, 0.55)',
        backdropBlur: 30,
    },
    high: {
        backgroundColor: 'rgba(42, 32, 64, 0.7)',
        backdropBlur: 40,
    },
} as const;

// =============================================================================
// ANIMATION
// =============================================================================

const animation = {
    fast: 200,
    standard: 300,
    slow: 500,
} as const;

// Legacy glow export (separate from colors.glow for backwards compatibility)
const glow = {
    gold: 'rgba(233, 195, 73, 0.15)',
    purple: 'rgba(147, 51, 234, 0.15)',
    primary: 'rgba(147, 51, 234, 0.15)',
} as const;

// =============================================================================
// LAYOUT (legacy compatibility)
// =============================================================================

const layout = {
    heights: {
        input: 48,
        button: 48,
        buttonSmall: 36,
        header: 56,
        tabBar: 72,
        card: 120,
    },
    widths: {
        container: 400,
        button: 280,
    },
} as const;

// =============================================================================
// UNIFIED THEME EXPORT
// =============================================================================

export const theme = {
    colors,
    gradients,
    fonts,
    typography,
    spacing,
    radius,
    borderRadius,
    shadows,
    glass,
    animation,
    glow,
    layout,
} as const;

// Named exports for convenience
export { colors, gradients, fonts, typography, spacing, radius, borderRadius, shadows, glass, animation, glow, layout };

// Type exports
export type Theme = typeof theme;
export type Colors = typeof colors;
export type Typography = typeof typography;
export type Spacing = typeof spacing;
export type Radius = typeof radius;
export type Shadows = typeof shadows;
export type Glass = typeof glass;
export type Animation = typeof animation;

export default theme;
