import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { colors, fonts, spacing } from '@/theme';

interface Props {
    scoreTarget: number;
    tagline: string;
    nameA: string;   // initial
    nameB: string;   // initial
    subjectA: string;
    subjectB: string;
}

const RING_SIZE = 200;
const STROKE = 10;
const R = (RING_SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

export function CompatibilityHeroV2({ scoreTarget, tagline, nameA, nameB, subjectA, subjectB }: Props) {
    const [shown, setShown] = useState(0);

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

    const dashOffset = CIRCUMFERENCE - (shown / 100) * CIRCUMFERENCE;

    return (
        <View style={styles.hero}>
            {/* Avatar pair */}
            <View style={styles.pair}>
                <View style={[styles.avatar, styles.avatarA]}>
                    <Text style={styles.avatarInitial}>{nameA}</Text>
                </View>
                <View style={styles.linkDots}>
                    {[0, 1, 2].map((i) => <View key={i} style={styles.dot} />)}
                </View>
                <View style={[styles.avatar, styles.avatarB]}>
                    <Text style={styles.avatarInitial}>{nameB}</Text>
                </View>
            </View>

            {/* Names */}
            <Text style={styles.names}>
                <Text style={styles.nameBold}>{subjectA}</Text>
                <Text style={styles.nameSep}> × </Text>
                <Text style={styles.nameBold}>{subjectB}</Text>
            </Text>

            {/* Score ring */}
            <View style={styles.ringWrap}>
                <Svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
                    <Defs>
                        <SvgGradient id="scoreGradV2" x1="0%" y1="0%" x2="100%" y2="100%">
                            <Stop offset="0%" stopColor={colors.primary} />
                            <Stop offset="60%" stopColor="#E5C266" />
                            <Stop offset="100%" stopColor={colors.secondaryContainer} />
                        </SvgGradient>
                    </Defs>
                    {/* Track */}
                    <Circle
                        cx={RING_SIZE / 2}
                        cy={RING_SIZE / 2}
                        r={R}
                        fill="none"
                        stroke={`${colors.surfaceContainerHighest}`}
                        strokeWidth={STROKE}
                    />
                    {/* Progress */}
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

            {/* Tagline */}
            <Text style={styles.tagline}>{tagline}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    hero: {
        alignItems: 'center',
        paddingTop: spacing.xxl,
        paddingBottom: spacing.xxl,
        paddingHorizontal: spacing.xl,
    },
    pair: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarA: {
        backgroundColor: `${colors.primary}33`,
        borderWidth: 2,
        borderColor: `${colors.primary}88`,
    },
    avatarB: {
        backgroundColor: `${colors.secondary}22`,
        borderWidth: 2,
        borderColor: `${colors.secondary}66`,
    },
    avatarInitial: {
        fontFamily: fonts.display.bold,
        fontSize: 22,
        color: colors.onSurface,
        lineHeight: 28,
    },
    linkDots: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginHorizontal: spacing.sm,
    },
    dot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: `${colors.primary}55`,
    },
    names: {
        marginBottom: spacing.xl,
        textAlign: 'center',
    },
    nameBold: {
        fontFamily: fonts.display.bold,
        fontSize: 18,
        color: colors.onSurface,
        letterSpacing: 0.3,
    },
    nameSep: {
        fontFamily: fonts.body.regular,
        fontSize: 16,
        color: colors.onSurfaceMuted,
    },
    ringWrap: {
        position: 'relative',
        width: RING_SIZE,
        height: RING_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.xl,
    },
    scoreCenter: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    },
    scoreValue: {
        fontFamily: fonts.display.bold,
        fontSize: 52,
        lineHeight: 60,
        color: colors.onSurface,
        letterSpacing: -1,
    },
    scorePct: {
        fontSize: 28,
        color: colors.primary,
    },
    scoreLabel: {
        fontFamily: fonts.body.semiBold,
        fontSize: 10,
        letterSpacing: 2,
        color: colors.onSurfaceMuted,
        textTransform: 'uppercase',
        textAlign: 'center',
    },
    tagline: {
        fontFamily: fonts.display.regular,
        fontSize: 17,
        lineHeight: 26,
        color: colors.onSurface,
        fontStyle: 'italic',
        textAlign: 'center',
        paddingHorizontal: spacing.xl,
        opacity: 0.9,
    },
});
