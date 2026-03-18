/**
 * AstroMatch Premium Color System
 * Glassmorphism + Soft Light Aesthetic
 * Inspired by: Apple, Revolut, Stripe
 */

// Primary gradient colors
export const gradients = {
    primary: ['#6D28D9', '#9333EA', '#C084FC'] as const,
    primaryReverse: ['#C084FC', '#9333EA', '#6D28D9'] as const,
    cosmic: ['#1E1B4B', '#312E81', '#4C1D95'] as const,
    love: ['#EC4899', '#F472B6', '#FBCFE8'] as const,
    gold: ['#F59E0B', '#FBBF24', '#FDE68A'] as const,
    fire: ['#EF4444', '#F97316', '#FBBF24'] as const,
    water: ['#0EA5E9', '#6366F1', '#8B5CF6'] as const,
    earth: ['#10B981', '#34D399', '#6EE7B7'] as const,
    air: ['#F472B6', '#E879F9', '#C084FC'] as const,
    sunset: ['#F97316', '#EC4899', '#8B5CF6'] as const,
    aurora: ['#06B6D4', '#8B5CF6', '#EC4899'] as const,
};

// Accent colors
export const accent = {
    pink: '#EC4899',
    pinkLight: '#F472B6',
    pinkSoft: 'rgba(236, 72, 153, 0.15)',
    gold: '#FBBF24',
    goldLight: '#FDE68A',
    goldSoft: 'rgba(251, 191, 36, 0.15)',
    purple: '#9333EA',
    purpleLight: '#A855F7',
    violet: '#8B5CF6',
    cyan: '#06B6D4',
};

// Dark mode colors (default)
const darkMode = {
    background: {
        primary: '#0F0B1F',
        secondary: '#1A1333',
        tertiary: '#251D47',
        gradient: ['#0F0B1F', '#1A1333'] as const,
    },
    surface: {
        default: 'rgba(255, 255, 255, 0.08)',
        elevated: 'rgba(255, 255, 255, 0.12)',
        glass: 'rgba(255, 255, 255, 0.08)',
        glassStrong: 'rgba(255, 255, 255, 0.15)',
        glassBorder: 'rgba(255, 255, 255, 0.15)',
        glassHighlight: 'rgba(255, 255, 255, 0.25)',
        card: 'rgba(255, 255, 255, 0.06)',
    },
    text: {
        primary: '#F8FAFC',
        secondary: '#CBD5E1',
        muted: '#64748B',
        disabled: 'rgba(255, 255, 255, 0.3)',
        inverse: '#0F172A',
        onAccent: '#FFFFFF',
    },
    border: {
        subtle: 'rgba(255, 255, 255, 0.06)',
        default: 'rgba(255, 255, 255, 0.12)',
        strong: 'rgba(255, 255, 255, 0.2)',
        focus: '#9333EA',
    },
    overlay: {
        light: 'rgba(255, 255, 255, 0.05)',
        medium: 'rgba(0, 0, 0, 0.4)',
        heavy: 'rgba(0, 0, 0, 0.7)',
        backdrop: 'rgba(15, 11, 31, 0.9)',
    },
};

// Light mode colors
const lightMode = {
    background: {
        primary: '#F8FAFC',
        secondary: '#F1F5F9',
        tertiary: '#E2E8F0',
        gradient: ['#F8FAFC', '#EDE9FE'] as const,
    },
    surface: {
        default: 'rgba(255, 255, 255, 0.85)',
        elevated: 'rgba(255, 255, 255, 0.95)',
        glass: 'rgba(255, 255, 255, 0.65)',
        glassStrong: 'rgba(255, 255, 255, 0.8)',
        glassBorder: 'rgba(255, 255, 255, 0.9)',
        glassHighlight: 'rgba(255, 255, 255, 1)',
        card: 'rgba(255, 255, 255, 0.9)',
    },
    text: {
        primary: '#1E293B',
        secondary: '#475569',
        muted: '#94A3B8',
        disabled: 'rgba(0, 0, 0, 0.3)',
        inverse: '#FFFFFF',
        onAccent: '#FFFFFF',
    },
    border: {
        subtle: 'rgba(0, 0, 0, 0.04)',
        default: 'rgba(0, 0, 0, 0.08)',
        strong: 'rgba(0, 0, 0, 0.12)',
        focus: '#9333EA',
    },
    overlay: {
        light: 'rgba(0, 0, 0, 0.02)',
        medium: 'rgba(0, 0, 0, 0.3)',
        heavy: 'rgba(0, 0, 0, 0.6)',
        backdrop: 'rgba(248, 250, 252, 0.9)',
    },
};

// Brand colors (constant across themes)
export const brand = {
    primary: '#9333EA',
    primaryLight: '#C084FC',
    primaryDark: '#6D28D9',
    secondary: '#EC4899',
    secondaryLight: '#F472B6',
    accent: '#FBBF24',
    accentLight: '#FDE68A',
};

// Status colors
export const status = {
    success: '#10B981',
    successLight: '#34D399',
    successSoft: 'rgba(16, 185, 129, 0.15)',
    warning: '#F59E0B',
    warningLight: '#FBBF24',
    warningSoft: 'rgba(245, 158, 11, 0.15)',
    error: '#EF4444',
    errorLight: '#F87171',
    errorSoft: 'rgba(239, 68, 68, 0.15)',
    info: '#6366F1',
    infoLight: '#818CF8',
    infoSoft: 'rgba(99, 102, 241, 0.15)',
};

// Zodiac sign colors (gradients)
export const zodiac = {
    aries: ['#EF4444', '#F97316'] as const,
    taurus: ['#10B981', '#34D399'] as const,
    gemini: ['#FBBF24', '#F59E0B'] as const,
    cancer: ['#94A3B8', '#CBD5E1'] as const,
    leo: ['#F97316', '#FBBF24'] as const,
    virgo: ['#10B981', '#6EE7B7'] as const,
    libra: ['#EC4899', '#F472B6'] as const,
    scorpio: ['#7C3AED', '#8B5CF6'] as const,
    sagittarius: ['#8B5CF6', '#A78BFA'] as const,
    capricorn: ['#475569', '#64748B'] as const,
    aquarius: ['#0EA5E9', '#38BDF8'] as const,
    pisces: ['#6366F1', '#818CF8'] as const,
};

// Glow effects
export const glow = {
    primary: 'rgba(147, 51, 234, 0.4)',
    primaryStrong: 'rgba(147, 51, 234, 0.6)',
    pink: 'rgba(236, 72, 153, 0.4)',
    pinkStrong: 'rgba(236, 72, 153, 0.6)',
    gold: 'rgba(251, 191, 36, 0.4)',
    goldStrong: 'rgba(251, 191, 36, 0.6)',
    white: 'rgba(255, 255, 255, 0.2)',
    whiteStrong: 'rgba(255, 255, 255, 0.4)',
    cyan: 'rgba(6, 182, 212, 0.4)',
};

// Glass effect presets
export const glass = {
    dark: {
        background: 'rgba(255, 255, 255, 0.08)',
        border: 'rgba(255, 255, 255, 0.15)',
        highlight: 'rgba(255, 255, 255, 0.25)',
    },
    light: {
        background: 'rgba(255, 255, 255, 0.65)',
        border: 'rgba(255, 255, 255, 0.8)',
        highlight: 'rgba(255, 255, 255, 1)',
    },
};

// Input specific colors
export const input = {
    background: 'rgba(255, 255, 255, 0.08)',
    backgroundFocused: 'rgba(255, 255, 255, 0.12)',
    border: 'rgba(255, 255, 255, 0.15)',
    borderFocused: '#9333EA',
    placeholder: 'rgba(255, 255, 255, 0.4)',
};

// Theme type
export type ThemeMode = 'light' | 'dark';

// Get colors based on theme
export const getColors = (mode: ThemeMode = 'dark') => {
    const themeColors = mode === 'dark' ? darkMode : lightMode;

    return {
        ...themeColors,
        brand,
        status,
        accent,
        gradients,
        zodiac,
        glow,
        glass: mode === 'dark' ? glass.dark : glass.light,
        input,
    };
};

// Default export for dark mode (app default)
export const colors = getColors('dark');

// Legacy compatibility - map old structure to new
export const palette = {
    navy800: darkMode.background.primary,
    navy700: darkMode.background.secondary,
    navy600: darkMode.background.tertiary,
    gold500: brand.accent,
    lavender400: brand.primaryLight,
    silver100: '#FFFFFF',
    rose500: brand.secondary,
} as const;

export type Colors = typeof colors;
export default colors;
