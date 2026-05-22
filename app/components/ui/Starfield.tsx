import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

const SHOOTING_STARS: { top: string; left: string; delay: number; interval: number }[] = [
    { top: '12%', left: '10%', delay: 3000,  interval: 12000 },
    { top: '55%', left: '58%', delay: 9000,  interval: 15000 },
    { top: '28%', left: '75%', delay: 6500,  interval: 18000 },
];

function ShootingStar({ top, left, delay, interval }: typeof SHOOTING_STARS[0]) {
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.timing(anim, { toValue: 1, duration: 600, useNativeDriver: true }),
                Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
                Animated.delay(interval),
            ]),
        );
        loop.start();
        return () => loop.stop();
    }, []);

    const opacity = anim.interpolate({
        inputRange: [0, 0.15, 0.5, 0.85, 1],
        outputRange: [0, 0.7, 1, 0.5, 0],
    });
    const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 55] });
    const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 55] });

    return (
        <Animated.View
            style={{
                position: 'absolute',
                top,
                left,
                width: 45,
                height: 1.5,
                borderRadius: 1,
                backgroundColor: '#C8E6FF',
                opacity,
                transform: [{ rotate: '-45deg' }, { translateX }, { translateY }],
            }}
        />
    );
}

/**
 * Animated star field — renders twinkling white dots + occasional shooting stars
 * as an absoluteFill background layer. Use as first child of a screen root View.
 * pointerEvents="none" ensures it never captures touches.
 */
export function Starfield({ count = 36 }: { count?: number }) {
    const stars = useMemo(
        () =>
            Array.from({ length: count }, () => ({
                top: Math.random() * 100,
                left: Math.random() * 100,
                size: Math.random() < 0.85 ? 1.2 : 2,
                peak: 0.25 + Math.random() * 0.55,
                delay: Math.random() * 4000,
                half: 1500 + Math.random() * 1000,
            })),
        [],
    );

    const anims = useRef(stars.map(() => new Animated.Value(0))).current;

    useEffect(() => {
        const loops = anims.map((anim, i) => {
            const { peak, delay, half } = stars[i];
            const loop = Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(anim, { toValue: peak, duration: half, useNativeDriver: true }),
                    Animated.timing(anim, { toValue: 0, duration: half, useNativeDriver: true }),
                ]),
            );
            loop.start();
            return loop;
        });
        return () => loops.forEach((l) => l.stop());
    }, []);

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {stars.map((s, i) => (
                <Animated.View
                    key={i}
                    style={{
                        position: 'absolute',
                        top: `${s.top}%`,
                        left: `${s.left}%`,
                        width: s.size,
                        height: s.size,
                        borderRadius: s.size / 2,
                        backgroundColor: '#fff',
                        opacity: anims[i],
                    }}
                />
            ))}
            {SHOOTING_STARS.map((s, i) => (
                <ShootingStar key={`shoot_${i}`} {...s} />
            ))}
        </View>
    );
}
