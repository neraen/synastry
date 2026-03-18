import React from 'react';
import { Image, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import {
    Screen,
    AppButton,
    AppHeading,
    AppText,
    AppCard,
    Spacer,
} from '@/components/ui';
import { colors, spacing, borderRadius, shadows } from '@/theme';

const BG = require('@/assets/images/interface/background.png');
const LOGO = require('@/assets/images/interface/logo.png');
const MOON = require('@/assets/images/interface/moon-part.png');
const HEARTS = require('@/assets/images/interface/double-heart.png');

export default function Home() {
    const router = useRouter();
    const { user, isAuthenticated, logout, isLoading } = useAuth();

    async function handleLogout() {
        await logout();
    }

    return (
        <Screen variant="static" backgroundImage={BG}>
            {/* Header with Logo */}
            <View style={styles.header}>
                <View style={styles.logoContainer}>
                    <Image source={LOGO} style={styles.logo} resizeMode="contain" />
                </View>
            </View>

            {/* Center content */}
            <View style={styles.centerBlock}>
                <AppHeading variant="display" align="center">
                    Astro Match
                </AppHeading>
                <Spacer size="md" />
                <AppText variant="body" color="muted" align="center">
                    Découvrez votre compatibilité cosmique
                </AppText>

                {isAuthenticated && user && (
                    <>
                        <Spacer size="xl" />
                        <View style={styles.userBadge}>
                            <AppText variant="caption" color="muted">
                                Connecté en tant que
                            </AppText>
                            <Spacer size="xxs" />
                            <AppText variant="bodyMedium" color="accent">
                                {user.email}
                            </AppText>
                        </View>
                    </>
                )}
            </View>

            {/* Decorative elements */}
            <Image source={MOON} style={styles.moon} resizeMode="contain" />
            <Image source={HEARTS} style={styles.hearts} resizeMode="contain" />

            {/* Actions */}
            <View style={styles.actions}>
                {isAuthenticated ? (
                    <>
                        {user?.hasBirthProfile ? (
                            <>
                                <AppButton
                                    title="Mon thème natal"
                                    onPress={() => router.push('/natal-chart')}
                                    variant="primary"
                                />
                                <Spacer size="md" />
                                <AppButton
                                    title="Analyse de compatibilité"
                                    onPress={() => router.push('/synastry')}
                                    variant="outline"
                                />
                                <Spacer size="md" />
                                <AppButton
                                    title="Historique des analyses"
                                    onPress={() => router.push('/synastry-history')}
                                    variant="ghost"
                                />
                            </>
                        ) : (
                            <>
                                <AppCard variant="outline" style={styles.profilePrompt}>
                                    <AppText variant="body" color="muted" align="center">
                                        Complétez votre profil pour accéder à votre thème natal
                                    </AppText>
                                </AppCard>
                                <Spacer size="lg" />
                                <AppButton
                                    title="Compléter mon profil"
                                    onPress={() => router.push('/birth-profile')}
                                    variant="primary"
                                />
                            </>
                        )}
                        <Spacer size="lg" />
                        <AppButton
                            title="Se déconnecter"
                            onPress={handleLogout}
                            variant="ghost"
                            disabled={isLoading}
                        />
                    </>
                ) : (
                    <>
                        <AppButton
                            title="Créer un profil"
                            onPress={() => router.push('/signup')}
                            variant="primary"
                        />
                        <Spacer size="md" />
                        <AppButton
                            title="Se connecter"
                            onPress={() => router.push('/login')}
                            variant="outline"
                        />
                    </>
                )}
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    header: {
        alignItems: 'center',
        marginTop: spacing.xl,
    },
    logoContainer: {
        padding: spacing.md,
        borderRadius: borderRadius.badge,
        backgroundColor: colors.surface.default,
        ...shadows.glow.gold,
    },
    logo: {
        width: 96,
        height: 96,
    },
    centerBlock: {
        alignItems: 'center',
        marginTop: spacing.xl,
    },
    userBadge: {
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        backgroundColor: colors.surface.elevated,
        borderRadius: borderRadius.card,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        ...shadows.sm,
    },
    profilePrompt: {
        padding: spacing.lg,
    },
    actions: {
        marginTop: 'auto',
        marginBottom: spacing['3xl'],
    },
    moon: {
        position: 'absolute',
        right: 18,
        top: 140,
        width: 56,
        height: 56,
        opacity: 0.95,
    },
    hearts: {
        position: 'absolute',
        left: 24,
        bottom: 160,
        width: 72,
        height: 72,
        opacity: 0.95,
    },
});
