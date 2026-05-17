import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, fonts } from '@/theme';
import { submitFeedback } from '@/services/feedback';

interface Props {
    contentType: 'chat' | 'horoscope' | 'natal';
    contentRef: string;
    label?: string;
}

export function FeedbackThumbs({ contentType, contentRef, label }: Props) {
    const [vote, setVote] = useState<'up' | 'down' | null>(null);

    const handleVote = async (v: 'up' | 'down') => {
        const next = vote === v ? null : v;
        setVote(next);
        if (next !== null) {
            await submitFeedback(contentType, next === 'up', contentRef).catch(() => {});
        }
    };

    return (
        <View style={styles.row}>
            {label ? <Text style={styles.label}>{label}</Text> : null}
            <Pressable
                onPress={() => handleVote('up')}
                hitSlop={10}
                style={({ pressed }) => [styles.btn, pressed && { opacity: 0.6 }]}
            >
                <Feather
                    name="thumbs-up"
                    size={14}
                    color={vote === 'up' ? colors.primary : `${colors.onSurfaceMuted}70`}
                />
            </Pressable>
            <Pressable
                onPress={() => handleVote('down')}
                hitSlop={10}
                style={({ pressed }) => [styles.btn, pressed && { opacity: 0.6 }]}
            >
                <Feather
                    name="thumbs-down"
                    size={14}
                    color={vote === 'down' ? colors.primary : `${colors.onSurfaceMuted}70`}
                />
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    label: {
        fontFamily: fonts.body.regular,
        fontSize: 12,
        color: `${colors.onSurfaceMuted}90`,
    },
    btn: {
        padding: 4,
    },
});
