import React from 'react';
import { View, ScrollView, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radius, fonts } from '@/theme';

export default function DemoLogin() {
    const router = useRouter();

    return (
        <View style={styles.screen}>
            {/* Star decorations */}
            <View style={[styles.star, { top: 80, right: 48, width: 4, height: 4, opacity: 0.4 }]} />
            <View style={[styles.star, { top: 128, right: 96, width: 2, height: 2, opacity: 0.3 }]} />
            <View style={[styles.star, { top: 192, left: 32, width: 4, height: 4, opacity: 0.2 }]} />
            <View style={[styles.star, { top: 256, right: 32, width: 2, height: 2, opacity: 0.4 }]} />
            <View style={[styles.star, { bottom: 320, left: 48, width: 4, height: 4, opacity: 0.3 }]} />
            <View style={[styles.star, { bottom: 280, right: 64, width: 2, height: 2, opacity: 0.2 }]} />

            <SafeAreaView style={styles.safeArea}>
                <View style={styles.inner}>
                    {/* Back button */}
                    <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
                        <Feather name="arrow-left" size={18} color={colors.onSurfaceMuted} />
                    </Pressable>

                    {/* Logo */}
                    <View style={styles.logo}>
                        <Feather name="star" size={18} color={colors.primary} />
                        <Text style={styles.logoText}>AstroMatch</Text>
                    </View>

                    {/* Badge */}
                    <View style={styles.badge}>
                        <Feather name="star" size={14} color={colors.primary} />
                        <Text style={styles.badgeText}>THE STARS ARE ALIGNING</Text>
                    </View>

                    {/* Hero Title */}
                    <View style={styles.heroSection}>
                        <Text style={styles.heroTitle}>
                            Discover your{'\n'}true{' '}
                            <Text style={styles.heroAccent}>compatibility</Text>
                        </Text>
                    </View>

                    {/* Description */}
                    <Text style={styles.description}>
                        Where ancient wisdom meets modern connection. Journey through the zodiac to find a soul that resonates with your celestial frequency.
                    </Text>

                    {/* Avatar stack */}
                    <View style={styles.avatarSection}>
                        <View style={styles.avatarStack}>
                            {['A', 'B', 'C'].map((l, i) => (
                                <View
                                    key={l}
                                    style={[
                                        styles.avatarBubble,
                                        { marginLeft: i === 0 ? 0 : -12, zIndex: 3 - i }
                                    ]}
                                >
                                    <Text style={styles.avatarLetter}>{l}</Text>
                                </View>
                            ))}
                            <View style={[styles.avatarBubble, { marginLeft: -12 }]}>
                                <Text style={styles.avatarPlus}>+12K</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.socialProof}>
                        <View style={styles.proofDot} />
                        <Text style={styles.proofText}>Join 12,000+ souls already connected</Text>
                    </View>

                    {/* Spacer */}
                    <View style={{ flex: 1, minHeight: 32 }} />

                    {/* Bottom glass card */}
                    <View style={styles.bottomCard}>
                        <Text style={styles.cardTitle}>Begin your journey</Text>
                        <Text style={styles.cardSub}>
                            We'll need your birth chart details to find your cosmic matches.
                        </Text>

                        {/* Primary CTA */}
                        <Pressable style={styles.primaryBtn}>
                            <LinearGradient
                                colors={[colors.primary, colors.primaryContainer]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.primaryBtnGradient}
                            >
                                <Text style={styles.primaryBtnText}>Create Birth Chart</Text>
                                <Feather name="arrow-right" size={18} color={colors.surfaceLowest} />
                            </LinearGradient>
                        </Pressable>

                        {/* Secondary */}
                        <Pressable style={styles.secondaryBtn}>
                            <Text style={styles.secondaryBtnText}>Login</Text>
                        </Pressable>

                        {/* Divider */}
                        <View style={styles.dividerRow}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>OR SIGN UP WITH</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        {/* Social buttons */}
                        <View style={styles.socialRow}>
                            <Pressable style={styles.socialBtn}>
                                <Text style={styles.socialIcon}>G</Text>
                                <Text style={styles.socialBtnText}>Google</Text>
                            </Pressable>
                            <Pressable style={styles.socialBtn}>
                                <Text style={styles.socialIcon}>f</Text>
                                <Text style={styles.socialBtnText}>Facebook</Text>
                            </Pressable>
                        </View>

                        {/* Terms */}
                        <Text style={styles.terms}>
                            By continuing, you agree to AstroMatch's{' '}
                            <Text style={styles.termsLink}>Terms of Service</Text>
                            {' '}and{' '}
                            <Text style={styles.termsLink}>Privacy Policy</Text>.
                        </Text>
                    </View>
                </View>
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
    inner: {
        flex: 1,
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.lg,
        paddingBottom: 0,
    },
    star: {
        position: 'absolute',
        borderRadius: 99,
        backgroundColor: colors.onSurfaceMuted,
    },

    backBtn: { marginBottom: spacing.xl },
    logo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.xxl,
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

    heroSection: { marginBottom: spacing.xl },
    heroTitle: {
        fontFamily: fonts.display.regular,
        fontSize: 40,
        lineHeight: 48,
        color: colors.onSurface,
    },
    heroAccent: {
        fontFamily: fonts.display.regular,
        color: colors.primary,
        fontStyle: 'italic',
    },

    description: {
        fontFamily: fonts.body.regular,
        fontSize: 15,
        lineHeight: 24,
        color: colors.onSurfaceMuted,
        maxWidth: 320,
        marginBottom: spacing.xxl,
    },

    avatarSection: { marginBottom: spacing.sm },
    avatarStack: { flexDirection: 'row', alignItems: 'center' },
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
        marginBottom: spacing.xl,
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

    // Bottom card
    bottomCard: {
        backgroundColor: `${colors.surfaceLow}CC`,
        borderRadius: 40,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.xxl,
        paddingBottom: spacing.xl,
        borderTopWidth: 1,
        borderTopColor: `${colors.outline}1A`,
        marginHorizontal: -spacing.xl,
    },
    cardTitle: {
        fontFamily: fonts.display.regular,
        fontSize: 24,
        color: colors.onSurface,
        marginBottom: spacing.sm,
    },
    cardSub: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        color: colors.onSurfaceMuted,
        marginBottom: spacing.xl,
        lineHeight: 20,
    },

    primaryBtn: {
        borderRadius: radius.full,
        overflow: 'hidden',
        marginBottom: spacing.md,
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

    secondaryBtn: {
        borderRadius: radius.full,
        backgroundColor: `${colors.surfaceBright}99`,
        borderWidth: 1,
        borderColor: `${colors.outline}1A`,
        paddingVertical: spacing.lg,
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    secondaryBtnText: {
        fontFamily: fonts.body.semiBold,
        fontSize: 15,
        color: colors.onSurface,
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
        fontSize: 10,
        letterSpacing: 1.5,
        color: `${colors.onSurfaceMuted}99`,
        textTransform: 'uppercase',
    },

    socialRow: {
        flexDirection: 'row',
        gap: spacing.lg,
        marginBottom: spacing.xl,
    },
    socialBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.md,
        borderRadius: radius.full,
        backgroundColor: `${colors.surfaceContainerHigh}99`,
        borderWidth: 1,
        borderColor: `${colors.outline}1A`,
    },
    socialIcon: {
        fontFamily: fonts.body.bold,
        fontSize: 16,
        color: colors.onSurface,
    },
    socialBtnText: {
        fontFamily: fonts.body.medium,
        fontSize: 13,
        color: colors.onSurface,
    },

    terms: {
        fontFamily: fonts.body.regular,
        fontSize: 11,
        color: `${colors.onSurfaceMuted}99`,
        textAlign: 'center',
        lineHeight: 18,
    },
    termsLink: {
        color: colors.onSurfaceMuted,
        textDecorationLine: 'underline',
    },
});