import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Line, Circle } from 'react-native-svg';

// Gold = colors.primary
const GOLD = '#e9c349';

const SHOOTING_STARS: { top: string; left: string; delay: number; interval: number }[] = [
    { top: '12%', left:  '8%', delay: 3000,  interval: 13000 },
    { top: '58%', left: '55%', delay: 9500,  interval: 16000 },
    { top: '30%', left: '72%', delay: 6000,  interval: 19000 },
];

function ShootingStar({ top, left, delay, interval }: typeof SHOOTING_STARS[0]) {
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                // phase 1: slide + fade in
                Animated.timing(anim, { toValue: 0.5, duration: 350, useNativeDriver: true }),
                // phase 2: continue + fade out
                Animated.timing(anim, { toValue: 1,   duration: 350, useNativeDriver: true }),
                Animated.timing(anim, { toValue: 0,   duration: 0,   useNativeDriver: true }),
                Animated.delay(interval),
            ]),
        );
        loop.start();
        return () => loop.stop();
    }, []);

    // Fade: 0→peak at mid→0 at end
    const opacity = anim.interpolate({
        inputRange: [0, 0.35, 0.65, 1],
        outputRange: [0,  0.9,  0.8, 0],
    });
    // The whole star translates along its own axis (rotated frame)
    const translate = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 70] });

    return (
        <Animated.View
            style={{
                position: 'absolute',
                top,
                left,
                opacity,
                transform: [{ rotate: '-42deg' }, { translateX: translate }, { translateY: translate }],
            }}
        >
            <Svg width={52} height={8} viewBox="0 0 52 8">
                <Defs>
                    <LinearGradient id={`sg_${top}_${left}`} x1="0" y1="0" x2="1" y2="0">
                        <Stop offset="0"   stopColor={GOLD} stopOpacity="0"   />
                        <Stop offset="0.6" stopColor={GOLD} stopOpacity="0.4" />
                        <Stop offset="1"   stopColor={GOLD} stopOpacity="0"   />
                    </LinearGradient>
                </Defs>
                {/* Tail */}
                <Line x1="0" y1="4" x2="46" y2="4"
                    stroke={`url(#sg_${top}_${left})`} strokeWidth="1.2" />
                {/* Bright head */}
                <Circle cx="49" cy="4" r="2.2" fill={GOLD} opacity="0.95" />
                <Circle cx="49" cy="4" r="3.8" fill={GOLD} opacity="0.18" />
            </Svg>
        </Animated.View>
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
