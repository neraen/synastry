/**
 * AppHeader
 * Top header bar with logo, greeting, and avatar.
 */

import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, radius, typography, fonts } from '@/theme';
import { CelestialText } from './CelestialText';

interface AppHeaderProps {
    userName: string;
    onAvatarPress?: () => void;
}

export const AppHeader = memo(function AppHeader({
    userName,
    onAvatarPress,
}: AppHeaderProps) {
    return (
        <View style={styles.container}>
            {/* Logo */}
            <Text style={styles.logoContainer}>
                <Text style={styles.logoStar}>✦ </Text>
                <Text style={styles.logoText}>AstroMatch</Text>
            </Text>

            {/* Right side: greeting + avatar */}
            <View style={styles.rightSection}>
                <CelestialText variant="bodyMd" color="muted">
                    Hi, {userName}
                </CelestialText>
                <Pressable
                    onPress={onAvatarPress}
                    style={({ pressed }) => [
                        styles.avatar,
                        pressed && styles.avatarPressed,
                    ]}
                >
                    <Feather name="user" size={18} color={colors.onSurface} />
                </Pressable>
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.md,
        paddingBottom: spacing.lg,
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logoStar: {
        ...typography.titleLg,
        color: colors.primary,
    },
    logoText: {
        ...typography.titleLg,
        fontFamily: fonts.display.regular,
        fontStyle: 'italic',
        color: colors.primary,
    },
    rightSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: radius.full,
        backgroundColor: colors.surfaceContainerHigh,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarPressed: {
        opacity: 0.7,
    },
});

export default AppHeader;
