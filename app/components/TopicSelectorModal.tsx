/**
 * TopicSelectorModal — mandatory subject picker shown when opening a new Lyra chat.
 *
 * Bottom sheet sliding over the dimmed chat: gold hairline, "Guidance" kicker,
 * serif title and a 2-column grid of accent-tinted topic tiles with a staggered
 * entrance. No backdrop dismissal: a topic must be chosen before the conversation
 * can start. Selecting a tile pops its medallion, then the sheet slides away and
 * onSelect(topic) fires.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Easing,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors, fonts, spacing, radius } from '@/theme';
import { TOPICS, TopicLyra, TopicMeta } from '@/constants/topics';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const PICK_CLOSE_DELAY = 420;

// ─── Staggered entrance wrapper (opacity + 18px rise) ─────────────────────────

function Rise({
    visible,
    delay,
    style,
    children,
}: {
    visible: boolean;
    delay: number;
    style?: object;
    children: React.ReactNode;
}) {
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            anim.setValue(0);
            Animated.timing(anim, {
                toValue: 1,
                duration: 550,
                delay,
                easing: Easing.bezier(0.4, 0, 0.2, 1),
                useNativeDriver: true,
            }).start();
        }
    }, [visible, anim, delay]);

    return (
        <Animated.View
            style={[
                style,
                {
                    opacity: anim,
                    transform: [
                        { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
                    ],
                },
            ]}
        >
            {children}
        </Animated.View>
    );
}

// ─── Topic tile ────────────────────────────────────────────────────────────────

function TopicTile({
    topic,
    picked,
    onPick,
}: {
    topic: TopicMeta;
    picked: boolean;
    onPick: (topic: TopicLyra) => void;
}) {
    const pop = useRef(new Animated.Value(1)).current;
    const acc = topic.accent;

    useEffect(() => {
        if (picked) {
            Animated.sequence([
                Animated.timing(pop, { toValue: 1.18, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
                Animated.timing(pop, { toValue: 1, duration: 240, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
            ]).start();
        }
    }, [picked, pop]);

    return (
        <Pressable
            onPress={() => onPick(topic.key)}
            style={({ pressed }) => [
                styles.tile,
                pressed && styles.tilePressed,
                picked && { borderColor: acc },
            ]}
        >
            {/* Accent halo bleeding from the top of the tile */}
            <LinearGradient
                colors={[`${acc}29`, 'transparent']}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
            />
            <Animated.View
                style={[
                    styles.medallion,
                    {
                        backgroundColor: `${acc}1f`,
                        borderColor: `${acc}52`,
                        transform: [{ scale: pop }],
                    },
                ]}
            >
                <Feather name={topic.icon} size={28} color={acc} />
            </Animated.View>
            <View style={styles.tileText}>
                <Text style={styles.tileName}>{topic.label}</Text>
                <Text style={styles.tileHint}>{topic.hint}</Text>
            </View>
        </Pressable>
    );
}

// ─── Modal ─────────────────────────────────────────────────────────────────────

export function TopicSelectorModal({
    visible,
    onSelect,
    onBack,
}: {
    visible: boolean;
    onSelect: (topic: TopicLyra) => void;
    /** Optional: leave the picker without choosing (back arrow + hardware back). */
    onBack?: () => void;
}) {
    const insets = useSafeAreaInsets();
    const [picked, setPicked] = useState<TopicLyra | null>(null);
    const scrimAnim = useRef(new Animated.Value(0)).current;
    const sheetAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const closingRef = useRef(false);

    useEffect(() => {
        if (visible) {
            setPicked(null);
            closingRef.current = false;
            scrimAnim.setValue(0);
            sheetAnim.setValue(SCREEN_HEIGHT);
            Animated.parallel([
                Animated.timing(scrimAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
                Animated.timing(sheetAnim, {
                    toValue: 0,
                    duration: 600,
                    easing: Easing.bezier(0.5, 0, 0.15, 1),
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible, scrimAnim, sheetAnim]);

    const animateOut = useCallback(
        (done: () => void) => {
            closingRef.current = true;
            Animated.parallel([
                Animated.timing(scrimAnim, { toValue: 0, duration: 320, useNativeDriver: true }),
                Animated.timing(sheetAnim, {
                    toValue: SCREEN_HEIGHT,
                    duration: 380,
                    easing: Easing.in(Easing.cubic),
                    useNativeDriver: true,
                }),
            ]).start(done);
        },
        [scrimAnim, sheetAnim]
    );

    const handlePick = useCallback(
        (topic: TopicLyra) => {
            if (closingRef.current || picked) return;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            setPicked(topic);
            setTimeout(() => animateOut(() => onSelect(topic)), PICK_CLOSE_DELAY);
        },
        [picked, animateOut, onSelect]
    );

    const handleBack = useCallback(() => {
        if (!onBack || closingRef.current) return;
        animateOut(onBack);
    }, [onBack, animateOut]);

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={handleBack}>
            <View style={styles.container}>
                <Animated.View style={[styles.scrim, { opacity: scrimAnim }]} />

                <Animated.View
                    style={[
                        styles.sheet,
                        { paddingBottom: spacing.xxl + insets.bottom, transform: [{ translateY: sheetAnim }] },
                    ]}
                >
                    {/* Sheet background: deep violet gradient + soft gold radiance at the top */}
                    <LinearGradient
                        colors={['rgba(38, 27, 77, 0.98)', 'rgba(24, 16, 48, 0.99)']}
                        style={StyleSheet.absoluteFill}
                    />
                    <LinearGradient
                        colors={[`${colors.primary}1a`, 'transparent']}
                        style={styles.goldRadiance}
                        pointerEvents="none"
                    />
                    {/* Hairline top glow */}
                    <LinearGradient
                        colors={['transparent', `${colors.primary}8c`, 'transparent']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.hairline}
                        pointerEvents="none"
                    />

                    <View style={styles.grabber} />

                    {onBack ? (
                        <Pressable onPress={handleBack} hitSlop={12} style={styles.backBtn}>
                            <Feather name="arrow-left" size={22} color={colors.onSurfaceMuted} />
                        </Pressable>
                    ) : null}

                    <View style={styles.head}>
                        <Rise visible={visible} delay={80}>
                            <View style={styles.kickerRow}>
                                <LinearGradient
                                    colors={['transparent', colors.primary]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.kickerLine}
                                />
                                <Text style={styles.kicker}>Guidance</Text>
                                <LinearGradient
                                    colors={[colors.primary, 'transparent']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.kickerLine}
                                />
                            </View>
                        </Rise>
                        <Rise visible={visible} delay={140}>
                            <Text style={styles.title}>De quoi veux-tu parler ?</Text>
                        </Rise>
                    </View>

                    <View style={styles.grid}>
                        {TOPICS.map((topic, i) => (
                            <Rise key={topic.key} visible={visible} delay={200 + i * 60} style={styles.tileWrap}>
                                <TopicTile topic={topic} picked={picked === topic.key} onPick={handlePick} />
                            </Rise>
                        ))}
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    scrim: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(10, 5, 22, 0.72)',
    },

    sheet: {
        borderTopLeftRadius: radius.xxl,
        borderTopRightRadius: radius.xxl,
        overflow: 'hidden',
        paddingTop: spacing.lg,
        paddingHorizontal: spacing.xl,
    },
    goldRadiance: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 140,
    },
    hairline: {
        position: 'absolute',
        top: 0,
        alignSelf: 'center',
        width: '60%',
        height: 1,
    },
    grabber: {
        width: 42,
        height: 5,
        borderRadius: radius.full,
        backgroundColor: 'rgba(255, 255, 255, 0.18)',
        alignSelf: 'center',
        marginBottom: spacing.lg,
    },
    backBtn: {
        position: 'absolute',
        top: spacing.lg,
        left: spacing.xl,
        padding: spacing.xs,
        zIndex: 2,
    },

    head: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    kickerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    kickerLine: {
        width: 18,
        height: 1,
    },
    kicker: {
        fontFamily: fonts.body.bold,
        fontSize: 11,
        letterSpacing: 2.4,
        textTransform: 'uppercase',
        color: colors.primary,
    },
    title: {
        fontFamily: fonts.display.regular,
        fontSize: 28,
        lineHeight: 34,
        color: colors.onSurface,
        textAlign: 'center',
    },

    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: spacing.md,
    },
    tileWrap: {
        width: '48.4%',
    },
    tile: {
        overflow: 'hidden',
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        paddingTop: spacing.xl,
        paddingBottom: spacing.lg,
        paddingHorizontal: spacing.lg,
        alignItems: 'center',
        gap: spacing.md,
    },
    tilePressed: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        transform: [{ scale: 0.985 }],
    },
    medallion: {
        width: 60,
        height: 60,
        borderRadius: radius.lg,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tileText: {
        alignItems: 'center',
        gap: 2,
    },
    tileName: {
        fontFamily: fonts.body.semiBold,
        fontSize: 15,
        color: colors.onSurface,
        letterSpacing: 0.2,
    },
    tileHint: {
        fontFamily: fonts.body.regular,
        fontSize: 11,
        lineHeight: 14,
        color: colors.onSurfaceMuted,
        textAlign: 'center',
    },
});
