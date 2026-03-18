import React, { useState } from 'react';
import { View, StyleSheet, Image, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import {
    Screen,
    AppInput,
    AppButton,
    AppHeading,
    AppText,
    AppCard,
    Spacer,
    InlineLoading,
    Divider,
} from '@/components/ui';
// OAuth temporarily disabled - uncomment when using development build
// import { GoogleSignInButton, AppleSignInButton } from '@/components/auth';
import { colors, spacing } from '@/theme';

const BG = require('@/assets/images/interface/background-starry.png');
const LOGO = require('@/assets/images/interface/logo.png');

export default function Login() {
    const router = useRouter();
    const { login, isLoading } = useAuth();
    const [email, setEmail] = useState('');
    const [pwd, setPwd] = useState('');
    const [error, setError] = useState<string | undefined>();
    const [oauthLoading, setOauthLoading] = useState(false);

    function handleOAuthSuccess() {
        router.replace('/(tabs)');
    }

    function handleOAuthError(errorMessage: string) {
        setError(errorMessage);
        setOauthLoading(false);
    }

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
        <Screen variant="form" backgroundImage={BG}>
            <Spacer size="2xl" />

            {/* Header with Logo */}
            <View style={styles.header}>
                <Image source={LOGO} style={styles.logo} resizeMode="contain" />
                <Spacer size="lg" />
                <AppHeading variant="h1" align="center">
                    Connexion
                </AppHeading>
                <Spacer size="sm" />
                <AppText variant="body" color="muted" align="center">
                    Accédez à votre univers astrologique
                </AppText>
            </View>

            <Spacer size="2xl" />

            {/* Form Card */}
            <AppCard variant="elevated" style={styles.formCard}>
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
            </AppCard>

            <Spacer size="2xl" />

            {/* Actions */}
            {isLoading || oauthLoading ? (
                <View style={styles.loadingContainer}>
                    <InlineLoading />
                    <Spacer size="md" />
                    <AppText variant="body" color="muted">
                        Connexion en cours...
                    </AppText>
                </View>
            ) : (
                <>
                    <AppButton
                        title="Se connecter"
                        onPress={handleLogin}
                        variant="primary"
                    />

                    {/* OAuth temporarily disabled - requires development build
                    <Spacer size="xl" />
                    <Divider text="ou" spacing="none" />
                    <Spacer size="xl" />
                    <GoogleSignInButton
                        onSuccess={handleOAuthSuccess}
                        onError={handleOAuthError}
                    />
                    {Platform.OS === 'ios' && (
                        <>
                            <Spacer size="md" />
                            <AppleSignInButton
                                onSuccess={handleOAuthSuccess}
                                onError={handleOAuthError}
                            />
                        </>
                    )}
                    */}

                    <Spacer size="xl" />
                    <View style={styles.signupPrompt}>
                        <AppText variant="body" color="muted">
                            Pas encore de compte ?
                        </AppText>
                    </View>
                    <Spacer size="sm" />
                    <AppButton
                        title="Créer un compte"
                        onPress={() => router.push('/signup')}
                        variant="outline"
                    />
                </>
            )}

            <Spacer size="3xl" />
        </Screen>
    );
}

const styles = StyleSheet.create({
    header: {
        alignItems: 'center',
    },
    logo: {
        width: 80,
        height: 80,
    },
    formCard: {
        padding: spacing.xl,
    },
    errorContainer: {
        backgroundColor: colors.status.errorSoft,
        borderRadius: 8,
        padding: spacing.md,
    },
    loadingContainer: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
    },
    signupPrompt: {
        alignItems: 'center',
    },
});
