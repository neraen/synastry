/**
 * Astrologer AI Chat — Talk to Lyra
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { FeedbackThumbs, Starfield } from '@/components/ui';
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
import { router, useLocalSearchParams } from 'expo-router';
import { usePremium } from '@/hooks/usePremium';
import { useAuth } from '@/contexts/AuthContext';
import {
    sendChatMessageStream,
    getChatPartners,
    getTopicIntro,
    ChatMessage,
    ChatPartner,
} from '@/services/astrology';
import * as FileSystem from 'expo-file-system';
import { createChatSession, getChatSession, updateChatSession } from '@/services/chatSessions';
import { TopicSelectorModal } from '@/components/TopicSelectorModal';
import { SuggestionChips } from '@/components/SuggestionChips';
import { TopicLyra, TOPIC_META } from '@/constants/topics';

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

function MessageBubble({ message, isStreaming, showFeedback }: { message: ChatMessage; isStreaming?: boolean; showFeedback?: boolean }) {
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
                    <Text selectable style={styles.bubbleTextUser}>{message.content}</Text>
                </LinearGradient>
            ) : (
                <View style={styles.aiBubbleWrapper}>
                    <View style={[styles.bubble, styles.bubbleAI, { maxWidth: '100%' }]}>
                        {isStreaming && message.content === '' ? (
                            <View style={styles.typingRow}>
                                <TypingDot delay={0} />
                                <TypingDot delay={150} />
                                <TypingDot delay={300} />
                            </View>
                        ) : (
                            <Text selectable style={styles.bubbleTextAI}>{message.content}</Text>
                        )}
                    </View>
                    {showFeedback && (
                        <View style={styles.feedbackRow}>
                            <FeedbackThumbs
                                contentType="chat"
                                contentRef={message.id}
                            />
                        </View>
                    )}
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
    const { user } = useAuth();
    const { sessionId: paramSessionId } = useLocalSearchParams<{ sessionId?: string }>();
    
    const [sessionId, setSessionId] = useState<number | null>(null);
    const [lastResponseId, setLastResponseId] = useState<string | null>(null);
    const [canReply, setCanReply] = useState(true);
    // Conversation subject: chosen via the mandatory modal on a new chat, or restored
    // from a saved session. null = not yet chosen (modal showing for a new conv).
    const [topic, setTopic] = useState<TopicLyra | null>(null);
    const [topicModalVisible, setTopicModalVisible] = useState(!paramSessionId);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [saveModalVisible, setSaveModalVisible] = useState(false);
    const [chatTitle, setChatTitle] = useState('');
    const [isLoadingSession, setIsLoadingSession] = useState(false);

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
    const [plusTooltipVisible, setPlusTooltipVisible] = useState(false);
    const [freeUsed, setFreeUsed] = useState(false);
    const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null);
    const listRef = useRef<FlatList>(null);
    const twRef = useRef<{ target: string; shown: number; interval: ReturnType<typeof setInterval> | null }>(
        { target: '', shown: 0, interval: null }
    );
    const tooltipAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (paramSessionId) {
            const id = parseInt(paramSessionId, 10);
            if (!isNaN(id)) {
                setSessionId(id);
                setIsLoadingSession(true);
                getChatSession(id)
                    .then(res => {
                        if (res.success && res.session) {
                            const loadedMessages = res.session.messages.map((m: any, idx: number) => ({
                                id: `hist_${idx}`,
                                role: m.role,
                                content: m.content,
                                createdAt: new Date()
                            }));
                            setMessages(loadedMessages);
                            if (res.session.lastResponseId) {
                                setLastResponseId(res.session.lastResponseId);
                            }
                            if (res.session.partnerHistoryId) {
                                setActivePartner({ id: res.session.partnerHistoryId, partnerName: 'Partenaire', compatibilityScore: null });
                            }
                            // Restore the subject from the DB (source of truth); no modal on reload.
                            if (res.session.topic) {
                                setTopic(res.session.topic as TopicLyra);
                            }
                        }
                        if (res.can_reply !== undefined) {
                            setCanReply(res.can_reply);
                        }
                    })
                    .catch(e => console.warn(e))
                    .finally(() => setIsLoadingSession(false));
            }
        }
    }, [paramSessionId]);

    // ── Init: load free-use flag + tooltip state ──────────────────────────────
    const FREE_USED_FILE    = FileSystem.documentDirectory ? `${FileSystem.documentDirectory}chat_free_used` : null;
    const TOOLTIP_DONE_FILE = FileSystem.documentDirectory ? `${FileSystem.documentDirectory}chat_tooltip_done` : null;

    useEffect(() => {
        if (isPremium || !FREE_USED_FILE || !TOOLTIP_DONE_FILE) return;
        Promise.all([
            FileSystem.getInfoAsync(FREE_USED_FILE),
            FileSystem.getInfoAsync(TOOLTIP_DONE_FILE),
        ]).then(([freeInfo, tooltipInfo]) => {
            if (freeInfo.exists) setFreeUsed(true);
            if (!tooltipInfo.exists) {
                setPlusTooltipVisible(true);
                Animated.sequence([
                    Animated.timing(tooltipAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
                    Animated.delay(3000),
                    Animated.timing(tooltipAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
                ]).start(() => {
                    setPlusTooltipVisible(false);
                    FileSystem.writeAsStringAsync(TOOLTIP_DONE_FILE!, '1').catch(() => {});
                });
            }
        });
    }, [isPremium]);

    const handleSaveChat = async () => {
        if (!isPremium) return;
        const toSave = messages.filter(m => m.id !== WELCOME_ID).map(m => ({ role: m.role, content: m.content }));
        try {
            const res = await createChatSession(chatTitle, toSave, activePartner?.id, topic ?? undefined);
            if (res.success && res.id) {
                setSessionId(res.id);
                setSaveModalVisible(false);
            }
        } catch (e) {
            console.warn(e);
        }
    };

    // Topic chosen in the mandatory selector: fetch the static welcome + chips,
    // then start the conversation. The topic is sent with every subsequent message.
    const handleSelectTopic = useCallback(async (selected: TopicLyra) => {
        setTopic(selected);
        setTopicModalVisible(false);
        try {
            const intro = await getTopicIntro(selected);
            if (intro.success && intro.welcome_message) {
                setMessages([
                    { id: WELCOME_ID, role: 'assistant', content: intro.welcome_message, createdAt: new Date() },
                ]);
                setSuggestions(intro.suggestions ?? []);
            }
        } catch (e) {
            console.warn('[Chat] getTopicIntro error:', e);
        }
    }, []);

    const handleNewChat = useCallback(() => {
        if (paramSessionId) {
            router.setParams({ sessionId: '' });
        }
        setSessionId(null);
        setLastResponseId(null);
        setMessages([
            {
                id: WELCOME_ID,
                role: 'assistant',
                content: t('chat.welcomeMessage'),
                createdAt: new Date(),
            },
        ]);
        setActivePartner(null);
        setChatTitle('');
        setCanReply(true);
        // Re-open the subject selector for the new conversation.
        setTopic(null);
        setSuggestions([]);
        setTopicModalVisible(true);
    }, [paramSessionId, t]);

    const scrollToBottom = useCallback(() => {
        listRef.current?.scrollToEnd({ animated: true });
    }, []);

    const submitMessage = useCallback(async (rawText: string) => {
        const text = rawText.trim();
        if (!text || isTyping || streamingMsgId) return;

        // Any send dismisses the suggestion chips for good.
        setSuggestions([]);

        // Non-premium: enforce 1 free use
        if (!isPremium && freeUsed && !dailyLimitReached) {
            router.push({ pathname: '/premium', params: { source: 'chat_free_limit' } });
            return;
        }

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: text,
            createdAt: new Date(),
        };

        const tempId = (Date.now() + 1).toString();
        setInputText('');
        setMessages((prev) => [...prev, userMsg]);
        setIsTyping(true);

        const history = [...messages.filter((m) => m.id !== WELCOME_ID), userMsg].map(
            ({ role, content }) => ({ role, content })
        );

        // Reset typewriter
        twRef.current.target = '';
        twRef.current.shown = 0;
        if (twRef.current.interval) {
            clearInterval(twRef.current.interval);
            twRef.current.interval = null;
        }

        try {
            const placeholderMsg: ChatMessage = { id: tempId, role: 'assistant', content: '', createdAt: new Date() };
            setStreamingMsgId(tempId);
            setIsTyping(false);
            setMessages((prev) => [...prev, placeholderMsg]);

            // Typewriter: reveal 4 chars every 16ms (~250 chars/sec)
            twRef.current.interval = setInterval(() => {
                const tw = twRef.current;
                if (tw.shown >= tw.target.length) return;
                tw.shown = Math.min(tw.shown + 4, tw.target.length);
                const next = tw.target.slice(0, tw.shown);
                setMessages((prev) => prev.map((m) => m.id === tempId ? { ...m, content: next } : m));
            }, 16);

            const result = await sendChatMessageStream(
                history,
                activePartner?.id,
                lastResponseId ?? undefined,
                (delta) => { twRef.current.target += delta; },
                topic ?? undefined,
            );

            // Stream done — clear interval and fast-forward to full content
            clearInterval(twRef.current.interval);
            twRef.current.interval = null;
            setMessages((prev) => prev.map((m) => m.id === tempId ? { ...m, content: twRef.current.target } : m));

            if (result.remainingMessages !== null) setRemainingMessages(result.remainingMessages);
            if (result.dailyLimitReached) setDailyLimitReached(true);
            if (result.responseId) setLastResponseId(result.responseId);

            if (!isPremium && !freeUsed && FREE_USED_FILE) {
                setFreeUsed(true);
                FileSystem.writeAsStringAsync(FREE_USED_FILE, '1').catch(() => {});
            }

            setMessages((prev) => {
                if (sessionId) {
                    const toSave = prev.filter(m => m.id !== WELCOME_ID).map(m => ({ role: m.role, content: m.content }));
                    updateChatSession(sessionId, toSave, result.responseId ?? lastResponseId).catch(e => console.warn(e));
                }
                return prev;
            });
        } catch (err: any) {
            if (twRef.current.interval) {
                clearInterval(twRef.current.interval);
                twRef.current.interval = null;
            }
            if (err?.status === 403 && err?.payload?.error === 'daily_limit_reached') {
                setDailyLimitReached(true);
                setRemainingMessages(0);
                setMessages((prev) => prev.filter(m => m.id !== tempId));
            } else {
                setMessages((prev) =>
                    prev.map((m) => m.id === tempId ? { ...m, content: t('chat.errorMessage') } : m)
                );
            }
        } finally {
            setIsTyping(false);
            setStreamingMsgId(null);
        }
    }, [isTyping, streamingMsgId, messages, activePartner, t, isPremium, freeUsed, dailyLimitReached, lastResponseId, sessionId, topic]);

    const handleSend = useCallback(() => submitMessage(inputText), [submitMessage, inputText]);
    const handleChipSelect = useCallback((text: string) => submitMessage(text), [submitMessage]);

    const renderItem = useCallback(
        ({ item }: { item: ChatMessage }) => (
            <MessageBubble
                message={item}
                isStreaming={item.id === streamingMsgId && item.content === ''}
                showFeedback={item.role === 'assistant' && item.id !== WELCOME_ID && item.id !== streamingMsgId}
            />
        ),
        [streamingMsgId]
    );

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <Starfield />
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerAvatar}>
                    <Text style={styles.headerAvatarText}>✦</Text>
                </View>
                <View style={styles.headerTextWrap}>
                    <Text style={styles.headerName}>{t('chat.astrologerName')}</Text>
                    {topic && topic !== 'libre' ? (
                        <View style={styles.topicBadge}>
                            <Text style={styles.topicBadgeText}>
                                {TOPIC_META[topic].emoji} {TOPIC_META[topic].label}
                            </Text>
                        </View>
                    ) : (
                        <Text style={styles.headerStatus}>
                            {isTyping ? t('chat.statusTyping') : t('chat.statusOnline')}
                        </Text>
                    )}
                </View>
                <View style={{ flexDirection: 'row', gap: spacing.md }}>
                    <Pressable onPress={handleNewChat} hitSlop={10}>
                        <Feather name="edit" size={20} color={colors.onSurface} />
                    </Pressable>
                    {!sessionId && isPremium && (
                        <Pressable onPress={() => setSaveModalVisible(true)} hitSlop={10}>
                            <Feather name="bookmark" size={20} color={colors.onSurface} />
                        </Pressable>
                    )}
                    <Pressable onPress={() => router.push('/chat-history')} hitSlop={10}>
                        <Feather name="clock" size={20} color={colors.onSurface} />
                    </Pressable>
                </View>
            </View>

            {/* No birth profile — subtle banner */}
            {!user?.hasBirthProfile && (
                <Pressable
                    style={styles.noBirthBanner}
                    onPress={() => router.push('/birth-profile')}
                >
                    <Text style={styles.noBirthBannerIcon}>✦</Text>
                    <Text style={styles.noBirthBannerText}>{t('chat.noBirthProfileBanner')}</Text>
                    <Text style={styles.noBirthBannerCta}>{t('chat.noBirthProfileBannerCta')} →</Text>
                </Pressable>
            )}

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
                    ListFooterComponent={
                        suggestions.length > 0
                            ? <SuggestionChips suggestions={suggestions} onSelect={handleChipSelect} />
                            : (isTyping ? <TypingIndicator /> : null)
                    }
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
                    {/* Add partner button */}
                    <View>
                        {/* Tooltip bubble (first display for non-premium) */}
                        {plusTooltipVisible && !isPremium && (
                            <Animated.View style={[styles.plusTooltip, { opacity: tooltipAnim, transform: [{ translateY: tooltipAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }]}>
                                <Text style={styles.plusTooltipText}>{t('chat.plusTooltip')}</Text>
                            </Animated.View>
                        )}
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
                    </View>

                    <TextInput
                        style={[styles.input, (!isPremium && dailyLimitReached) && styles.inputDisabled]}
                        value={inputText}
                        onChangeText={(v) => {
                            setInputText(v);
                            // Typing manually dismisses the chips.
                            if (v.length > 0 && suggestions.length > 0) setSuggestions([]);
                        }}
                        placeholder={t('chat.inputPlaceholder')}
                        placeholderTextColor={colors.onSurfaceMuted}
                        multiline
                        maxLength={1000}
                        onSubmitEditing={handleSend}
                        blurOnSubmit={false}
                        returnKeyType="send"
                        editable={(isPremium || !dailyLimitReached) && canReply}
                    />

                    <Pressable
                        onPress={handleSend}
                        disabled={!inputText.trim() || isTyping || !!streamingMsgId || (!isPremium && dailyLimitReached) || !canReply}
                        style={({ pressed }) => [
                            styles.sendBtn,
                            (!inputText.trim() || isTyping || !!streamingMsgId || (!isPremium && dailyLimitReached) || !canReply) && styles.sendBtnDisabled,
                            pressed && styles.sendBtnPressed,
                        ]}
                    >
                        <Feather name="send" size={18} color={colors.surfaceLowest} />
                    </Pressable>
                </View>
            </KeyboardAvoidingView>

            <TopicSelectorModal
                visible={topicModalVisible}
                onSelect={handleSelectTopic}
            />

            <PartnerPickerModal
                visible={pickerVisible}
                onClose={() => setPickerVisible(false)}
                onSelect={(p) => setActivePartner(p)}
                activePartnerId={activePartner?.id ?? null}
            />

            {/* Save Chat Modal */}
            <Modal visible={saveModalVisible} transparent animationType="fade" onRequestClose={() => setSaveModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.saveModalContent}>
                        <Text style={styles.saveModalTitle}>{t('chat.saveChatTitle', 'Sauvegarder la discussion')}</Text>
                        <Text style={styles.saveModalSubtitle}>
                            {t('chat.saveChatDesc', 'Donnez un nom à cette discussion, ou laissez vide pour que l\'IA en génère un.')}
                        </Text>
                        
                        <TextInput
                            style={styles.saveInput}
                            value={chatTitle}
                            onChangeText={setChatTitle}
                            placeholder={t('chat.savePlaceholder', 'Ex: Ma vie pro...')}
                            placeholderTextColor={colors.onSurfaceMuted}
                            autoFocus
                        />
                        
                        <View style={styles.saveModalActions}>
                            <TouchableOpacity style={styles.saveBtnCancel} onPress={() => setSaveModalVisible(false)}>
                                <Text style={styles.saveBtnCancelText}>{t('common.cancel', 'Annuler')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtnConfirm} onPress={handleSaveChat}>
                                <Text style={styles.saveBtnConfirmText}>{t('common.save', 'Sauvegarder')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
    topicBadge: {
        alignSelf: 'flex-start',
        marginTop: 3,
        backgroundColor: `${colors.primary}33`,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: `${colors.primary}55`,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
    },
    topicBadgeText: {
        fontFamily: fonts.body.semiBold,
        fontSize: 11,
        color: colors.primary,
        letterSpacing: 0.2,
    },

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

    aiBubbleWrapper: {
        maxWidth: '78%',
    },
    feedbackRow: {
        paddingLeft: spacing.sm,
        paddingTop: 4,
        paddingBottom: 2,
    },

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
    plusTooltip: {
        position: 'absolute',
        bottom: 52,
        left: -8,
        backgroundColor: colors.surfaceContainerHigh,
        borderRadius: radius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        width: 180,
        zIndex: 100,
    },
    plusTooltipText: {
        fontFamily: fonts.body.regular,
        fontSize: 12,
        color: colors.onSurface,
        lineHeight: 18,
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

    // No birth profile banner
    noBirthBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        backgroundColor: `${colors.primary}10`,
        borderBottomWidth: 1,
        borderBottomColor: `${colors.primary}18`,
    },
    noBirthBannerIcon: {
        fontSize: 12,
        color: colors.primary,
    },
    noBirthBannerText: {
        flex: 1,
        fontFamily: fonts.body.regular,
        fontSize: 12,
        color: colors.onSurfaceMuted,
        lineHeight: 17,
    },
    noBirthBannerCta: {
        fontFamily: fonts.body.semiBold,
        fontSize: 12,
        color: colors.primary,
    },

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
    
    // Save Modal
    saveModalContent: {
        backgroundColor: colors.surfaceLow,
        margin: spacing.xl,
        borderRadius: radius.xl,
        padding: spacing.xl,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        top: '25%',
    },
    saveModalTitle: {
        fontFamily: fonts.display.regular,
        fontSize: 18,
        color: colors.onSurface,
        marginBottom: spacing.xs,
    },
    saveModalSubtitle: {
        fontFamily: fonts.body.regular,
        fontSize: 13,
        color: colors.onSurfaceMuted,
        marginBottom: spacing.lg,
    },
    saveInput: {
        fontFamily: fonts.body.regular,
        fontSize: 15,
        color: colors.onSurface,
        backgroundColor: 'rgba(42, 32, 64, 0.60)',
        borderRadius: radius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        marginBottom: spacing.xl,
    },
    saveModalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: spacing.md,
    },
    saveBtnCancel: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    saveBtnCancelText: {
        fontFamily: fonts.body.semiBold,
        fontSize: 14,
        color: colors.onSurfaceMuted,
    },
    saveBtnConfirm: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: radius.md,
    },
    saveBtnConfirmText: {
        fontFamily: fonts.body.semiBold,
        fontSize: 14,
        color: colors.surfaceLowest,
    },
});