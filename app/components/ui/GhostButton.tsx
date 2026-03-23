/**
 * GhostButton
 * Secondary action button with glass styling.
 */

import React, { memo, useRef, useCallback } from 'react';
import { Pressable, StyleSheet, Animated, ViewStyle } from 'react-native';
import { colors, radius, typography } from '@/theme';
import { CelestialText } from './CelestialText';

type Size = 'sm' | 'md' | 'lg';

interface GhostButtonProps {
    label: string;
    onPress: () => void;
    disabled?: boolean;
    size?: Size;
}

// surfaceBright #3d3660 at 10% opacity
const BACKGROUND_COLOR = 'rgba(61, 54, 96, 0.1)';
// outline #474556 at 15% opacity
const BORDER_COLOR = 'rgba(71, 69, 86, 0.15)';

const sizeStyles: Record<Size, { paddingVertical: number; paddingHorizontal: number; variant: 'labelSm' | 'labelMd' | 'titleMd' }> = {
    sm: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        variant: 'labelSm',
    },
    md: {
        paddingVertical: 14,
        paddingHorizontal: 28,
        variant: 'labelMd',
    },
    lg: {
        paddingVertical: 18,
        paddingHorizontal: 36,
        variant: 'titleMd',
    },
};

export const GhostButton = memo(function GhostButton({
    label,
    onPress,
    disabled = false,
    size = 'md',
}: GhostButtonProps) {
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

    const buttonStyle: ViewStyle = {
        paddingVertical: sizeConfig.paddingVertical,
        paddingHorizontal: sizeConfig.paddingHorizontal,
    };

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <Pressable
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={disabled}
                style={[
                    styles.button,
                    buttonStyle,
                    disabled && styles.disabled,
                ]}
            >
                <CelestialText variant={sizeConfig.variant} color="primary">
                    {label}
                </CelestialText>
            </Pressable>
        </Animated.View>
    );
});

const styles = StyleSheet.create({
    button: {
        backgroundColor: BACKGROUND_COLOR,
        borderWidth: 1,
        borderColor: BORDER_COLOR,
        borderRadius: radius.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    disabled: {
        opacity: 0.4,
    },
});

export default GhostButton;
