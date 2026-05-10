/**
 * NoBirthProfileCard — full-screen prompt shown when the user
 * has not yet completed their birth profile.
 *
 * Includes the TabHeader so the screen looks complete.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { TabHeader } from './TabHeader';
import { GoldButton } from './GoldButton';
import { colors, spacing, radius, fonts } from '@/theme';

interface NoBirthProfileCardProps {
    /** Override the default title */
    title?: string;
    /** Override the default subtitle */
    subtitle?: string;
}

export function NoBirthProfileCard({ title, subtitle }: NoBirthProfileCardProps = {}) {
    const router = useRouter();
    const { t } = useTranslation();

    return (
        <View style={styles.root}>
            <SafeAreaView style={styles.safe} edges={['top']}>
                <TabHeader />

                <View style={styles.body}>
                    <Text style={styles.icon}>✨</Text>

                    {/* Copy */}
                    <View style={styles.textBlock}>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{t('noBirthProfile.badge')}</Text>
                        </View>
                        <Text style={styles.title}>
                            {title ?? t('noBirthProfile.title')}
                        </Text>
                        <Text style={styles.subtitle}>
                            {subtitle ?? t('noBirthProfile.subtitle')}
                        </Text>
                    </View>

                    <GoldButton
                        label={t('noBirthProfile.cta')}
                        onPress={() => router.push('/birth-profile')}
                    />
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.surfaceLowest },
    safe: { flex: 1 },

    body: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
        gap: spacing.xxl,
    },

    icon: {
        fontSize: 40,
    },

    // ── Text ─────────────────────────────────────────────────────────────────
    textBlock: {
        alignItems: 'center',
        gap: spacing.md,
    },
    badge: {
        backgroundColor: `${colors.primary}18`,
        borderRadius: radius.full,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.xs,
        marginBottom: spacing.sm,
    },
    badgeText: {
        fontFamily: fonts.body.medium,
        fontSize: 11,
        letterSpacing: 1.2,
        color: colors.primary,
        textTransform: 'uppercase',
    },
    title: {
        fontFamily: fonts.display.bold,
        fontSize: 26,
        color: colors.onSurface,
        textAlign: 'center',
        lineHeight: 34,
    },
    subtitle: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        color: colors.onSurfaceMuted,
        textAlign: 'center',
        lineHeight: 21,
        maxWidth: 280,
        marginBottom: spacing.lg,
    },
});
