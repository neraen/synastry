import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Pressable,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, spacing, radius, fonts } from '@/theme';
import { usePremium } from '@/hooks/usePremium';
import {
    getChatSessions,
    deleteChatSession,
    ChatSessionSummary,
} from '@/services/chatSessions';

export default function ChatHistoryScreen() {
    const { t } = useTranslation();
    const { isPremium } = usePremium();
    const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
    const [loading, setLoading] = useState(true);

    const loadSessions = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getChatSessions();
            if (res.success && res.sessions) {
                setSessions(res.sessions);
            }
        } catch (error) {
            console.warn('[ChatHistory] load error:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadSessions();
    }, [loadSessions]);

    const handleDelete = (id: number) => {
        Alert.alert(
            t('chat.deleteSessionTitle', 'Supprimer le chat'),
            t('chat.deleteSessionDesc', 'Voulez-vous vraiment supprimer cette conversation ?'),
            [
                { text: t('common.cancel', 'Annuler'), style: 'cancel' },
                {
                    text: t('common.delete', 'Supprimer'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const res = await deleteChatSession(id);
                            if (res.success) {
                                setSessions((prev) => prev.filter((s) => s.id !== id));
                            }
                        } catch (error) {
                            console.warn('[ChatHistory] delete error:', error);
                        }
                    },
                },
            ]
        );
    };

    const renderItem = ({ item }: { item: ChatSessionSummary }) => {
        const dateStr = new Date(item.updatedAt).toLocaleDateString();
        return (
            <Pressable
                style={({ pressed }) => [styles.itemContainer, pressed && styles.itemPressed]}
                onPress={() => router.push(`/chat?sessionId=${item.id}`)}
            >
                <View style={styles.itemIconWrap}>
                    <Feather name="message-square" size={20} color={colors.primary} />
                </View>
                <View style={styles.itemInfo}>
                    <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.itemDate}>{dateStr}</Text>
                </View>
                <Pressable
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(item.id)}
                    hitSlop={10}
                >
                    <Feather name="trash-2" size={18} color={colors.onSurfaceMuted} />
                </Pressable>
            </Pressable>
        );
    };

    return (
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
                    <Feather name="arrow-left" size={24} color={colors.onSurface} />
                </Pressable>
                <Text style={styles.headerTitle}>{t('chat.historyTitle', 'Historique')}</Text>
                <View style={{ width: 44 }} />
            </View>

            {loading ? (
                <View style={styles.centerContent}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : sessions.length === 0 ? (
                <View style={styles.centerContent}>
                    <View style={styles.emptyIconWrap}>
                        <Feather name="message-circle" size={32} color={colors.onSurfaceMuted} />
                    </View>
                    <Text style={styles.emptyTitle}>{t('chat.noHistory', 'Aucun historique')}</Text>
                    <Text style={styles.emptyDesc}>
                        {t('chat.noHistoryDesc', 'Sauvegardez vos conversations avec Lyra pour les retrouver ici.')}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={sessions}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: colors.surfaceLowest,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.06)',
    },
    backBtn: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: -10,
    },
    headerTitle: {
        fontFamily: fonts.display.regular,
        fontSize: 18,
        color: colors.onSurface,
    },
    listContent: {
        padding: spacing.lg,
        gap: spacing.sm,
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceLow,
        padding: spacing.lg,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    itemPressed: {
        backgroundColor: colors.surface,
    },
    itemIconWrap: {
        width: 40,
        height: 40,
        borderRadius: radius.full,
        backgroundColor: `${colors.primary}20`,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    itemInfo: {
        flex: 1,
        gap: 2,
    },
    itemTitle: {
        fontFamily: fonts.body.semiBold,
        fontSize: 16,
        color: colors.onSurface,
    },
    itemDate: {
        fontFamily: fonts.body.regular,
        fontSize: 13,
        color: colors.onSurfaceMuted,
    },
    deleteBtn: {
        padding: spacing.sm,
    },
    centerContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
    },
    emptyIconWrap: {
        width: 64,
        height: 64,
        borderRadius: radius.full,
        backgroundColor: `${colors.onSurfaceMuted}15`,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    emptyTitle: {
        fontFamily: fonts.display.regular,
        fontSize: 18,
        color: colors.onSurface,
        marginBottom: spacing.xs,
    },
    emptyDesc: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        color: colors.onSurfaceMuted,
        textAlign: 'center',
        lineHeight: 20,
    },
});
