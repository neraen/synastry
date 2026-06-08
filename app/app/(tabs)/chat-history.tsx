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
import { BlurView } from 'expo-blur';
import { TabHeader } from '@/components/ui';
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
                style={({ pressed }) => [styles.itemContainer, pressed && isPremium && styles.itemPressed]}
                onPress={() => {
                    if (isPremium) {
                        router.push(`/chat?sessionId=${item.id}`);
                    } else {
                        router.push('/premium');
                    }
                }}
            >
                <View style={styles.itemIconWrap}>
                    <Feather name="message-square" size={20} color={colors.primary} />
                </View>
                <View style={styles.itemInfo}>
                    <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.itemDate}>{dateStr}</Text>
                </View>
                {isPremium && (
                    <Pressable
                        style={styles.deleteBtn}
                        onPress={() => handleDelete(item.id)}
                        hitSlop={10}
                    >
                        <Feather name="trash-2" size={18} color={colors.onSurfaceMuted} />
                    </Pressable>
                )}
            </Pressable>
        );
    };

    const displaySessions = isPremium
        ? sessions
        : (sessions.length > 0
            ? sessions
            : [
                { id: 9991, title: t('chat.mockSession1', 'Mon avenir sentimental dans 6 mois'), partnerHistoryId: null, createdAt: new Date().toISOString(), updatedAt: new Date(Date.now() - 86400000 * 2).toISOString() },
                { id: 9992, title: t('chat.mockSession2', 'Transit de Saturne - Opportunité pro'), partnerHistoryId: null, createdAt: new Date().toISOString(), updatedAt: new Date(Date.now() - 86400000 * 5).toISOString() },
                { id: 9993, title: t('chat.mockSession3', 'Compatibilité amoureuse avec Sarah'), partnerHistoryId: null, createdAt: new Date().toISOString(), updatedAt: new Date(Date.now() - 86400000 * 10).toISOString() },
            ]
        );

    const hasNoSessions = isPremium && sessions.length === 0;

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <TabHeader onBack={() => router.back()} />
            <Text style={styles.pageTitle}>{t('chat.historyTitle', 'Historique')}</Text>

            <View style={styles.contentContainer}>
                {loading ? (
                    <View style={styles.centerContent}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                ) : hasNoSessions ? (
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
                    <View style={styles.listWrapper}>
                        <FlatList
                            data={displaySessions}
                            keyExtractor={(item) => item.id.toString()}
                            renderItem={renderItem}
                            contentContainerStyle={styles.listContent}
                            showsVerticalScrollIndicator={false}
                            scrollEnabled={isPremium}
                        />
                        
                        {!isPremium && (
                            <View style={styles.lockOverlay}>
                                <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
                                <View style={styles.lockContent}>
                                    <View style={styles.lockIconCircle}>
                                        <Feather name="lock" size={28} color={colors.primary} />
                                    </View>
                                    <Text style={styles.lockTitle}>{t('chat.lockHistoryTitle', 'Historique verrouillé')}</Text>
                                    <Text style={styles.lockDesc}>
                                        {t('chat.lockHistoryDesc', 'Sauvegardez vos conversations avec Lyra et reprenez-les à tout moment grâce à Lunestia Premium.')}
                                    </Text>
                                    <Pressable
                                        style={({ pressed }) => [styles.premiumBtn, pressed && styles.premiumBtnPressed]}
                                        onPress={() => router.push('/premium')}
                                    >
                                        <Text style={styles.premiumBtnText}>{t('chat.unlockHistoryCta', 'Débloquer l\'historique')}</Text>
                                    </Pressable>
                                </View>
                            </View>
                        )}
                    </View>
                )}
            </View>
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
    contentContainer: {
        flex: 1,
    },
    listWrapper: {
        flex: 1,
        position: 'relative',
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
        backgroundColor: colors.surfaceContainer,
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
    lockOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
    },
    lockContent: {
        backgroundColor: 'rgba(30, 20, 50, 0.95)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: radius.xl,
        padding: spacing.xl,
        alignItems: 'center',
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        elevation: 10,
    },
    lockIconCircle: {
        width: 60,
        height: 60,
        borderRadius: radius.full,
        backgroundColor: 'rgba(124, 58, 237, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: 'rgba(124, 58, 237, 0.3)',
    },
    lockTitle: {
        fontFamily: fonts.display.regular,
        fontSize: 20,
        color: colors.onSurface,
        marginBottom: spacing.xs,
        textAlign: 'center',
    },
    lockDesc: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        color: colors.onSurfaceMuted,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: spacing.xl,
    },
    premiumBtn: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        borderRadius: radius.full,
        width: '100%',
        alignItems: 'center',
    },
    premiumBtnPressed: {
        opacity: 0.8,
        transform: [{ scale: 0.98 }],
    },
    premiumBtnText: {
        fontFamily: fonts.body.semiBold,
        fontSize: 15,
        color: '#fff',
    },
    pageTitle: {
        fontFamily: fonts.display.bold,
        fontSize: 24,
        color: colors.onSurface,
        paddingHorizontal: spacing.lg,
        marginTop: spacing.md,
        marginBottom: spacing.sm,
    },
});
