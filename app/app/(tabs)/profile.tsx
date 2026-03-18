import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, Alert } from 'react-native';
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
    Divider,
} from '@/components/ui';
import { colors, spacing, borderRadius } from '@/theme';
import { deleteAccountText } from '@/constants/legalTexts';

const BG = require('@/assets/images/interface/background-starry.png');

export default function ProfileTab() {
    const router = useRouter();
    const { user, isAuthenticated, logout, deleteAccount, isLoading } = useAuth();
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Redirect if not authenticated
    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.replace('/login');
        }
    }, [isAuthenticated, isLoading, router]);

    const handleDeleteAccount = async () => {
        setIsDeleting(true);
        try {
            await deleteAccount();
            setShowDeleteModal(false);
            router.replace('/login');
        } catch (error) {
            Alert.alert(
                'Erreur',
                'Impossible de supprimer le compte. Veuillez réessayer.',
            );
        } finally {
            setIsDeleting(false);
        }
    };

    if (isLoading) {
        return (
            <Screen backgroundImage={BG}>
                <LoadingState message="Chargement..." />
            </Screen>
        );
    }

    if (!isAuthenticated || !user) {
        return null;
    }

    return (
        <Screen variant="scroll" backgroundImage={BG}>
            <Spacer size="xl" />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.avatarContainer}>
                    <AppText style={styles.avatarEmoji}>👤</AppText>
                </View>
                <Spacer size="lg" />
                <AppHeading variant="h1" align="center">
                    Mon Profil
                </AppHeading>
            </View>

            <Spacer size="2xl" />

            {/* Email Card */}
            <AppCard variant="elevated" style={styles.card}>
                <AppText variant="label" color="muted">
                    Email
                </AppText>
                <Spacer size="xs" />
                <AppText variant="bodyMedium" color="primary">
                    {user.email}
                </AppText>
            </AppCard>

            <Spacer size="lg" />

            {/* Birth Profile Card */}
            <AppCard variant="elevated" style={styles.card}>
                <View style={styles.cardHeader}>
                    <AppText variant="label" color="muted">
                        Profil astrologique
                    </AppText>
                    {user.hasBirthProfile ? (
                        <View style={styles.statusBadge}>
                            <AppText style={styles.statusText}>Complet</AppText>
                        </View>
                    ) : (
                        <View style={[styles.statusBadge, styles.statusIncomplete]}>
                            <AppText style={[styles.statusText, styles.statusTextIncomplete]}>
                                À compléter
                            </AppText>
                        </View>
                    )}
                </View>
                <Spacer size="md" />
                <AppButton
                    title={user.hasBirthProfile ? "Modifier mon profil" : "Compléter mon profil"}
                    onPress={() => router.push('/birth-profile')}
                    variant="outline"
                />
            </AppCard>

            <Spacer size="lg" />

            {/* Quick Actions */}
            {user.hasBirthProfile && (
                <>
                    <AppCard variant="outline" style={styles.card}>
                        <AppText variant="bodyMedium" color="primary">
                            Accès rapide
                        </AppText>
                        <Spacer size="md" />
                        <AppButton
                            title="Mon thème natal"
                            onPress={() => router.push('/natal-chart')}
                            variant="primary"
                        />
                    </AppCard>
                    <Spacer size="lg" />
                </>
            )}

            {/* Legal Section */}
            <AppCard variant="elevated" style={styles.card}>
                <AppText variant="label" color="muted">
                    Informations légales
                </AppText>
                <Spacer size="md" />

                <TouchableOpacity
                    style={styles.legalItem}
                    onPress={() => router.push('/privacy-policy')}
                    accessibilityLabel="Politique de confidentialité"
                    accessibilityRole="button"
                >
                    <AppText variant="body" color="primary">
                        Politique de confidentialité
                    </AppText>
                    <AppText style={styles.chevron}>›</AppText>
                </TouchableOpacity>

                <Divider />

                <TouchableOpacity
                    style={styles.legalItem}
                    onPress={() => router.push('/terms-of-service')}
                    accessibilityLabel="Conditions d'utilisation"
                    accessibilityRole="button"
                >
                    <AppText variant="body" color="primary">
                        Conditions d'utilisation
                    </AppText>
                    <AppText style={styles.chevron}>›</AppText>
                </TouchableOpacity>

                <Divider />

                <TouchableOpacity
                    style={styles.legalItem}
                    onPress={() => router.push('/legal-notice')}
                    accessibilityLabel="Mentions légales"
                    accessibilityRole="button"
                >
                    <AppText variant="body" color="primary">
                        Mentions légales
                    </AppText>
                    <AppText style={styles.chevron}>›</AppText>
                </TouchableOpacity>
            </AppCard>

            <Spacer size="2xl" />

            {/* Logout */}
            <AppButton
                title="Se déconnecter"
                onPress={logout}
                variant="ghost"
            />

            <Spacer size="lg" />

            {/* Delete Account */}
            <TouchableOpacity
                style={styles.deleteAccountButton}
                onPress={() => setShowDeleteModal(true)}
                accessibilityLabel="Supprimer le compte"
                accessibilityRole="button"
            >
                <AppText variant="body" color="error">
                    Supprimer mon compte
                </AppText>
            </TouchableOpacity>

            <Spacer size="3xl" />

            {/* Delete Account Modal */}
            <Modal
                visible={showDeleteModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowDeleteModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <AppText style={styles.modalIcon}>⚠️</AppText>
                        <Spacer size="md" />
                        <AppHeading variant="h2" align="center">
                            {deleteAccountText.title}
                        </AppHeading>
                        <Spacer size="md" />
                        <AppText variant="body" color="secondary" align="center">
                            {deleteAccountText.warning}
                        </AppText>
                        <Spacer size="xl" />
                        <AppButton
                            title={deleteAccountText.confirm}
                            onPress={handleDeleteAccount}
                            variant="primary"
                            loading={isDeleting}
                            style={styles.deleteButton}
                        />
                        <Spacer size="md" />
                        <AppButton
                            title={deleteAccountText.cancel}
                            onPress={() => setShowDeleteModal(false)}
                            variant="ghost"
                            disabled={isDeleting}
                        />
                    </View>
                </View>
            </Modal>
        </Screen>
    );
}

const styles = StyleSheet.create({
    header: {
        alignItems: 'center',
    },
    avatarContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.surface.elevated,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.brand.primary,
    },
    avatarEmoji: {
        fontSize: 40,
        lineHeight: 52,
        textAlign: 'center',
    },
    card: {
        padding: spacing.xl,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statusBadge: {
        backgroundColor: colors.status.success + '20',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs,
        borderRadius: borderRadius.badge,
    },
    statusIncomplete: {
        backgroundColor: colors.status.warning + '20',
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.status.success,
    },
    statusTextIncomplete: {
        color: colors.status.warning,
    },
    legalItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.md,
    },
    chevron: {
        fontSize: 20,
        color: colors.text.muted,
    },
    deleteAccountButton: {
        alignItems: 'center',
        paddingVertical: spacing.md,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: colors.overlay.heavy,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.screenPadding,
    },
    modalContent: {
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.card,
        padding: spacing.xl,
        width: '100%',
        maxWidth: 340,
    },
    modalIcon: {
        fontSize: 48,
        textAlign: 'center',
        lineHeight: 60,
    },
    deleteButton: {
        backgroundColor: colors.status.error,
    },
});
