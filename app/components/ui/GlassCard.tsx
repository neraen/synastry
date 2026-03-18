/**
 * GlassCard Component
 * Premium glassmorphism card with optional blur effect, border, and glow
 * Falls back gracefully when expo-blur is not available (Expo Go)
 */

import React from 'react';
import {
    View,
    StyleSheet,
    ViewStyle,
    StyleProp,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, spacing } from '@/theme';

// Dynamically import BlurView (may not be available in Expo Go)
let BlurView: any = null;
try {
    BlurView = require('expo-blur').BlurView;
} catch {
    // expo-blur not available
}

interface GlassCardProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    variant?: 'default' | 'elevated' | 'strong' | 'gradient';
    intensity?: number;
    glowColor?: string;
    showHighlight?: boolean;
    padding?: keyof typeof spacing | number;
    borderRadius?: number;
}

export function GlassCard({
    children,
    style,
    variant = 'default',
    intensity = 20,
    glowColor,
    showHighlight = true,
    padding = 'lg',
    borderRadius = radius.xl,
}: GlassCardProps) {
    const paddingValue = typeof padding === 'number' ? padding : spacing[padding];

    const getBackgroundColor = () => {
        switch (variant) {
            case 'elevated':
                return colors.surface.elevated;
            case 'strong':
                return colors.surface.glassStrong;
            case 'gradient':
                return 'transparent';
            default:
                return colors.surface.glass;
        }
    };

    const renderContent = () => (
        <View style={[styles.content, { padding: paddingValue }]}>
            {/* Top-left highlight for depth */}
            {showHighlight && (
                <View style={[styles.highlight, { borderRadius }]} />
            )}
            {children}
        </View>
    );

    const cardStyle: ViewStyle = {
        backgroundColor: getBackgroundColor(),
        borderRadius,
        borderWidth: 1,
        borderColor: colors.surface.glassBorder,
        overflow: 'hidden',
    };

    const shadowStyle = glowColor
        ? {
              shadowColor: glowColor,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 16,
              elevation: 8,
          }
        : styles.shadow;

    // Use BlurView if available, otherwise fallback
    if (BlurView) {
        return (
            <View style={[cardStyle, shadowStyle, style]}>
                <BlurView intensity={intensity} style={StyleSheet.absoluteFill} tint="dark" />
                {renderContent()}
            </View>
        );
    }

    // Fallback without blur - use semi-transparent background
    return (
        <View style={[cardStyle, shadowStyle, style]}>
            {renderContent()}
        </View>
    );
}

// Gradient variant of GlassCard
export function GradientGlassCard({
    children,
    style,
    gradientColors = colors.gradients.primary,
    intensity = 15,
    padding = 'lg',
    borderRadius = radius.xl,
}: GlassCardProps & { gradientColors?: readonly string[] }) {
    const paddingValue = typeof padding === 'number' ? padding : spacing[padding];

    return (
        <View style={[styles.gradientContainer, { borderRadius }, style]}>
            <LinearGradient
                colors={gradientColors as [string, string, ...string[]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[StyleSheet.absoluteFill, { borderRadius }]}
            />
            <View style={[styles.gradientOverlay, { borderRadius }]} />
            <View style={[styles.content, { padding: paddingValue }]}>
                <View style={[styles.highlight, { borderRadius }]} />
                {children}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    content: {
        position: 'relative',
        zIndex: 1,
    },
    highlight: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: '50%',
        height: 1,
        backgroundColor: colors.surface.glassHighlight,
        opacity: 0.5,
    },
    shadow: {
        shadowColor: colors.brand.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 8,
    },
    gradientContainer: {
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.surface.glassBorder,
    },
    gradientOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
});

export default GlassCard;
