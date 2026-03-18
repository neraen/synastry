/**
 * Home Screen - Premium Glassmorphism Design
 * Main landing page with cosmic aesthetic
 */

import React, { useEffect, useRef } from 'react';
import { Image, View, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import {
    Screen,
    GlassCard,
    GradientButton,
    AppHeading,
    AppText,
    Spacer,
} from '@/components/ui';
import { colors, spacing, radius, gradients, glow } from '@/theme';

const LOGO = require('@/assets/images/interface/logo.png');

export default function Home() {
    const router = useRouter();
    const { user, isAuthenticated, logout, isLoading } = useAuth();

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const logoScale = useRef(new Animated.Value(0.8)).current;
    const glowAnim = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        // Entry animations
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.spring(logoScale, {
                toValue: 1,
                friction: 8,
                useNativeDriver: true,
            }),
        ]).start();

        // Pulsing glow animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(glowAnim, {
                    toValue: 0.6,
                    duration: 2000,
                    useNativeDriver: true,
                }),
                Animated.timing(glowAnim, {
                    toValue: 0.3,
                    duration: 2000,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    async function handleLogout() {
        await logout();
    }

    return (
        <Screen variant="static" backgroundVariant="cosmic">
            {/* Decorative orbs */}
            <Animated.View style={[styles.orbTopRight, { opacity: glowAnim }]} />
            <Animated.View style={[styles.orbBottomLeft, { opacity: glowAnim }]} />

            {/* Header with Logo */}
            <Animated.View
                style={[
                    styles.header,
                    {
                        transform: [{ scale: logoScale }],
                    },
                ]}
            >
                <View style={styles.logoGlow} />
                <View style={styles.logoContainer}>
                    <Image source={LOGO} style={styles.logo} resizeMode="contain" />
                </View>
            </Animated.View>

            {/* Center content */}
            <Animated.View
                style={[
                    styles.centerBlock,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }],
                    },
                ]}
            >
                <AppHeading variant="display" align="center" style={styles.title}>
                    AstroMatch
                </AppHeading>
                <Spacer size="sm" />
                <AppText variant="body" color="muted" align="center" style={styles.subtitle}>
                    Découvrez votre compatibilité cosmique
                </AppText>

                {isAuthenticated && user && (
                    <>
                        <Spacer size="xl" />
                        <GlassCard padding="md" style={styles.userBadge}>
                            <AppText variant="caption" color="muted" align="center">
                                Connecté en tant que
                            </AppText>
                            <Spacer size="xxs" />
                            <AppText variant="bodyMedium" color="primary" align="center">
                                {user.email}
                            </AppText>
                        </GlassCard>
                    </>
                )}
            </Animated.View>

            {/* Actions */}
            <Animated.View
                style={[
                    styles.actions,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }],
                    },
                ]}
            >
                {isAuthenticated ? (
                    <>
                        {user?.hasBirthProfile ? (
                            <>
                                <GradientButton
                                    title="Analyse de compatibilité"
                                    onPress={() => router.push('/synastry')}
                                    variant="primary"
                                    size="large"
                                    icon={<AppText style={styles.buttonIcon}>💫</AppText>}
                                />
                                <Spacer size="md" />
                                <GradientButton
                                    title="Mon thème natal"
                                    onPress={() => router.push('/natal-chart')}
                                    variant="secondary"
                                />
                                <Spacer size="md" />
                                <GradientButton
                                    title="Historique"
                                    onPress={() => router.push('/synastry-history')}
                                    variant="outline"
                                />
                            </>
                        ) : (
                            <>
                                <GlassCard padding="lg" style={styles.profilePrompt}>
                                    <AppText style={styles.promptIcon}>✨</AppText>
                                    <Spacer size="sm" />
                                    <AppText variant="body" color="secondary" align="center">
                                        Complétez votre profil pour découvrir votre thème natal
                                    </AppText>
                                </GlassCard>
                                <Spacer size="lg" />
                                <GradientButton
                                    title="Compléter mon profil"
                                    onPress={() => router.push('/birth-profile')}
                                    variant="primary"
                                    size="large"
                                />
                            </>
                        )}
                        <Spacer size="lg" />
                        <GradientButton
                            title="Se déconnecter"
                            onPress={handleLogout}
                            variant="ghost"
                            disabled={isLoading}
                        />
                    </>
                ) : (
                    <>
                        <GradientButton
                            title="Commencer"
                            onPress={() => router.push('/signup')}
                            variant="primary"
                            size="large"
                            icon={<AppText style={styles.buttonIcon}>🚀</AppText>}
                        />
                        <Spacer size="md" />
                        <GradientButton
                            title="J'ai déjà un compte"
                            onPress={() => router.push('/login')}
                            variant="outline"
                        />
                    </>
                )}
            </Animated.View>

            {/* Bottom tagline */}
            <View style={styles.tagline}>
                <AppText variant="caption" color="muted" align="center">
                    Propulsé par l'intelligence artificielle
                </AppText>
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    // Decorative elements
    orbTopRight: {
        position: 'absolute',
        top: -80,
        right: -80,
        width: 250,
        height: 250,
        borderRadius: 125,
        backgroundColor: colors.brand.primary,
    },
    orbBottomLeft: {
        position: 'absolute',
        bottom: -60,
        left: -100,
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: colors.accent.pink,
    },
    header: {
        alignItems: 'center',
        marginTop: spacing['2xl'],
        position: 'relative',
    },
    logoGlow: {
        position: 'absolute',
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: glow.primary,
        top: -10,
    },
    logoContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: colors.surface.glass,
        borderWidth: 1,
        borderColor: colors.surface.glassBorder,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.brand.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 24,
        elevation: 12,
    },
    logo: {
        width: 80,
        height: 80,
    },
    centerBlock: {
        alignItems: 'center',
        marginTop: spacing['2xl'],
        paddingHorizontal: spacing.xl,
    },
    title: {
        letterSpacing: 2,
    },
    subtitle: {
        maxWidth: 280,
    },
    userBadge: {
        minWidth: 200,
    },
    profilePrompt: {
        alignItems: 'center',
    },
    promptIcon: {
        fontSize: 32,
    },
    actions: {
        marginTop: 'auto',
        paddingHorizontal: spacing.screenPadding,
        marginBottom: spacing.xl,
    },
    buttonIcon: {
        fontSize: 18,
    },
    tagline: {
        paddingBottom: spacing.lg,
    },
});
