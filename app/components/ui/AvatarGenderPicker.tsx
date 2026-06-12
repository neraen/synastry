/**
 * AvatarGenderPicker
 *
 * Subtle gender selection through sign avatars: once a birth date is known,
 * shows the two avatar variants of that sun sign (female / male) and the
 * user taps the one that represents them. Renders nothing without a valid date.
 */

import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from '@/theme';
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
                    return (
                        <Pressable
                            key={gender}
                            onPress={() => onChange(gender)}
                            disabled={disabled}
                            style={[
                                styles.tile,
                                selected && styles.tileSelected,
                                disabled && styles.disabled,
                            ]}
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                        >
                            <Image
                                source={getSignAvatarBySign(sign, gender)}
                                style={[styles.avatar, !selected && value !== null && styles.avatarDimmed]}
                                resizeMode="contain"
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
        gap: spacing.md,
    },
    tile: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        backgroundColor: colors.surface.glass,
    },
    tileSelected: {
        ...shadows.ambientGlow,
        backgroundColor: colors.glow.gold,
    },
    avatar: {
        width: 88,
        height: 88,
    },
    avatarDimmed: {
        opacity: 0.45,
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
