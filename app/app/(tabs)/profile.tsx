import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    StyleSheet,
    Modal,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { GlassCard, GoldButton, GhostButton, TabHeader } from '@/components/ui';
import { colors, spacing, radius, fonts } from '@/theme';
import { deleteAccountText } from '@/constants/legalTexts';

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
                            <Text style={styles.subTitleDark}>Premium actif</Text>
                            <Text style={styles.subSubtitleDark}>Renouvellement le {formattedDate}</Text>
                        </View>
                        <View style={styles.subActiveBadge}>
                            <Text style={styles.subActiveBadgeText}>ACTIF</Text>
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
                        <Text style={styles.subTitle}>Passer Premium</Text>
                        <Text style={styles.subSubtitle}>Analyses illimitées · Insights avancés</Text>
                    </View>
                    <Pressable onPress={() => router.push('/premium')} style={styles.subCta} hitSlop={8}>
                        <LinearGradient
                            colors={[colors.primary, colors.primaryContainer]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.subCtaGradient}
                        >
                            <Text style={styles.subCtaText}>VOIR</Text>
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
    const { user, isAuthenticated, isLoading, logout, deleteAccount } = useAuth();
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDeleteAccount = async () => {
        setIsDeleting(true);
        try {
            await deleteAccount();
            setShowDeleteModal(false);
            router.replace('/login');
        } catch {
            Alert.alert('Erreur', 'Impossible de supprimer le compte. Veuillez réessayer.');
        } finally {
            setIsDeleting(false);
        }
    };

    if (isLoading) {
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

    if (!isAuthenticated || !user) return null;

    const displayName = user.firstName || user.email.split('@')[0];
    const initials = displayName.charAt(0).toUpperCase();

    return (
        <View style={styles.screen}>
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
                                    <Text style={styles.avatarInitial}>{initials}</Text>
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
                                {user.hasBirthProfile ? 'PROFIL COMPLET' : 'PROFIL INCOMPLET'}
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
                                        <Text style={styles.natalTitle}>Mon thème natal</Text>
                                        <Text style={styles.natalSubtitle}>Soleil, Lune, Ascendant et plus</Text>
                                    </View>
                                    <Pressable
                                        onPress={() => router.push('/(tabs)/horoscope')}
                                        style={styles.natalBtn}
                                        hitSlop={8}
                                    >
                                        <Text style={styles.natalBtnText}>VOIR</Text>
                                        <Feather name="arrow-up-right" size={12} color={colors.primary} />
                                    </Pressable>
                                </View>
                            </GlassCard>
                        </View>
                    )}

                    {/* ── Profil astrologique ────────────────────────────────── */}
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>MON PROFIL</Text>
                        <GlassCard opacity="low" radius="xl">
                            <PrefRow
                                icon="user"
                                title={user.hasBirthProfile ? 'Modifier mon profil de naissance' : 'Compléter mon profil de naissance'}
                                subtitle={user.hasBirthProfile ? 'Date, heure et lieu de naissance' : 'Requis pour les analyses'}
                                onPress={() => router.push('/birth-profile')}
                            />
                        </GlassCard>
                    </View>

                    {/* ── Preferences & Alignment ────────────────────────────── */}
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>PRÉFÉRENCES & ALIGNEMENT</Text>
                        <GlassCard opacity="low" radius="xl">
                            <PrefRow
                                icon="shield"
                                title="Politique de confidentialité"
                                onPress={() => router.push('/privacy-policy')}
                            />
                            <View style={styles.prefSep} />
                            <PrefRow
                                icon="file-text"
                                title="Conditions d'utilisation"
                                onPress={() => router.push('/terms-of-service')}
                            />
                            <View style={styles.prefSep} />
                            <PrefRow
                                icon="info"
                                title="Mentions légales"
                                onPress={() => router.push('/legal-notice')}
                            />
                            <View style={styles.prefSep} />
                            <PrefRow
                                icon="log-out"
                                title="Se déconnecter"
                                onPress={logout}
                                danger
                                showChevron={false}
                            />
                        </GlassCard>
                    </View>

                    {/* ── Delete account ─────────────────────────────────────── */}
                    <View style={styles.deleteWrap}>
                        <Pressable onPress={() => setShowDeleteModal(true)} hitSlop={8}>
                            <Text style={styles.deleteText}>Supprimer mon compte</Text>
                        </Pressable>
                    </View>

                    {/* ── Design Demo ────────────────────────────────────────── */}
                    <View style={styles.demoSection}>
                        <Text style={styles.sectionLabel}>DESIGN DEMO</Text>
                        <View style={styles.demoGrid}>
                            {[
                                { label: 'Home', route: '/demo/home' },
                                { label: 'Matches', route: '/demo/matches' },
                                { label: 'Profile', route: '/demo/profile-view' },
                                { label: 'Login', route: '/demo/login' },
                                { label: 'Share', route: '/demo/share' },
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
