/**
 * Card Components
 *
 * AppCard - Surface container with consistent styling
 */

import React, { ReactNode } from 'react';
import { View, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, borderRadius, shadows } from '@/theme';

type CardVariant = 'default' | 'elevated' | 'outline' | 'highlight';

interface AppCardProps {
    children: ReactNode;
    variant?: CardVariant;
    onPress?: () => void;
    disabled?: boolean;
    style?: ViewStyle;
    noPadding?: boolean;
}

const variantStyles: Record<CardVariant, ViewStyle> = {
    default: {
        backgroundColor: colors.surface.default,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    elevated: {
        backgroundColor: colors.surface.elevated,
        borderWidth: 1,
        borderColor: colors.border.default,
        ...shadows.sm,
    },
    outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: colors.border.default,
    },
    highlight: {
        backgroundColor: colors.decorative.goldGlow,
        borderWidth: 1,
        borderColor: colors.brand.primary,
    },
};

export function AppCard({
    children,
    variant = 'default',
    onPress,
    disabled = false,
    style,
    noPadding = false,
}: AppCardProps) {
    const cardStyle: ViewStyle = {
        ...styles.base,
        ...variantStyles[variant],
        ...(noPadding ? {} : styles.padding),
    };

    if (onPress) {
        return (
            <Pressable
                onPress={onPress}
                disabled={disabled}
                style={({ pressed }) => [
                    cardStyle,
                    pressed && styles.pressed,
                    disabled && styles.disabled,
                    style,
                ]}
            >
                {children}
            </Pressable>
        );
    }

    return <View style={[cardStyle, style]}>{children}</View>;
}

// Specialized card for displaying scores
interface ScoreCardProps {
    score: number | string;
    label?: string;
    style?: ViewStyle;
}

export function ScoreCard({ score, label = 'Compatibilité', style }: ScoreCardProps) {
    return (
        <AppCard variant="highlight" style={{ ...styles.scoreCard, ...style }}>
            <View style={styles.scoreContent}>
                {label && (
                    <View style={styles.scoreLabel}>
                        <View style={styles.labelText}>
                            {/* Text will be handled by parent */}
                        </View>
                    </View>
                )}
            </View>
        </AppCard>
    );
}

// Section card with title
interface SectionCardProps {
    children: ReactNode;
    style?: ViewStyle;
}

export function SectionCard({ children, style }: SectionCardProps) {
    return (
        <AppCard variant="default" style={style}>
            {children}
        </AppCard>
    );
}

const styles = StyleSheet.create({
    base: {
        borderRadius: borderRadius.card,
        overflow: 'hidden',
    },
    padding: {
        padding: spacing.cardPadding,
    },
    pressed: {
        opacity: 0.8,
        transform: [{ scale: 0.99 }],
    },
    disabled: {
        opacity: 0.5,
    },
    scoreCard: {
        alignItems: 'center',
        padding: spacing.xl,
    },
    scoreContent: {
        alignItems: 'center',
    },
    scoreLabel: {
        marginBottom: spacing.sm,
    },
    labelText: {},
});

export default AppCard;
