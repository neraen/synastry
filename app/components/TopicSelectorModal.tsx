/**
 * TopicSelectorModal — mandatory subject picker shown when opening a new Lyra chat.
 *
 * No cancel button and no backdrop dismissal: a topic must be chosen before the
 * conversation can start. Selecting a tile fires onSelect(topic) and the parent
 * closes the modal + kicks off the conversation.
 */

import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, fonts, spacing, radius } from '@/theme';
import { TOPICS, TopicLyra } from '@/constants/topics';

export function TopicSelectorModal({
    visible,
    onSelect,
    onBack,
}: {
    visible: boolean;
    onSelect: (topic: TopicLyra) => void;
    /** Optional: leave the picker without choosing (back arrow + hardware back). */
    onBack?: () => void;
}) {
    const handlePick = (topic: TopicLyra) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onSelect(topic);
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            // Hardware/system back leaves the picker if a handler is provided, else no-op.
            onRequestClose={() => onBack?.()}
        >
            <View style={styles.overlay}>
                <View style={styles.card}>
                    <View style={styles.header}>
                        {onBack ? (
                            <Pressable onPress={onBack} hitSlop={12} style={styles.backBtn}>
                                <Feather name="arrow-left" size={22} color={colors.onSurface} />
                            </Pressable>
                        ) : null}
                        <Text style={styles.title}>De quoi veux-tu parler ?</Text>
                    </View>

                    <View style={styles.grid}>
                        {TOPICS.map((topic) => (
                            <Pressable
                                key={topic.key}
                                onPress={() => handlePick(topic.key)}
                                style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
                            >
                                {({ pressed }) => (
                                    <>
                                        <View style={[styles.iconHalo, pressed && styles.iconHaloPressed]}>
                                            <Feather
                                                name={topic.icon}
                                                size={24}
                                                color={pressed ? colors.surfaceLowest : colors.primary}
                                            />
                                        </View>
                                        <Text style={[styles.tileLabel, pressed && styles.tileLabelPressed]}>
                                            {topic.label}
                                        </Text>
                                    </>
                                )}
                            </Pressable>
                        ))}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        // Deep violet Lunestia, ~0.85 opacity
        backgroundColor: 'rgba(19, 8, 39, 0.88)',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
    },
    card: {
        backgroundColor: colors.surfaceLow,
        borderRadius: 20,
        paddingVertical: spacing.xxl,
        paddingHorizontal: spacing.xl,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.xl,
    },
    backBtn: {
        position: 'absolute',
        left: 0,
        padding: spacing.xs,
    },
    title: {
        fontFamily: fonts.display.regular,
        fontSize: 22,
        color: colors.onSurface,
        textAlign: 'center',
        // Keep the centered title clear of the back arrow on narrow screens.
        paddingHorizontal: spacing.xl,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: spacing.md,
    },
    tile: {
        width: '47%',
        aspectRatio: 1,
        backgroundColor: colors.surfaceContainerHigh,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.md,
        paddingVertical: spacing.lg,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    tilePressed: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    iconHalo: {
        width: 52,
        height: 52,
        borderRadius: radius.full,
        backgroundColor: `${colors.primary}1f`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconHaloPressed: {
        backgroundColor: `${colors.surfaceLowest}26`,
    },
    tileLabel: {
        fontFamily: fonts.body.semiBold,
        fontSize: 15,
        color: colors.onSurface,
    },
    tileLabelPressed: {
        color: colors.surfaceLowest,
    },
});
