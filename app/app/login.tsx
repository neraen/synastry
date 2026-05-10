import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    Pressable,
    StyleSheet,
    Platform,
    ScrollView,
    Animated,
    TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '@/contexts/AuthContext';
import { loginWithGoogle, loginWithApple } from '@/services/oauth';
import { login, register } from '@/services/auth';
import * as AppleAuthentication from 'expo-apple-authentication';
import { InlineLoading } from '@/components/ui';
import { colors, spacing, radius, fonts } from '@/theme';

WebBrowser.maybeCompleteAuthSession();

export default function Login() {
    const router = useRouter();
    const { t } = useTranslation();
    const { refreshUser } = useAuth();
    const [error, setError] = useState<string | undefined>();
    const [googleLoading, setGoogleLoading] = useState(false);
    const [appleLoading, setAppleLoading] = useState(false);
    const [devEmail, setDevEmail] = useState('');
    const [devPassword, setDevPassword] = useState('');
    const [devLoading, setDevLoading] = useState(false);
    const [regEmail, setRegEmail] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [regLoading, setRegLoading] = useState(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '';
    const [request, response, promptAsync] = Google.useAuthRequest({
        androidClientId: GOOGLE_CLIENT_ID,
        scopes: ['openid', 'profile', 'email'],
    });

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, friction: 8, useNativeDriver: true }),
        ]).start();
    }, []);

    useEffect(() => {
        if (response?.type === 'success') {
            const idToken = response.authentication?.idToken ?? response.params?.id_token;
            if (idToken) {
                handleGoogleLogin(idToken);
            } else {
                setError(t('auth.errors.loginFailed'));
            }
        } else if (response?.type === 'error') {
            setError(t('auth.errors.loginFailed'));
        }
    }, [response]);

    async function handleGoogleLogin(idToken: string) {
        setGoogleLoading(true);
        setError(undefined);
        try {
            await loginWithGoogle(idToken);
            await refreshUser();
            router.replace('/(tabs)');
        } catch (err) {
            setError(err instanceof Error ? err.message : t('auth.errors.loginFailed'));
        } finally {
            setGoogleLoading(false);
        }
    }

    async function handleDevRegister() {
        if (!regEmail || !regPassword) return;
        setRegLoading(true);
        setError(undefined);
        try {
            await register({ email: regEmail, password: regPassword });
            await login({ email: regEmail, password: regPassword });
            await refreshUser();
            router.replace('/onboarding');
        } catch (err) {
            setError(err instanceof Error ? err.message : t('auth.errors.signupFailed'));
        } finally {
            setRegLoading(false);
        }
    }

    async function handleDevLogin() {
        if (!devEmail || !devPassword) return;
        setDevLoading(true);
        setError(undefined);
        try {
            await login({ email: devEmail, password: devPassword });
            await refreshUser();
            router.replace('/(tabs)');
        } catch (err) {
            setError(err instanceof Error ? err.message : t('auth.errors.loginFailed'));
        } finally {
            setDevLoading(false);
        }
    }

    async function handleAppleLogin() {
        setAppleLoading(true);
        setError(undefined);
        try {
            const credential = await AppleAuthentication.signInAsync({
                requestedScopes: [
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL,
                ],
            });
            if (!credential.identityToken) throw new Error(t('auth.errors.loginFailed'));
            await loginWithApple(credential.identityToken, {
                email: credential.email ?? undefined,
                fullName: credential.fullName ?? undefined,
            });
            await refreshUser();
            router.replace('/(tabs)');
        } catch (err: any) {
            if (err?.code !== 'ERR_REQUEST_CANCELED') {
                setError(err instanceof Error ? err.message : t('auth.errors.loginFailed'));
            }
        } finally {
            setAppleLoading(false);
        }
    }

    return (
        <View style={styles.screen}>
            {/* Star decorations */}
            <View style={[styles.star, { top: 80, right: 48, width: 4, height: 4, opacity: 0.4 }]} />
            <View style={[styles.star, { top: 130, right: 96, width: 2, height: 2, opacity: 0.3 }]} />
            <View style={[styles.star, { top: 200, left: 32, width: 4, height: 4, opacity: 0.2 }]} />
            <View style={[styles.star, { top: 260, right: 32, width: 2, height: 2, opacity: 0.4 }]} />
            <View style={[styles.star, { top: 340, left: 56, width: 3, height: 3, opacity: 0.25 }]} />

            <SafeAreaView style={styles.safeArea}>
                <ScrollView
                    contentContainerStyle={styles.scroll}
                    showsVerticalScrollIndicator={false}
                >
                        <Animated.View
                            style={[styles.heroSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
                        >
                            {/* Logo */}
                            <View style={styles.logo}>
                                <Text style={styles.logoIcon}>✦</Text>
                                <Text style={styles.logoText}>Lunestia</Text>
                            </View>

                            {/* Badge */}
                            <View style={styles.badge}>
                                <Feather name="star" size={13} color={colors.primary} />
                                <Text style={styles.badgeText}>{t('login.badge')}</Text>
                            </View>

                            {/* Hero title */}
                            <Text style={styles.heroTitle}>
                                {t('login.heroTitle')}{' '}
                                <Text style={styles.heroAccent}>{t('login.heroAccent')}</Text>
                            </Text>

                            {/* Description */}
                            <Text style={styles.description}>
                                {t('login.description')}
                            </Text>

                        </Animated.View>

                        {/* Bottom glass card */}
                        <Animated.View
                            style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
                        >
                            <Text style={styles.cardTitle}>{t('login.cardTitle')}</Text>
                            <Text style={styles.cardSub}>
                                {t('login.cardSubtitle')}
                            </Text>

                            {/* Error */}
                            {!!error && (
                                <View style={styles.errorBox}>
                                    <Text style={styles.errorText}>{error}</Text>
                                </View>
                            )}

                            {/* OAuth buttons */}
                            {(googleLoading || appleLoading) ? (
                                <View style={styles.loadingWrap}>
                                    <InlineLoading />
                                    <Text style={styles.loadingText}>{t('auth.loggingIn')}</Text>
                                </View>
                            ) : (
                                <>
                                    {/* Google Sign-In */}
                                    <Pressable
                                        style={[styles.googleBtn, (!request || googleLoading) && { opacity: 0.5 }]}
                                        onPress={() => promptAsync()}
                                        disabled={!request || googleLoading}
                                    >
                                        <View style={styles.googleIconWrap}>
                                            <MaterialCommunityIcons name="google" size={18} color={colors.primary} />
                                        </View>
                                        <Text style={styles.googleBtnText}>{t('auth.continueWithGoogle')}</Text>
                                    </Pressable>

                                    {/* Apple Sign-In (iOS only) */}
                                    {Platform.OS === 'ios' && (
                                        <>
                                            <View style={{ height: spacing.lg }} />
                                            <Pressable
                                                style={[styles.appleBtn, appleLoading && { opacity: 0.5 }]}
                                                onPress={handleAppleLogin}
                                                disabled={appleLoading}
                                            >
                                                <Feather name="smartphone" size={18} color={colors.onSurface} />
                                                <Text style={styles.appleBtnText}>{t('auth.continueWithApple')}</Text>
                                            </Pressable>
                                        </>
                                    )}
                                </>
                            )}
                            {/* Dev-only email/password form */}
                            {__DEV__ && (
                                <View style={styles.devSection}>
                                    <View style={styles.devDivider}>
                                        <Text style={styles.devDividerText}>DEV ONLY</Text>
                                    </View>
                                    <TextInput
                                        style={styles.devInput}
                                        placeholder="Email"
                                        placeholderTextColor={colors.onSurfaceMuted}
                                        value={devEmail}
                                        onChangeText={setDevEmail}
                                        autoCapitalize="none"
                                        keyboardType="email-address"
                                        editable={!devLoading}
                                    />
                                    <TextInput
                                        style={styles.devInput}
                                        placeholder="Mot de passe"
                                        placeholderTextColor={colors.onSurfaceMuted}
                                        value={devPassword}
                                        onChangeText={setDevPassword}
                                        secureTextEntry
                                        editable={!devLoading}
                                    />
                                    <Pressable
                                        style={[styles.devBtn, (!devEmail || !devPassword || devLoading) && { opacity: 0.4 }]}
                                        onPress={handleDevLogin}
                                        disabled={!devEmail || !devPassword || devLoading}
                                    >
                                        <Text style={styles.devBtnText}>
                                            {devLoading ? 'Connexion...' : 'Se connecter'}
                                        </Text>
                                    </Pressable>
                                    <View style={styles.devDivider}>
                                        <Text style={styles.devDividerText}>INSCRIPTION</Text>
                                    </View>
                                    <TextInput
                                        style={styles.devInput}
                                        placeholder="Email"
                                        placeholderTextColor={colors.onSurfaceMuted}
                                        value={regEmail}
                                        onChangeText={setRegEmail}
                                        autoCapitalize="none"
                                        keyboardType="email-address"
                                        editable={!regLoading}
                                    />
                                    <TextInput
                                        style={styles.devInput}
                                        placeholder="Mot de passe"
                                        placeholderTextColor={colors.onSurfaceMuted}
                                        value={regPassword}
                                        onChangeText={setRegPassword}
                                        secureTextEntry
                                        editable={!regLoading}
                                    />
                                    <Pressable
                                        style={[styles.devBtn, (!regEmail || !regPassword || regLoading) && { opacity: 0.4 }]}
                                        onPress={handleDevRegister}
                                        disabled={!regEmail || !regPassword || regLoading}
                                    >
                                        <Text style={styles.devBtnText}>
                                            {regLoading ? 'Création...' : 'Créer un compte'}
                                        </Text>
                                    </Pressable>
                                </View>
                            )}
                        </Animated.View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.surfaceLowest,
    },
    safeArea: { flex: 1 },
    scroll: {
        flexGrow: 1,
        justifyContent: 'space-between',
    },

    // Star decorations
    star: {
        position: 'absolute',
        borderRadius: 99,
        backgroundColor: colors.onSurfaceMuted,
    },

    // Hero
    heroSection: {
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.xxl,
        paddingBottom: spacing.xxl,
    },
    logo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.xxl,
    },
    logoIcon: {
        fontSize: 14,
        color: colors.primary,
        lineHeight: 18,
    },
    logoText: {
        fontFamily: fonts.display.regular,
        fontSize: 20,
        color: colors.primary,
        letterSpacing: 1,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        alignSelf: 'flex-start',
        backgroundColor: `${colors.surfaceContainerHigh}99`,
        borderRadius: radius.full,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        marginBottom: spacing.xxl,
    },
    badgeText: {
        fontFamily: fonts.body.medium,
        fontSize: 11,
        letterSpacing: 1.5,
        color: colors.onSurfaceMuted,
        textTransform: 'uppercase',
    },
    heroTitle: {
        fontFamily: fonts.display.regular,
        fontSize: 40,
        lineHeight: 48,
        color: colors.onSurface,
        marginBottom: spacing.xl,
    },
    heroAccent: {
        color: colors.primary,
        fontStyle: 'italic',
    },
    description: {
        fontFamily: fonts.body.regular,
        fontSize: 15,
        lineHeight: 24,
        color: colors.onSurfaceMuted,
        marginBottom: spacing.xxl,
    },
    // Card
    card: {
        backgroundColor: `${colors.surfaceLow}CC`,
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.xxl,
        paddingBottom: spacing.xxxl,
        borderTopWidth: 1,
        borderTopColor: `${colors.outline}1A`,
    },
    cardTitle: {
        fontFamily: fonts.display.regular,
        fontSize: 26,
        color: colors.onSurface,
        marginBottom: spacing.sm,
    },
    cardSub: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        color: colors.onSurfaceMuted,
        lineHeight: 20,
        marginBottom: spacing.xl,
    },
    errorBox: {
        backgroundColor: `${colors.error}1A`,
        borderRadius: radius.md,
        padding: spacing.md,
        marginBottom: spacing.xl,
    },
    errorText: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        color: colors.error,
        textAlign: 'center',
    },
    loadingWrap: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
        gap: spacing.md,
    },
    loadingText: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        color: colors.onSurfaceMuted,
    },
    googleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.md,
        borderRadius: radius.full,
        backgroundColor: `${colors.primary}18`,
        borderWidth: 1,
        borderColor: `${colors.primary}30`,
        paddingVertical: spacing.lg,
    },
    googleIconWrap: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: `${colors.primary}25`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    googleBtnText: {
        fontFamily: fonts.body.semiBold,
        fontSize: 15,
        color: colors.onSurface,
        letterSpacing: 0.2,
    },
    appleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.md,
        borderRadius: radius.full,
        backgroundColor: `${colors.onSurface}10`,
        paddingVertical: spacing.lg,
    },
    appleBtnText: {
        fontFamily: fonts.body.semiBold,
        fontSize: 15,
        color: colors.onSurface,
        letterSpacing: 0.2,
    },
    devSection: {
        marginTop: spacing.xl,
        gap: spacing.md,
    },
    devDivider: {
        alignItems: 'center',
        paddingVertical: spacing.sm,
    },
    devDividerText: {
        fontFamily: fonts.body.medium,
        fontSize: 10,
        letterSpacing: 2,
        color: colors.onSurfaceMuted,
        opacity: 0.5,
    },
    devInput: {
        backgroundColor: `${colors.surfaceContainerHigh}80`,
        borderRadius: radius.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        fontFamily: fonts.body.regular,
        fontSize: 14,
        color: colors.onSurface,
    },
    devBtn: {
        backgroundColor: `${colors.surfaceContainerHigh}CC`,
        borderRadius: radius.md,
        paddingVertical: spacing.md,
        alignItems: 'center',
    },
    devBtnText: {
        fontFamily: fonts.body.semiBold,
        fontSize: 14,
        color: colors.onSurfaceMuted,
    },
});