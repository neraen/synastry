/**
 * AstroMatch Spacing Scale
 *
 * Based on 4px grid for precision
 * All spacing values should come from here
 */

export const spacing = {
    // Base scale (multiples of 4)
    none: 0,
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
    '4xl': 40,
    '5xl': 48,
    '6xl': 64,
    '7xl': 80,
    '8xl': 96,

    // Semantic spacing
    screenPadding: 24,
    cardPadding: 16,
    cardPaddingLg: 20,
    inputPadding: 14,
    buttonPaddingVertical: 16,
    buttonPaddingHorizontal: 24,
    sectionGap: 24,
    itemGap: 12,
    inlineGap: 8,

    // Component-specific
    formFieldGap: 16,
    listItemGap: 12,
    gridGap: 12,
    modalPaddingTop: 24,
    bottomSafeSpacing: 40,
    headerHeight: 56,
    tabBarHeight: 64,
    tabBarHeightIOS: 84,
} as const;

// Helper function to get spacing value
export function getSpacing(key: keyof typeof spacing): number {
    return spacing[key];
}

// Gap helper for consistent vertical spacing
export function verticalGap(size: keyof typeof spacing) {
    return { marginBottom: spacing[size] };
}

export type Spacing = typeof spacing;
export default spacing;