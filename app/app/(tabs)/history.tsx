import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import {
    Screen,
    AppButton,
    AppHeading,
    AppText,
    AppCard,
    Spacer,
    LoadingState,
    EmptyState,
} from '@/components/ui';
import {
    getSynastryHistory,
    deleteSynastryHistoryEntry,
    SynastryHistorySummary,
} from '@/services/astrology';
import { colors, spacing, borderRadius, shadows } from '@/theme';

const BG = require('@/assets/images/interface/background-starry.png');

function getScoreColor(score: number | null): string {
    if (score === null) return colors.text.muted;
    if (score >= 80) return colors.status.success;
    if (score >= 60) return colors.brand.primary;
    if (score >= 40) return colors.status.warning;
    return colors.status.error;
}

function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

export default function HistoryTab() {
    const router = useRouter();
    const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string>();
    const [histories, setHistories] = useState<SynastryHistorySummary[]>([]);

    const loadHistory = useCallback(async (showRefresh = false) => {
        if (showRefresh) setIsRefreshing(true);
        setError(undefined);

        try {
            const response = await getSynastryHistory();
            if (response.success && response.histories) {
                setHistories(response.histories);
            } else {
                setError(response.error || 'Erreur lors du chargement');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur inconnue');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated) {
            loadHistory();
        }
    }, [isAuthenticated, loadHistory]);

    const handleDelete = useCallback((item: SynastryHistorySummary) => {
        Alert.alert(
            'Supprimer',
            `Supprimer l'analyse avec ${item.partnerName} ?`,
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Supprimer',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const response = await deleteSynastryHistoryEntry(item.id);
                            if (response.success) {
                                setHistories(prev => prev.filter(h => h.id !== item.id));
                            }
                        } catch {
                            Alert.alert('Erreur', 'Impossible de supprimer');
                        }
                    },
                },
            ]
        );
    }, []);

    const renderItem = useCallback(({ item }: { item: SynastryHistorySummary }) => {
        const score = item.compatibilityScore;
        const scoreColor = getScoreColor(score);

        return (
            <TouchableOpacity
                style={styles.historyItem}
                onPress={() => router.push(`/synastry-detail?id=${item.id}`)}
                activeOpacity={0.8}
            >
                {/* Accent bar on left */}
                <View style={[styles.accentBar, { backgroundColor: scoreColor }]} />

                <View style={styles.historyContent}>
                    {/* Emoji container */}
                    <View style={styles.emojiContainer}>
                        <AppText style={styles.partnerEmoji}>
                            {score !== null && score >= 70 ? '💕' : '💫'}
                        </AppText>
                    </View>

                    {/* Info section */}
                    <View style={styles.historyInfo}>
                        <AppText variant="bodyMedium" color="primary" numberOfLines={1}>
                            {item.partnerName}
                        </AppText>
                        <Spacer size="xxs" />
                        <AppText variant="caption" color="muted">
                            {formatDate(item.createdAt)}
                        </AppText>
                    </View>

                    {/* Score section */}
                    <View style={styles.scoreSection}>
                        {score !== null ? (
                            <View style={styles.scoreCircle}>
                                <AppText style={[styles.scoreValue, { color: scoreColor }]}>
                                    {Math.round(score)}
                                </AppText>
                                <AppText style={styles.scorePercent}>%</AppText>
                            </View>
                        ) : (
                            <AppText variant="caption" color="muted">—</AppText>
                        )}
                    </View>

                    {/* Arrow indicator */}
                    <View style={styles.arrowContainer}>
                        <AppText style={styles.arrowIcon}>›</AppText>
                    </View>
                </View>

                {/* Delete button */}
                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDelete(item)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                    <AppText style={styles.deleteIcon}>×</AppText>
                </TouchableOpacity>
            </TouchableOpacity>
        );
    }, [router, handleDelete]);

    if (isAuthLoading || isLoading) {
        return (
            <Screen backgroundImage={BG}>
                <LoadingState message="Chargement..." />
            </Screen>
        );
    }

    if (!isAuthenticated) {
        return (
            <Screen backgroundImage={BG}>
                <View style={styles.centerContent}>
                    <AppText variant="body" color="muted" align="center">
                        Connectez-vous pour voir votre historique
                    </AppText>
                    <Spacer size="lg" />
                    <AppButton
                        title="Se connecter"
                        onPress={() => router.push('/login')}
                        variant="primary"
                    />
                </View>
            </Screen>
        );
    }

    return (
        <Screen variant="static" backgroundImage={BG}>
            <Spacer size="xl" />

            {/* Header */}
            <View style={styles.header}>
                <AppText style={styles.headerIcon}>📜</AppText>
                <AppHeading variant="h1" align="center">
                    Historique
                </AppHeading>
            </View>

            <Spacer size="xl" />

            {error && (
                <AppCard variant="outline" style={styles.errorCard}>
                    <AppText variant="body" color="error" align="center">
                        {error}
                    </AppText>
                </AppCard>
            )}

            {histories.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <EmptyState
                        title="Aucune analyse"
                        description="Vos analyses de compatibilité apparaîtront ici"
                    />
                </View>
            ) : (
                <FlatList
                    data={histories}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={() => loadHistory(true)}
                            tintColor={colors.brand.primary}
                        />
                    }
                    ItemSeparatorComponent={() => <Spacer size="md" />}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </Screen>
    );
}

const styles = StyleSheet.create({
    header: {
        alignItems: 'center',
    },
    headerIcon: {
        fontSize: 40,
        marginBottom: spacing.sm,
        lineHeight: 50,
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
    },
    errorCard: {
        borderColor: colors.status.error,
        padding: spacing.lg,
        marginHorizontal: spacing.screenPadding,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    listContent: {
        paddingHorizontal: spacing.screenPadding,
        paddingBottom: spacing['3xl'],
    },
    historyItem: {
        backgroundColor: colors.surface.elevated,
        borderRadius: borderRadius.card,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        position: 'relative',
        ...shadows.md,
    },
    accentBar: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 4,
        borderTopLeftRadius: borderRadius.card,
        borderBottomLeftRadius: borderRadius.card,
    },
    historyContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.lg,
        paddingLeft: spacing.xl,
        paddingRight: spacing.md,
    },
    emojiContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.surface.highlight,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    partnerEmoji: {
        fontSize: 24,
        lineHeight: 32,
        textAlign: 'center',
    },
    historyInfo: {
        flex: 1,
        marginRight: spacing.md,
    },
    scoreSection: {
        alignItems: 'center',
        marginRight: spacing.sm,
    },
    scoreCircle: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    scoreValue: {
        fontSize: 24,
        fontWeight: '700',
    },
    scorePercent: {
        fontSize: 12,
        color: colors.text.muted,
        marginLeft: 1,
    },
    arrowContainer: {
        width: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    arrowIcon: {
        fontSize: 24,
        color: colors.text.muted,
        fontWeight: '300',
    },
    deleteButton: {
        position: 'absolute',
        top: spacing.sm,
        right: spacing.sm,
        width: 28,
        height: 28,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface.highlight,
        borderRadius: 14,
    },
    deleteIcon: {
        fontSize: 20,
        color: colors.text.muted,
        lineHeight: 22,
    },
});
