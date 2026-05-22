import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

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
        </View>
    );
}
