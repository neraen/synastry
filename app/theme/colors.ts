/**
 * AstroMatch Color Palette
 *
 * Inspired by: night sky, constellations, moonlight, cosmic romance
 * Style: premium, elegant, soft, modern
 */

// Base palette
const palette = {
    // Deep night sky blues
    navy900: '#050510',
    navy800: '#0A0A1A',
    navy700: '#0F0F24',
    navy600: '#14142E',
    navy500: '#1A1A3A',

    // Cosmic purples
    purple900: '#1A0A2E',
    purple800: '#2D1B4E',
    purple700: '#3D2B6E',
    purple600: '#4E3B8E',
    purple500: '#6B5BA7',

    // Celestial lavenders
    lavender400: '#9D8DC9',
    lavender300: '#B8A9D9',
    lavender200: '#D4C8E9',
    lavender100: '#EDE8F5',

    // Moonlight silvers
    silver100: '#FFFFFF',
    silver200: '#F5F5F7',
    silver300: '#E8E8ED',
    silver400: '#C8C8D0',
    silver500: '#A8A8B3',

    // Stardust golds
    gold500: '#C99A64',
    gold400: '#D4A973',
    gold300: '#DFB882',
    gold200: '#E9C79A',
    gold100: '#F4D6B3',

    // Rose accents
    rose500: '#E87B9C',
    rose400: '#ED96B0',
    rose300: '#F2B1C4',
    rose200: '#F7CCD8',

    // Semantic colors
    emerald500: '#4CC38A',
    emerald400: '#6DD0A0',
    ruby500: '#E5484D',
    ruby400: '#EB6B6E',
    amber500: '#F5A623',
    amber400: '#F7B84D',
    sky500: '#5B9BD5',
    sky400: '#7DB0E0',

    // Transparent variations
    white: '#FFFFFF',
    black: '#000000',
} as const;

// Semantic color tokens
export const colors = {
    // Backgrounds
    background: {
        primary: palette.navy800,
        secondary: palette.navy700,
        tertiary: palette.navy600,
        elevated: palette.navy600,
    },

    // Surfaces (cards, modals, etc.)
    surface: {
        default: 'rgba(255, 255, 255, 0.03)',
        elevated: 'rgba(255, 255, 255, 0.06)',
        highlight: 'rgba(255, 255, 255, 0.08)',
        overlay: 'rgba(255, 255, 255, 0.12)',
    },

    // Text colors
    text: {
        primary: palette.silver100,
        secondary: 'rgba(255, 255, 255, 0.85)',
        muted: 'rgba(255, 255, 255, 0.7)',
        disabled: 'rgba(255, 255, 255, 0.4)',
        inverse: palette.navy800,
        onAccent: palette.navy900,
    },

    // Brand colors
    brand: {
        primary: palette.gold500,
        primarySoft: palette.gold200,
        secondary: palette.lavender400,
        secondarySoft: palette.lavender200,
        accent: palette.rose500,
        accentSoft: palette.rose200,
    },

    // Interactive states
    interactive: {
        default: palette.gold500,
        hover: palette.gold400,
        pressed: palette.gold300,
        disabled: 'rgba(201, 154, 100, 0.4)',
    },

    // Borders
    border: {
        subtle: 'rgba(255, 255, 255, 0.08)',
        default: 'rgba(255, 255, 255, 0.12)',
        strong: 'rgba(255, 255, 255, 0.18)',
        focus: palette.gold500,
    },

    // Semantic states
    status: {
        success: palette.emerald500,
        successSoft: 'rgba(76, 195, 138, 0.15)',
        warning: palette.amber500,
        warningSoft: 'rgba(245, 166, 35, 0.15)',
        error: palette.ruby500,
        errorSoft: 'rgba(229, 72, 77, 0.15)',
        info: palette.sky500,
        infoSoft: 'rgba(91, 155, 213, 0.15)',
    },

    // Overlays
    overlay: {
        light: 'rgba(255, 255, 255, 0.1)',
        medium: 'rgba(0, 0, 0, 0.4)',
        heavy: 'rgba(0, 0, 0, 0.7)',
        backdrop: 'rgba(5, 5, 16, 0.8)',
    },

    // Input specific
    input: {
        background: 'rgba(255, 255, 255, 0.06)',
        border: 'rgba(255, 255, 255, 0.12)',
        borderFocus: palette.gold500,
        placeholder: 'rgba(255, 255, 255, 0.4)',
    },

    // Special decorative
    decorative: {
        goldGlow: 'rgba(201, 154, 100, 0.2)',
        goldGlowStrong: 'rgba(201, 154, 100, 0.35)',
        purpleGlow: 'rgba(157, 141, 201, 0.2)',
        moonlight: 'rgba(255, 255, 255, 0.95)',
    },

    // Raw palette access (for edge cases)
    palette,
} as const;

export type Colors = typeof colors;
export default colors;