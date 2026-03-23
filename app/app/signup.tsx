import React, { useState } from 'react';
import { View, StyleSheet, Image, TouchableOpacity } from 'react-native';
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
} from '@/components/ui';
import { colors, spacing, borderRadius } from '@/theme';
import { consentText } from '@/constants/legalTexts';

const LOGO = require('@/assets/images/interface/logo.png');

export default function Signup() {
    const router = useRouter();
    const { register, isLoading } = useAuth();
    const [email, setEmail] = useState('');
    const [pwd, setPwd] = useState('');
    const [confirm, setConfirm] = useState('');
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [error, setError] = useState<string | undefined>();

    const canSubmit = email && pwd && confirm && acceptedTerms && !isLoading;

    async function handleSignup() {
        if (!email || !pwd || !confirm) {
            setError('Tous les champs sont requis.');
            return;
        }
        if (pwd !== confirm) {
            setError('Les mots de passe ne correspondent pas.');
            return;
        }
        if (pwd.length < 8) {
            setError('Le mot de passe doit contenir au moins 8 caractères.');
            return;
        }
        if (!acceptedTerms) {
            setError("Vous devez accepter les conditions d'utilisation.");
            return;
        }

        setError(undefined);

        try {
            await register({ email, password: pwd });
            router.replace('/(tabs)');
        } catch (err) {
            const message = err instanceof Error ? err.message : "Erreur lors de l'inscription";
            setError(message);
        }
    }

    return (
        <Screen variant="form" backgroundColor={colors.surfaceLowest}>
            <Spacer size="2xl" />

            {/* Header with Logo */}
            <View style={styles.header}>
                <Image source={LOGO} style={styles.logo} resizeMode="contain" />
                <Spacer size="lg" />
                <AppHeading variant="h1" align="center">
                    Créer un compte
                </AppHeading>
                <Spacer size="sm" />
                <AppText variant="body" color="muted" align="center">
                    Commencez votre voyage astrologique
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
                    hint="Minimum 8 caractères"
                />

                <Spacer size="lg" />

                <AppInput
                    label="Confirmer le mot de passe"
                    placeholder="••••••••"
                    secureTextEntry
                    value={confirm}
                    onChangeText={setConfirm}
                    disabled={isLoading}
                />

                <Spacer size="xl" />

                {/* Terms Consent Checkbox */}
                <View
                    style={styles.consentContainer}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: acceptedTerms }}
                    accessibilityLabel="Accepter les conditions d'utilisation et la politique de confidentialité"
                >
                    <TouchableOpacity
                        onPress={() => setAcceptedTerms(!acceptedTerms)}
                        activeOpacity={0.7}
                        style={styles.checkboxTouchable}
                    >
                        <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
                            {acceptedTerms && <AppText style={styles.checkmark}>✓</AppText>}
                        </View>
                    </TouchableOpacity>
                    <View style={styles.consentTextContainer}>
                        <AppText variant="caption" color="secondary">
                            {consentText.prefix}
                        </AppText>
                        <TouchableOpacity onPress={() => router.push('/terms-of-service')}>
                            <AppText variant="caption" style={styles.link}>
                                {consentText.termsLink}
                            </AppText>
                        </TouchableOpacity>
                        <AppText variant="caption" color="secondary">
                            {consentText.separator}
                        </AppText>
                        <TouchableOpacity onPress={() => router.push('/privacy-policy')}>
                            <AppText variant="caption" style={styles.link}>
                                {consentText.privacyLink}
                            </AppText>
                        </TouchableOpacity>
                    </View>
                </View>

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
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <InlineLoading />
                    <Spacer size="md" />
                    <AppText variant="body" color="muted">
                        Création du compte...
                    </AppText>
                </View>
            ) : (
                <>
                    <AppButton
                        title="Créer mon compte"
                        onPress={handleSignup}
                        variant="primary"
                        disabled={!canSubmit}
                    />
                    <Spacer size="lg" />
                    <View style={styles.loginPrompt}>
                        <AppText variant="body" color="muted">
                            Déjà inscrit ?
                        </AppText>
                    </View>
                    <Spacer size="sm" />
                    <AppButton
                        title="Se connecter"
                        onPress={() => router.push('/login')}
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
    consentContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    checkboxTouchable: {
        marginRight: spacing.md,
        marginTop: 2,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: colors.border.default,
        backgroundColor: colors.surface.default,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxChecked: {
        backgroundColor: colors.brand.primary,
        borderColor: colors.brand.primary,
    },
    checkmark: {
        color: colors.text.onAccent,
        fontSize: 14,
        fontWeight: '700',
    },
    consentTextContainer: {
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
    },
    link: {
        color: colors.brand.primary,
        textDecorationLine: 'underline',
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
    loginPrompt: {
        alignItems: 'center',
    },
});
