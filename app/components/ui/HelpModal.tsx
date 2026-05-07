/**
 * HelpModal — Reusable bottom-sheet help modal.
 *
 * Accepts structured sections with items. If more than one section is
 * provided, a tab row is displayed at the top. Items can optionally render
 * an astrological symbol bubble or a plain dot indicator.
 */

import React, { useState } from 'react';
import {
    Modal,
    View,
    Text,
    Pressable,
    ScrollView,
    StyleSheet,
    TouchableWithoutFeedback,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, radius, fonts } from '@/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HelpItem {
    /** Unicode astrological symbol (e.g. "☉", "☌") */
    symbol?: string;
    /** Hex color for the symbol and its bubble background */
    symbolColor?: string;
    name: string;
    /** Small right-aligned badge text, e.g. an angle like "0°" */
    badge?: string;
    description: string;
}

export interface HelpSection {
    key: string;
    title: string;
    items: HelpItem[];
}

interface HelpModalProps {
    visible: boolean;
    onClose: () => void;
    title: string;
    sections: HelpSection[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HelpModal({ visible, onClose, title, sections }: HelpModalProps) {
    const [activeIdx, setActiveIdx] = useState(0);
    const hasTabs = sections.length > 1;
    const current = sections[Math.min(activeIdx, sections.length - 1)];

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <TouchableWithoutFeedback onPress={onClose}>
                    <View style={StyleSheet.absoluteFill} />
                </TouchableWithoutFeedback>

                <View style={styles.sheet}>
                    <View style={styles.handle} />

                    <View style={styles.header}>
                        <Text style={styles.title}>{title}</Text>
                        <Pressable onPress={onClose} hitSlop={12}>
                            <Feather name="x" size={18} color={colors.onSurfaceMuted} />
                        </Pressable>
                    </View>

                    {hasTabs && (
                        <View style={styles.tabRow}>
                            {sections.map((s, i) => (
                                <Pressable
                                    key={s.key}
                                    style={[styles.tab, activeIdx === i && styles.tabActive]}
                                    onPress={() => setActiveIdx(i)}
                                >
                                    <Text style={[styles.tabText, activeIdx === i && styles.tabTextActive]}>
                                        {s.title}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    )}

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                    >
                        {current.items.map((item, i) => (
                            <View key={i} style={styles.item}>
                                {item.symbol ? (
                                    <View style={[
                                        styles.symbolBubble,
                                        { backgroundColor: `${item.symbolColor ?? colors.primary}20` },
                                    ]}>
                                        <Text style={[
                                            styles.symbol,
                                            { color: item.symbolColor ?? colors.primary },
                                            item.symbol.length > 1 && styles.symbolSmall,
                                        ]}>
                                            {item.symbol}
                                        </Text>
                                    </View>
                                ) : (
                                    <View style={styles.dotBubble}>
                                        <View style={[
                                            styles.dot,
                                            { backgroundColor: item.symbolColor ?? colors.primary },
                                        ]} />
                                    </View>
                                )}

                                <View style={styles.itemBody}>
                                    <View style={styles.itemHeader}>
                                        <Text style={[
                                            styles.itemName,
                                            item.symbolColor ? { color: item.symbolColor } : undefined,
                                        ]}>
                                            {item.name}
                                        </Text>
                                        {item.badge && (
                                            <Text style={styles.itemBadge}>{item.badge}</Text>
                                        )}
                                    </View>
                                    <Text style={styles.itemDesc}>{item.description}</Text>
                                </View>
                            </View>
                        ))}
                        <View style={{ height: spacing.xl }} />
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: colors.surfaceContainer,
        borderTopLeftRadius: radius.xl,
        borderTopRightRadius: radius.xl,
        paddingTop: spacing.md,
        maxHeight: '82%',
    },
    handle: {
        width: 36,
        height: 4,
        borderRadius: radius.full,
        backgroundColor: colors.outline,
        alignSelf: 'center',
        marginBottom: spacing.lg,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.md,
    },
    title: {
        fontFamily: fonts.display.regular,
        fontSize: 18,
        color: colors.onSurface,
        letterSpacing: 0.2,
    },
    tabRow: {
        flexDirection: 'row',
        paddingHorizontal: spacing.xl,
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    tab: {
        paddingHorizontal: spacing.md,
        paddingVertical: 7,
        borderRadius: radius.full,
        backgroundColor: colors.surfaceContainerHigh,
    },
    tabActive: {
        backgroundColor: colors.primary,
    },
    tabText: {
        fontFamily: fonts.body.semiBold,
        fontSize: 13,
        color: colors.onSurfaceMuted,
    },
    tabTextActive: {
        color: colors.surfaceLowest,
    },
    scrollContent: {
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.sm,
    },
    item: {
        flexDirection: 'row',
        gap: spacing.md,
        marginBottom: spacing.lg,
        alignItems: 'flex-start',
    },
    symbolBubble: {
        width: 44,
        height: 44,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    symbol: {
        fontSize: 18,
        lineHeight: 22,
    },
    symbolSmall: {
        fontSize: 10,
    },
    dotBubble: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    itemBody: {
        flex: 1,
    },
    itemHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.xs,
    },
    itemName: {
        fontFamily: fonts.body.semiBold,
        fontSize: 14,
        color: colors.onSurface,
    },
    itemBadge: {
        fontFamily: fonts.body.regular,
        fontSize: 11,
        color: colors.onSurfaceMuted,
        backgroundColor: colors.surfaceContainerHigh,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: radius.full,
    },
    itemDesc: {
        fontFamily: fonts.body.regular,
        fontSize: 13,
        lineHeight: 19,
        color: colors.onSurfaceMuted,
    },
});
