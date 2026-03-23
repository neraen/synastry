/**
 * CosmicProgressRing
 * Circular progress indicator for compatibility percentage.
 */

import React, { memo, useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '@/theme';
import { CelestialText } from './CelestialText';

interface CosmicProgressRingProps {
    percentage: number;
    size?: number;
    label?: string;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const CosmicProgressRing = memo(function CosmicProgressRing({
    percentage,
    size = 160,
    label = 'COSMIC SYNC',
}: CosmicProgressRingProps) {
    const animatedValue = useRef(new Animated.Value(0)).current;
    const displayValue = useRef(new Animated.Value(0)).current;

    const strokeWidth = 3;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const center = size / 2;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(animatedValue, {
                toValue: percentage,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.timing(displayValue, {
                toValue: percentage,
                duration: 800,
                useNativeDriver: false,
            }),
        ]).start();
    }, [percentage, animatedValue, displayValue]);

    const strokeDashoffset = animatedValue.interpolate({
        inputRange: [0, 100],
        outputRange: [circumference, 0],
    });

    const displayNumber = displayValue.interpolate({
        inputRange: [0, 100],
        outputRange: [0, 100],
    });

    return (
        <View style={[styles.container, { width: size, height: size }]}>
            <Svg width={size} height={size}>
                {/* Background circle */}
                <Circle
                    cx={center}
                    cy={center}
                    r={radius}
                    stroke={colors.surfaceContainerHigh}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                />
                {/* Progress arc */}
                <AnimatedCircle
                    cx={center}
                    cy={center}
                    r={radius}
                    stroke={colors.primary}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="butt"
                    rotation="-90"
                    origin={`${center}, ${center}`}
                />
            </Svg>
            <View style={styles.content}>
                <AnimatedNumber value={displayNumber} />
                <CelestialText variant="labelSm" color="muted">
                    {label}
                </CelestialText>
            </View>
        </View>
    );
});

// Animated number display component
const AnimatedNumber = memo(function AnimatedNumber({
    value,
}: {
    value: Animated.AnimatedInterpolation<number>;
}) {
    const [displayText, setDisplayText] = React.useState('0');

    useEffect(() => {
        const listener = value.addListener(({ value: val }) => {
            setDisplayText(Math.round(val).toString());
        });
        return () => value.removeListener(listener);
    }, [value]);

    return (
        <CelestialText variant="displayMd" color="gold">
            {displayText}%
        </CelestialText>
    );
});

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default CosmicProgressRing;
