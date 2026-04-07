/**
 * TransitOnboarding — spotlight-style first-visit tutorial for the Transits screen.
 *
 * Renders a full-screen overlay with a "cut-out" around the highlighted element,
 * plus a tooltip card at the bottom with Next/Skip controls.
 *
 * Steps progress through tabs automatically; target refs are measured via
 * measureInWindow so scroll position is irrelevant.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, fonts, radius, spacing } from '@/theme';

// ─── Persistence ──────────────────────────────────────────────────────────────

const FLAG_FILE = FileSystem.documentDirectory
    ? `${FileSystem.documentDirectory}transit_onboarding_v1.txt`
    : null;

export async function hasSeenTransitOnboarding(): Promise<boolean> {
    if (!FLAG_FILE) return false;
    try {
        const info = await FileSystem.getInfoAsync(FLAG_FILE);
        return info.exists;
    } catch {
        return false;
    }
}

async function markDone(): Promise<void> {
    if (!FLAG_FILE) return;
    try {
        await FileSystem.writeAsStringAsync(FLAG_FILE, '1');
    } catch {
        // non-critical, ignore
    }
}

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId = 'timeline' | 'calendar' | 'mirror';
type RefKey = 'tabs' | 'help' | 'timeline' | 'calendar' | 'mirror';

interface Rect { x: number; y: number; w: number; h: number }

interface Step {
    refKey: RefKey;
    tab: TabId;                 // which tab to activate for this step
    titleKey: string;
    bodyKey: string;
}

export interface OnboardingRefs {
    tabs: React.RefObject<View | null>;
    help: React.RefObject<View | null>;
    timeline: React.RefObject<View | null>;
    calendar: React.RefObject<View | null>;
    mirror: React.RefObject<View | null>;
}

interface Props {
    refs: OnboardingRefs;
    activeTab: TabId;
    onTabChange: (tab: TabId) => void;
    scrollRef: React.RefObject<ScrollView | null>;
    onDone: () => void;
}

// ─── Steps definition ─────────────────────────────────────────────────────────

const STEPS: Step[] = [
    { refKey: 'timeline', tab: 'timeline', titleKey: 'transitsOnboarding.step2Title', bodyKey: 'transitsOnboarding.step2Body' },
    { refKey: 'calendar', tab: 'calendar', titleKey: 'transitsOnboarding.step3Title', bodyKey: 'transitsOnboarding.step3Body' },
    { refKey: 'mirror',   tab: 'mirror',   titleKey: 'transitsOnboarding.step4Title', bodyKey: 'transitsOnboarding.step4Body' },
    { refKey: 'help',     tab: 'mirror',   titleKey: 'transitsOnboarding.step5Title', bodyKey: 'transitsOnboarding.step5Body' },
];

const { width: W, height: H } = Dimensions.get('window');
const SPOT_PAD = 12;
const SPOT_RADIUS = radius.lg;

// ─── Component ────────────────────────────────────────────────────────────────

export function TransitOnboarding({ refs, activeTab, onTabChange, scrollRef, onDone }: Props) {
    const { t } = useTranslation();

    const [stepIdx, setStepIdx] = useState(0);
    const [spot, setSpot] = useState<Rect | null>(null);

    // Fade-in overlay
    const overlayOpacity = useRef(new Animated.Value(0)).current;
    // Pulse for spotlight border
    const pulse = useRef(new Animated.Value(0.5)).current;
    // Tooltip slide-up
    const tooltipY = useRef(new Animated.Value(40)).current;

    const currentStep = STEPS[stepIdx];

    // ── Enter animation ──────────────────────────────────────────────────────
    useEffect(() => {
        Animated.timing(overlayOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
                Animated.timing(pulse, { toValue: 0.45, duration: 900, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    // ── Animate tooltip on step change ───────────────────────────────────────
    const animateTooltipIn = useCallback(() => {
        tooltipY.setValue(30);
        Animated.spring(tooltipY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }).start();
    }, [tooltipY]);

    // ── Measure target ref ───────────────────────────────────────────────────
    const measureStep = useCallback((step: Step) => {
        const ref = refs[step.refKey];
        if (!ref?.current) { setSpot(null); animateTooltipIn(); return; }
        ref.current.measureInWindow((x, y, w, h) => {
            setSpot({ x, y, w, h });
            animateTooltipIn();
        });
    }, [refs, animateTooltipIn]);

    // ── Re-measure when activeTab matches current step ───────────────────────
    useEffect(() => {
        if (activeTab !== currentStep.tab) return;
        // Give the new tab content one frame to mount
        const id = requestAnimationFrame(() => {
            setTimeout(() => measureStep(currentStep), 80);
        });
        return () => cancelAnimationFrame(id);
    }, [activeTab, stepIdx]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Navigation ───────────────────────────────────────────────────────────
    const goNext = useCallback(() => {
        if (stepIdx >= STEPS.length - 1) {
            markDone();
            Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(onDone);
            return;
        }
        const next = STEPS[stepIdx + 1];
        setSpot(null); // clear while transitioning
        setStepIdx(stepIdx + 1);

        if (next.tab !== activeTab) {
            // Switch tab — measure will happen in the useEffect above once activeTab updates
            scrollRef.current?.scrollTo({ y: 0, animated: false });
            onTabChange(next.tab);
        } else {
            // Same tab — measure immediately
            setTimeout(() => measureStep(next), 80);
        }
    }, [stepIdx, activeTab, onTabChange, scrollRef, measureStep, overlayOpacity, onDone]);

    const goSkip = useCallback(() => {
        markDone();
        Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(onDone);
    }, [overlayOpacity, onDone]);

    // ── Spotlight geometry ───────────────────────────────────────────────────
    const sx = spot ? spot.x - SPOT_PAD : 0;
    const sy = spot ? spot.y - SPOT_PAD : 0;
    const sw = spot ? spot.w + SPOT_PAD * 2 : 0;
    const sh = spot ? spot.h + SPOT_PAD * 2 : 0;

    const isLast = stepIdx === STEPS.length - 1;

    return (
        <Animated.View style={[StyleSheet.absoluteFill, styles.overlay, { opacity: overlayOpacity }]} pointerEvents="box-none">

            {/* ── 4-rect spotlight dimming ── */}
            {spot ? (
                <>
                    {/* Top */}
                    <View style={[styles.dim, { top: 0, left: 0, right: 0, height: Math.max(0, sy) }]} />
                    {/* Bottom */}
                    <View style={[styles.dim, { top: sy + sh, left: 0, right: 0, bottom: 0 }]} />
                    {/* Left */}
                    <View style={[styles.dim, { top: sy, left: 0, width: Math.max(0, sx), height: sh }]} />
                    {/* Right */}
                    <View style={[styles.dim, { top: sy, left: sx + sw, right: 0, height: sh }]} />

                    {/* Glowing border around spotlight */}
                    <Animated.View
                        pointerEvents="none"
                        style={[
                            styles.spotBorder,
                            {
                                left: sx,
                                top: sy,
                                width: sw,
                                height: sh,
                                borderRadius: SPOT_RADIUS,
                                opacity: pulse,
                            },
                        ]}
                    />
                </>
            ) : (
                // Full dim while measuring
                <View style={[styles.dim, StyleSheet.absoluteFill]} />
            )}

            {/* ── Tooltip card (always at bottom) ── */}
            <Animated.View style={[styles.tooltip, { transform: [{ translateY: tooltipY }] }]}>
                {/* Progress dots */}
                <View style={styles.dotsRow}>
                    {STEPS.map((_, i) => (
                        <View
                            key={i}
                            style={[styles.dot, i === stepIdx ? styles.dotActive : styles.dotInactive]}
                        />
                    ))}
                </View>

                {/* Text */}
                <Text style={styles.title}>{t(currentStep.titleKey)}</Text>
                <Text style={styles.body}>{t(currentStep.bodyKey)}</Text>

                {/* Buttons */}
                <View style={styles.btnRow}>
                    <Pressable onPress={goSkip} style={styles.skipBtn} hitSlop={12}>
                        <Text style={styles.skipText}>{t('transitsOnboarding.skip')}</Text>
                    </Pressable>
                    <Pressable onPress={goNext} style={styles.nextBtn}>
                        <Text style={styles.nextText}>
                            {isLast ? t('transitsOnboarding.finish') : t('transitsOnboarding.next')}
                        </Text>
                        {!isLast && <Feather name="arrow-right" size={14} color={colors.surfaceLowest} />}
                    </Pressable>
                </View>
            </Animated.View>
        </Animated.View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    overlay: {
        zIndex: 9999,
    },
    dim: {
        position: 'absolute',
        backgroundColor: 'rgba(10, 6, 22, 0.78)',
    },
    spotBorder: {
        position: 'absolute',
        borderWidth: 1.5,
        borderColor: colors.primary,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 8,
        elevation: 0,
    },

    // Tooltip
    tooltip: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.surfaceContainerHigh,
        borderTopLeftRadius: radius.xl,
        borderTopRightRadius: radius.xl,
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.xl,
        paddingBottom: spacing.xxxl,
        gap: spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 20,
    },
    dotsRow: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: spacing.sm,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    dotActive: {
        backgroundColor: colors.primary,
        width: 18,
    },
    dotInactive: {
        backgroundColor: `${colors.onSurfaceMuted}40`,
    },
    title: {
        fontFamily: fonts.display.bold,
        fontSize: 20,
        color: colors.onSurface,
        lineHeight: 26,
    },
    body: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        lineHeight: 22,
        color: colors.onSurfaceMuted,
    },
    btnRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: spacing.sm,
    },
    skipBtn: {
        paddingVertical: spacing.sm,
    },
    skipText: {
        fontFamily: fonts.body.regular,
        fontSize: 13,
        color: `${colors.onSurfaceMuted}80`,
    },
    nextBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: radius.full,
    },
    nextText: {
        fontFamily: fonts.body.semiBold,
        fontSize: 14,
        color: colors.surfaceLowest,
    },
});