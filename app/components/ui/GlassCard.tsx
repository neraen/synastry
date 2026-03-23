/**
 * GlassCard
 * The ONLY card/container component to use across the entire app.
 * Implements glassmorphism with platform-specific rendering.
 */

import React, { memo, ReactNode } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { colors, radius, shadows, spacing } from '@/theme';

type Opacity = 'low' | 'medium' | 'high';
type Radius = 'md' | 'xl' | 'xxl';
type Padding = 'sm' | 'md' | 'lg' | 'xl' | 'none';
// Legacy variant prop - maps to opacity
type Variant = 'default' | 'elevated' | 'strong';

interface GlassCardProps {
    children: ReactNode;
    opacity?: Opacity;
    radius?: Radius;
    style?: StyleProp<ViewStyle>;
    ambient?: boolean;
    // Legacy props for backwards compatibility
    variant?: Variant;
    padding?: Padding;
    glowColor?: string; // Legacy - not used in new implementation
}

// Glassmorphism backgrounds — surfaceLow (#1e1338) semi-transparent over page bg (#130827)
const overlayColors: Record<Opacity, string> = {
    low:    'rgba(30, 19, 56, 0.40)',
    medium: 'rgba(30, 19, 56, 0.60)',
    high:   'rgba(30, 19, 56, 0.80)',
};

// Padding values
const paddingValues: Record<Padding, number> = {
    none: 0,
    sm: spacing.sm,
    md: spacing.md,
    lg: spacing.lg,
    xl: spacing.xl,
};

// Map legacy variant to opacity
const variantToOpacity: Record<Variant, Opacity> = {
    default: 'low',
    elevated: 'medium',
    strong: 'high',
};

// Border color for glass effect
const GLASS_BORDER_COLOR = 'rgba(255, 255, 255, 0.10)';

const styles = StyleSheet.create({
    topHighlight: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
    },
});

export const GlassCard = memo(function GlassCard({
    children,
    opacity,
    radius: radiusProp = 'xl',
    style,
    ambient = false,
    // Legacy props
    variant,
    padding,
    glowColor: _glowColor, // Ignored in new implementation
}: GlassCardProps) {
    // Resolve opacity: explicit opacity prop takes precedence, then variant mapping, then default
    const resolvedOpacity = opacity ?? (variant ? variantToOpacity[variant] : 'low');
    const resolvedPadding = padding ? paddingValues[padding] : spacing.xl;
    const borderRadiusValue = radius[radiusProp];

    const containerStyle: ViewStyle = {
        borderRadius: borderRadiusValue,
        overflow: 'hidden',
        backgroundColor: overlayColors[resolvedOpacity],
        borderWidth: 1,
        borderColor: GLASS_BORDER_COLOR,
        ...(ambient && shadows.ambientGlow),
    };

    const contentStyle: ViewStyle = {
        padding: resolvedPadding,
    };

    return (
        <View style={[containerStyle, style]}>
            {/* Top highlight to simulate glass sheen */}
            <View style={styles.topHighlight} />
            <View style={contentStyle}>
                {children}
            </View>
        </View>
    );
});

export default GlassCard;
