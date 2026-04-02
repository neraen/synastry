import React, { useState, useEffect } from 'react';
import { View, ScrollView, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { GlassCard, GoldButton, CosmicProgressRing, TabHeader } from '@/components/ui';
import { colors, spacing, radius, fonts } from '@/theme';
import { getUpcomingTransits, getCosmicHeadline } from '@/services/astrology';

// ─── CompatibilityCard ─────────────────────────────────────────────────────────
function CompatibilityCard({ onAnalyze }: { onAnalyze: () => void }) {
    const { t } = useTranslation();
    return (
        <GlassCard opacity="medium" radius="xxl" ambient>
            <View style={styles.badge}>
                <View style={styles.badgeDot} />
                <Text style={styles.badgeText}>{t('home.heroBadge')}</Text>
            </View>
            <Text style={styles.cardTitle}>{t('home.compatibilityCardTitle')}</Text>
            <Text style={styles.cardDesc}>
                {t('home.compatibilityCardDesc')}
            </Text>
            <View style={styles.cardBtnSpacing}>
                <GoldButton label={t('home.analyzeNewMatch')} onPress={onAnalyze} rightIcon />
            </View>
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
    onPress?: () => void;
}

function InsightCard({ iconName, title, description, symbols, highlightText, onPress }: InsightCardProps) {
    return (
        <GlassCard opacity="low" radius="xl">
            <View style={styles.insightTopRow}>
                <View style={styles.insightIconBubble}>
                    <Feather name={iconName} size={20} color={colors.secondary} />
                </View>
                <Pressable onPress={onPress} hitSlop={8}>
                    <Feather name="arrow-up-right" size={20} color={colors.onSurfaceMuted} />
                </Pressable>
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
interface Transit {
    date: string;
    title: string;
    desc: string;
    highlighted: boolean;
}

function TransitTimeline({ onViewAll }: { onViewAll: () => void }) {
    const { t } = useTranslation();
    const [transits, setTransits] = useState<Transit[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getUpcomingTransits()
            .then((res) => {
                if (res.success && res.transits) {
                    setTransits(
                        res.transits.slice(0, 2).map((t, i) => ({
                            date: t.date,
                            title: t.title,
                            desc: t.description,
                            highlighted: i === 0,
                        }))
                    );
                }
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    return (
        <View style={styles.transitsSection}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t('home.upcomingTransits')}</Text>
                <Pressable onPress={onViewAll} hitSlop={8}>
                    <Text style={styles.sectionAction}>{t('home.viewAllTransits')}</Text>
                </Pressable>
            </View>
            {loading ? (
                <View style={{ gap: spacing.xxl }}>
                    {[0, 1].map((i) => (
                        <View key={i} style={{ flexDirection: 'row', paddingLeft: spacing.xl }}>
                            <View style={{ width: 10, height: 80, backgroundColor: colors.surfaceContainerHigh, borderRadius: 5, opacity: 0.4, flex: 1 }} />
                        </View>
                    ))}
                </View>
            ) : (
                <View style={styles.timeline}>
                    <View style={styles.timelineLine} />
                    {transits.map((t, i) => (
                        <View key={i} style={styles.transitItem}>
                            <View style={[styles.transitDot, t.highlighted && styles.transitDotActive]} />
                            <View style={styles.transitContent}>
                                <Text style={styles.transitDate}>{t.date}</Text>
                                <Text style={styles.transitTitle}>{t.title}</Text>
                                <Text style={styles.transitDesc}>{t.desc}</Text>
                            </View>
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
}

// ─── Screen ────────────────────────────────────────────────────────────────────
export default function Home() {
    const router = useRouter();
    const { user } = useAuth();
    const { t } = useTranslation();
    const [heroTitle, setHeroTitle] = useState<string | null>(null);
    const [heroSubtitle, setHeroSubtitle] = useState<string | null>(null);

    useEffect(() => {
        getCosmicHeadline()
            .then((res) => {
                if (res.success && res.headline) {
                    setHeroTitle(res.headline.title);
                    setHeroSubtitle(res.headline.subtitle);
                }
            })
            .catch(() => {});
    }, []);

    return (
        <View style={styles.screen}>
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <TabHeader />

                    {/* Hero */}
                    <View style={styles.hero}>
                        <Text style={styles.heroTitle}>{heroTitle ?? t('home.heroTitle')}</Text>
                        <Text style={styles.heroSubtitle}>{heroSubtitle ?? t('home.heroSubtitle')}</Text>
                    </View>



                    {/* Insight cards */}
                    <View style={styles.insightSection}>
                        <InsightCard
                            iconName="star"
                            title={t('home.birthChartTitle')}
                            description={t('home.birthChartDesc')}
                            symbols={['☀', '☽', '↑']}
                            onPress={() => router.push('/(tabs)/horoscope')}
                        />
                        <View style={{ height: spacing.lg }} />
                        <InsightCard
                            iconName="zap"
                            title={t('home.dailyInsightsTitle')}
                            description={t('home.dailyInsightsDesc')}
                            highlightText={t('home.dailyInsightsQuote')}
                            onPress={() => router.push('/daily-horoscope')}
                        />
                    </View>

                    <TransitTimeline onViewAll={() => router.push('/(tabs)/transits')} />

                    <View style={{ height: 100 }} />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.surfaceLowest },
    safeArea: { flex: 1 },
    scroll: { flex: 1 },
    scrollContent: { flexGrow: 1 },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    logoIcon: {
        fontSize: 14,
        color: colors.primary,
        lineHeight: 18,
    },
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

    sectionPad: { paddingHorizontal: spacing.xl },
    insightSection: {
        paddingHorizontal: spacing.xl,
        marginTop: spacing.xxxl,
    },

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
    badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
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
    symbolsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
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