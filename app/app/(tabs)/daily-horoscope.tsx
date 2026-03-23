import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { GlassCard, GoldButton, GhostButton, TabHeader } from '@/components/ui';
import { getDailyHoroscope, DailyHoroscope } from '@/services/astrology';
import { aiDisclaimerText } from '@/constants/legalTexts';
import { colors, spacing, radius, fonts } from '@/theme';

// ─── Horoscope section card ────────────────────────────────────────────────────
const SECTIONS = [
    { key: 'overview', icon: '✦', label: 'APERÇU', color: colors.primary },
    { key: 'love',     icon: '♡', label: 'AMOUR',  color: '#ec4899' },
    { key: 'energy',   icon: '⚡', label: 'ÉNERGIE', color: colors.secondary },
    { key: 'advice',   icon: '◈', label: 'CONSEIL', color: colors.onSurface },
] as const;

function HoroscopeSection({ icon, label, content, color }: {
    icon: string; label: string; content: string; color: string;
}) {
    return (
        <GlassCard opacity="low" radius="xl">
            <View style={styles.sectionHeader}>
                <Text style={[styles.sectionIcon, { color }]}>{icon}</Text>
                <Text style={[styles.sectionLabel, { color }]}>{label}</Text>
            </View>
            <Text style={styles.sectionContent}>{content}</Text>
        </GlassCard>
    );
}

// ─── Empty states ──────────────────────────────────────────────────────────────
function EmptyState({ emoji, message, actionLabel, onAction }: {
    emoji: string; message: string; actionLabel: string; onAction: () => void;
}) {
    return (
        <View style={styles.screen}>
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.emptyWrap}>
                    <Text style={styles.emptyEmoji}>{emoji}</Text>
                    <Text style={styles.emptyText}>{message}</Text>
                    <View style={{ marginTop: spacing.xl }}>
                        <GoldButton label={actionLabel} onPress={onAction} />
                    </View>
                </View>
            </SafeAreaView>
        </View>
    );
}

// ─── Screen ────────────────────────────────────────────────────────────────────
export default function DailyHoroscopeTab() {
    const router = useRouter();
    const { isAuthenticated, user, isLoading: isAuthLoading } = useAuth();

    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string>();
    const [horoscope, setHoroscope] = useState<DailyHoroscope | null>(null);

    const loadHoroscope = useCallback(async (refresh = false) => {
        try {
            setError(undefined);
            const response = await getDailyHoroscope(refresh);
            if (response.success && response.horoscope) {
                setHoroscope(response.horoscope);
            } else {
                setError(response.error || 'Erreur lors du chargement');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur inconnue');
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated && user?.hasBirthProfile) {
            loadHoroscope().finally(() => setIsLoading(false));
        } else {
            setIsLoading(false);
        }
    }, [isAuthenticated, user, loadHoroscope]);

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        await loadHoroscope(true);
        setIsRefreshing(false);
    }, [loadHoroscope]);

    const formatDate = (dateString: string) =>
        new Date(dateString).toLocaleDateString('fr-FR', {
            weekday: 'long', day: 'numeric', month: 'long',
        });

    // Loading
    if (isAuthLoading || isLoading) {
        return (
            <View style={styles.screen}>
                <SafeAreaView style={styles.safeArea}>
                    <TabHeader />
                    <View style={styles.emptyWrap}>
                        <ActivityIndicator color={colors.primary} size="large" />
                        <Text style={styles.loadingText}>Chargement de votre horoscope…</Text>
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    // Not authenticated
    if (!isAuthenticated) {
        return (
            <EmptyState
                emoji="🌟"
                message="Connectez-vous pour voir votre horoscope quotidien"
                actionLabel="SE CONNECTER"
                onAction={() => router.push('/login')}
            />
        );
    }

    // No birth profile
    if (!user?.hasBirthProfile) {
        return (
            <EmptyState
                emoji="🌙"
                message="Complétez votre profil pour recevoir votre horoscope personnalisé"
                actionLabel="COMPLÉTER MON PROFIL"
                onAction={() => router.push('/birth-profile')}
            />
        );
    }

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
                        <View style={styles.badge}>
                            <View style={styles.badgeDot} />
                            <Text style={styles.badgeText}>HOROSCOPE DU JOUR</Text>
                        </View>
                        {horoscope ? (
                            <>
                                <Text style={styles.heroTitle}>{horoscope.title}</Text>
                                <Text style={styles.heroDate}>{formatDate(horoscope.date)}</Text>
                            </>
                        ) : (
                            <Text style={styles.heroTitle}>Votre cosmos{'\n'}aujourd'hui</Text>
                        )}
                    </View>

                    {/* Error */}
                    {error && (
                        <View style={styles.sectionPad}>
                            <GlassCard opacity="low" radius="xl">
                                <Text style={styles.errorText}>{error}</Text>
                                <View style={{ marginTop: spacing.lg }}>
                                    <GhostButton label="RÉESSAYER" onPress={() => loadHoroscope()} />
                                </View>
                            </GlassCard>
                        </View>
                    )}

                    {/* Refreshing indicator */}
                    {isRefreshing && (
                        <View style={styles.refreshingRow}>
                            <ActivityIndicator color={colors.primary} size="small" />
                            <Text style={styles.refreshingText}>Actualisation…</Text>
                        </View>
                    )}

                    {/* Horoscope sections */}
                    {horoscope && !isRefreshing && (
                        <View style={styles.sectionsContainer}>
                            {SECTIONS.map((s) => {
                                const content = horoscope[s.key];
                                if (!content) return null;
                                return (
                                    <HoroscopeSection
                                        key={s.key}
                                        icon={s.icon}
                                        label={s.label}
                                        content={content}
                                        color={s.color}
                                    />
                                );
                            })}
                        </View>
                    )}

                    {/* Actions */}
                    {horoscope && !isRefreshing && (
                        <View style={styles.actionsSection}>
                            <GhostButton
                                label={horoscope.cached ? "ACTUALISER L'HOROSCOPE" : 'RAFRAÎCHIR'}
                                onPress={handleRefresh}
                                disabled={isRefreshing}
                            />
                            {horoscope.cached && (
                                <Text style={styles.cachedText}>Généré plus tôt aujourd'hui</Text>
                            )}
                        </View>
                    )}

                    {/* AI Disclaimer */}
                    <View style={styles.disclaimer}>
                        <Text style={styles.disclaimerText}>{aiDisclaimerText}</Text>
                    </View>

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
        fontSize: 40,
        lineHeight: 48,
        color: colors.onSurface,
        letterSpacing: -0.5,
        marginBottom: spacing.md,
    },
    heroDate: {
        fontFamily: fonts.body.regular,
        fontSize: 15,
        color: colors.onSurfaceMuted,
        textTransform: 'capitalize',
    },

    sectionPad: { paddingHorizontal: spacing.xl },

    // Horoscope sections
    sectionsContainer: {
        paddingHorizontal: spacing.xl,
        gap: spacing.lg,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    sectionIcon: { fontSize: 16, lineHeight: 20 },
    sectionLabel: {
        fontFamily: fonts.body.semiBold,
        fontSize: 11,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    sectionContent: {
        fontFamily: fonts.body.regular,
        fontSize: 15,
        lineHeight: 24,
        color: colors.onSurface,
    },

    // Actions
    actionsSection: {
        paddingHorizontal: spacing.xl,
        marginTop: spacing.xxl,
        alignItems: 'center',
        gap: spacing.md,
    },
    cachedText: {
        fontFamily: fonts.body.regular,
        fontSize: 12,
        color: colors.onSurfaceMuted,
    },

    // Disclaimer
    disclaimer: {
        paddingHorizontal: spacing.xl,
        marginTop: spacing.xxl,
    },
    disclaimerText: {
        fontFamily: fonts.body.regular,
        fontSize: 11,
        lineHeight: 18,
        color: `${colors.onSurfaceMuted}80`,
        fontStyle: 'italic',
        textAlign: 'center',
    },

    // Empty / Loading states
    emptyWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
        gap: spacing.lg,
    },
    emptyEmoji: { fontSize: 56, lineHeight: 68 },
    emptyText: {
        fontFamily: fonts.body.regular,
        fontSize: 15,
        lineHeight: 24,
        color: colors.onSurfaceMuted,
        textAlign: 'center',
        maxWidth: 280,
    },
    loadingText: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        color: colors.onSurfaceMuted,
        marginTop: spacing.lg,
    },
    refreshingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.md,
        paddingVertical: spacing.xl,
    },
    refreshingText: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        color: colors.onSurfaceMuted,
    },
    errorText: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        color: colors.error,
        textAlign: 'center',
        lineHeight: 20,
    },
});