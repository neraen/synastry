/**
 * Astrologer AI Chat — Talk to Lyra
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    Pressable,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Animated,
    Easing,
    Modal,
    ScrollView,
    ActivityIndicator,
    Dimensions,
} from 'react-native';

const SCREEN_HEIGHT = Dimensions.get('window').height;
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radius, fonts } from '@/theme';
import { router } from 'expo-router';
import { usePremium } from '@/hooks/usePremium';
import {
    sendChatMessage,
    getChatPartners,
    ChatMessage,
    ChatPartner,
} from '@/services/astrology';

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingDot({ delay }: { delay: number }) {
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.timing(anim, { toValue: 1, duration: 300, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(anim, { toValue: 0, duration: 300, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.delay(600 - delay),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [anim, delay]);

    const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -5] });

    return <Animated.View style={[styles.typingDot, { transform: [{ translateY }] }]} />;
}

function TypingIndicator() {
    return (
        <View style={[styles.bubbleRow, styles.bubbleRowAI]}>
            <View style={[styles.bubble, styles.bubbleAI]}>
                <View style={styles.typingRow}>
                    <TypingDot delay={0} />
                    <TypingDot delay={150} />
                    <TypingDot delay={300} />
                </View>
            </View>
        </View>
    );
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: ChatMessage }) {
    const isUser = message.role === 'user';
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(8)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 250, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        ]).start();
    }, [fadeAnim, slideAnim]);

    return (
        <Animated.View
            style={[
                styles.bubbleRow,
                isUser ? styles.bubbleRowUser : styles.bubbleRowAI,
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
        >
            {isUser ? (
                <LinearGradient
                    colors={['#7c3aed', '#9333ea']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.bubble, styles.bubbleUser]}
                >
                    <Text style={styles.bubbleTextUser}>{message.content}</Text>
                </LinearGradient>
            ) : (
                <View style={[styles.bubble, styles.bubbleAI]}>
                    <Text style={styles.bubbleTextAI}>{message.content}</Text>
                </View>
            )}
        </Animated.View>
    );
}

// ─── Partner picker modal ─────────────────────────────────────────────────────

function PartnerPickerModal({
    visible,
    onClose,
    onSelect,
    activePartnerId,
}: {
    visible: boolean;
    onClose: () => void;
    onSelect: (partner: ChatPartner | null) => void;
    activePartnerId: number | null;
}) {
    const { t } = useTranslation();
    const [partners, setPartners] = useState<ChatPartner[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!visible) return;
        setLoading(true);
        getChatPartners()
            .then((res) => {
                console.log('[Chat] partners response:', JSON.stringify(res));
                if (res.success && res.partners) setPartners(res.partners);
            })
            .catch((e) => console.warn('[Chat] getChatPartners error:', e))
            .finally(() => setLoading(false));
    }, [visible]);

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.modalContainer}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
                <View style={styles.modalSheet}>
                <View style={styles.modalHandle} />
                <Text style={styles.modalTitle}>{t('chat.partnerPickerTitle')}</Text>
                <Text style={styles.modalSubtitle}>{t('chat.partnerPickerSubtitle')}</Text>

                {loading ? (
                    <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
                ) : (
                    <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
                        {/* Remove partner option */}
                        {activePartnerId && (
                            <Pressable
                                style={styles.partnerRow}
                                onPress={() => { onSelect(null); onClose(); }}
                            >
                                <View style={[styles.partnerIconWrap, { backgroundColor: `${colors.error}18` }]}>
                                    <Feather name="x" size={16} color={colors.error} />
                                </View>
                                <Text style={[styles.partnerName, { color: colors.error }]}>{t('chat.removePartner')}</Text>
                            </Pressable>
                        )}

                        {partners.length === 0 && (
                            <View style={styles.emptyState}>
                                <View style={styles.emptyIconWrap}>
                                    <Feather name="users" size={24} color={colors.onSurfaceMuted} />
                                </View>
                                <Text style={styles.emptyText}>{t('chat.noPartners')}</Text>
                                <Text style={styles.emptyHint}>{t('chat.noPartnersHint')}</Text>
                            </View>
                        )}

                        {partners.map((p) => {
                            const isActive = p.id === activePartnerId;
                            return (
                                <Pressable
                                    key={p.id}
                                    style={[styles.partnerRow, isActive && styles.partnerRowActive]}
                                    onPress={() => { onSelect(p); onClose(); }}
                                >
                                    <View style={[styles.partnerIconWrap, isActive && { backgroundColor: `${colors.primary}20` }]}>
                                        <Feather name="user" size={16} color={isActive ? colors.primary : colors.onSurfaceMuted} />
                                    </View>
                                    <View style={styles.partnerInfo}>
                                        <Text style={[styles.partnerName, isActive && { color: colors.primary }]}>
                                            {p.partnerName}
                                        </Text>
                                        {p.compatibilityScore != null && (
                                            <Text style={styles.partnerScore}>{p.compatibilityScore}% ✦</Text>
                                        )}
                                    </View>
                                    {isActive && <Feather name="check" size={16} color={colors.primary} />}
                                </Pressable>
                            );
                        })}
                        <View style={{ height: spacing.xl }} />
                    </ScrollView>
                )}
            </View>
            </View>
        </Modal>
    );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

const WELCOME_ID = '__welcome__';

export default function ChatScreen() {
    const { t } = useTranslation();
    const { isPremium } = usePremium();
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: WELCOME_ID,
            role: 'assistant',
            content: t('chat.welcomeMessage'),
            createdAt: new Date(),
        },
    ]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [activePartner, setActivePartner] = useState<ChatPartner | null>(null);
    const [pickerVisible, setPickerVisible] = useState(false);
    const [remainingMessages, setRemainingMessages] = useState<number | null>(null);
    const [dailyLimitReached, setDailyLimitReached] = useState(false);
    const listRef = useRef<FlatList>(null);

    const scrollToBottom = useCallback(() => {
        listRef.current?.scrollToEnd({ animated: true });
    }, []);

    const handleSend = useCallback(async () => {
        const text = inputText.trim();
        if (!text || isTyping) return;

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: text,
            createdAt: new Date(),
        };

        setInputText('');
        setMessages((prev) => [...prev, userMsg]);
        setIsTyping(true);

        const history = [...messages.filter((m) => m.id !== WELCOME_ID), userMsg].map(
            ({ role, content }) => ({ role, content })
        );

        try {
            const res = await sendChatMessage(history, activePartner?.id);

            if (res.remaining_messages !== undefined) setRemainingMessages(res.remaining_messages);
            if (res.daily_limit_reached) setDailyLimitReached(true);

            const replyContent = res.success && res.message ? res.message : t('chat.errorMessage');
            setMessages((prev) => [
                ...prev,
                { id: (Date.now() + 1).toString(), role: 'assistant', content: replyContent, createdAt: new Date() },
            ]);
        } catch (err: any) {
            if (err?.status === 403 && err?.payload?.error === 'daily_limit_reached') {
                setDailyLimitReached(true);
                setRemainingMessages(0);
            }
            setMessages((prev) => [
                ...prev,
                { id: (Date.now() + 1).toString(), role: 'assistant', content: t('chat.errorMessage'), createdAt: new Date() },
            ]);
        } finally {
            setIsTyping(false);
        }
    }, [inputText, isTyping, messages, activePartner, t]);

    const renderItem = useCallback(
        ({ item }: { item: ChatMessage }) => <MessageBubble message={item} />,
        []
    );

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerAvatar}>
                    <Text style={styles.headerAvatarText}>✦</Text>
                </View>
                <View style={styles.headerTextWrap}>
                    <Text style={styles.headerName}>{t('chat.astrologerName')}</Text>
                    <Text style={styles.headerStatus}>
                        {isTyping ? t('chat.statusTyping') : t('chat.statusOnline')}
                    </Text>
                </View>
            </View>

            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={0}
            >
                <FlatList
                    ref={listRef}
                    data={messages}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    onContentSizeChange={scrollToBottom}
                    onLayout={scrollToBottom}
                    showsVerticalScrollIndicator={false}
                    ListFooterComponent={isTyping ? <TypingIndicator /> : null}
                />

                {/* Active partner chip */}
                {activePartner && (
                    <View style={styles.partnerChipBar}>
                        <View style={styles.partnerChip}>
                            <Feather name="user" size={12} color={colors.primary} />
                            <Text style={styles.partnerChipText}>{activePartner.partnerName}</Text>
                            <Pressable onPress={() => setActivePartner(null)} hitSlop={8}>
                                <Feather name="x" size={12} color={colors.onSurfaceMuted} />
                            </Pressable>
                        </View>
                    </View>
                )}

                {/* Daily limit banner / counter */}
                {!isPremium && dailyLimitReached && (
                    <View style={styles.limitBanner}>
                        <Text style={styles.limitBannerText}>{t('premium.chatLimitReached')}</Text>
                        <TouchableOpacity onPress={() => router.push('/premium')} activeOpacity={0.8}>
                            <Text style={styles.limitBannerCta}>{t('premium.chatLimitCta')}</Text>
                        </TouchableOpacity>
                    </View>
                )}
                {!isPremium && !dailyLimitReached && remainingMessages !== null && remainingMessages >= 0 && (
                    <View style={styles.limitCounter}>
                        <Text style={styles.limitCounterText}>
                            {t('premium.chatRemaining', { count: remainingMessages })}
                        </Text>
                        <TouchableOpacity onPress={() => router.push('/premium')} hitSlop={8}>
                            <Text style={styles.limitCounterCta}>{t('premium.trialCta')}</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Input bar */}
                <View style={styles.inputBar}>
                    {/* Add partner button — premium only */}
                    {isPremium ? (
                        <Pressable
                            onPress={() => setPickerVisible(true)}
                            style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.7 }]}
                            hitSlop={8}
                        >
                            <Feather
                                name={activePartner ? 'users' : 'user-plus'}
                                size={18}
                                color={activePartner ? colors.primary : colors.onSurfaceMuted}
                            />
                        </Pressable>
                    ) : (
                        <Pressable
                            onPress={() => router.push({ pathname: '/premium', params: { source: 'chat_partner_context' } })}
                            style={[styles.addBtn, { opacity: 0.5 }]}
                            hitSlop={8}
                        >
                            <Feather name="lock" size={18} color={colors.onSurfaceMuted} />
                        </Pressable>
                    )}

                    <TextInput
                        style={[styles.input, (!isPremium && dailyLimitReached) && styles.inputDisabled]}
                        value={inputText}
                        onChangeText={setInputText}
                        placeholder={t('chat.inputPlaceholder')}
                        placeholderTextColor={colors.onSurfaceMuted}
                        multiline
                        maxLength={1000}
                        onSubmitEditing={handleSend}
                        blurOnSubmit={false}
                        returnKeyType="send"
                        editable={isPremium || !dailyLimitReached}
                    />

                    <Pressable
                        onPress={handleSend}
                        disabled={!inputText.trim() || isTyping || (!isPremium && dailyLimitReached)}
                        style={({ pressed }) => [
                            styles.sendBtn,
                            (!inputText.trim() || isTyping || (!isPremium && dailyLimitReached)) && styles.sendBtnDisabled,
                            pressed && styles.sendBtnPressed,
                        ]}
                    >
                        <Feather name="send" size={18} color={colors.surfaceLowest} />
                    </Pressable>
                </View>
            </KeyboardAvoidingView>

            <PartnerPickerModal
                visible={pickerVisible}
                onClose={() => setPickerVisible(false)}
                onSelect={(p) => setActivePartner(p)}
                activePartnerId={activePartner?.id ?? null}
            />
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: colors.surfaceLowest,
    },
    flex: { flex: 1 },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
        backgroundColor: 'rgba(30, 19, 56, 0.80)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.06)',
    },
    headerAvatar: {
        width: 40,
        height: 40,
        borderRadius: radius.full,
        backgroundColor: `${colors.primary}20`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerAvatarText: { fontSize: 18, color: colors.primary },
    headerTextWrap: { flex: 1 },
    headerName: { fontFamily: fonts.display.regular, fontSize: 17, color: colors.onSurface },
    headerStatus: { fontFamily: fonts.body.regular, fontSize: 12, color: colors.onSurfaceMuted, marginTop: 1 },

    // List
    listContent: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.lg,
        gap: spacing.sm,
        paddingBottom: spacing.xl,
    },

    // Bubbles
    bubbleRow: { flexDirection: 'row', marginVertical: 2 },
    bubbleRowUser: { justifyContent: 'flex-end' },
    bubbleRowAI: { justifyContent: 'flex-start' },
    bubble: { maxWidth: '78%', borderRadius: 20, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
    bubbleUser: { borderBottomRightRadius: 4 },
    bubbleAI: {
        backgroundColor: 'rgba(30, 19, 56, 0.70)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        borderBottomLeftRadius: 4,
    },
    bubbleTextUser: { fontFamily: fonts.body.regular, fontSize: 15, lineHeight: 22, color: '#fff' },
    bubbleTextAI: { fontFamily: fonts.body.regular, fontSize: 15, lineHeight: 22, color: colors.onSurface },

    // Typing
    typingRow: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4 },
    typingDot: { width: 7, height: 7, borderRadius: radius.full, backgroundColor: colors.onSurfaceMuted },

    // Partner chip
    partnerChipBar: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.sm,
        paddingTop: 2,
    },
    partnerChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        alignSelf: 'flex-start',
        backgroundColor: `${colors.primary}15`,
        borderRadius: radius.full,
        paddingHorizontal: spacing.md,
        paddingVertical: 5,
        borderWidth: 1,
        borderColor: `${colors.primary}30`,
    },
    partnerChipText: {
        fontFamily: fonts.body.semiBold,
        fontSize: 12,
        color: colors.primary,
        letterSpacing: 0.3,
    },

    // Input bar
    inputBar: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: spacing.sm,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        paddingBottom: spacing.xl,
        backgroundColor: 'rgba(30, 19, 56, 0.95)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.06)',
    },
    addBtn: {
        width: 40,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    input: {
        flex: 1,
        fontFamily: fonts.body.regular,
        fontSize: 15,
        color: colors.onSurface,
        backgroundColor: 'rgba(42, 32, 64, 0.60)',
        borderRadius: radius.xl,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        maxHeight: 120,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    sendBtn: {
        width: 44,
        height: 44,
        borderRadius: radius.full,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendBtnDisabled: { backgroundColor: `${colors.primary}40` },
    sendBtnPressed: { opacity: 0.8, transform: [{ scale: 0.95 }] },
    inputDisabled: { opacity: 0.5 },

    // Limit banner / counter
    limitBanner: {
        backgroundColor: `${colors.primary}15`,
        borderTopWidth: 1,
        borderTopColor: `${colors.primary}25`,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        alignItems: 'center',
        gap: spacing.xs,
    },
    limitBannerText: {
        fontFamily: fonts.body.regular,
        fontSize: 13,
        color: colors.onSurface,
        textAlign: 'center',
    },
    limitBannerCta: {
        fontFamily: fonts.body.semiBold,
        fontSize: 13,
        color: colors.primary,
    },
    limitCounter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.md,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.sm,
    },
    limitCounterText: {
        fontFamily: fonts.body.regular,
        fontSize: 12,
        color: colors.onSurfaceMuted,
    },
    limitCounterCta: {
        fontFamily: fonts.body.semiBold,
        fontSize: 12,
        color: colors.primary,
    },

    // Partner picker modal
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalSheet: {
        backgroundColor: colors.surfaceLow,
        borderTopLeftRadius: radius.xxl,
        borderTopRightRadius: radius.xxl,
        paddingTop: spacing.md,
        paddingHorizontal: spacing.xl,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    modalHandle: {
        width: 40,
        height: 4,
        borderRadius: radius.full,
        backgroundColor: colors.onSurfaceMuted,
        alignSelf: 'center',
        marginBottom: spacing.lg,
        opacity: 0.4,
    },
    modalTitle: {
        fontFamily: fonts.display.regular,
        fontSize: 20,
        color: colors.onSurface,
        marginBottom: spacing.xs,
    },
    modalSubtitle: {
        fontFamily: fonts.body.regular,
        fontSize: 13,
        color: colors.onSurfaceMuted,
        marginBottom: spacing.lg,
    },
    modalList: { maxHeight: SCREEN_HEIGHT * 0.38 },

    partnerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.md,
        borderRadius: radius.md,
        paddingHorizontal: spacing.sm,
    },
    partnerRowActive: { backgroundColor: `${colors.primary}10` },
    partnerIconWrap: {
        width: 36,
        height: 36,
        borderRadius: radius.full,
        backgroundColor: `${colors.onSurfaceMuted}15`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    partnerInfo: { flex: 1 },
    partnerName: {
        fontFamily: fonts.body.semiBold,
        fontSize: 15,
        color: colors.onSurface,
    },
    partnerScore: {
        fontFamily: fonts.body.regular,
        fontSize: 12,
        color: colors.onSurfaceMuted,
        marginTop: 2,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: spacing.xxl,
        paddingHorizontal: spacing.lg,
        gap: spacing.sm,
    },
    emptyIconWrap: {
        width: 52,
        height: 52,
        borderRadius: radius.full,
        backgroundColor: `${colors.onSurfaceMuted}12`,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.xs,
    },
    emptyText: {
        fontFamily: fonts.body.semiBold,
        fontSize: 15,
        color: colors.onSurface,
        textAlign: 'center',
    },
    emptyHint: {
        fontFamily: fonts.body.regular,
        fontSize: 13,
        color: colors.onSurfaceMuted,
        textAlign: 'center',
        lineHeight: 19,
    },
});