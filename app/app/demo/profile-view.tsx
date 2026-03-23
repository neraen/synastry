import React from 'react';
import { View, ScrollView, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radius, fonts } from '@/theme';
import { GlassCard, GoldButton, CelestialText } from '@/components/ui';

// ─── ProfileHeader ─────────────────────────────────────────────────────────────
function ProfileHeader() {
    return (
        <View style={styles.profileHeader}>
            {/* Avatar */}
            <View style={styles.avatarWrap}>
                <LinearGradient
                    colors={[colors.primary, colors.primaryContainer]}
                    style={styles.avatarRing}
                >
                    <View style={styles.avatarInner}>
                        <Text style={styles.avatarInitial}>E</Text>
                    </View>
                </LinearGradient>
                {/* Online dot */}
                <View style={styles.onlineDot} />
            </View>
            {/* Name */}
            <Text style={styles.profileName}>Elena Vance</Text>
            {/* Signs */}
            <View style={styles.signsRow}>
                <Text style={styles.signText}>Scorpio Sun</Text>
                <Text style={styles.signSep}>·</Text>
                <Text style={styles.signText}>Pisces Moon</Text>
            </View>
            <Text style={styles.risingText}>Leo Rising</Text>
            {/* Bio */}
            <Text style={styles.bioText}>
                Seeker of cosmic connections and deep conversations. Navigating the stars to find a resonant soul.
            </Text>
        </View>
    );
}

// ─── SubscriptionCard ──────────────────────────────────────────────────────────
function SubscriptionCard() {
    return (
        <GlassCard opacity="low" radius="xl">
            <Text style={styles.planLabel}>CURRENT PLAN</Text>
            <Text style={styles.planName}>Celestial Premium</Text>
            <Text style={styles.planDesc}>
                Unlimited natal chart comparisons and priority matching active until Dec 2024.
            </Text>
            <View style={{ marginTop: spacing.lg, alignSelf: 'flex-start' }}>
                <GoldButton label="Manage Subscription" onPress={() => {}} size="sm" />
            </View>
        </GlassCard>
    );
}

// ─── CompatibilityStats ────────────────────────────────────────────────────────
function CompatibilityStats() {
    return (
        <View style={styles.statsContainer}>
            <View style={styles.statsIcon}>
                <Feather name="activity" size={22} color={colors.onSurface} />
            </View>
            <Text style={styles.statsPct}>84%</Text>
            <Text style={styles.statsLabel}>AVG COMPATIBILITY</Text>
            <View style={styles.statsDivider} />
        </View>
    );
}

// ─── SavedConstellations ───────────────────────────────────────────────────────
const savedProfiles = [
    { name: 'Julian', age: 29, pct: 92, color: colors.surfaceContainerHighest },
    { name: 'Amara', age: 27, pct: 88, color: colors.surfaceBright },
    { name: 'Soren', age: 31, pct: 76, color: colors.surfaceVariant },
    { name: 'Mia', age: 26, pct: 95, color: colors.surfaceContainerHigh },
];

function SavedConstellations() {
    return (
        <View style={styles.savedSection}>
            <View style={styles.savedHeader}>
                <View>
                    <Text style={styles.savedTitle}>Saved{'\n'}Constellations</Text>
                    <Text style={styles.savedSub}>Profile matches you've bookmarked for alignment.</Text>
                </View>
                <Pressable style={styles.viewAllBtn}>
                    <Text style={styles.viewAllText}>View{'\n'}All</Text>
                    <Feather name="arrow-right" size={16} color={colors.primary} />
                </Pressable>
            </View>
            <View style={styles.profileGrid}>
                {savedProfiles.map((p) => (
                    <View key={p.name} style={[styles.profileCard, { backgroundColor: p.color }]}>
                        {/* Gradient overlay */}
                        <LinearGradient
                            colors={['transparent', `${colors.surfaceLowest}E6`]}
                            style={StyleSheet.absoluteFill}
                        />
                        {/* Match badge */}
                        <View style={styles.matchBadge}>
                            <Feather name="heart" size={10} color={colors.primary} />
                            <Text style={styles.matchPct}>{p.pct}% Match</Text>
                        </View>
                        {/* Name */}
                        <View style={styles.profileCardName}>
                            <Text style={styles.profileNameText}>{p.name}, {p.age}</Text>
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
}

// ─── PreferencesSection ────────────────────────────────────────────────────────
const prefItems = [
    { id: 'criteria', icon: 'settings' as const, title: 'Matching Criteria', desc: 'Sun sign filters, distance, and age', danger: false },
    { id: 'alerts', icon: 'bell' as const, title: 'Celestial Alerts', desc: 'New matches and transit notifications', danger: false },
    { id: 'privacy', icon: 'shield' as const, title: 'Privacy & Sanctuary', desc: 'Visibility and data protection', danger: false },
    { id: 'logout', icon: 'log-out' as const, title: 'Sign Out', danger: true },
];

function PreferencesSection() {
    return (
        <View style={styles.prefSection}>
            <Text style={styles.prefLabel}>PREFERENCES & ALIGNMENT</Text>
            {prefItems.map((item) => (
                <Pressable key={item.id} style={styles.prefItem}>
                    <View style={[styles.prefIcon, item.danger && styles.prefIconDanger]}>
                        <Feather
                            name={item.icon}
                            size={18}
                            color={item.danger ? colors.error : colors.primary}
                        />
                    </View>
                    <View style={styles.prefText}>
                        <Text style={[styles.prefTitle, item.danger && styles.prefTitleDanger]}>
                            {item.title}
                        </Text>
                        {item.desc && <Text style={styles.prefDesc}>{item.desc}</Text>}
                    </View>
                    {!item.danger && (
                        <Feather name="chevron-right" size={18} color={colors.onSurfaceMuted} />
                    )}
                </Pressable>
            ))}
        </View>
    );
}

// ─── Screen ────────────────────────────────────────────────────────────────────
export default function DemoProfileView() {
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
                        <Text style={styles.headerTitle}>Profile</Text>
                        <View style={{ width: 18 }} />
                    </View>

                    <ProfileHeader />

                    <View style={styles.sectionPad}>
                        <SubscriptionCard />
                    </View>

                    <CompatibilityStats />

                    <SavedConstellations />

                    <PreferencesSection />

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

    // ProfileHeader
    profileHeader: {
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.xl,
    },
    avatarWrap: { position: 'relative', marginBottom: spacing.xl },
    avatarRing: {
        width: 116,
        height: 116,
        borderRadius: 58,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 2,
    },
    avatarInner: {
        width: 112,
        height: 112,
        borderRadius: 56,
        backgroundColor: colors.surfaceContainerHigh,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarInitial: {
        fontFamily: fonts.display.bold,
        fontSize: 40,
        color: colors.onSurface,
    },
    onlineDot: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: colors.primary,
        borderWidth: 2,
        borderColor: colors.surfaceLowest,
    },
    profileName: {
        fontFamily: fonts.display.bold,
        fontSize: 30,
        color: colors.onSurface,
        letterSpacing: 0.3,
        marginBottom: spacing.md,
    },
    signsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
    signText: { fontFamily: fonts.body.medium, fontSize: 14, color: colors.primary },
    signSep: { color: colors.onSurfaceMuted, fontSize: 14 },
    risingText: { fontFamily: fonts.body.regular, fontSize: 14, color: colors.onSurface, marginBottom: spacing.lg },
    bioText: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        lineHeight: 22,
        color: colors.onSurfaceMuted,
        textAlign: 'center',
        maxWidth: 280,
    },

    // Section
    sectionPad: { paddingHorizontal: spacing.xl },

    // Plan
    planLabel: {
        fontFamily: fonts.body.semiBold,
        fontSize: 10,
        letterSpacing: 1.5,
        color: colors.onSurfaceMuted,
        textTransform: 'uppercase',
        marginBottom: spacing.sm,
    },
    planName: {
        fontFamily: fonts.display.regular,
        fontSize: 20,
        color: colors.onSurface,
        marginBottom: spacing.sm,
    },
    planDesc: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        lineHeight: 20,
        color: colors.onSurfaceMuted,
    },

    // Stats
    statsContainer: {
        alignItems: 'center',
        paddingVertical: spacing.xxxl,
        paddingHorizontal: spacing.xl,
    },
    statsIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: `${colors.secondaryContainer}CC`,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    statsPct: {
        fontFamily: fonts.body.medium,
        fontSize: 36,
        color: colors.onSurface,
        marginBottom: spacing.xs,
    },
    statsLabel: {
        fontFamily: fonts.body.semiBold,
        fontSize: 11,
        letterSpacing: 1.5,
        color: colors.onSurfaceMuted,
        textTransform: 'uppercase',
    },
    statsDivider: {
        width: '100%',
        height: 1,
        backgroundColor: `${colors.outline}33`,
        marginTop: spacing.xxxl,
    },

    // Saved
    savedSection: { paddingHorizontal: spacing.xl, paddingVertical: spacing.xl },
    savedHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: spacing.xl,
    },
    savedTitle: {
        fontFamily: fonts.display.regular,
        fontSize: 24,
        color: colors.onSurface,
        lineHeight: 30,
    },
    savedSub: {
        fontFamily: fonts.body.regular,
        fontSize: 13,
        color: colors.onSurfaceMuted,
        marginTop: spacing.xs,
    },
    viewAllBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    viewAllText: {
        fontFamily: fonts.body.semiBold,
        fontSize: 12,
        color: colors.primary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        textAlign: 'right',
    },
    profileGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.lg,
    },
    profileCard: {
        width: '46%',
        aspectRatio: 4 / 5,
        borderRadius: radius.xl,
        overflow: 'hidden',
        justifyContent: 'space-between',
    },
    matchBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        alignSelf: 'flex-start',
        margin: spacing.md,
        backgroundColor: `${colors.surfaceLowest}99`,
        borderRadius: radius.full,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
    },
    matchPct: {
        fontFamily: fonts.body.medium,
        fontSize: 11,
        color: colors.primary,
    },
    profileCardName: {
        padding: spacing.md,
    },
    profileNameText: {
        fontFamily: fonts.body.medium,
        fontSize: 14,
        color: colors.onSurface,
    },

    // Preferences
    prefSection: {
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.xl,
    },
    prefLabel: {
        fontFamily: fonts.body.semiBold,
        fontSize: 10,
        letterSpacing: 1.5,
        color: colors.onSurfaceMuted,
        textTransform: 'uppercase',
        marginBottom: spacing.lg,
        paddingHorizontal: spacing.sm,
    },
    prefItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.lg,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.md,
        borderRadius: radius.md,
    },
    prefIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: `${colors.surfaceContainerHigh}99`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    prefIconDanger: {
        backgroundColor: `${colors.error}1A`,
    },
    prefText: { flex: 1 },
    prefTitle: {
        fontFamily: fonts.body.medium,
        fontSize: 15,
        color: colors.onSurface,
    },
    prefTitleDanger: { color: colors.error },
    prefDesc: {
        fontFamily: fonts.body.regular,
        fontSize: 13,
        color: colors.onSurfaceMuted,
        marginTop: 2,
    },
});