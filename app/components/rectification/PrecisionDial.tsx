/**
 * PrecisionDial
 *
 * The permanent state element of the rectification wizard (spec §6). It
 * replaces any step-by-step progress bar: a 24 h dial whose lit arc is the
 * current uncertainty, with the estimate that would come out if the calculation
 * ran right now.
 *
 * The point of it is motivational. It has to tighten *visibly* every time an
 * event is added, and a day-dated event has to tighten it noticeably more than
 * a month-dated one — that is what makes the quality of a date tangible instead
 * of a claim in a help text.
 */

import React, { memo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Circle, Path, G, Line } from 'react-native-svg';
import { colors, spacing, typography } from '@/theme';
import { formatUncertainty, type CurvePoint } from '@/services/rectification';

const SIZE = 176;
const CENTRE = SIZE / 2;
const RING_RADIUS = 74;
const RING_WIDTH = 10;

interface PrecisionDialProps {
    /** Half-width of the credible interval, in minutes. Null before any event. */
    uncertaintyMinutes: number | null;
    /** Search window in local hours; end below start means it wraps past midnight. */
    window?: { start: number; end: number } | null;
    /** The estimated time, once a calculation has run ("HH:MM"). */
    modeTime?: string | null;
    /** Posterior curve, drawn as radial ticks once available (spec §9.1). */
    curve?: CurvePoint[] | null;
    eventCount?: number;
    /** Exact shortfall, e.g. "Il te manque 1 événement pour lancer le calcul". */
    caption?: string;
}

/** Hours (0–24) to degrees, midnight at the top, clockwise. */
function hourToAngle(hour: number): number {
    return (hour / 24) * 360 - 90;
}

function pointOnCircle(radius: number, angleDeg: number): [number, number] {
    const rad = (angleDeg * Math.PI) / 180;

    return [CENTRE + radius * Math.cos(rad), CENTRE + radius * Math.sin(rad)];
}

/** SVG arc path between two angles, sweeping clockwise. */
function describeArc(radius: number, fromAngle: number, toAngle: number): string {
    // A full circle cannot be drawn as a single arc — the start and end points
    // coincide and the renderer draws nothing. Split it in two halves.
    let sweep = toAngle - fromAngle;
    if (sweep <= 0) sweep += 360;

    if (sweep >= 359.9) {
        const [ax, ay] = pointOnCircle(radius, fromAngle);
        const [bx, by] = pointOnCircle(radius, fromAngle + 180);

        return `M ${ax} ${ay} A ${radius} ${radius} 0 1 1 ${bx} ${by} A ${radius} ${radius} 0 1 1 ${ax} ${ay}`;
    }

    const [startX, startY] = pointOnCircle(radius, fromAngle);
    const [endX, endY] = pointOnCircle(radius, fromAngle + sweep);
    const largeArc = sweep > 180 ? 1 : 0;

    return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY}`;
}

function parseHour(time: string): number {
    const [h, m] = time.split(':').map(Number);

    return h + m / 60;
}

const AnimatedPath = Animated.createAnimatedComponent(Path);

export const PrecisionDial = memo(function PrecisionDial({
    uncertaintyMinutes,
    window,
    modeTime,
    curve,
    eventCount = 0,
    caption,
}: PrecisionDialProps) {
    // Fade the lit arc on every change, so a tightening reads as a movement
    // rather than a silent redraw.
    const pulse = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        pulse.setValue(0.35);
        Animated.timing(pulse, {
            toValue: 1,
            duration: 520,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
    }, [uncertaintyMinutes, eventCount, pulse]);

    const windowStart = window?.start ?? 0;
    const windowEnd = window?.end ?? 24;
    const windowSpan = windowEnd > windowStart ? windowEnd - windowStart : 24 - windowStart + windowEnd;

    // Where the lit arc sits. Once a calculation has produced a mode we centre
    // on it; before that there is no known centre, so we centre on the window
    // and the arc communicates width only — which is all §6 asks of it.
    const centreHour = modeTime ? parseHour(modeTime) : windowStart + windowSpan / 2;

    // Uncertainty is a half-width, so the lit arc spans twice it. Floored at a
    // few minutes so a very sharp result is still visible on screen.
    const litHalfSpan = uncertaintyMinutes === null
        ? windowSpan / 2
        : Math.max(uncertaintyMinutes / 60, 0.12);

    const litFrom = hourToAngle(centreHour - litHalfSpan);
    const litTo = hourToAngle(centreHour + litHalfSpan);

    const peak = curve?.length ? Math.max(...curve.map((c) => c.p)) : 0;

    return (
        <View style={styles.container}>
            <Svg width={SIZE} height={SIZE}>
                {/* The full 24 h, always present as the reference. */}
                <Circle
                    cx={CENTRE}
                    cy={CENTRE}
                    r={RING_RADIUS}
                    stroke={colors.surfaceContainerHigh}
                    strokeWidth={RING_WIDTH}
                    fill="none"
                />

                {/* The search window, once the user has bounded it. */}
                {window && windowSpan < 24 && (
                    <Path
                        d={describeArc(RING_RADIUS, hourToAngle(windowStart), hourToAngle(windowEnd))}
                        stroke={colors.surfaceBright}
                        strokeWidth={RING_WIDTH}
                        strokeLinecap="round"
                        fill="none"
                    />
                )}

                {/* Posterior curve, as radial ticks inside the ring. */}
                {curve && peak > 0 && (
                    <G opacity={0.75}>
                        {curve.map((point, index) => {
                            const height = (point.p / peak) * 22;
                            if (height < 0.6) return null;

                            const angle = hourToAngle(parseHour(point.t));
                            const inner = RING_RADIUS - RING_WIDTH / 2 - 3;
                            const [x1, y1] = pointOnCircle(inner, angle);
                            const [x2, y2] = pointOnCircle(inner - height, angle);

                            return (
                                <Line
                                    key={`${point.t}-${index}`}
                                    x1={x1}
                                    y1={y1}
                                    x2={x2}
                                    y2={y2}
                                    stroke={colors.secondary}
                                    strokeWidth={1.5}
                                    strokeLinecap="round"
                                />
                            );
                        })}
                    </G>
                )}

                {/* The lit arc: the current uncertainty. */}
                <AnimatedPath
                    d={describeArc(RING_RADIUS, litFrom, litTo)}
                    stroke={colors.primary}
                    strokeWidth={RING_WIDTH}
                    strokeLinecap="round"
                    fill="none"
                    opacity={pulse}
                />
            </Svg>

            <View style={styles.readout} pointerEvents="none">
                {/* Never a time on its own — the margin is the headline until a
                    calculation has actually run. */}
                <Text style={styles.uncertainty}>{formatUncertainty(uncertaintyMinutes)}</Text>
                {modeTime && <Text style={styles.modeTime}>autour de {modeTime}</Text>}
            </View>

            <Text style={styles.caption}>
                {caption ?? `${eventCount} événement${eventCount > 1 ? 's' : ''} posé${eventCount > 1 ? 's' : ''}`}
            </Text>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.lg,
    },
    readout: {
        position: 'absolute',
        top: spacing.lg,
        width: SIZE,
        height: SIZE,
        alignItems: 'center',
        justifyContent: 'center',
    },
    uncertainty: {
        ...typography.headlineMd,
        color: colors.onSurface,
    },
    modeTime: {
        ...typography.labelSm,
        color: colors.onSurfaceMuted,
        marginTop: spacing.xs,
    },
    caption: {
        ...typography.labelSm,
        color: colors.onSurfaceMuted,
        marginTop: spacing.md,
        textAlign: 'center',
        paddingHorizontal: spacing.lg,
    },
});
