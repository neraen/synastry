/**
 * TopicSelectorModal — mandatory subject picker shown when opening a new Lyra chat.
 *
 * No cancel button and no backdrop dismissal: a topic must be chosen before the
 * conversation can start. Selecting a tile fires onSelect(topic) and the parent
 * closes the modal + kicks off the conversation.
 */

import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, fonts, spacing, radius } from '@/theme';
import { TOPICS, TopicLyra } from '@/constants/topics';

export function TopicSelectorModal({
    visible,
    onSelect,
}: {
    visible: boolean;
    onSelect: (topic: TopicLyra) => void;
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
            // Selection is mandatory: ignore Android back / system dismissal.
            onRequestClose={() => {}}
        >
            <View style={styles.overlay}>
                <View style={styles.card}>
                    <Text style={styles.title}>De quoi veux-tu parler ?</Text>

                    <View style={styles.grid}>
                        {TOPICS.map((topic) => (
                            <Pressable
                                key={topic.key}
                                onPress={() => handlePick(topic.key)}
                                style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
                            >
                                {({ pressed }) => (
                                    <>
                                        <Text style={styles.tileEmoji}>{topic.emoji}</Text>
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
    title: {
        fontFamily: fonts.display.regular,
        fontSize: 22,
        color: colors.onSurface,
        textAlign: 'center',
        marginBottom: spacing.xl,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: spacing.md,
    },
    tile: {
        width: '47%',
        aspectRatio: 1.25,
        backgroundColor: colors.surfaceContainerHigh,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    tilePressed: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    tileEmoji: {
        fontSize: 32,
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
