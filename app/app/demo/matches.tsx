import React, { useEffect, useRef } from 'react';
import { View, ScrollView, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { colors, spacing, radius, typography, fonts } from '@/theme';
import { GlassCard, GoldButton, GhostButton, CelestialText } from '@/components/ui';

// ─── Mini ring ─────────────────────────────────────────────────────────────────
function MiniRing({ percentage, id }: { percentage: number; id: string }) {
    const size = 64;
    const sw = 4;
    const r = (size - sw) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (percentage / 100) * circ;
    return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={size} height={size} style={{ position: 'absolute' }}>
                <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colors.surfaceContainerHigh} strokeWidth={sw} />
            </Svg>
            <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
                <Defs>
                    <SvgLinearGradient id={`g-${id}`} x1="0" y1="0" x2="1" y2="0">
                        <Stop offset="0" stopColor={colors.primary} />
                        <Stop offset="1" stopColor={colors.primaryContainer} />
                    </SvgLinearGradient>
                </Defs>
                <Circle
                    cx={size / 2} cy={size / 2} r={r}
                    fill="none"
                    stroke={`url(#g-${id})`}
                    strokeWidth={sw}
                    strokeLinecap="round"
                    strokeDasharray={circ}
                    strokeDashoffset={offset}
                />
            </Svg>
            <Text style={styles.ringPct}>{percentage}%</Text>
        </View>
    );
}

// ─── MetricCard ────────────────────────────────────────────────────────────────
function MetricCard({ label, title, percentage }: { label: string; title: string; percentage: number }) {
    return (
        <GlassCard opacity="low" radius="md" style={styles.metricCard}>
            <View style={styles.metricRow}>
                <View style={styles.metricLeft}>
                    <Text style={styles.metricLabel}>{label}</Text>
                    <Text style={styles.metricTitle}>{title}</Text>
                </View>
                <MiniRing percentage={percentage} id={label} />
            </View>
        </GlassCard>
    );
}

// ─── CelestialInsightsCard ─────────────────────────────────────────────────────
function CelestialInsightsCard() {
    return (
        <GlassCard opacity="low" radius="xl">
            <View style={styles.insightHeader}>
                <View style={styles.insightIconWrap}>
                    <Feather name="star" size={16} color={colors.primary} />
                </View>
                <Text style={styles.insightLabel}>CELESTIAL INSIGHTS</Text>
            </View>
            <Text style={styles.insightText}>
                The stars suggest a profound alignment between your Lunar placements. While your communication styles may require conscious effort during Mercury retrogrades, the underlying emotional tether is exceptionally resilient. This match thrives on shared creative ventures and quiet, domestic intimacy.
            </Text>
            <View style={styles.signsRow}>
                <View style={styles.avatarStack}>
                    <View style={[styles.signAvatar, styles.signAvatarA]}>
                        <Text style={styles.signAvatarText}>L</Text>
                    </View>
                    <View style={[styles.signAvatar, styles.signAvatarB]}>
                        <Text style={styles.signAvatarText}>T</Text>
                    </View>
                </View>
                <View>
                    <Text style={styles.signNames}>LEO + TAURUS</Text>
                    <Text style={styles.signSub}>ALIGNMENT</Text>
                </View>
            </View>
        </GlassCard>
    );
}

// ─── Screen ────────────────────────────────────────────────────────────────────
const metrics = [
    { label: 'Emotional', title: 'Deep Resonance', percentage: 80 },
    { label: 'Communication', title: 'Fluid Exchange', percentage: 65 },
    { label: 'Attraction', title: 'Magnetic Pull', percentage: 90 },
    { label: 'Long-term', title: 'Stable Orbit', percentage: 72 },
];

export default function DemoMatches() {
    const router = useRouter();
    return (
        <View style={styles.screen}>
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Pressable onPress={() => router.back()} hitSlop={12}>
                            <Feather name="arrow-left" size={18} color={colors.onSurfaceMuted} />
                        </Pressable>
                        <Text style={styles.headerTitle}>Compatibility</Text>
                        <View style={{ width: 18 }} />
                    </View>

                    {/* Hero */}
                    <View style={styles.hero}>
                        <Text style={styles.heroPct}>78%</Text>
                        <Text style={styles.heroSub}>Strong emotional connection</Text>
                        <Text style={styles.heroCaption}>COSMIC COMPATIBILITY RESULT</Text>
                    </View>

                    {/* Metrics */}
                    <View style={styles.sectionPad}>
                        {metrics.map((m) => (
                            <View key={m.label} style={styles.metricGap}>
                                <MetricCard {...m} />
                            </View>
                        ))}
                    </View>

                    {/* Celestial Insights */}
                    <View style={[styles.sectionPad, { marginTop: spacing.xxl }]}>
                        <CelestialInsightsCard />
                    </View>

                    {/* Actions */}
                    <View style={[styles.sectionPad, styles.actionsSection]}>
                        <GoldButton label="SAVE THIS MATCH" onPress={() => {}} rightIcon />
                        <View style={{ height: spacing.md }} />
                        <GhostButton label="SHARE RESULT" onPress={() => {}} />
                    </View>

                    <View style={{ height: 100 }} />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.surfaceLowest },
    safeArea: { flex: 1 },
    content: { flexGrow: 1 },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
    },
    headerTitle: {
        fontFamily: fonts.display.regular,
        fontSize: 18,
        color: colors.onSurface,
    },

    hero: {
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.lg,
        paddingBottom: spacing.xxxl,
    },
    heroPct: {
        fontFamily: fonts.display.medium,
        fontSize: 72,
        lineHeight: 80,
        color: colors.primary,
        letterSpacing: -2,
    },
    heroSub: {
        fontFamily: fonts.display.regular,
        fontSize: 24,
        color: colors.onSurface,
        fontStyle: 'italic',
        marginTop: spacing.sm,
    },
    heroCaption: {
        fontFamily: fonts.body.semiBold,
        fontSize: 10,
        letterSpacing: 2,
        color: colors.onSurfaceMuted,
        textTransform: 'uppercase',
        marginTop: spacing.sm,
    },

    sectionPad: { paddingHorizontal: spacing.xl },
    metricGap: { marginBottom: spacing.md },
    metricCard: { marginBottom: 0 },
    metricRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    metricLeft: { flex: 1, gap: spacing.xs },
    metricLabel: {
        fontFamily: fonts.body.semiBold,
        fontSize: 10,
        letterSpacing: 1.5,
        color: colors.onSurfaceMuted,
        textTransform: 'uppercase',
    },
    metricTitle: {
        fontFamily: fonts.display.regular,
        fontSize: 20,
        color: colors.onSurface,
    },
    ringPct: {
        fontFamily: fonts.body.medium,
        fontSize: 13,
        color: colors.onSurface,
        position: 'absolute',
    },

    insightHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    insightIconWrap: {
        width: 32,
        height: 32,
        borderRadius: radius.md,
        backgroundColor: `${colors.secondaryContainer}4D`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    insightLabel: {
        fontFamily: fonts.body.semiBold,
        fontSize: 10,
        letterSpacing: 2,
        color: colors.onSurfaceMuted,
        textTransform: 'uppercase',
    },
    insightText: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        lineHeight: 22,
        color: `${colors.onSurface}E6`,
        marginBottom: spacing.xl,
    },
    signsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    avatarStack: { flexDirection: 'row' },
    signAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: `${colors.surfaceContainerHigh}`,
    },
    signAvatarA: { backgroundColor: colors.surfaceContainerHighest, zIndex: 1 },
    signAvatarB: { backgroundColor: colors.surfaceBright, marginLeft: -10 },
    signAvatarText: {
        fontFamily: fonts.body.semiBold,
        fontSize: 12,
        color: colors.onSurface,
    },
    signNames: {
        fontFamily: fonts.body.semiBold,
        fontSize: 11,
        letterSpacing: 1.5,
        color: colors.primary,
        textTransform: 'uppercase',
    },
    signSub: {
        fontFamily: fonts.body.regular,
        fontSize: 10,
        letterSpacing: 1,
        color: colors.onSurfaceMuted,
        textTransform: 'uppercase',
    },

    actionsSection: { marginTop: spacing.xxl },
});