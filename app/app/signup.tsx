import React, { useState } from 'react';
import { View, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation();
    const { register, isLoading } = useAuth();
    const [email, setEmail] = useState('');
    const [pwd, setPwd] = useState('');
    const [confirm, setConfirm] = useState('');
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [error, setError] = useState<string | undefined>();

    const canSubmit = email && pwd && confirm && acceptedTerms && !isLoading;

    async function handleSignup() {
        if (!email || !pwd || !confirm) {
            setError(t('auth.errors.allFieldsRequired'));
            return;
        }
        if (pwd !== confirm) {
            setError(t('auth.errors.passwordMismatch'));
            return;
        }
        if (pwd.length < 8) {
            setError(t('auth.errors.passwordTooShort'));
            return;
        }
        if (!acceptedTerms) {
            setError(t('auth.errors.acceptTerms'));
            return;
        }

        setError(undefined);

        try {
            await register({ email, password: pwd });
            router.replace('/onboarding');
        } catch (err) {
            const message = err instanceof Error ? err.message : t('auth.errors.signupFailed');
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
                    {t('auth.signupTitle')}
                </AppHeading>
                <Spacer size="sm" />
                <AppText variant="body" color="muted" align="center">
                    {t('auth.signupSubtitle')}
                </AppText>
            </View>

            <Spacer size="2xl" />

            {/* Form Card */}
            <AppCard variant="elevated" style={styles.formCard}>
                <AppInput
                    label={t('auth.email')}
                    placeholder={t('auth.emailPlaceholder')}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={email}
                    onChangeText={setEmail}
                    disabled={isLoading}
                />

                <Spacer size="lg" />

                <AppInput
                    label={t('auth.password')}
                    placeholder={t('auth.passwordPlaceholder')}
                    secureTextEntry
                    value={pwd}
                    onChangeText={setPwd}
                    disabled={isLoading}
                    hint={t('auth.passwordHint')}
                />

                <Spacer size="lg" />

                <AppInput
                    label={t('auth.confirmPassword')}
                    placeholder={t('auth.passwordPlaceholder')}
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
                    accessibilityLabel={t('auth.errors.acceptTerms')}
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
                        {t('auth.creatingAccount')}
                    </AppText>
                </View>
            ) : (
                <>
                    <AppButton
                        title={t('auth.createAccount')}
                        onPress={handleSignup}
                        variant="primary"
                        disabled={!canSubmit}
                    />
                    <Spacer size="lg" />
                    <View style={styles.loginPrompt}>
                        <AppText variant="body" color="muted">
                            {t('auth.hasAccount')}
                        </AppText>
                    </View>
                    <Spacer size="sm" />
                    <AppButton
                        title={t('auth.login')}
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