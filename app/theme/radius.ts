/**
 * AstroMatch Border Radius Scale
 *
 * Soft, modern, premium feel
 */

export const radius = {
    none: 0,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
    full: 9999, // Pill shape
} as const;

// Semantic radius tokens
export const borderRadius = {
    // Components
    button: radius.lg,
    buttonSmall: radius.md,
    input: radius.md,
    card: radius.lg,
    cardLarge: radius.xl,
    modal: radius['2xl'],
    badge: radius.full,
    avatar: radius.full,
    tag: radius.sm,
    tooltip: radius.sm,

    // Interactive elements
    chip: radius.full,
    toggle: radius.full,
    slider: radius.full,
} as const;

export type Radius = typeof radius;
export type BorderRadius = typeof borderRadius;

export default radius;