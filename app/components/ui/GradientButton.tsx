/**
 * GradientButton Component
 * Rounded button with gradient background and press animation
 */

import React, { useRef } from 'react';
import {
    Pressable,
    Text,
    StyleSheet,
    Animated,
    ViewStyle,
    TextStyle,
    StyleProp,
    ActivityIndicator,
    View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, spacing, typography } from '@/theme';

interface GradientButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'gold' | 'pink' | 'outline' | 'ghost';
    size?: 'small' | 'medium' | 'large';
    fullWidth?: boolean;
    disabled?: boolean;
    loading?: boolean;
    icon?: React.ReactNode;
    iconPosition?: 'left' | 'right';
    style?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
}

const GRADIENTS = {
    primary: colors.gradients.primary,
    secondary: colors.gradients.cosmic,
    gold: colors.gradients.gold,
    pink: colors.gradients.love,
    outline: ['transparent', 'transparent'] as const,
    ghost: ['transparent', 'transparent'] as const,
};

const SIZES = {
    small: { height: 40, paddingHorizontal: 16, fontSize: 14 },
    medium: { height: 52, paddingHorizontal: 24, fontSize: 16 },
    large: { height: 60, paddingHorizontal: 32, fontSize: 18 },
};

export function GradientButton({
    title,
    onPress,
    variant = 'primary',
    size = 'medium',
    fullWidth = true,
    disabled = false,
    loading = false,
    icon,
    iconPosition = 'left',
    style,
    textStyle,
}: GradientButtonProps) {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const opacityAnim = useRef(new Animated.Value(1)).current;
    const sizeConfig = SIZES[size];
    const gradientColors = GRADIENTS[variant];

    const handlePressIn = () => {
        Animated.parallel([
            Animated.spring(scaleAnim, {
                toValue: 0.97,
                useNativeDriver: true,
                speed: 50,
                bounciness: 4,
            }),
            Animated.timing(opacityAnim, {
                toValue: 0.9,
                duration: 100,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const handlePressOut = () => {
        Animated.parallel([
            Animated.spring(scaleAnim, {
                toValue: 1,
                useNativeDriver: true,
                speed: 50,
                bounciness: 8,
            }),
            Animated.timing(opacityAnim, {
                toValue: 1,
                duration: 100,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const isOutline = variant === 'outline';
    const isGhost = variant === 'ghost';
    const isTransparent = isOutline || isGhost;

    const buttonStyle: ViewStyle = {
        height: sizeConfig.height,
        borderRadius: sizeConfig.height / 2,
        ...(fullWidth ? {} : { alignSelf: 'center' as const }),
    };

    const textColor = isTransparent ? colors.text.primary : colors.text.onAccent;

    const renderContent = () => (
        <View style={styles.content}>
            {loading ? (
                <ActivityIndicator color={textColor} />
            ) : (
                <>
                    {icon && iconPosition === 'left' && (
                        <View style={styles.iconLeft}>{icon}</View>
                    )}
                    <Text
                        style={[
                            styles.text,
                            {
                                fontSize: sizeConfig.fontSize,
                                color: textColor,
                            },
                            textStyle,
                        ]}
                    >
                        {title}
                    </Text>
                    {icon && iconPosition === 'right' && (
                        <View style={styles.iconRight}>{icon}</View>
                    )}
                </>
            )}
        </View>
    );

    return (
        <Animated.View
            style={[
                buttonStyle,
                { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
                fullWidth && styles.fullWidth,
                style,
            ]}
        >
            <Pressable
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={disabled || loading}
                style={[
                    styles.pressable,
                    buttonStyle,
                    isOutline && styles.outline,
                    disabled && styles.disabled,
                ]}
            >
                {isTransparent ? (
                    <View style={[styles.transparentContent, buttonStyle]}>
                        {renderContent()}
                    </View>
                ) : (
                    <LinearGradient
                        colors={gradientColors as [string, string, ...string[]]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.gradient, buttonStyle]}
                    >
                        {/* Highlight overlay */}
                        <View style={styles.highlight} />
                        {renderContent()}
                    </LinearGradient>
                )}
            </Pressable>
        </Animated.View>
    );
}

// Simple text link button
interface LinkButtonProps {
    title: string;
    onPress: () => void;
    color?: string;
    style?: StyleProp<ViewStyle>;
}

export function LinkButton({
    title,
    onPress,
    color = colors.brand.primary,
    style,
}: LinkButtonProps) {
    return (
        <Pressable onPress={onPress} style={[styles.linkButton, style]}>
            <Text style={[styles.linkText, { color }]}>{title}</Text>
        </Pressable>
    );
}

// Icon button with glow
interface IconButtonProps {
    icon: React.ReactNode;
    onPress: () => void;
    size?: number;
    backgroundColor?: string;
    glowColor?: string;
    style?: StyleProp<ViewStyle>;
}

export function IconButton({
    icon,
    onPress,
    size = 48,
    backgroundColor = colors.surface.glass,
    glowColor,
    style,
}: IconButtonProps) {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.9,
            useNativeDriver: true,
            speed: 50,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            speed: 50,
            bounciness: 8,
        }).start();
    };

    return (
        <Animated.View
            style={[
                {
                    transform: [{ scale: scaleAnim }],
                    ...(glowColor && {
                        shadowColor: glowColor,
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.5,
                        shadowRadius: 12,
                    }),
                },
                style,
            ]}
        >
            <Pressable
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={[
                    styles.iconButton,
                    {
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        backgroundColor,
                    },
                ]}
            >
                {icon}
            </Pressable>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    fullWidth: {
        width: '100%',
    },
    pressable: {
        overflow: 'hidden',
    },
    gradient: {
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    highlight: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '50%',
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderTopLeftRadius: 100,
        borderTopRightRadius: 100,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.lg,
    },
    transparentContent: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    iconLeft: {
        marginRight: spacing.sm,
    },
    iconRight: {
        marginLeft: spacing.sm,
    },
    outline: {
        borderWidth: 2,
        borderColor: colors.brand.primary,
    },
    disabled: {
        opacity: 0.5,
    },
    linkButton: {
        padding: spacing.sm,
    },
    linkText: {
        fontSize: 14,
        fontWeight: '500',
    },
    iconButton: {
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.surface.glassBorder,
    },
});

export default GradientButton;
