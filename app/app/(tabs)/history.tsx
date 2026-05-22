import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    StyleSheet,
    RefreshControl,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { GlassCard, GoldButton, GhostButton, TabHeader, PremiumLockedButton } from '@/components/ui';
import {
    getSynastryHistory,
    deleteSynastryHistoryEntry,
    SynastryHistorySummary,
} from '@/services/astrology';
import { colors, spacing, radius, fonts } from '@/theme';

// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

function scoreLabel(score: number, t: (key: string) => string): string {
    if (score >= 85) return t('history.scoreLabels.soulmates');
    if (score >= 70) return t('history.scoreLabels.veryCompatible');
    if (score >= 55) return t('history.scoreLabels.compatible');
    if (score >= 40) return t('history.scoreLabels.complex');
    return t('history.scoreLabels.challenging');
}

// ─── History Card ──────────────────────────────────────────────────────────────
function HistoryCard({
    item,
    userName,
    onPress,
    onDelete,
}: {
    item: SynastryHistorySummary;
    userName: string;
    onPress: () => void;
    onDelete: () => void;
}) {
    const { t } = useTranslation();
    const score = item.compatibilityScore;

    return (
        <GlassCard opacity="low" radius="xl">
            <View style={styles.cardRow}>
                {/* Left: names + date + label */}
                <View style={styles.cardInfo}>
                    <Text style={styles.cardNames} numberOfLines={1}>
                        {userName} & {item.partnerName}
                    </Text>
                    <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
                    {score !== null && (
                        <Text style={styles.cardLabel}>{scoreLabel(score, t)}</Text>
                    )}
                </View>

                {/* Right: score */}
                {score !== null && (
                    <View style={styles.scoreBlock}>
                        <Text style={styles.scoreValue}>{Math.round(score)}</Text>
                        <Text style={styles.scorePercent}>%</Text>
                    </View>
                )}
            </View>

            {/* Footer: VIEW DETAILS + delete */}
            <View style={styles.cardFooter}>
                <Pressable style={styles.detailsBtn} onPress={onPress} hitSlop={8}>
                    <Text style={styles.detailsBtnText}>{t('common.viewDetails')}</Text>
                    <Feather name="arrow-up-right" size={12} color={colors.primary} />
                </Pressable>

                <Pressable onPress={onDelete} hitSlop={12} style={styles.deleteBtn}>
                    <Feather name="trash-2" size={14} color={colors.onSurfaceMuted} />
                </Pressable>
            </View>
        </GlassCard>
    );
}

// ─── Screen ────────────────────────────────────────────────────────────────────
export default function HistoryTab() {
    const router = useRouter();
    const { t } = useTranslation();
    const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
    const userName = user?.firstName || 'Vous';

    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string>();
    const [histories, setHistories] = useState<SynastryHistorySummary[]>([]);
    const [isLimited, setIsLimited] = useState(false);
    const [totalCount, setTotalCount] = useState(0);

    const loadHistory = useCallback(async (showRefresh = false) => {
        if (showRefresh) setIsRefreshing(true);
        setError(undefined);
        try {
            const response = await getSynastryHistory();
            if (response.success && response.histories) {
                setHistories(response.histories);
                setIsLimited(response.is_limited ?? false);
                setTotalCount(response.total_count ?? response.histories.length);
            } else {
                setError(response.error || t('history.loadError'));
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : t('history.unknownError'));
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [t]);

    useEffect(() => {
        if (isAuthenticated) loadHistory();
        else setIsLoading(false);
    }, [isAuthenticated, loadHistory]);

    const handleDelete = useCallback((item: SynastryHistorySummary) => {
        Alert.alert(
            t('history.deleteTitle'),
            t('history.deleteMessage', { name: item.partnerName }),
            [
                { text: t('history.deleteCancelBtn'), style: 'cancel' },
                {
                    text: t('history.deleteConfirmBtn'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const response = await deleteSynastryHistoryEntry(item.id);
                            if (response.success) {
                                setHistories(prev => prev.filter(h => h.id !== item.id));
                            }
                        } catch {
                            Alert.alert(t('common.error'), t('history.deleteError'));
                        }
                    },
                },
            ]
        );
    }, [t]);

    // ── Loading ──
    if (isAuthLoading || isLoading) {
        return (
            <View style={styles.screen}>
                <SafeAreaView style={styles.safeArea}>
                    <TabHeader />
                    <View style={styles.centered}>
                        <ActivityIndicator color={colors.primary} size="large" />
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    // ── Not authenticated ──
    if (!isAuthenticated) {
        return (
            <View style={styles.screen}>
                <SafeAreaView style={styles.safeArea}>
                    <TabHeader />
                    <View style={styles.centered}>
                        <Text style={styles.emptyEmoji}>🔒</Text>
                        <Text style={styles.emptyText}>{t('history.loginPrompt')}</Text>
                        <View style={{ marginTop: spacing.xl }}>
                            <GoldButton label={t('history.loginBtn')} onPress={() => router.push('/login')} />
                        </View>
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    return (
        <View style={styles.screen}>
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={() => loadHistory(true)}
                            tintColor={colors.primary}
                        />
                    }
                >
                    <TabHeader />

                    {/* Hero */}
                    <View style={styles.hero}>
                        <View style={styles.badge}>
                            <View style={styles.badgeDot} />
                            <Text style={styles.badgeText}>{t('history.badge')}</Text>
                        </View>
                        <Text style={styles.heroTitle}>{t('history.heroTitle')}</Text>
                        <Text style={styles.heroSubtitle}>
                            {t('history.heroSubtitle')}
                        </Text>
                    </View>

                    {/* Error */}
                    {error && (
                        <View style={styles.sectionPad}>
                            <GlassCard opacity="low" radius="xl">
                                <Text style={styles.errorText}>{error}</Text>
                                <View style={{ marginTop: spacing.lg }}>
                                    <GhostButton label={t('history.retry')} onPress={() => loadHistory()} />
                                </View>
                            </GlassCard>
                        </View>
                    )}

                    {/* Empty state */}
                    {!error && histories.length === 0 && (
                        <View style={styles.centered}>
                            <Text style={styles.emptyEmoji}>✦</Text>
                            <Text style={styles.emptyText}>
                                {t('history.emptyText')}
                            </Text>
                            <View style={{ marginTop: spacing.xl }}>
                                <GoldButton
                                    label={t('history.analyzeCompatibilityBtn')}
                                    onPress={() => router.push('/compatibility')}
                                    rightIcon
                                />
                            </View>
                        </View>
                    )}

                    {/* History list */}
                    {histories.length > 0 && (
                        <View style={styles.list}>
                            {histories.map((item) => (
                                <HistoryCard
                                    key={item.id}
                                    item={item}
                                    userName={userName}
                                    onPress={() => router.push(`/compatibility-result-v2?id=${item.id}`)}
                                    onDelete={() => handleDelete(item)}
                                />
                            ))}

                            {/* Locked entries card for free users */}
                            {isLimited && totalCount > histories.length && (
                                <PremiumLockedButton
                                    label={t('premium.historyLockedTitle', { count: totalCount - histories.length })}
                                    reason={t('premium.historyLockedSubtitle')}
                                    source="synastry_history"
                                />
                            )}

                            <View style={styles.bottomActions}>
                                <GhostButton
                                    label={t('history.newAnalysisBtn')}
                                    onPress={() => router.push('/compatibility')}
                                />
                            </View>
                        </View>
                    )}

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

    // Header
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
    hiText: { fontFamily: fonts.body.regular, fontSize: 14, color: colors.onSurfaceMuted },
    avatarBubble: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: colors.surfaceContainerHigh,
        alignItems: 'center', justifyContent: 'center',
    },
    avatarLetter: { fontFamily: fonts.body.semiBold, fontSize: 14, color: colors.onSurface },

    // Hero
    hero: {
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.xl,
        paddingBottom: spacing.xxxl,
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
    heroTitle: {
        fontFamily: fonts.display.bold,
        fontSize: 42,
        lineHeight: 50,
        color: colors.onSurface,
        letterSpacing: -0.5,
        marginBottom: spacing.md,
    },
    heroSubtitle: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        lineHeight: 22,
        color: colors.onSurfaceMuted,
        maxWidth: 300,
    },

    sectionPad: { paddingHorizontal: spacing.xl },

    // List
    list: {
        paddingHorizontal: spacing.xl,
        gap: spacing.lg,
    },

    // Card
    cardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.lg,
    },
    cardInfo: { flex: 1, paddingRight: spacing.lg },
    cardNames: {
        fontFamily: fonts.display.regular,
        fontSize: 18,
        color: colors.onSurface,
        letterSpacing: 0.2,
        marginBottom: spacing.xs,
    },
    cardDate: {
        fontFamily: fonts.body.regular,
        fontSize: 12,
        color: colors.onSurfaceMuted,
        marginBottom: spacing.xs,
    },
    cardLabel: {
        fontFamily: fonts.body.semiBold,
        fontSize: 10,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        color: `${colors.primary}99`,
    },
    scoreBlock: {
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    scoreValue: {
        fontFamily: fonts.display.bold,
        fontSize: 40,
        lineHeight: 46,
        color: colors.primary,
    },
    scorePercent: {
        fontFamily: fonts.display.regular,
        fontSize: 18,
        color: colors.primary,
        marginBottom: 4,
        marginLeft: 2,
    },

    // Card footer
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: spacing.md,
    },
    detailsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    detailsBtnText: {
        fontFamily: fonts.body.semiBold,
        fontSize: 10,
        letterSpacing: 1.5,
        color: colors.primary,
        textTransform: 'uppercase',
    },
    deleteBtn: {
        padding: spacing.xs,
    },

    // Bottom
    bottomActions: {
        alignItems: 'center',
        marginTop: spacing.lg,
    },

    // States
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.xxxl,
        gap: spacing.lg,
    },
    emptyEmoji: {
        fontSize: 48,
        lineHeight: 60,
        color: colors.primary,
        fontFamily: fonts.display.regular,
    },
    emptyText: {
        fontFamily: fonts.body.regular,
        fontSize: 15,
        lineHeight: 24,
        color: colors.onSurfaceMuted,
        textAlign: 'center',
        maxWidth: 280,
    },
    errorText: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        color: colors.error,
        textAlign: 'center',
        lineHeight: 20,
    },
});