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

// Score color based on value
function getScoreColor(score: number | null): string {
    if (score === null) return colors.text.muted;
    if (score >= 80) return colors.status.success;
    if (score >= 60) return colors.brand.primary;
    if (score >= 40) return colors.status.warning;
    return colors.status.error;
}

// Format date for display
function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

export default function SynastryHistoryScreen() {
    const router = useRouter();
    const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string>();
    const [histories, setHistories] = useState<SynastryHistorySummary[]>([]);

    // Redirect if not authenticated
    useEffect(() => {
        if (!isAuthLoading && !isAuthenticated) {
            router.replace('/login');
        }
    }, [isAuthenticated, isAuthLoading, router]);

    // Load history
    const loadHistory = useCallback(async (showRefresh = false) => {
        if (showRefresh) {
            setIsRefreshing(true);
        }
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

    // Handle delete
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

    // Render item
    const renderItem = useCallback(({ item }: { item: SynastryHistorySummary }) => (
        <TouchableOpacity
            style={styles.historyItem}
            onPress={() => router.push(`/synastry-detail?id=${item.id}`)}
            activeOpacity={0.7}
        >
            <View style={styles.historyContent}>
                <View style={styles.historyHeader}>
                    <AppText style={styles.partnerEmoji}>
                        {item.compatibilityScore && item.compatibilityScore >= 70 ? '💕' : '💫'}
                    </AppText>
                    <View style={styles.historyInfo}>
                        <AppText variant="bodyMedium" color="primary">
                            {item.partnerName}
                        </AppText>
                        <AppText variant="caption" color="muted">
                            {formatDate(item.createdAt)}
                        </AppText>
                    </View>
                </View>

                <View style={styles.scoreContainer}>
                    {item.compatibilityScore !== null ? (
                        <View
                            style={[
                                styles.scoreBadge,
                                { backgroundColor: getScoreColor(item.compatibilityScore) + '20' },
                            ]}
                        >
                            <AppText
                                variant="bodyMedium"
                                style={{ color: getScoreColor(item.compatibilityScore) }}
                            >
                                {Math.round(item.compatibilityScore)}%
                            </AppText>
                        </View>
                    ) : (
                        <AppText variant="caption" color="muted">—</AppText>
                    )}
                    <AppText style={styles.arrowIcon}>→</AppText>
                </View>
            </View>

            <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDelete(item)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <AppText style={styles.deleteIcon}>×</AppText>
            </TouchableOpacity>
        </TouchableOpacity>
    ), [router, handleDelete]);

    if (isAuthLoading || isLoading) {
        return (
            <Screen backgroundImage={BG}>
                <LoadingState message="Chargement de l'historique..." />
            </Screen>
        );
    }

    return (
        <Screen variant="scroll" backgroundImage={BG}>
            <Spacer size="xl" />

            {/* Header */}
            <View style={styles.header}>
                <AppText style={styles.headerIcon}>📜</AppText>
                <AppHeading variant="h1" align="center">
                    Historique
                </AppHeading>
                <Spacer size="sm" />
                <AppText variant="body" color="muted" align="center">
                    Vos analyses de compatibilité passées
                </AppText>
            </View>

            <Spacer size="2xl" />

            {error && (
                <>
                    <AppCard variant="outline" style={styles.errorCard}>
                        <AppText variant="body" color="error" align="center">
                            {error}
                        </AppText>
                    </AppCard>
                    <Spacer size="lg" />
                </>
            )}

            {histories.length === 0 ? (
                <EmptyState
                    title="Aucune analyse"
                    description="Vous n'avez pas encore fait d'analyse de compatibilité"
                    actionLabel="Nouvelle analyse"
                    onAction={() => router.push('/synastry')}
                />
            ) : (
                <FlatList
                    data={histories}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    scrollEnabled={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={() => loadHistory(true)}
                            tintColor={colors.brand.primary}
                        />
                    }
                    ItemSeparatorComponent={() => <Spacer size="md" />}
                    contentContainerStyle={styles.listContent}
                />
            )}

            <Spacer size="2xl" />

            {/* Actions */}
            <AppButton
                title="Nouvelle analyse"
                onPress={() => router.push('/synastry')}
                variant="primary"
            />
            <Spacer size="md" />
            <AppButton
                title="Retour"
                onPress={() => router.back()}
                variant="ghost"
            />

            <Spacer size="3xl" />
        </Screen>
    );
}

const styles = StyleSheet.create({
    header: {
        alignItems: 'center',
    },
    headerIcon: {
        fontSize: 40,
        marginBottom: spacing.md,
    },
    errorCard: {
        borderColor: colors.status.error,
        padding: spacing.lg,
    },
    listContent: {
        paddingBottom: spacing.lg,
    },
    historyItem: {
        backgroundColor: colors.surface.elevated,
        borderRadius: borderRadius.card,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        overflow: 'hidden',
        ...shadows.sm,
    },
    historyContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.lg,
    },
    historyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    partnerEmoji: {
        fontSize: 32,
        marginRight: spacing.md,
    },
    historyInfo: {
        flex: 1,
    },
    scoreContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    scoreBadge: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.badge,
    },
    arrowIcon: {
        color: colors.brand.primary,
        fontSize: 18,
        marginLeft: spacing.md,
    },
    deleteButton: {
        position: 'absolute',
        top: spacing.sm,
        right: spacing.sm,
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    deleteIcon: {
        fontSize: 20,
        color: colors.text.muted,
    },
});
