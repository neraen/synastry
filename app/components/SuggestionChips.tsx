/**
 * SuggestionChips — contextual starter prompts shown under Lyra's welcome message.
 *
 * Tapping a chip immediately sends it as the user's first message. The parent owns
 * the lifecycle: chips are cleared as soon as one is tapped or the user types.
 */

import React from 'react';
import { ScrollView, Pressable, Text, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, fonts, spacing, radius } from '@/theme';

export function SuggestionChips({
    suggestions,
    onSelect,
}: {
    suggestions: string[];
    onSelect: (text: string) => void;
}) {
    if (suggestions.length === 0) return null;

    const handlePress = (text: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onSelect(text);
    };

    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.scroll}
            contentContainerStyle={styles.row}
            keyboardShouldPersistTaps="handled"
        >
            {suggestions.map((text, i) => (
                <Pressable
                    key={i}
                    onPress={() => handlePress(text)}
                    style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
                >
                    <Text style={styles.chipText} numberOfLines={1}>{text}</Text>
                </Pressable>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    // Hug the content height — without this a horizontal ScrollView grows to fill
    // the leftover vertical space between the list and the input bar.
    scroll: {
        flexGrow: 0,
        flexShrink: 0,
    },
    row: {
        gap: spacing.sm,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        alignItems: 'center',
    },
    chip: {
        borderRadius: 20,
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: colors.primary,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    chipPressed: {
        backgroundColor: `${colors.primary}1f`,
    },
    chipText: {
        fontFamily: fonts.body.semiBold,
        fontSize: 13,
        color: colors.primary,
    },
});
