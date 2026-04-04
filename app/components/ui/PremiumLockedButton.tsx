import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, radius, spacing } from '@/theme';

interface Props {
    label: string;
    reason?: string;
    source: string;
}

export function PremiumLockedButton({ label, reason, source }: Props) {
    return (
        <TouchableOpacity
            style={styles.container}
            onPress={() => router.push({ pathname: '/premium', params: { source } })}
            activeOpacity={0.8}
        >
            <View style={styles.row}>
                <Feather name="lock" size={14} color={colors.primary} />
                <Text style={styles.label}>{label}</Text>
            </View>
            {reason && <Text style={styles.reason}>{reason}</Text>}
            <Text style={styles.cta}>✦ Essayer Premium gratuitement</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: `${colors.primary}12`,
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: `${colors.primary}30`,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
        alignItems: 'center',
        gap: spacing.xs,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    label: {
        fontFamily: fonts.body.semiBold,
        fontSize: 15,
        color: colors.onSurface,
    },
    reason: {
        fontFamily: fonts.body.regular,
        fontSize: 13,
        color: colors.onSurfaceMuted,
        textAlign: 'center',
    },
    cta: {
        fontFamily: fonts.body.semiBold,
        fontSize: 13,
        color: colors.primary,
        marginTop: spacing.xs,
    },
});