/**
 * TabHeader — shared header for all tab screens.
 *
 * Left:  ✦ AstroMatch logo (tap → /transits)
 * Right: "Hi, firstName" + avatar bubble (tap → /profile)
 *
 * Reads the user from AuthContext internally — no props required.
 * Pass `onBack` to show a back arrow instead of the logo tap (used in nested views).
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { colors, spacing, fonts } from '@/theme';

interface TabHeaderProps {
    /** Replace logo tap with a back arrow (e.g. compatibility result view) */
    onBack?: () => void;
}

export function TabHeader({ onBack }: TabHeaderProps = {}) {
    const router = useRouter();
    const { user } = useAuth();
    const name = user?.birthProfile?.firstName || 'Stargazer';
    const initial = name.charAt(0).toUpperCase();

    return (
        <View style={styles.header}>
            {/* Left — logo or back */}
            {onBack ? (
                <Pressable style={styles.backBtn} onPress={onBack} hitSlop={12}>
                    <Feather name="arrow-left" size={18} color={colors.onSurfaceMuted} />
                </Pressable>
            ) : (
                <Pressable style={styles.logoRow} onPress={() => router.push('/transits')} hitSlop={8}>
                    <Text style={styles.logoIcon}>✦</Text>
                    <Text style={styles.logoText}>AstroMatch</Text>
                </Pressable>
            )}

            {/* Right — greeting + avatar */}
            <Pressable style={styles.userRow} onPress={() => router.push('/(tabs)/profile')} hitSlop={8}>
                <Text style={styles.hiText}>Hi, {name}</Text>
                <View style={styles.avatar}>
                    <Text style={styles.avatarLetter}>{initial}</Text>
                </View>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
    },
    logoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    logoIcon: {
        fontSize: 14,
        color: colors.primary,
        lineHeight: 18,
    },
    logoText: {
        fontFamily: fonts.display.regular,
        fontSize: 18,
        color: colors.onSurface,
        letterSpacing: 0.5,
    },
    backBtn: {
        width: 32,
        alignItems: 'flex-start',
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    hiText: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        color: colors.onSurfaceMuted,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.surfaceContainerHigh,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarLetter: {
        fontFamily: fonts.body.semiBold,
        fontSize: 14,
        color: colors.onSurface,
    },
});