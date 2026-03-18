/**
 * AstroMatch Layout Constants
 *
 * Consistent layout values across the app
 */

import { Dimensions, Platform } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const layout = {
    // Screen dimensions
    screen: {
        width: screenWidth,
        height: screenHeight,
    },

    // Content constraints
    content: {
        maxWidth: 500, // Max content width for tablets
        padding: 24,
        paddingSmall: 16,
    },

    // Component heights
    heights: {
        button: 52,
        buttonSmall: 44,
        input: 52,
        inputSmall: 44,
        header: 56,
        tabBar: Platform.select({ ios: 84, default: 64 }),
        listItem: 56,
        listItemLarge: 72,
    },

    // Icon sizes
    icons: {
        xs: 16,
        sm: 20,
        md: 24,
        lg: 28,
        xl: 32,
        '2xl': 40,
        '3xl': 48,
    },

    // Avatar sizes
    avatars: {
        xs: 24,
        sm: 32,
        md: 40,
        lg: 48,
        xl: 64,
        '2xl': 80,
        '3xl': 96,
    },

    // Touch targets
    touch: {
        min: 44, // Minimum touch target (Apple HIG)
        comfortable: 48,
        large: 56,
    },

    // Z-index scale
    zIndex: {
        base: 0,
        dropdown: 10,
        sticky: 20,
        overlay: 30,
        modal: 40,
        toast: 50,
    },

    // Breakpoints (for future tablet support)
    breakpoints: {
        sm: 375,
        md: 428,
        lg: 768,
        xl: 1024,
    },

    // Animation durations (ms)
    animation: {
        fast: 150,
        normal: 250,
        slow: 350,
    },
} as const;

// Helper to check if device is small
export function isSmallDevice(): boolean {
    return screenWidth < layout.breakpoints.md;
}

// Helper to check if device is tablet
export function isTablet(): boolean {
    return screenWidth >= layout.breakpoints.lg;
}

export type Layout = typeof layout;
export default layout;