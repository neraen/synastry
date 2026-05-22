import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, fonts, spacing, radius } from '@/theme';
import { PlanetGlyph, SignGlyph, TagIconSvg } from './PlanetSignGlyphs';
import type { CompatibilityItem } from './types';

interface Props {
    kicker: string;
    items: CompatibilityItem[];
    variant: 'strength' | 'watch';
}

const VARIANT_COLOR = {
    strength: colors.primary,
    watch: '#F59E0B',
};

export function AccordionListV2({ kicker, items, variant }: Props) {
    const [openIdx, setOpenIdx] = useState(-1);
    const accentColor = VARIANT_COLOR[variant];

    return (
        <View style={styles.section}>
            <View style={styles.sectionHead}>
                <Text style={styles.kicker}>{kicker}</Text>
            </View>
            <View style={styles.list}>
                {items.map((item, i) => {
                    const open = openIdx === i;
                    return (
                        <View
                            key={i}
                            style={[
                                styles.item,
                                i === 0 && styles.itemFirst,
                                i === items.length - 1 && styles.itemLast,
                                open && styles.itemOpen,
                            ]}
                        >
                            <Pressable
                                style={styles.head}
                                onPress={() => setOpenIdx(open ? -1 : i)}
                                android_ripple={{ color: `${accentColor}10` }}
                            >
                                {/* Planet + sign glyph */}
                                <View style={styles.glyphWrap}>
                                    <PlanetGlyph id={item.planet} size={40} />
                                    <View style={styles.badgeWrap}>
                                        <SignGlyph id={item.badge} size={20} />
                                    </View>
                                </View>

                                {/* Title + summary */}
                                <View style={styles.titleWrap}>
                                    <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                                    <Text style={styles.summary} numberOfLines={1}>{item.summary}</Text>
                                </View>

                                {/* Chevron */}
                                <Text style={[styles.chev, open && styles.chevOpen]}>›</Text>
                            </Pressable>

                            {/* Expanded body */}
                            {open && (
                                <View style={styles.body}>
                                    <Text style={styles.detail}>{item.detail}</Text>
                                    {item.tags.length > 0 && (
                                        <View style={styles.tags}>
                                            {item.tags.map((tag, j) => (
                                                <View key={j} style={[styles.tag, { borderColor: `${accentColor}44`, backgroundColor: `${accentColor}14` }]}>
                                                    <TagIconSvg icon={tag.icon} color={accentColor} />
                                                    <Text style={[styles.tagLabel, { color: accentColor }]}>{tag.label}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    section: {
        paddingHorizontal: spacing.xl,
        marginBottom: spacing.xxl,
    },
    sectionHead: {
        marginBottom: spacing.md,
    },
    kicker: {
        fontFamily: fonts.body.semiBold,
        fontSize: 10,
        letterSpacing: 1.5,
        color: colors.onSurfaceMuted,
        textTransform: 'uppercase',
    },
    list: {
        gap: spacing.xs,
    },
    item: {
        backgroundColor: 'rgba(30, 19, 56, 0.50)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.07)',
        borderRadius: radius.md,
        overflow: 'hidden',
    },
    itemFirst: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl },
    itemLast: { borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl },
    itemOpen: { borderColor: 'rgba(255,255,255,0.12)' },
    head: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.lg,
        gap: spacing.md,
    },
    glyphWrap: {
        position: 'relative',
        width: 44,
        height: 44,
    },
    badgeWrap: {
        position: 'absolute',
        bottom: -2,
        right: -4,
        backgroundColor: colors.surfaceLowest,
        borderRadius: 12,
        padding: 1,
    },
    titleWrap: {
        flex: 1,
    },
    title: {
        fontFamily: fonts.display.regular,
        fontSize: 15,
        lineHeight: 21,
        color: colors.onSurface,
        marginBottom: 2,
    },
    summary: {
        fontFamily: fonts.body.regular,
        fontSize: 12,
        color: colors.onSurfaceMuted,
    },
    chev: {
        fontFamily: fonts.body.bold,
        fontSize: 20,
        color: colors.onSurfaceMuted,
        transform: [{ rotate: '90deg' }],
        lineHeight: 24,
    },
    chevOpen: {
        transform: [{ rotate: '-90deg' }],
    },
    body: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.lg,
        paddingTop: 0,
    },
    detail: {
        fontFamily: fonts.body.regular,
        fontSize: 13,
        lineHeight: 20,
        color: `${colors.onSurface}CC`,
        marginBottom: spacing.md,
    },
    tags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.xs,
    },
    tag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: spacing.sm,
        paddingVertical: 5,
        borderRadius: radius.full,
        borderWidth: 1,
    },
    tagLabel: {
        fontFamily: fonts.body.semiBold,
        fontSize: 11,
        letterSpacing: 0.5,
    },
});
