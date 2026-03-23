/**
 * GoldButton
 * Primary CTA button with signature gold gradient.
 */

import React, { memo, useRef, useCallback } from 'react';
import {
    Pressable,
    View,
    Text,
    ActivityIndicator,
    StyleSheet,
    Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, spacing, typography } from '@/theme';

type Size = 'sm' | 'md' | 'lg';

interface GoldButtonProps {
    label: string;
    onPress: () => void;
    loading?: boolean;
    disabled?: boolean;
    size?: Size;
    rightIcon?: boolean;
}

// Dark text for contrast on gold gradient - uses surface color
const DARK_TEXT = colors.surface.default;

const sizeStyles = {
    sm: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        typography: typography.labelSm,
    },
    md: {
        paddingVertical: 14,
        paddingHorizontal: 28,
        typography: typography.labelMd,
    },
    lg: {
        paddingVertical: 18,
        paddingHorizontal: 36,
        typography: typography.titleMd,
    },
} as const;

export const GoldButton = memo(function GoldButton({
    label,
    onPress,
    loading = false,
    disabled = false,
    size = 'md',
    rightIcon = false,
}: GoldButtonProps) {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = useCallback(() => {
        Animated.spring(scaleAnim, {
            toValue: 0.97,
            useNativeDriver: true,
            speed: 50,
            bounciness: 4,
        }).start();
    }, [scaleAnim]);

    const handlePressOut = useCallback(() => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            speed: 50,
            bounciness: 4,
        }).start();
    }, [scaleAnim]);

    const sizeConfig = sizeStyles[size];
    const isDisabled = disabled || loading;

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <Pressable
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={isDisabled}
            >
                <LinearGradient
                    colors={[colors.primary, colors.primaryContainer]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                        styles.gradient,
                        {
                            paddingVertical: sizeConfig.paddingVertical,
                            paddingHorizontal: sizeConfig.paddingHorizontal,
                        },
                        isDisabled && styles.disabled,
                    ]}
                >
                    {loading ? (
                        <ActivityIndicator color={DARK_TEXT} size="small" />
                    ) : (
                        <View style={styles.content}>
                            <Text style={[styles.label, sizeConfig.typography]}>
                                {label}
                            </Text>
                            {rightIcon && (
                                <Text style={[styles.arrow, sizeConfig.typography]}>
                                    →
                                </Text>
                            )}
                        </View>
                    )}
                </LinearGradient>
            </Pressable>
        </Animated.View>
    );
});

const styles = StyleSheet.create({
    gradient: {
        borderRadius: radius.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    label: {
        color: DARK_TEXT,
        textAlign: 'center',
    },
    arrow: {
        color: DARK_TEXT,
        marginLeft: spacing.sm,
    },
    disabled: {
        opacity: 0.4,
    },
});

export default GoldButton;
