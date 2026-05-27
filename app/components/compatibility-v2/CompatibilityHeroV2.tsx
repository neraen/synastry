import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, spacing } from '@/theme';

const GOLD = '#E5C266';
const GOLD_2 = '#F0D585';
const GOLD_DIM = '#B89549';
const GOLD_SOFT = 'rgba(229,194,102,0.16)';
const VIOLET = '#9B5CFF';
const VIOLET_2 = '#C39BFF';
const TEXT = '#ECE5F7';
const TEXT_3 = '#8A82A6';
const TEXT_4 = '#5C5478';

const RING_SIZE = 184;
const STROKE = 9;
const R = (RING_SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;
const ORBIT_PAD = 10;
const ORBIT_SIZE = RING_SIZE + ORBIT_PAD * 2;

interface Props {
    scoreTarget: number;
    tagline: string;
    nameA: string;
    nameB: string;
    subjectA: string;
    subjectB: string;
}

export function CompatibilityHeroV2({ scoreTarget, tagline, nameA, nameB, subjectA, subjectB }: Props) {
    const [shown, setShown] = useState(0);
    const orbitAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        let raf: number;
        const start = performance.now();
        const dur = 1500;
        const tick = (now: number) => {
            const k = Math.min(1, (now - start) / dur);
            const eased = 1 - Math.pow(1 - k, 3);
            setShown(Math.round(scoreTarget * eased));
            if (k < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [scoreTarget]);

    useEffect(() => {
        const orbit = Animated.loop(
            Animated.timing(orbitAnim, {
                toValue: 1,
                duration: 60000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        );
        orbit.start();

        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            ])
        );
        pulse.start();

        return () => {
            orbit.stop();
            pulse.stop();
        };
    }, []);

    const dashOffset = CIRCUMFERENCE - (shown / 100) * CIRCUMFERENCE;

    const orbitRotate = orbitAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });
    const pulseScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] });
    const pulseOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });

    return (
        <View style={styles.hero}>
            {/* Avatar pair */}
            <View style={styles.pair}>
                <View style={styles.avatarA}>
                    <Text style={styles.avatarInitialA}>{nameA}</Text>
                </View>

                {/* Gradient link line with pulsing dot */}
                <View style={styles.linkWrap}>
                    <LinearGradient
                        colors={[GOLD_DIM, VIOLET]}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={styles.linkLine}
                    />
                    <Animated.View
                        style={[
                            styles.linkPulse,
                            { transform: [{ scale: pulseScale }], opacity: pulseOpacity },
                        ]}
                    />
                </View>

                <View style={styles.avatarB}>
                    <Text style={styles.avatarInitialB}>{nameB}</Text>
                </View>
            </View>

            {/* Names */}
            <Text style={styles.names}>
                <Text style={styles.nameBold}>{subjectA}</Text>
                <Text style={styles.nameSep}> × </Text>
                <Text style={styles.nameBold}>{subjectB}</Text>
            </Text>

            {/* Orbit + score ring */}
            <View style={styles.ringOuter}>
                {/* Rotating dashed orbit with two glowing dots */}
                <Animated.View
                    style={[styles.orbitContainer, { transform: [{ rotate: orbitRotate }] }]}
                    pointerEvents="none"
                >
                    <Svg width={ORBIT_SIZE} height={ORBIT_SIZE}>
                        <Circle
                            cx={ORBIT_SIZE / 2}
                            cy={ORBIT_SIZE / 2}
                            r={(ORBIT_SIZE - 2) / 2}
                            fill="none"
                            stroke={GOLD_SOFT}
                            strokeWidth={1}
                            strokeDasharray="4 6"
                        />
                        {/* Gold dot at 12 o'clock */}
                        <Circle cx={ORBIT_SIZE / 2} cy={2.5} r={2.5} fill={GOLD} />
                        {/* Violet dot at 3 o'clock */}
                        <Circle cx={ORBIT_SIZE - 2.5} cy={ORBIT_SIZE / 2} r={2.5} fill={VIOLET_2} />
                    </Svg>
                </Animated.View>

                {/* Score ring */}
                <View style={styles.ringWrap}>
                    <Svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
                        <Defs>
                            <SvgGradient id="scoreGradV2" x1="0%" y1="0%" x2="100%" y2="100%">
                                <Stop offset="0%" stopColor={GOLD_2} />
                                <Stop offset="50%" stopColor={GOLD} />
                                <Stop offset="100%" stopColor={VIOLET} />
                            </SvgGradient>
                        </Defs>
                        <Circle
                            cx={RING_SIZE / 2}
                            cy={RING_SIZE / 2}
                            r={R}
                            fill="none"
                            stroke="rgba(255,255,255,0.06)"
                            strokeWidth={STROKE}
                        />
                        <Circle
                            cx={RING_SIZE / 2}
                            cy={RING_SIZE / 2}
                            r={R}
                            fill="none"
                            stroke="url(#scoreGradV2)"
                            strokeWidth={STROKE}
                            strokeDasharray={CIRCUMFERENCE}
                            strokeDashoffset={dashOffset}
                            strokeLinecap="round"
                            rotation={-90}
                            origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
                        />
                    </Svg>
                    <View style={styles.scoreCenter}>
                        <Text style={styles.scoreValue}>
                            {shown}<Text style={styles.scorePct}>%</Text>
                        </Text>
                        <Text style={styles.scoreLabel}>Compatibilité</Text>
                    </View>
                </View>
            </View>

            {/* Tagline */}
            <Text style={styles.tagline}>{tagline}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    hero: {
        alignItems: 'center',
        paddingTop: spacing.lg,
        paddingBottom: spacing.md,
        paddingHorizontal: spacing.xl,
    },
    pair: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    avatarA: {
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(229,194,102,0.06)',
        borderWidth: 1.5,
        borderColor: 'rgba(229,194,102,0.4)',
    },
    avatarInitialA: {
        fontFamily: fonts.display.bold,
        fontSize: 21,
        color: GOLD,
        lineHeight: 26,
    },
    avatarB: {
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(155,92,255,0.06)',
        borderWidth: 1.5,
        borderColor: 'rgba(155,92,255,0.4)',
    },
    avatarInitialB: {
        fontFamily: fonts.display.bold,
        fontSize: 21,
        color: VIOLET_2,
        lineHeight: 26,
    },
    linkWrap: {
        width: 26,
        height: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: spacing.lg,
        position: 'relative',
    },
    linkLine: {
        position: 'absolute',
        width: 26,
        height: 1,
    },
    linkPulse: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: GOLD,
        position: 'absolute',
        shadowColor: GOLD,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.7,
        shadowRadius: 5,
        elevation: 2,
    },
    names: {
        marginBottom: spacing.md,
        textAlign: 'center',
    },
    nameBold: {
        fontFamily: fonts.body.semiBold,
        fontSize: 14,
        color: TEXT,
        fontWeight: '600',
    },
    nameSep: {
        fontFamily: fonts.body.regular,
        fontSize: 13,
        color: TEXT_4,
    },
    ringOuter: {
        width: ORBIT_SIZE,
        height: ORBIT_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    orbitContainer: {
        position: 'absolute',
        width: ORBIT_SIZE,
        height: ORBIT_SIZE,
    },
    ringWrap: {
        width: RING_SIZE,
        height: RING_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: GOLD,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 24,
        elevation: 6,
    },
    scoreCenter: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scoreValue: {
        fontFamily: fonts.display.bold,
        fontSize: 58,
        lineHeight: 64,
        color: GOLD,
        letterSpacing: -1,
    },
    scorePct: {
        fontSize: 26,
        color: GOLD_DIM,
        letterSpacing: 0,
    },
    scoreLabel: {
        marginTop: 6,
        fontFamily: fonts.body.semiBold,
        fontSize: 11,
        letterSpacing: 2.3,
        color: TEXT_3,
        textTransform: 'uppercase',
    },
    tagline: {
        fontFamily: fonts.display.regular,
        fontSize: 21,
        lineHeight: 28,
        color: TEXT,
        fontStyle: 'italic',
        textAlign: 'center',
        paddingHorizontal: spacing.xl,
        maxWidth: 320,
        marginTop: spacing.xs,
    },
});
