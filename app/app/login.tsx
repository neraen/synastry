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
import { useAuth } from '@/contexts/AuthContext';
import * as AppleAuthentication from 'expo-apple-authentication';
import { InlineLoading, Starfield } from '@/components/ui';
import { colors, spacing, radius, fonts } from '@/theme';

// Dynamically import Google Sign-In (native module not available in Expo Go)
let GoogleSignin: any = null;
let statusCodes: any = {};
let isErrorWithCode: any = () => false;
let googleSignInAvailable = false;

try {
    const mod = require('@react-native-google-signin/google-signin');
    GoogleSignin = mod.GoogleSignin;
    statusCodes = mod.statusCodes;
    isErrorWithCode = mod.isErrorWithCode;
    GoogleSignin.configure({
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
        offlineAccess: false,
    });
    googleSignInAvailable = true;
} catch (e) {
    console.warn('Google Sign-In native module not available:', e);
}

export default function Login() {
    const router = useRouter();
    const { t } = useTranslation();
    const { loginWithGoogle: authLoginWithGoogle, loginWithApple: authLoginWithApple, login: authLogin, register: authRegister } = useAuth();
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

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, friction: 8, useNativeDriver: true }),
        ]).start();
    }, []);

    async function handleGoogleSignIn() {
        if (!googleSignInAvailable) {
            setError('Google Sign-In non disponible (module natif requis)');
            return;
        }
        setGoogleLoading(true);
        setError(undefined);
        try {
            await GoogleSignin.hasPlayServices();
            const response = await GoogleSignin.signIn();
            const idToken = response?.data?.idToken;
            if (!idToken) {
                throw new Error(t('auth.errors.loginFailed'));
            }
            const loggedInUser = await authLoginWithGoogle(idToken);
            router.replace(loggedInUser.hasBirthProfile ? '/(tabs)/horoscope' : '/onboarding');
        } catch (err) {
            if (isErrorWithCode(err)) {
                if (err.code === statusCodes.SIGN_IN_CANCELLED) {
                    // User cancelled — do nothing
                    setGoogleLoading(false);
                    return;
                }
                if (err.code === statusCodes.IN_PROGRESS) {
                    setGoogleLoading(false);
                    return;
                }
            }
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
            await authRegister({ email: regEmail, password: regPassword });
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
            await authLogin({ email: devEmail, password: devPassword });
            router.replace('/(tabs)/horoscope');
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
            const loggedInUser = await authLoginWithApple(
                credential.identityToken,
                {
                    email: credential.email ?? undefined,
                    fullName: credential.fullName
                        ? {
                            givenName: credential.fullName.givenName ?? undefined,
                            familyName: credential.fullName.familyName ?? undefined,
                        }
                        : undefined,
                },
                credential.authorizationCode ?? undefined,
            );
            router.replace(loggedInUser.hasBirthProfile ? '/(tabs)/horoscope' : '/onboarding');
        } catch (err: any) {
            if (err?.code !== 'ERR_REQUEST_CANCELED') {
                setError(err instanceof Error ? err.message : t('auth.errors.loginFailed'));
            }
        } finally {
            setAppleLoading(false);
        }
    }

    const features = [
        { icon: 'moon' as const, label: t('login.featureNatal', { defaultValue: 'Thème natal détaillé' }) },
        { icon: 'heart' as const, label: t('login.featureCompat', { defaultValue: 'Compatibilité amoureuse' }) },
        { icon: 'message-circle' as const, label: t('login.featureAI', { defaultValue: 'Lyra, astrologue IA' }) },
    ];

    return (
        <View style={styles.screen}>
            <Starfield />
            {/* Star decorations */}
            <View style={[styles.star, { top: 80, right: 48, width: 4, height: 4, opacity: 0.4 }]} />
            <View style={[styles.star, { top: 130, right: 96, width: 2, height: 2, opacity: 0.3 }]} />
            <View style={[styles.star, { top: 200, left: 32, width: 4, height: 4, opacity: 0.2 }]} />
            <View style={[styles.star, { top: 420, right: 32, width: 2, height: 2, opacity: 0.4 }]} />
            <View style={[styles.star, { top: 500, left: 56, width: 3, height: 3, opacity: 0.25 }]} />
            <View style={[styles.star, { top: 360, right: 72, width: 3, height: 3, opacity: 0.15 }]} />

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
                                {t('login.heroTitleSuffix', { defaultValue: '' })}
                            </Text>

                            {/* Description */}
                            <Text style={styles.description}>
                                {t('login.description')}
                            </Text>

                            {/* Feature highlights */}
                            <View style={styles.featuresRow}>
                                {features.map((f, i) => (
                                    <View key={i} style={styles.featureItem}>
                                        <View style={styles.featureIconWrap}>
                                            <Feather name={f.icon} size={18} color={colors.primary} />
                                        </View>
                                        <Text style={styles.featureLabel}>{f.label}</Text>
                                    </View>
                                ))}
                            </View>

                        </Animated.View>

                        {/* Sign-in card */}
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
                                    {/* Google Sign-In (Android only) */}
                                    {Platform.OS !== 'ios' && (
                                        <Pressable
                                            style={[styles.googleBtn, googleLoading && { opacity: 0.5 }]}
                                            onPress={handleGoogleSignIn}
                                            disabled={googleLoading}
                                        >
                                            <View style={styles.googleIconWrap}>
                                                <MaterialCommunityIcons name="google" size={18} color={colors.primary} />
                                            </View>
                                            <Text style={styles.googleBtnText}>{t('auth.continueWithGoogle')}</Text>
                                        </Pressable>
                                    )}

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

                            {/* Subtle separator + privacy note */}
                            <Text style={styles.privacyNote}>
                                {t('login.privacyNote', { defaultValue: 'En continuant, vous acceptez nos conditions d\'utilisation.' })}
                            </Text>

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
        justifyContent: 'flex-end',
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
        paddingTop: spacing.xl,
        paddingBottom: spacing.lg,
    },
    logo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.xl,
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
        marginBottom: spacing.xl,
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
        fontSize: 36,
        lineHeight: 44,
        color: colors.onSurface,
        marginBottom: spacing.md,
    },
    heroAccent: {
        color: colors.primary,
        fontStyle: 'italic',
    },
    description: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        lineHeight: 22,
        color: colors.onSurfaceMuted,
        marginBottom: spacing.xl,
    },

    // Feature highlights
    featuresRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: spacing.md,
        marginBottom: spacing.sm,
    },
    featureItem: {
        flex: 1,
        alignItems: 'center',
        gap: spacing.sm,
    },
    featureIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: `${colors.primary}15`,
        borderWidth: 1,
        borderColor: `${colors.primary}25`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    featureLabel: {
        fontFamily: fonts.body.medium,
        fontSize: 11,
        color: colors.onSurfaceMuted,
        textAlign: 'center',
        lineHeight: 15,
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
    privacyNote: {
        fontFamily: fonts.body.regular,
        fontSize: 11,
        color: colors.onSurfaceMuted,
        opacity: 0.5,
        textAlign: 'center',
        marginTop: spacing.xl,
        lineHeight: 16,
    },
});