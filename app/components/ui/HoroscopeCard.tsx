/**
 * HoroscopeCard Component
 *
 * Card for displaying daily horoscope sections
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, borderRadius, shadows } from '@/theme';
import { AppText } from './Text';

export interface HoroscopeCardProps {
    icon: string;
    title: string;
    content: string;
    accentColor?: string;
    style?: ViewStyle;
}

export function HoroscopeCard({
    icon,
    title,
    content,
    accentColor = colors.brand.primary,
    style,
}: HoroscopeCardProps) {
    return (
        <View style={[styles.card, { borderLeftColor: accentColor }, style]}>
            <View style={styles.header}>
                <AppText style={styles.icon}>{icon}</AppText>
                <AppText variant="bodyMedium" color="primary" style={styles.title}>
                    {title}
                </AppText>
            </View>
            <AppText variant="body" color="secondary" style={styles.content}>
                {content}
            </AppText>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.surface.elevated,
        borderRadius: borderRadius.card,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        borderLeftWidth: 3,
        padding: spacing.lg,
        ...shadows.sm,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    icon: {
        fontSize: 24,
        lineHeight: 32,
        marginRight: spacing.sm,
    },
    title: {
        fontWeight: '600',
    },
    content: {
        lineHeight: 24,
    },
});

export default HoroscopeCard;
