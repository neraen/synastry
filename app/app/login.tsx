import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    Pressable,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { AppInput, InlineLoading } from '@/components/ui';
import { colors, spacing, radius, fonts } from '@/theme';

export default function Login() {
    const router = useRouter();
    const { login, isLoading } = useAuth();
    const [email, setEmail] = useState('');
    const [pwd, setPwd] = useState('');
    const [error, setError] = useState<string | undefined>();

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, friction: 8, useNativeDriver: true }),
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
            setError(err instanceof Error ? err.message : 'Erreur de connexion');
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
                <KeyboardAvoidingView
                    style={styles.kav}
                    behavior="padding"
                >
                    <ScrollView
                        contentContainerStyle={styles.scroll}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <Animated.View
                            style={[styles.heroSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
                        >
                            {/* Logo */}
                            <View style={styles.logo}>
                                <Text style={styles.logoIcon}>✦</Text>
                                <Text style={styles.logoText}>AstroMatch</Text>
                            </View>

                            {/* Badge */}
                            <View style={styles.badge}>
                                <Feather name="star" size={13} color={colors.primary} />
                                <Text style={styles.badgeText}>THE STARS ARE ALIGNING</Text>
                            </View>

                            {/* Hero title */}
                            <Text style={styles.heroTitle}>
                                Discover your{'\n'}true{' '}
                                <Text style={styles.heroAccent}>compatibility</Text>
                            </Text>

                            {/* Description */}
                            <Text style={styles.description}>
                                Where ancient wisdom meets modern connection. Journey through the zodiac to find a soul that resonates with your celestial frequency.
                            </Text>

                            {/* Avatar stack */}
                            <View style={styles.avatarRow}>
                                {['A', 'B', 'C'].map((l, i) => (
                                    <View
                                        key={l}
                                        style={[
                                            styles.avatarBubble,
                                            { marginLeft: i === 0 ? 0 : -12, zIndex: 3 - i },
                                        ]}
                                    >
                                        <Text style={styles.avatarLetter}>{l}</Text>
                                    </View>
                                ))}
                                <View style={[styles.avatarBubble, { marginLeft: -12 }]}>
                                    <Text style={styles.avatarPlus}>+12K</Text>
                                </View>
                            </View>
                            <View style={styles.socialProof}>
                                <View style={styles.proofDot} />
                                <Text style={styles.proofText}>Join 12,000+ souls already connected</Text>
                            </View>
                        </Animated.View>

                        {/* Bottom glass card */}
                        <Animated.View
                            style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
                        >
                            <Text style={styles.cardTitle}>Begin your journey</Text>
                            <Text style={styles.cardSub}>
                                Connectez-vous pour accéder à votre univers astrologique.
                            </Text>

                            {/* Inputs */}
                            <View style={styles.inputs}>
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
                                <View style={{ height: spacing.lg }} />
                                <AppInput
                                    label="Mot de passe"
                                    placeholder="••••••••"
                                    secureTextEntry
                                    value={pwd}
                                    onChangeText={setPwd}
                                    disabled={isLoading}
                                />
                            </View>

                            {/* Error */}
                            {!!error && (
                                <View style={styles.errorBox}>
                                    <Text style={styles.errorText}>{error}</Text>
                                </View>
                            )}

                            {/* Actions */}
                            {isLoading ? (
                                <View style={styles.loadingWrap}>
                                    <InlineLoading />
                                    <Text style={styles.loadingText}>Connexion en cours...</Text>
                                </View>
                            ) : (
                                <>
                                    {/* Primary CTA */}
                                    <Pressable onPress={handleLogin} style={styles.primaryBtn}>
                                        <LinearGradient
                                            colors={[colors.primary, colors.primaryContainer]}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                            style={styles.primaryBtnGradient}
                                        >
                                            <Text style={styles.primaryBtnText}>Se connecter</Text>
                                            <Feather name="arrow-right" size={16} color={colors.surfaceLowest} />
                                        </LinearGradient>
                                    </Pressable>

                                    {/* Divider */}
                                    <View style={styles.dividerRow}>
                                        <View style={styles.dividerLine} />
                                        <Text style={styles.dividerText}>OU</Text>
                                        <View style={styles.dividerLine} />
                                    </View>

                                    {/* Secondary */}
                                    <Pressable
                                        style={styles.secondaryBtn}
                                        onPress={() => router.push('/signup')}
                                    >
                                        <Text style={styles.secondaryBtnText}>Créer un compte</Text>
                                    </Pressable>
                                </>
                            )}
                        </Animated.View>
                    </ScrollView>
                </KeyboardAvoidingView>
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
    kav: { flex: 1 },
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
    avatarRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    avatarBubble: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.surfaceContainerHigh,
        borderWidth: 2,
        borderColor: colors.surfaceLowest,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarLetter: {
        fontFamily: fonts.body.semiBold,
        fontSize: 14,
        color: colors.onSurface,
    },
    avatarPlus: {
        fontFamily: fonts.body.semiBold,
        fontSize: 10,
        color: colors.onSurfaceMuted,
    },
    socialProof: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    proofDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.primary,
    },
    proofText: {
        fontFamily: fonts.body.regular,
        fontSize: 13,
        color: colors.onSurfaceMuted,
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
    inputs: {
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
    primaryBtn: {
        borderRadius: radius.full,
        overflow: 'hidden',
        marginBottom: spacing.xl,
    },
    primaryBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.md,
        paddingVertical: spacing.lg,
    },
    primaryBtnText: {
        fontFamily: fonts.body.semiBold,
        fontSize: 15,
        color: colors.surfaceLowest,
        letterSpacing: 0.5,
    },
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.lg,
        marginBottom: spacing.xl,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: `${colors.outline}33`,
    },
    dividerText: {
        fontFamily: fonts.body.medium,
        fontSize: 11,
        letterSpacing: 1.5,
        color: `${colors.onSurfaceMuted}99`,
        textTransform: 'uppercase',
    },
    secondaryBtn: {
        borderRadius: radius.full,
        backgroundColor: `${colors.surfaceBright}99`,
        borderWidth: 1,
        borderColor: `${colors.outline}1A`,
        paddingVertical: spacing.lg,
        alignItems: 'center',
    },
    secondaryBtnText: {
        fontFamily: fonts.body.semiBold,
        fontSize: 15,
        color: colors.onSurface,
    },
});