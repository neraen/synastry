import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    Image,
    StyleSheet,
    Modal,
    Alert,
    Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { GlassCard, GoldButton, GhostButton, TabHeader, Starfield } from '@/components/ui';
import { FullPageLoader } from '@/components/loaders';
import { getSignAvatar } from '@/utils/signAvatar';
import { colors, spacing, radius, fonts } from '@/theme';
import { deleteAccountText } from '@/constants/legalTexts';
import { getApiEnv, setApiEnv, LOCAL_URL, PROD_URL } from '@/services/apiConfig';
import { api } from '@/services/api';
import { getToken } from '@/services/auth';
import { getAiModel, setAiModel, MODEL_MINI, MODEL_PRO, MODEL_MINI5, MODEL_CLAUDE_SONNET, MODEL_CLAUDE_HAIKU, AiModel } from '@/services/aiModelConfig';

// ─── Preference Row ────────────────────────────────────────────────────────────
interface PrefRowProps {
    icon: keyof typeof Feather.glyphMap;
    title: string;
    subtitle?: string;
    onPress: () => void;
    danger?: boolean;
    showChevron?: boolean;
}

function PrefRow({ icon, title, subtitle, onPress, danger = false, showChevron = true }: PrefRowProps) {
    return (
        <Pressable style={styles.prefRow} onPress={onPress} android_ripple={{ color: 'rgba(255,255,255,0.05)' }}>
            <View style={[styles.prefIconBubble, danger && styles.prefIconBubbleDanger]}>
                <Feather name={icon} size={18} color={danger ? colors.error : colors.primary} strokeWidth={1.5} />
            </View>
            <View style={styles.prefInfo}>
                <Text style={[styles.prefTitle, danger && styles.prefTitleDanger]}>{title}</Text>
                {subtitle && <Text style={styles.prefSubtitle}>{subtitle}</Text>}
            </View>
            {showChevron && !danger && (
                <Feather name="chevron-right" size={16} color={colors.onSurfaceMuted} />
            )}
        </Pressable>
    );
}

// ─── Subscription Card ─────────────────────────────────────────────────────────
function SubscriptionCard({ isPremium, premiumUntil }: { isPremium?: boolean; premiumUntil?: string | null }) {
    const router = useRouter();
    const { t } = useTranslation();

    const formattedDate = premiumUntil
        ? new Date(premiumUntil).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
        : null;

    if (isPremium && formattedDate) {
        return (
            <View style={styles.section}>
                <LinearGradient
                    colors={[colors.primary, colors.primaryContainer]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.subCardGold}
                >
                    <View style={styles.subCardRow}>
                        <View style={styles.subIconWrap}>
                            <Text style={styles.subIcon}>★</Text>
                        </View>
                        <View style={styles.subInfo}>
                            <Text style={styles.subTitleDark}>{t('profile.premiumActive')}</Text>
                            <Text style={styles.subSubtitleDark}>{t('profile.premiumRenewal', { date: formattedDate })}</Text>
                        </View>
                        <View style={styles.subActiveBadge}>
                            <Text style={styles.subActiveBadgeText}>{t('profile.premiumActiveBadge')}</Text>
                        </View>
                    </View>
                </LinearGradient>
            </View>
        );
    }

    return (
        <View style={styles.section}>
            <GlassCard opacity="medium" radius="xl" padding="none">
                <View style={styles.subCardRow}>
                    <View style={[styles.subIconWrap, styles.subIconWrapDim]}>
                        <Text style={styles.subIconDim}>★</Text>
                    </View>
                    <View style={styles.subInfo}>
                        <Text style={styles.subTitle}>{t('profile.upgradePremium')}</Text>
                        <Text style={styles.subSubtitle}>{t('profile.upgradeSubtitle')}</Text>
                    </View>
                    <Pressable onPress={() => router.push('/premium')} style={styles.subCta} hitSlop={8}>
                        <LinearGradient
                            colors={[colors.primary, colors.primaryContainer]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.subCtaGradient}
                        >
                            <Text style={styles.subCtaText}>{t('profile.upgradeBtn')}</Text>
                        </LinearGradient>
                    </Pressable>
                </View>
            </GlassCard>
        </View>
    );
}

// ─── Screen ────────────────────────────────────────────────────────────────────
export default function ProfileTab() {
    const router = useRouter();
    const { t } = useTranslation();
    const { user, isAuthenticated, isLoading, logout, deleteAccount } = useAuth();
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isLocal, setIsLocal] = useState(getApiEnv() === 'local');
    const [aiModel, setAiModelState] = useState<AiModel>(getAiModel());

    useEffect(() => {
        setIsLocal(getApiEnv() === 'local');
        setAiModelState(getAiModel());
    }, []);

    async function toggleApiEnv(value: boolean) {
        setIsLocal(value);
        await setApiEnv(value ? 'local' : 'prod');
    }

    async function selectAiModel(model: AiModel) {
        setAiModelState(model);
        await setAiModel(model);
    }

    async function forcePremium() {
        try {
            const token = await getToken();
            await api.post('/api/dev/force-premium', {}, { headers: { Authorization: `Bearer ${token}` } });
            Alert.alert('✓ Premium activé', 'Reconnecte-toi pour que le statut se mette à jour.');
        } catch (e: any) {
            Alert.alert('Erreur', e?.message ?? 'Impossible d\'activer le premium');
        }
    }

    const handleDeleteAccount = async () => {
        setIsDeleting(true);
        try {
            await deleteAccount();
            setShowDeleteModal(false);
            // Navigation handled by (tabs)/_layout.tsx redirect when isAuthenticated becomes false
        } catch (e: any) {
            Alert.alert(t('common.error'), e?.message || t('profile.deleteError'));
        } finally {
            setIsDeleting(false);
        }
    };

    if (!isLoading && (!isAuthenticated || !user)) return null;

    const displayName = user ? (user.firstName || user.email.split('@')[0]) : '';
    const initials = displayName ? displayName.charAt(0).toUpperCase() : '';
    const signAvatar = user ? getSignAvatar(user.birthProfile?.birthDate) : undefined;

    return (
        <View style={styles.screen}>
            <Starfield />
            {user && (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <TabHeader />

                    {/* ── Profile Hero ───────────────────────────────────────── */}
                    <View style={styles.hero}>
                        {/* Avatar with gold ring */}
                        <View style={styles.avatarWrap}>
                            <LinearGradient
                                colors={[colors.primary, colors.primaryContainer]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.avatarRing}
                            >
                                <View style={styles.avatarInner}>
                                    {signAvatar ? (
                                        <Image source={signAvatar} style={styles.avatarImage} />
                                    ) : (
                                        <Text style={styles.avatarInitial}>{initials}</Text>
                                    )}
                                </View>
                            </LinearGradient>
                            {/* Online dot */}
                            <View style={styles.onlineDot} />
                        </View>

                        <Text style={styles.heroName}>{displayName}</Text>
                        <Text style={styles.heroEmail}>{user.email}</Text>

                        {/* Birth profile status chip */}
                        <View style={[
                            styles.statusChip,
                            user.hasBirthProfile ? styles.statusChipComplete : styles.statusChipIncomplete,
                        ]}>
                            <View style={[
                                styles.statusDot,
                                { backgroundColor: user.hasBirthProfile ? '#4ade80' : colors.primary },
                            ]} />
                            <Text style={[
                                styles.statusChipText,
                                { color: user.hasBirthProfile ? '#4ade80' : colors.primary },
                            ]}>
                                {user.hasBirthProfile ? t('profile.profileComplete') : t('profile.profileIncomplete')}
                            </Text>
                        </View>
                    </View>

                    {/* ── Subscription card ─────────────────────────────────── */}
                    <SubscriptionCard isPremium={user.isPremium} premiumUntil={user.premiumUntil} />

                    {/* ── Natal chart shortcut (if has profile) ──────────────── */}
                    {user.hasBirthProfile && (
                        <View style={styles.section}>
                            <GlassCard opacity="medium" radius="xl">
                                <View style={styles.natalRow}>
                                    <View style={styles.natalIcon}>
                                        <Feather name="star" size={20} color={colors.primary} />
                                    </View>
                                    <View style={styles.natalInfo}>
                                        <Text style={styles.natalTitle}>{t('profile.natalChartTitle')}</Text>
                                        <Text style={styles.natalSubtitle}>{t('profile.natalChartSubtitle')}</Text>
                                    </View>
                                    <Pressable
                                        onPress={() => router.push('/(tabs)/horoscope')}
                                        style={styles.natalBtn}
                                        hitSlop={8}
                                    >
                                        <Text style={styles.natalBtnText}>{t('profile.natalChartBtn')}</Text>
                                        <Feather name="arrow-up-right" size={12} color={colors.primary} />
                                    </Pressable>
                                </View>
                            </GlassCard>
                        </View>
                    )}

                    {/* ── Historique des compatibilités ─────────────────────── */}
                    <View style={styles.section}>
                        <GlassCard opacity="medium" radius="xl">
                            <View style={styles.natalRow}>
                                <View style={styles.natalIcon}>
                                    <Feather name="clock" size={20} color={colors.primary} />
                                </View>
                                <View style={styles.natalInfo}>
                                    <Text style={styles.natalTitle}>{t('profile.historyCardTitle')}</Text>
                                    <Text style={styles.natalSubtitle}>{t('profile.historyCardSubtitle')}</Text>
                                </View>
                                <Pressable
                                    onPress={() => router.push('/(tabs)/history')}
                                    style={styles.natalBtn}
                                    hitSlop={8}
                                >
                                    <Text style={styles.natalBtnText}>{t('profile.historyCardBtn')}</Text>
                                    <Feather name="arrow-up-right" size={12} color={colors.primary} />
                                </Pressable>
                            </View>
                        </GlassCard>
                    </View>

                    {/* ── Profil astrologique ────────────────────────────────── */}
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>{t('profile.sectionMyProfile')}</Text>
                        <GlassCard opacity="low" radius="xl">
                            <PrefRow
                                icon="user"
                                title={user.hasBirthProfile ? t('profile.editBirthProfile') : t('profile.completeBirthProfile')}
                                subtitle={user.hasBirthProfile ? t('profile.birthProfileSubtitle') : t('profile.birthProfileRequired')}
                                onPress={() => router.push('/birth-profile')}
                            />
                        </GlassCard>
                    </View>

                    {/* ── Preferences & Alignment ────────────────────────────── */}
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>{t('profile.sectionPreferences')}</Text>
                        <GlassCard opacity="low" radius="xl">
                            <PrefRow
                                icon="help-circle"
                                title={t('profile.helpCenter')}
                                subtitle={t('profile.helpCenterSubtitle')}
                                onPress={() => router.push('/help')}
                            />
                            <View style={styles.prefSep} />
                            <PrefRow
                                icon="bell"
                                title="Notifications"
                                subtitle="Transits, événements du ciel, rappels"
                                onPress={() => router.push('/notification-preferences')}
                            />
                            <View style={styles.prefSep} />
                            <PrefRow
                                icon="shield"
                                title={t('profile.privacyPolicy')}
                                onPress={() => router.push('/privacy-policy')}
                            />
                            <View style={styles.prefSep} />
                            <PrefRow
                                icon="file-text"
                                title={t('profile.termsOfService')}
                                onPress={() => router.push('/terms-of-service')}
                            />
                            <View style={styles.prefSep} />
                            <PrefRow
                                icon="info"
                                title={t('profile.legalNotice')}
                                onPress={() => router.push('/legal-notice')}
                            />
                            <View style={styles.prefSep} />
                            <PrefRow
                                icon="log-out"
                                title={t('auth.logout')}
                                onPress={logout}
                                danger
                                showChevron={false}
                            />
                        </GlassCard>
                    </View>

                    {/* ── Delete account ─────────────────────────────────────── */}
                    <View style={styles.deleteWrap}>
                        <Pressable onPress={() => setShowDeleteModal(true)} hitSlop={8}>
                            <Text style={styles.deleteText}>{t('profile.deleteAccount')}</Text>
                        </Pressable>
                    </View>

                    {/* ── Dev Tools ──────────────────────────────────────────── */}
                    <View style={styles.demoSection}>
                        <Text style={styles.sectionLabel}>{t('profile.sectionDevelopment')}</Text>
                        <GlassCard opacity="low" radius="xl">
                            <View style={styles.devRow}>
                                <View style={styles.devInfo}>
                                    <Text style={styles.devTitle}>
                                        {isLocal ? t('profile.localServer') : t('profile.prodServer')}
                                    </Text>
                                    <Text style={styles.devUrl} numberOfLines={1}>
                                        {isLocal ? LOCAL_URL : PROD_URL}
                                    </Text>
                                </View>
                                <Switch
                                    value={isLocal}
                                    onValueChange={toggleApiEnv}
                                    trackColor={{ false: `${colors.primary}40`, true: `${colors.secondary}60` }}
                                    thumbColor={isLocal ? colors.secondary : colors.primary}
                                />
                            </View>

                            <View style={styles.devDivider} />

                            <View style={styles.devModelPicker}>
                                {(
                                    [
                                        { key: 'mini',         label: MODEL_MINI,          sub: 'Rapide — défaut' },
                                        { key: 'pro',          label: MODEL_PRO,            sub: 'Qualité max'     },
                                        { key: 'mini5',        label: MODEL_MINI5,          sub: 'Nouveau'         },
                                        { key: 'claude-sonnet', label: MODEL_CLAUDE_SONNET, sub: 'Anthropic'       },
                                        { key: 'claude-haiku',  label: MODEL_CLAUDE_HAIKU,  sub: 'Anthropic — rapide' },
                                    ] as { key: AiModel; label: string; sub: string }[]
                                ).map(({ key, label, sub }) => {
                                    const active = aiModel === key;
                                    return (
                                        <Pressable
                                            key={key}
                                            style={[styles.devModelOption, active && styles.devModelOptionActive]}
                                            onPress={() => selectAiModel(key)}
                                        >
                                            <Text style={[styles.devTitle, active && styles.devModelLabelActive]} numberOfLines={1}>
                                                {label}
                                            </Text>
                                            <Text style={styles.devUrl}>{sub}</Text>
                                        </Pressable>
                                    );
                                })}
                            </View>

                            <View style={styles.devDivider} />

                            <Pressable style={styles.devPremiumBtn} onPress={forcePremium}>
                                <Text style={styles.devPremiumLabel}>⚡ Activer Premium</Text>
                            </Pressable>
                        </GlassCard>
                    </View>

                    {/* ── Design Demo ────────────────────────────────────────── */}
                    <View style={styles.demoSection}>
                        <Text style={styles.sectionLabel}>{t('profile.sectionDesignDemo')}</Text>
                        <View style={styles.demoGrid}>
                            {[
                                { label: 'Home', route: '/demo/home' },
                                { label: 'Matches', route: '/demo/matches' },
                                { label: 'Profile', route: '/demo/profile-view' },
                                { label: 'Login', route: '/demo/login' },
                                { label: 'Share', route: '/demo/share' },
                                { label: 'Onboarding', route: '/onboarding' },
                                { label: 'Thème Astral', route: '/natal-chart-wheel' },
                                { label: 'Thème Natal Design', route: '/theme-natal-design' },
                                { label: 'Portrait Astral', route: '/astral-hero' },
                                { label: 'Thème Natal 4', route: '/test-theme-natal-4' },
                                { label: 'Onboarding 2', route: '/onboarding2' },
                                { label: 'Loaders', route: '/loaders-showcase' },
                                { label: 'Loader Zodiac', route: '/loader-zodiac' },
                                { label: 'Loader Saturn', route: '/loader-saturn' },
                                { label: 'Loader Eclipse', route: '/loader-eclipse' },
                                { label: 'Loader Lunar', route: '/loader-lunar-phases' },
                                { label: 'Compat V2', route: '/compatibility-result-v2' },
                                { label: 'Share V2', route: '/share-card-v2' },
                            ].map((item) => (
                                <Pressable
                                    key={item.route}
                                    style={styles.demoBtn}
                                    onPress={() => router.push(item.route as any)}
                                >
                                    <Text style={styles.demoBtnText}>{item.label}</Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>

                    <View style={{ height: 100 }} />
                </ScrollView>
            </SafeAreaView>
        )}

            {/* ── Delete Account Modal ──────────────────────────────────────── */}
            <Modal
                visible={showDeleteModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowDeleteModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <GlassCard opacity="high" radius="xl" style={styles.modalCard}>
                        <Text style={styles.modalEmoji}>⚠️</Text>
                        <Text style={styles.modalTitle}>{deleteAccountText.title}</Text>
                        <Text style={styles.modalBody}>{deleteAccountText.warning}</Text>
                        <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
                            <GoldButton
                                label={deleteAccountText.confirm}
                                onPress={handleDeleteAccount}
                                loading={isDeleting}
                            />
                            <GhostButton
                                label={deleteAccountText.cancel}
                                onPress={() => setShowDeleteModal(false)}
                                disabled={isDeleting}
                            />
                        </View>
                    </GlassCard>
                </View>
            </Modal>
            <FullPageLoader visible={isLoading} variant="profile" />
        </View>
    );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.surfaceLowest },
    safeArea: { flex: 1 },
    scroll: { flex: 1 },
    scrollContent: { flexGrow: 1 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
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

    // Hero
    hero: {
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.xl,
        paddingBottom: spacing.xxxl,
    },
    avatarWrap: {
        position: 'relative',
        marginBottom: spacing.xl,
    },
    avatarRing: {
        width: 108,
        height: 108,
        borderRadius: 54,
        padding: 3,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarInner: {
        width: 102,
        height: 102,
        borderRadius: 51,
        backgroundColor: colors.surfaceContainerHigh,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarInitial: {
        fontFamily: fonts.display.bold,
        fontSize: 42,
        color: colors.onSurface,
        lineHeight: 50,
    },
    avatarImage: {
        width: 102,
        height: 102,
        borderRadius: 51,
    },
    onlineDot: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#4ade80',
        borderWidth: 2,
        borderColor: colors.surfaceLowest,
    },
    heroName: {
        fontFamily: fonts.display.bold,
        fontSize: 30,
        color: colors.onSurface,
        letterSpacing: 0.3,
        marginBottom: spacing.xs,
    },
    heroEmail: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        color: colors.onSurfaceMuted,
        marginBottom: spacing.lg,
    },
    statusChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.md,
        paddingVertical: 6,
        borderRadius: radius.full,
    },
    statusChipComplete: { backgroundColor: 'rgba(74, 222, 128, 0.10)' },
    statusChipIncomplete: { backgroundColor: `${colors.primary}1A` },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusChipText: {
        fontFamily: fonts.body.semiBold,
        fontSize: 10,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },

    // Sections
    section: {
        paddingHorizontal: spacing.xl,
        marginBottom: spacing.xxl,
    },
    sectionLabel: {
        fontFamily: fonts.body.semiBold,
        fontSize: 10,
        letterSpacing: 1.5,
        color: colors.onSurfaceMuted,
        textTransform: 'uppercase',
        marginBottom: spacing.md,
    },

    // Subscription card
    subCardGold: {
        borderRadius: radius.xl,
    },
    subCardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        padding: spacing.xl,
    },
    subIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(19,8,39,0.20)',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    subIconWrapDim: {
        backgroundColor: `${colors.primary}1A`,
    },
    subIcon: {
        fontSize: 18,
        color: colors.surfaceLowest,
    },
    subIconDim: {
        fontSize: 18,
        color: colors.primary,
    },
    subInfo: { flex: 1 },
    subTitleDark: {
        fontFamily: fonts.display.regular,
        fontSize: 16,
        color: colors.surfaceLowest,
        marginBottom: 2,
    },
    subSubtitleDark: {
        fontFamily: fonts.body.regular,
        fontSize: 12,
        color: 'rgba(19,8,39,0.65)',
    },
    subTitle: {
        fontFamily: fonts.display.regular,
        fontSize: 16,
        color: colors.onSurface,
        marginBottom: 2,
    },
    subSubtitle: {
        fontFamily: fonts.body.regular,
        fontSize: 12,
        color: colors.onSurfaceMuted,
    },
    subActiveBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        backgroundColor: 'rgba(19,8,39,0.20)',
        borderRadius: radius.full,
    },
    subActiveBadgeText: {
        fontFamily: fonts.body.semiBold,
        fontSize: 9,
        letterSpacing: 1.5,
        color: colors.surfaceLowest,
        textTransform: 'uppercase',
    },
    subCta: {
        borderRadius: radius.full,
        overflow: 'hidden',
        flexShrink: 0,
    },
    subCtaGradient: {
        paddingHorizontal: spacing.md,
        paddingVertical: 8,
        borderRadius: radius.full,
    },
    subCtaText: {
        fontFamily: fonts.body.semiBold,
        fontSize: 10,
        letterSpacing: 1.5,
        color: colors.surfaceLowest,
        textTransform: 'uppercase',
    },

    // Natal card
    natalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    natalIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: `${colors.primary}1A`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    natalInfo: { flex: 1 },
    natalTitle: {
        fontFamily: fonts.display.regular,
        fontSize: 16,
        color: colors.onSurface,
        marginBottom: 2,
    },
    natalSubtitle: {
        fontFamily: fonts.body.regular,
        fontSize: 12,
        color: colors.onSurfaceMuted,
    },
    natalBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    natalBtnText: {
        fontFamily: fonts.body.semiBold,
        fontSize: 10,
        letterSpacing: 1.5,
        color: colors.primary,
        textTransform: 'uppercase',
    },

    // Preference rows
    prefRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.md,
    },
    prefIconBubble: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: `${colors.primary}1A`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    prefIconBubbleDanger: {
        backgroundColor: `${colors.error}1A`,
    },
    prefInfo: { flex: 1 },
    prefTitle: {
        fontFamily: fonts.body.medium,
        fontSize: 15,
        color: colors.onSurface,
    },
    prefTitleDanger: { color: colors.error },
    prefSubtitle: {
        fontFamily: fonts.body.regular,
        fontSize: 12,
        color: colors.onSurfaceMuted,
        marginTop: 2,
    },
    prefSep: {
        height: 1,
        backgroundColor: `${colors.outline}20`,
        marginLeft: 56,
    },

    // Delete account
    deleteWrap: {
        alignItems: 'center',
        paddingVertical: spacing.lg,
        marginBottom: spacing.xxl,
    },
    deleteText: {
        fontFamily: fonts.body.regular,
        fontSize: 13,
        color: `${colors.error}80`,
        textDecorationLine: 'underline',
    },

    // Dev tools
    devRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    devInfo: { flex: 1 },
    devDivider: {
        height: 1,
        backgroundColor: `${colors.onSurfaceMuted}15`,
        marginVertical: spacing.md,
    },
    devTitle: {
        fontFamily: fonts.body.medium,
        fontSize: 14,
        color: colors.onSurface,
        marginBottom: 2,
    },
    devUrl: {
        fontFamily: fonts.body.regular,
        fontSize: 11,
        color: colors.onSurfaceMuted,
    },
    devModelPicker: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    devModelOption: {
        flex: 1,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.sm,
        borderRadius: 12,
        backgroundColor: `${colors.primary}15`,
        alignItems: 'center',
    },
    devModelOptionActive: {
        backgroundColor: `${colors.primary}40`,
    },
    devModelLabelActive: {
        color: colors.primary,
    },
    devPremiumBtn: {
        paddingVertical: spacing.sm,
        borderRadius: 12,
        backgroundColor: `${colors.secondary}25`,
        alignItems: 'center',
    },
    devPremiumLabel: {
        fontFamily: fonts.body.medium,
        fontSize: 13,
        color: colors.secondary,
    },

    // Demo
    demoSection: {
        paddingHorizontal: spacing.xl,
        marginBottom: spacing.xl,
    },
    demoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    demoBtn: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: radius.full,
        backgroundColor: `${colors.surfaceContainerHigh}CC`,
    },
    demoBtnText: {
        fontFamily: fonts.body.medium,
        fontSize: 13,
        color: colors.primary,
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
    },
    modalCard: {
        width: '100%',
        maxWidth: 340,
    },
    modalEmoji: {
        fontSize: 44,
        textAlign: 'center',
        marginBottom: spacing.lg,
    },
    modalTitle: {
        fontFamily: fonts.display.bold,
        fontSize: 22,
        color: colors.onSurface,
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    modalBody: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        lineHeight: 22,
        color: colors.onSurfaceMuted,
        textAlign: 'center',
    },
});