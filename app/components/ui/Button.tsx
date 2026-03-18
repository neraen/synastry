/**
 * Button Components
 *
 * AppButton - Primary button component with variants
 */

import React, { ReactNode } from 'react';
import {
    Pressable,
    Text,
    View,
    StyleSheet,
    ActivityIndicator,
    ViewStyle,
    TextStyle,
} from 'react-native';
import { colors, typography, spacing, borderRadius, shadows, layout } from '@/theme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'default' | 'small' | 'large';

interface AppButtonProps {
    title: string;
    onPress?: () => void;
    variant?: ButtonVariant;
    size?: ButtonSize;
    disabled?: boolean;
    loading?: boolean;
    icon?: ReactNode;
    iconPosition?: 'left' | 'right';
    fullWidth?: boolean;
    style?: ViewStyle;
}

const variantStyles: Record<ButtonVariant, { container: ViewStyle; text: TextStyle; pressedOpacity: number }> = {
    primary: {
        container: {
            backgroundColor: colors.brand.primary,
            ...shadows.glow.gold,
        },
        text: {
            color: colors.text.onAccent,
        },
        pressedOpacity: 0.9,
    },
    secondary: {
        container: {
            backgroundColor: colors.surface.elevated,
            borderWidth: 1,
            borderColor: colors.border.default,
        },
        text: {
            color: colors.text.primary,
        },
        pressedOpacity: 0.8,
    },
    outline: {
        container: {
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            borderColor: colors.brand.primary,
        },
        text: {
            color: colors.text.primary,
        },
        pressedOpacity: 0.8,
    },
    ghost: {
        container: {
            backgroundColor: 'transparent',
        },
        text: {
            color: colors.brand.primary,
        },
        pressedOpacity: 0.6,
    },
    danger: {
        container: {
            backgroundColor: colors.status.error,
        },
        text: {
            color: colors.text.primary,
        },
        pressedOpacity: 0.9,
    },
};

const sizeStyles: Record<ButtonSize, { container: ViewStyle; text: TextStyle }> = {
    small: {
        container: {
            height: layout.heights.buttonSmall,
            paddingHorizontal: spacing.lg,
            borderRadius: borderRadius.buttonSmall,
        },
        text: typography.buttonSmall,
    },
    default: {
        container: {
            height: layout.heights.button,
            paddingHorizontal: spacing.buttonPaddingHorizontal,
            borderRadius: borderRadius.button,
        },
        text: typography.button,
    },
    large: {
        container: {
            height: 56,
            paddingHorizontal: spacing['3xl'],
            borderRadius: borderRadius.button,
        },
        text: typography.button,
    },
};

export function AppButton({
    title,
    onPress,
    variant = 'primary',
    size = 'default',
    disabled = false,
    loading = false,
    icon,
    iconPosition = 'left',
    fullWidth = true,
    style,
}: AppButtonProps) {
    const variantStyle = variantStyles[variant];
    const sizeStyle = sizeStyles[size];
    const isDisabled = disabled || loading;

    return (
        <Pressable
            onPress={onPress}
            disabled={isDisabled}
            style={({ pressed }) => [
                styles.base,
                variantStyle.container,
                sizeStyle.container,
                fullWidth && styles.fullWidth,
                pressed && { opacity: variantStyle.pressedOpacity, transform: [{ scale: 0.98 }] },
                isDisabled && styles.disabled,
                style,
            ]}
            accessibilityRole="button"
            accessibilityState={{ disabled: isDisabled }}
            accessibilityLabel={title}
        >
            {loading ? (
                <ActivityIndicator
                    color={variantStyle.text.color}
                    size="small"
                />
            ) : (
                <View style={styles.content}>
                    {icon && iconPosition === 'left' && (
                        <View style={styles.iconLeft}>{icon}</View>
                    )}
                    <Text style={[sizeStyle.text, variantStyle.text, isDisabled && styles.textDisabled]}>
                        {title}
                    </Text>
                    {icon && iconPosition === 'right' && (
                        <View style={styles.iconRight}>{icon}</View>
                    )}
                </View>
            )}
        </Pressable>
    );
}

// Icon Button variant
interface IconButtonProps {
    icon: ReactNode;
    onPress?: () => void;
    variant?: 'default' | 'ghost';
    size?: number;
    disabled?: boolean;
    style?: ViewStyle;
    accessibilityLabel: string;
}

export function IconButton({
    icon,
    onPress,
    variant = 'default',
    size = layout.touch.comfortable,
    disabled = false,
    style,
    accessibilityLabel,
}: IconButtonProps) {
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            style={({ pressed }) => [
                styles.iconButton,
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: variant === 'default' ? colors.surface.elevated : 'transparent',
                },
                pressed && { opacity: 0.7 },
                disabled && { opacity: 0.4 },
                style,
            ]}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
        >
            {icon}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    base: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    fullWidth: {
        width: '100%',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconLeft: {
        marginRight: spacing.sm,
    },
    iconRight: {
        marginLeft: spacing.sm,
    },
    disabled: {
        opacity: 0.5,
    },
    textDisabled: {
        opacity: 0.7,
    },
    iconButton: {
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default AppButton;
