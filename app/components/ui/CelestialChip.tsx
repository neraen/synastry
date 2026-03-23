/**
 * CelestialChip
 * Selection chip for filters, tags, and zodiac sign selection.
 */

import React, { memo, useEffect, useRef } from 'react';
import { Pressable, View, Text, StyleSheet, Animated } from 'react-native';
import { colors, radius, spacing, animation, typography } from '@/theme';
import { CelestialText } from './CelestialText';

interface CelestialChipProps {
    label: string;
    selected?: boolean;
    onPress?: () => void;
    icon?: string;
}

export const CelestialChip = memo(function CelestialChip({
    label,
    selected = false,
    onPress,
    icon,
}: CelestialChipProps) {
    const animValue = useRef(new Animated.Value(selected ? 1 : 0)).current;

    useEffect(() => {
        Animated.timing(animValue, {
            toValue: selected ? 1 : 0,
            duration: animation.standard,
            useNativeDriver: false,
        }).start();
    }, [selected, animValue]);

    const backgroundColor = animValue.interpolate({
        inputRange: [0, 1],
        outputRange: [colors.surfaceContainerHighest, colors.secondaryContainer],
    });

    return (
        <Pressable onPress={onPress} disabled={!onPress}>
            <Animated.View style={[styles.chip, { backgroundColor }]}>
                {icon && (
                    <Text style={styles.icon}>{icon}</Text>
                )}
                <CelestialText
                    variant="labelSm"
                    color={selected ? 'primary' : 'muted'}
                >
                    {label}
                </CelestialText>
            </Animated.View>
        </Pressable>
    );
});

const styles = StyleSheet.create({
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.full,
    },
    icon: {
        fontSize: typography.bodyMd.fontSize,
        marginRight: spacing.xs,
    },
});

export default CelestialChip;
