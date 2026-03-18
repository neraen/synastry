/**
 * Login Screen - Premium Glassmorphism Design
 * Authentication with glass card aesthetic
 */

import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Image, Animated, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import {
    Screen,
    GlassCard,
    GradientButton,
    AppInput,
    AppHeading,
    AppText,
    Spacer,
    InlineLoading,
} from '@/components/ui';
import { colors, spacing, radius, glow } from '@/theme';

const LOGO = require('@/assets/images/interface/logo.png');

export default function Login() {
    const router = useRouter();
    const { login, isLoading } = useAuth();
    const [email, setEmail] = useState('');
    const [pwd, setPwd] = useState('');
    const [error, setError] = useState<string | undefined>();

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(40)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.spring(slideAnim, {
                toValue: 0,
                friction: 8,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    async function handleLogin() {
        if (!email || !pwd) {
            setError('Veuillez renseigner email et mot de passe.');
            return;
        }

        setError(undefined);

        try {
            await login({ email, password: pwd });
            router.replace('/(tabs)');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erreur de connexion';
            setError(message);
        }
    }

    return (
        <Screen variant="form" backgroundVariant="cosmic">
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {/* Decorative orb */}
                <View style={styles.orbTop} />

                <Spacer size="2xl" />

                {/* Header with Logo */}
                <Animated.View
                    style={[
                        styles.header,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }],
                        },
                    ]}
                >
                    <View style={styles.logoGlow} />
                    <View style={styles.logoContainer}>
                        <Image source={LOGO} style={styles.logo} resizeMode="contain" />
                    </View>
                    <Spacer size="lg" />
                    <AppHeading variant="h1" align="center">
                        Connexion
                    </AppHeading>
                    <Spacer size="xs" />
                    <AppText variant="body" color="muted" align="center">
                        Accédez à votre univers astrologique
                    </AppText>
                </Animated.View>

                <Spacer size="2xl" />

                {/* Form Card */}
                <Animated.View
                    style={{
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }],
                    }}
                >
                    <GlassCard variant="elevated" padding="xl" style={styles.formCard}>
                        <AppInput
                            label="Email"
                            placeholder="vous@exemple.com"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            value={email}
                            onChangeText={setEmail}
                            disabled={isLoading}
                        />

                        <Spacer size="lg" />

                        <AppInput
                            label="Mot de passe"
                            placeholder="••••••••"
                            secureTextEntry
                            value={pwd}
                            onChangeText={setPwd}
                            disabled={isLoading}
                        />

                        {!!error && (
                            <>
                                <Spacer size="lg" />
                                <View style={styles.errorContainer}>
                                    <AppText variant="body" color="error" align="center">
                                        {error}
                                    </AppText>
                                </View>
                            </>
                        )}
                    </GlassCard>
                </Animated.View>

                <Spacer size="2xl" />

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
                    {isLoading ? (
                        <View style={styles.loadingContainer}>
                            <InlineLoading />
                            <Spacer size="md" />
                            <AppText variant="body" color="muted">
                                Connexion en cours...
                            </AppText>
                        </View>
                    ) : (
                        <>
                            <GradientButton
                                title="Se connecter"
                                onPress={handleLogin}
                                variant="primary"
                                size="large"
                            />

                            <Spacer size="xl" />

                            <View style={styles.signupPrompt}>
                                <AppText variant="body" color="muted">
                                    Pas encore de compte ?
                                </AppText>
                            </View>
                            <Spacer size="sm" />
                            <GradientButton
                                title="Créer un compte"
                                onPress={() => router.push('/signup')}
                                variant="outline"
                            />
                        </>
                    )}
                </Animated.View>

                <Spacer size="3xl" />
            </KeyboardAvoidingView>
        </Screen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    orbTop: {
        position: 'absolute',
        top: -100,
        right: -50,
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: glow.primary,
        opacity: 0.3,
    },
    header: {
        alignItems: 'center',
        position: 'relative',
    },
    logoGlow: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: glow.primary,
        top: -5,
    },
    logoContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.surface.glass,
        borderWidth: 1,
        borderColor: colors.surface.glassBorder,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.brand.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    logo: {
        width: 50,
        height: 50,
    },
    formCard: {
        borderWidth: 1,
        borderColor: colors.surface.glassBorder,
    },
    errorContainer: {
        backgroundColor: colors.status.errorSoft,
        borderRadius: radius.md,
        padding: spacing.md,
    },
    actions: {
        paddingHorizontal: spacing.md,
    },
    loadingContainer: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
    },
    signupPrompt: {
        alignItems: 'center',
    },
});
