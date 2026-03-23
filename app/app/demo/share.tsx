import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radius, fonts } from '@/theme';

function ZodiacProfile({ name, sign, symbol }: { name: string; sign: string; symbol: string }) {
    return (
        <View style={styles.zodiacProfile}>
            <View style={styles.zodiacAvatar}>
                <Text style={styles.zodiacSymbol}>{symbol}</Text>
            </View>
            <Text style={styles.zodiacName}>{name}</Text>
            <Text style={styles.zodiacSign}>{sign}</Text>
        </View>
    );
}

function SynergyConnector() {
    return (
        <View style={styles.connector}>
            <View style={styles.connectorLineTop} />
            <Text style={styles.connectorInfinity}>∞</Text>
            <Text style={styles.connectorLabel}>SYNERGY</Text>
            <View style={styles.connectorLineBottom} />
        </View>
    );
}

export default function DemoShare() {
    const router = useRouter();
    return (
        <View style={styles.screen}>
            <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
                <View style={styles.pageContent}>
                    {/* Back button */}
                    <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
                        <Feather name="arrow-left" size={18} color={colors.onSurfaceMuted} />
                    </Pressable>

                    {/* Card */}
                    <View style={styles.card}>
                        {/* Gradient background */}
                        <LinearGradient
                            colors={[colors.surfaceContainerHigh, colors.surfaceLowest]}
                            start={{ x: 0.5, y: 0 }}
                            end={{ x: 0.5, y: 1 }}
                            style={StyleSheet.absoluteFill}
                        />
                        {/* Glow accents */}
                        <View style={styles.glowTopRight} />
                        <View style={styles.glowBottomLeft} />

                        {/* Header */}
                        <View style={styles.cardHeader}>
                            <Feather name="star" size={18} color={`${colors.primary}CC`} />
                            <Text style={styles.cardLogo}>AstroMatch</Text>
                            <View style={styles.logoUnderline} />
                        </View>

                        {/* Profiles */}
                        <View style={styles.profilesSection}>
                            <ZodiacProfile name="Elena" sign="LEO" symbol="☀" />
                            <SynergyConnector />
                            <ZodiacProfile name="Julian" sign="PISCES" symbol="♓" />
                        </View>

                        {/* Percentage */}
                        <View style={styles.pctSection}>
                            <View style={styles.pctGlow} />
                            <Text style={styles.pctText}>89%</Text>
                            <View style={styles.pctBadge}>
                                <Text style={styles.pctBadgeText}>DESTINED CONNECTION</Text>
                            </View>
                        </View>

                        {/* Quote */}
                        <Text style={styles.quote}>
                            "Leo's vibrant flame meets the ethereal depths of Pisces, weaving a tapestry of profound spiritual understanding."
                        </Text>

                        {/* Footer */}
                        <View style={styles.cardFooter}>
                            <View style={styles.footerDivider} />
                            <View style={styles.footerRow}>
                                <Text style={styles.footerText}>astromatch.app</Text>
                                <Text style={styles.footerText}>#SoulmateReading</Text>
                            </View>
                        </View>
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
    pageContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
    },
    backBtn: {
        position: 'absolute',
        top: spacing.xl,
        left: spacing.xl,
        zIndex: 10,
    },

    card: {
        width: '100%',
        maxWidth: 360,
        borderRadius: 40,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xxl,
        paddingVertical: spacing.xxxl,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 24 },
        shadowOpacity: 0.6,
        shadowRadius: 40,
        elevation: 20,
        gap: spacing.xxl,
    },

    glowTopRight: {
        position: 'absolute',
        top: -40,
        right: -40,
        width: 128,
        height: 128,
        borderRadius: 64,
        backgroundColor: `${colors.primary}0D`,
    },
    glowBottomLeft: {
        position: 'absolute',
        bottom: -40,
        left: -40,
        width: 128,
        height: 128,
        borderRadius: 64,
        backgroundColor: `${colors.secondary}0D`,
    },

    cardHeader: {
        alignItems: 'center',
        gap: spacing.sm,
        zIndex: 1,
    },
    cardLogo: {
        fontFamily: fonts.body.medium,
        fontSize: 20,
        letterSpacing: 2,
        color: `${colors.primary}E6`,
    },
    logoUnderline: {
        width: 48,
        height: 1,
        backgroundColor: `${colors.primary}4D`,
    },

    profilesSection: {
        alignItems: 'center',
        gap: spacing.lg,
        zIndex: 1,
    },
    zodiacProfile: { alignItems: 'center', gap: spacing.md },
    zodiacAvatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    zodiacSymbol: { fontSize: 32, color: `${colors.primary}B3` },
    zodiacName: {
        fontFamily: fonts.display.regular,
        fontSize: 18,
        color: colors.onSurface,
        letterSpacing: 0.5,
    },
    zodiacSign: {
        fontFamily: fonts.body.medium,
        fontSize: 10,
        letterSpacing: 2.5,
        color: `${colors.onSurfaceMuted}B3`,
        textTransform: 'uppercase',
    },

    connector: { alignItems: 'center', gap: spacing.xs },
    connectorLineTop: {
        width: 1,
        height: 24,
        backgroundColor: `${colors.primary}4D`,
    },
    connectorInfinity: {
        fontSize: 22,
        color: `${colors.primary}66`,
        lineHeight: 28,
    },
    connectorLabel: {
        fontFamily: fonts.body.semiBold,
        fontSize: 9,
        letterSpacing: 4,
        color: `${colors.secondary}B3`,
        textTransform: 'uppercase',
    },
    connectorLineBottom: {
        width: 1,
        height: 24,
        backgroundColor: `${colors.primary}4D`,
    },

    pctSection: {
        alignItems: 'center',
        gap: spacing.lg,
        zIndex: 1,
    },
    pctGlow: {
        position: 'absolute',
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: `${colors.primary}0D`,
    },
    pctText: {
        fontFamily: fonts.display.regular,
        fontSize: 90,
        lineHeight: 96,
        letterSpacing: -4,
        color: colors.primary,
        zIndex: 1,
    },
    pctBadge: {
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: `${colors.primary}33`,
        backgroundColor: `${colors.primary}0D`,
        paddingHorizontal: spacing.xl,
        paddingVertical: 6,
    },
    pctBadgeText: {
        fontFamily: fonts.body.semiBold,
        fontSize: 9,
        letterSpacing: 3,
        color: colors.primary,
        textTransform: 'uppercase',
    },

    quote: {
        fontFamily: fonts.body.regular,
        fontSize: 13,
        lineHeight: 20,
        color: `${colors.onSurface}99`,
        textAlign: 'center',
        fontStyle: 'italic',
        maxWidth: 280,
        zIndex: 1,
    },

    cardFooter: {
        width: '100%',
        gap: spacing.lg,
        zIndex: 1,
    },
    footerDivider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    footerText: {
        fontFamily: fonts.body.medium,
        fontSize: 8,
        letterSpacing: 3,
        color: `${colors.onSurfaceMuted}66`,
        textTransform: 'uppercase',
    },
});