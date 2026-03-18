/**
 * AstroMatch Shadow System
 *
 * Subtle, elegant shadows for depth
 * Works on both iOS and Android
 */

import { Platform, ViewStyle } from 'react-native';

// Shadow definitions (iOS style)
const shadowDefinitions = {
    none: {
        shadowColor: 'transparent',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
        elevation: 0,
    },
    sm: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    md: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 4,
    },
    lg: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.16,
        shadowRadius: 16,
        elevation: 8,
    },
    xl: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
        elevation: 12,
    },
} as const;

// Glow effects (for accent elements)
const glowDefinitions = {
    gold: {
        shadowColor: '#C99A64',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 4,
    },
    goldStrong: {
        shadowColor: '#C99A64',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 6,
    },
    purple: {
        shadowColor: '#9D8DC9',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 4,
    },
} as const;

export const shadows = {
    ...shadowDefinitions,
    glow: glowDefinitions,
} as const;

// Helper to get shadow style
export function getShadow(level: keyof typeof shadowDefinitions): ViewStyle {
    return shadowDefinitions[level];
}

// Helper to get glow style
export function getGlow(type: keyof typeof glowDefinitions): ViewStyle {
    return glowDefinitions[type];
}

export type Shadows = typeof shadows;
export default shadows;