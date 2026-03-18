/**
 * ProgressBar Component
 * Thin, rounded progress bar with gradient fill
 */

import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    ViewStyle,
    StyleProp,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, spacing } from '@/theme';

interface ProgressBarProps {
    value: number; // 0-100
    height?: number;
    showLabel?: boolean;
    labelPosition?: 'left' | 'right' | 'top' | 'none';
    gradientColors?: readonly string[];
    backgroundColor?: string;
    animated?: boolean;
    style?: StyleProp<ViewStyle>;
}

export function ProgressBar({
    value,
    height = 6,
    showLabel = false,
    labelPosition = 'right',
    gradientColors = colors.gradients.primary,
    backgroundColor = colors.surface.default,
    animated = true,
    style,
}: ProgressBarProps) {
    const animatedWidth = useRef(new Animated.Value(0)).current;
    const clampedValue = Math.max(0, Math.min(100, value));

    useEffect(() => {
        if (animated) {
            Animated.timing(animatedWidth, {
                toValue: clampedValue,
                duration: 800,
                useNativeDriver: false,
            }).start();
        } else {
            animatedWidth.setValue(clampedValue);
        }
    }, [clampedValue, animated]);

    const widthInterpolation = animatedWidth.interpolate({
        inputRange: [0, 100],
        outputRange: ['0%', '100%'],
    });

    const renderLabel = () => {
        if (!showLabel || labelPosition === 'none') return null;

        return (
            <Text style={[
                styles.label,
                labelPosition === 'left' && styles.labelLeft,
            ]}>
                {Math.round(clampedValue)}%
            </Text>
        );
    };

    const isHorizontalLabel = labelPosition === 'left' || labelPosition === 'right';

    return (
        <View style={[
            isHorizontalLabel && styles.horizontalContainer,
            style,
        ]}>
            {labelPosition === 'left' && renderLabel()}
            {labelPosition === 'top' && (
                <View style={styles.topLabelContainer}>
                    {renderLabel()}
                </View>
            )}

            <View style={[
                styles.track,
                { height, backgroundColor },
                isHorizontalLabel && styles.trackFlex,
            ]}>
                <Animated.View
                    style={[
                        styles.fill,
                        { width: widthInterpolation, height },
                    ]}
                >
                    <LinearGradient
                        colors={gradientColors as [string, string, ...string[]]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.gradient}
                    />
                    {/* Glow effect at the end */}
                    <View style={[styles.glow, { backgroundColor: gradientColors[gradientColors.length - 1] }]} />
                </Animated.View>
            </View>

            {labelPosition === 'right' && renderLabel()}
        </View>
    );
}

// Score row with label, percentage, and progress bar
interface ScoreRowProps {
    label: string;
    value: number;
    icon?: string;
    gradientColors?: readonly string[];
    style?: StyleProp<ViewStyle>;
}

export function ScoreRow({
    label,
    value,
    icon,
    gradientColors,
    style,
}: ScoreRowProps) {
    // Choose gradient based on value
    const defaultGradient = value >= 70
        ? colors.gradients.primary
        : value >= 40
            ? colors.gradients.gold
            : colors.gradients.fire;

    return (
        <View style={[styles.scoreRow, style]}>
            <View style={styles.scoreHeader}>
                <View style={styles.scoreLabel}>
                    {icon && <Text style={styles.scoreIcon}>{icon}</Text>}
                    <Text style={styles.scoreLabelText}>{label}</Text>
                </View>
                <Text style={styles.scoreValue}>{Math.round(value)}%</Text>
            </View>
            <ProgressBar
                value={value}
                height={4}
                gradientColors={gradientColors || defaultGradient}
            />
        </View>
    );
}

// Circular progress indicator
interface CircularProgressProps {
    value: number;
    size?: number;
    strokeWidth?: number;
    gradientColors?: readonly string[];
    showValue?: boolean;
    style?: StyleProp<ViewStyle>;
}

export function CircularProgress({
    value,
    size = 120,
    strokeWidth = 8,
    gradientColors = colors.gradients.primary,
    showValue = true,
    style,
}: CircularProgressProps) {
    const clampedValue = Math.max(0, Math.min(100, value));
    const circumference = 2 * Math.PI * ((size - strokeWidth) / 2);
    const strokeDashoffset = circumference - (clampedValue / 100) * circumference;

    return (
        <View style={[{ width: size, height: size }, style]}>
            {/* Background circle */}
            <View
                style={[
                    styles.circularTrack,
                    {
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        borderWidth: strokeWidth,
                    },
                ]}
            />

            {/* Progress arc - simplified without SVG */}
            <View
                style={[
                    styles.circularProgress,
                    {
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        borderWidth: strokeWidth,
                        borderColor: gradientColors[1],
                        transform: [{ rotate: '-90deg' }],
                    },
                ]}
            />

            {/* Center content */}
            {showValue && (
                <View style={styles.circularCenter}>
                    <Text style={styles.circularValue}>{Math.round(clampedValue)}</Text>
                    <Text style={styles.circularPercent}>%</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    horizontalContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    track: {
        borderRadius: radius.full,
        overflow: 'hidden',
        position: 'relative',
    },
    trackFlex: {
        flex: 1,
    },
    fill: {
        borderRadius: radius.full,
        overflow: 'hidden',
        position: 'relative',
    },
    gradient: {
        ...StyleSheet.absoluteFillObject,
    },
    glow: {
        position: 'absolute',
        right: 0,
        top: '50%',
        width: 8,
        height: 8,
        borderRadius: 4,
        marginTop: -4,
        opacity: 0.8,
        shadowColor: '#FFF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 4,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text.primary,
        marginLeft: spacing.sm,
        minWidth: 40,
        textAlign: 'right',
    },
    labelLeft: {
        marginLeft: 0,
        marginRight: spacing.sm,
        textAlign: 'left',
    },
    topLabelContainer: {
        alignItems: 'flex-end',
        marginBottom: spacing.xs,
    },
    scoreRow: {
        marginBottom: spacing.md,
    },
    scoreHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    scoreLabel: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    scoreIcon: {
        fontSize: 16,
        marginRight: spacing.xs,
    },
    scoreLabelText: {
        fontSize: 14,
        color: colors.text.secondary,
        fontWeight: '500',
    },
    scoreValue: {
        fontSize: 14,
        color: colors.text.primary,
        fontWeight: '600',
    },
    circularTrack: {
        position: 'absolute',
        borderColor: colors.surface.default,
    },
    circularProgress: {
        position: 'absolute',
        borderTopColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: 'transparent',
    },
    circularCenter: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    circularValue: {
        fontSize: 32,
        fontWeight: '700',
        color: colors.text.primary,
    },
    circularPercent: {
        fontSize: 16,
        fontWeight: '500',
        color: colors.text.muted,
        marginLeft: 2,
        marginTop: 8,
    },
});

export default ProgressBar;
