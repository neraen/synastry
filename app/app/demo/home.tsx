import React from 'react';
import { View, ScrollView, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, radius, typography, fonts } from '@/theme';
import { GlassCard, GoldButton, GhostButton, CelestialText, CosmicProgressRing } from '@/components/ui';

// ─── Header ────────────────────────────────────────────────────────────────────
function DemoHeader() {
    const router = useRouter();
    return (
        <View style={styles.header}>
            <View style={styles.headerLeft}>
                <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
                    <Feather name="arrow-left" size={18} color={colors.onSurfaceMuted} />
                </Pressable>
                <Feather name="star" size={16} color={colors.primary} />
                <Text style={styles.logoText}>AstroMatch</Text>
            </View>
            <View style={styles.userRow}>
                <Text style={styles.hiText}>Hi, Selena</Text>
                <View style={styles.avatarBubble}>
                    <Text style={styles.avatarLetter}>S</Text>
                </View>
            </View>
        </View>
    );
}

// ─── CompatibilityCard ─────────────────────────────────────────────────────────
function CompatibilityCard() {
    const router = useRouter();
    return (
        <GlassCard opacity="medium" radius="xxl">
            {/* Badge */}
            <View style={styles.badge}>
                <View style={styles.badgeDot} />
                <Text style={styles.badgeText}>DAILY ALIGNMENT</Text>
            </View>
            {/* Title */}
            <Text style={styles.cardTitle}>Your compatibility{'\n'}today</Text>
            {/* Description */}
            <Text style={styles.cardDesc}>
                Celestial energy is 88% synchronized for new romantic ventures. The moon's position in Taurus stabilizes your emotional core.
            </Text>
            {/* CTA */}
            <View style={styles.cardBtnSpacing}>
                <GoldButton label="ANALYZE A NEW MATCH" onPress={() => {}} rightIcon />
            </View>
            {/* Progress ring */}
            <View style={styles.ringContainer}>
                <CosmicProgressRing percentage={88} size={160} />
            </View>
        </GlassCard>
    );
}

// ─── InsightCard ───────────────────────────────────────────────────────────────
interface InsightCardProps {
    iconName: keyof typeof Feather.glyphMap;
    title: string;
    description: string;
    symbols?: string[];
    highlightText?: string;
}
function InsightCard({ iconName, title, description, symbols, highlightText }: InsightCardProps) {
    return (
        <GlassCard opacity="low" radius="xl">
            <View style={styles.insightTopRow}>
                <View style={styles.insightIconBubble}>
                    <Feather name={iconName} size={20} color={colors.secondary} />
                </View>
                <Feather name="arrow-up-right" size={18} color={colors.onSurfaceMuted} />
            </View>
            <Text style={styles.insightTitle}>{title}</Text>
            <Text style={styles.insightDesc}>{description}</Text>
            {symbols && (
                <View style={styles.symbolsRow}>
                    {symbols.map((s, i) => (
                        <View key={i} style={styles.symbolBubble}>
                            <Text style={styles.symbolText}>{s}</Text>
                        </View>
                    ))}
                </View>
            )}
            {highlightText && (
                <View style={styles.quoteBox}>
                    <Text style={styles.quoteText}>"{highlightText}"</Text>
                </View>
            )}
        </GlassCard>
    );
}

// ─── TransitTimeline ───────────────────────────────────────────────────────────
const transits = [
    {
        id: '1',
        date: 'OCT 12 — OCT 15',
        title: 'Mars Opposite Saturn',
        desc: 'Expect some friction in professional partnerships. Patience is your greatest cosmic ally during this transit.',
        highlighted: true,
    },
    {
        id: '2',
        date: 'OCT 18',
        title: 'New Moon in Libra',
        desc: 'A perfect window for setting intentions around balance and aesthetic harmony in your home.',
        highlighted: false,
    },
];

function TransitTimeline() {
    return (
        <View style={styles.transitsSection}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Upcoming Transits</Text>
                <Text style={styles.sectionAction}>VIEW CALENDAR</Text>
            </View>
            <View style={styles.timeline}>
                {/* Vertical line */}
                <View style={styles.timelineLine} />
                {transits.map((t) => (
                    <View key={t.id} style={styles.transitItem}>
                        <View style={[styles.transitDot, t.highlighted && styles.transitDotActive]} />
                        <View style={styles.transitContent}>
                            <Text style={styles.transitDate}>{t.date}</Text>
                            <Text style={styles.transitTitle}>{t.title}</Text>
                            <Text style={styles.transitDesc}>{t.desc}</Text>
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
}

// ─── Screen ────────────────────────────────────────────────────────────────────
export default function DemoHome() {
    return (
        <View style={styles.screen}>
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <DemoHeader />

                    {/* Hero */}
                    <View style={styles.hero}>
                        <Text style={styles.heroTitle}>Venus in{'\n'}Retrograde</Text>
                        <Text style={styles.heroSubtitle}>The stars favor deep connections today.</Text>
                    </View>

                    {/* Compatibility card */}
                    <View style={styles.sectionPad}>
                        <CompatibilityCard />
                    </View>

                    {/* Insight cards */}
                    <View style={styles.insightSection}>
                        <InsightCard
                            iconName="star"
                            title="Your birth chart"
                            description="Deep dive into your sun, moon, and rising signs to unlock your cosmic DNA."
                            symbols={['☀', '☽', '↑']}
                        />
                        <View style={{ height: spacing.lg }} />
                        <InsightCard
                            iconName="zap"
                            title="Daily insights"
                            description="Personalized horoscopes based on your current transits and house placements."
                            highlightText="Communication will be key as Mercury enters your 5th house."
                        />
                    </View>

                    <TransitTimeline />

                    <View style={{ height: 100 }} />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.surfaceLowest,
    },
    safeArea: { flex: 1 },
    scroll: { flex: 1 },
    scrollContent: { flexGrow: 1 },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    backBtn: { marginRight: spacing.xs },
    logoText: {
        fontFamily: fonts.display.regular,
        fontSize: 18,
        color: colors.onSurface,
        letterSpacing: 0.5,
    },
    userRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    hiText: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        color: colors.onSurfaceMuted,
    },
    avatarBubble: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.surfaceContainerHigh,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarLetter: {
        fontFamily: fonts.body.semiBold,
        fontSize: 14,
        color: colors.onSurface,
    },

    // Hero
    hero: {
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.xl,
        marginBottom: spacing.xxxl,
    },
    heroTitle: {
        fontFamily: fonts.display.bold,
        fontSize: 45,
        lineHeight: 52,
        color: colors.onSurface,
        letterSpacing: -0.5,
    },
    heroSubtitle: {
        fontFamily: fonts.body.regular,
        fontSize: 16,
        color: colors.onSurfaceMuted,
        marginTop: spacing.md,
        lineHeight: 24,
    },

    // Section
    sectionPad: { paddingHorizontal: spacing.xl },
    insightSection: {
        paddingHorizontal: spacing.xl,
        marginTop: spacing.xxxl,
    },

    // Badge
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: spacing.sm,
        backgroundColor: colors.surfaceContainerHigh,
        borderRadius: radius.full,
        paddingHorizontal: spacing.md,
        paddingVertical: 6,
        marginBottom: spacing.xl,
    },
    badgeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.primary,
    },
    badgeText: {
        fontFamily: fonts.body.semiBold,
        fontSize: 10,
        letterSpacing: 1.5,
        color: colors.onSurfaceMuted,
        textTransform: 'uppercase',
    },
    cardTitle: {
        fontFamily: fonts.display.regular,
        fontSize: 24,
        lineHeight: 32,
        color: colors.onSurface,
        letterSpacing: 0.3,
        marginBottom: spacing.md,
    },
    cardDesc: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        lineHeight: 20,
        color: colors.onSurfaceMuted,
        marginBottom: spacing.lg,
    },
    cardBtnSpacing: { marginBottom: spacing.xl },
    ringContainer: { alignItems: 'center' },

    // InsightCard
    insightTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.xl,
    },
    insightIconBubble: {
        width: 48,
        height: 48,
        borderRadius: radius.xl,
        backgroundColor: `${colors.secondaryContainer}4D`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    insightTitle: {
        fontFamily: fonts.display.regular,
        fontSize: 18,
        color: colors.onSurface,
        letterSpacing: 0.3,
        marginBottom: spacing.sm,
    },
    insightDesc: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        lineHeight: 20,
        color: colors.onSurfaceMuted,
    },
    symbolsRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginTop: spacing.lg,
    },
    symbolBubble: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: `${colors.surfaceContainerHigh}99`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    symbolText: { fontSize: 14, color: colors.primary },
    quoteBox: {
        marginTop: spacing.lg,
        backgroundColor: `${colors.secondaryContainer}33`,
        borderRadius: radius.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    quoteText: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        fontStyle: 'italic',
        color: colors.secondary,
        lineHeight: 20,
    },

    // Transits
    transitsSection: {
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.xxxl,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    sectionTitle: {
        fontFamily: fonts.display.regular,
        fontSize: 20,
        color: colors.onSurface,
        letterSpacing: 0.3,
    },
    sectionAction: {
        fontFamily: fonts.body.semiBold,
        fontSize: 11,
        letterSpacing: 1,
        color: colors.primary,
        textTransform: 'uppercase',
    },
    timeline: { position: 'relative', gap: spacing.xxl },
    timelineLine: {
        position: 'absolute',
        left: 4,
        top: 8,
        bottom: 8,
        width: 1,
        backgroundColor: colors.outline,
        opacity: 0.3,
    },
    transitItem: {
        flexDirection: 'row',
        paddingLeft: spacing.xl,
        position: 'relative',
    },
    transitDot: {
        position: 'absolute',
        left: 0,
        top: 6,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.outline,
    },
    transitDotActive: {
        backgroundColor: colors.primary,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 6,
        elevation: 4,
    },
    transitContent: { flex: 1 },
    transitDate: {
        fontFamily: fonts.body.semiBold,
        fontSize: 10,
        letterSpacing: 1.5,
        color: colors.onSurfaceMuted,
        textTransform: 'uppercase',
        marginBottom: spacing.sm,
    },
    transitTitle: {
        fontFamily: fonts.display.regular,
        fontSize: 16,
        color: colors.onSurface,
        marginBottom: spacing.xs,
    },
    transitDesc: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        lineHeight: 20,
        color: colors.onSurfaceMuted,
    },
});