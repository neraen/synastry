/**
 * AvatarGenderPicker
 *
 * Subtle gender selection through sign avatars: once a birth date is known,
 * shows the two avatar variants of that sun sign (female / male) and the
 * user taps the one that represents them. Renders nothing without a valid date.
 *
 * Avatars are circular crops (same treatment as TabHeader/profile); selection
 * is a gold-tinted halo + full opacity — no borders, per the design system.
 */

import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { colors, typography, spacing, shadows } from '@/theme';
import { getSunSign, getSignAvatarBySign, Gender } from '@/utils/signAvatar';

interface AvatarGenderPickerProps {
    birthDate?: string | null;
    value: Gender | null;
    onChange: (gender: Gender) => void;
    label?: string;
    error?: string;
    disabled?: boolean;
}

const OPTIONS: Gender[] = ['female', 'male'];

const AVATAR_SIZE = 72;
const HALO_SIZE = 88;

export function AvatarGenderPicker({
    birthDate,
    value,
    onChange,
    label,
    error,
    disabled = false,
}: AvatarGenderPickerProps) {
    const sign = getSunSign(birthDate);
    if (!sign) return null;

    return (
        <View style={styles.container}>
            {label && (
                <Text style={[styles.label, error && styles.labelError]}>
                    {label}
                </Text>
            )}

            <View style={styles.row}>
                {OPTIONS.map((gender) => {
                    const selected = value === gender;
                    const dimmed = value !== null && !selected;
                    return (
                        <Pressable
                            key={gender}
                            onPress={() => onChange(gender)}
                            disabled={disabled}
                            style={[
                                styles.halo,
                                selected && styles.haloSelected,
                                disabled && styles.disabled,
                            ]}
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                            hitSlop={8}
                        >
                            <Image
                                source={getSignAvatarBySign(sign, gender)}
                                style={[styles.avatar, dimmed && styles.avatarDimmed]}
                            />
                        </Pressable>
                    );
                })}
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    label: {
        ...typography.label,
        color: colors.text.secondary,
        marginBottom: spacing.sm,
    },
    labelError: {
        color: colors.status.error,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: spacing.xxl,
        paddingVertical: spacing.xs,
    },
    halo: {
        width: HALO_SIZE,
        height: HALO_SIZE,
        borderRadius: HALO_SIZE / 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    haloSelected: {
        ...shadows.ambientGlow,
        backgroundColor: colors.glow.gold,
    },
    avatar: {
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        borderRadius: AVATAR_SIZE / 2,
        backgroundColor: colors.surfaceContainerHigh,
    },
    avatarDimmed: {
        opacity: 0.4,
    },
    errorText: {
        ...typography.caption,
        color: colors.status.error,
        marginTop: spacing.xs,
    },
    disabled: {
        opacity: 0.5,
    },
});

export default AvatarGenderPicker;
