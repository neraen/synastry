import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { fonts, spacing, radius } from '@/theme';
import { SignGlyph, TagIconSvg } from './PlanetSignGlyphs';
import type { CompatibilityItem } from './types';

const PLANET_SYMBOLS: Record<string, string> = {
    sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂',
    jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆', pluto: '♇',
};

const GREEN = '#4ADE80';
const ORANGE = '#E89B4C';
const TEXT = '#ECE5F7';
const TEXT_3 = '#8A82A6';
const TEXT_4 = '#5C5478';
const SURFACE = 'rgba(255,255,255,0.028)';
const BORDER = 'rgba(255,255,255,0.07)';
const BORDER_HI = 'rgba(255,255,255,0.12)';

const VARIANT_COLOR = { strength: GREEN, watch: ORANGE };
const VARIANT_DOT = { strength: GREEN, watch: ORANGE };

interface Props {
    kicker: string;
    items: CompatibilityItem[];
    variant: 'strength' | 'watch';
}

function ChevronDown({ color }: { color: string }) {
    return (
        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M6 9l6 6 6-6" />
        </Svg>
    );
}

export function AccordionListV2({ kicker, items, variant }: Props) {
    const [openIdx, setOpenIdx] = useState(-1);
    const accentColor = VARIANT_COLOR[variant];
    const dotColor = VARIANT_DOT[variant];

    return (
        <View style={styles.section}>
            {/* Section head: dot + kicker + rule */}
            <View style={styles.sectionHead}>
                <View style={[styles.dot, { backgroundColor: dotColor, shadowColor: dotColor }]} />
                <Text style={styles.kicker}>{kicker}</Text>
                <Text style={styles.count}>({items.length})</Text>
                <View style={styles.rule} />
            </View>

            {/* Unified flush card */}
            <View style={styles.card}>
                {items.map((item, i) => {
                    const open = openIdx === i;
                    return (
                        <View key={i} style={[styles.item, open && styles.itemOpen]}>
                            {i > 0 && <View style={styles.sep} />}
                            <Pressable
                                style={styles.head}
                                onPress={() => setOpenIdx(open ? -1 : i)}
                                android_ripple={{ color: `${accentColor}10` }}
                            >
                                {/* Planet symbol in rounded square + sign badge */}
                                <View style={[styles.glyphWrap, { backgroundColor: `${accentColor}10`, borderColor: `${accentColor}22` }]}>
                                    <Text style={[styles.glyphSymbol, { color: accentColor }]}>
                                        {PLANET_SYMBOLS[item.planet] ?? '★'}
                                    </Text>
                                    <View style={styles.badgeWrap}>
                                        <SignGlyph id={item.badge} size={18} />
                                    </View>
                                </View>

                                {/* Title + summary */}
                                <View style={styles.titleWrap}>
                                    <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                                    <Text style={styles.summary} numberOfLines={1}>{item.summary}</Text>
                                </View>

                                {/* Chevron */}
                                <View style={[styles.chevWrap, open && styles.chevWrapOpen]}>
                                    <ChevronDown color={TEXT_4} />
                                </View>
                            </Pressable>

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
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
        marginHorizontal: 2,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 4,
        elevation: 2,
    },
    kicker: {
        fontFamily: fonts.body.semiBold,
        fontSize: 11,
        letterSpacing: 2.3,
        color: TEXT_3,
        textTransform: 'uppercase',
    },
    count: {
        fontFamily: fonts.body.regular,
        fontSize: 11,
        color: TEXT_4,
    },
    rule: {
        flex: 1,
        height: 1,
        backgroundColor: BORDER,
    },
    card: {
        borderRadius: 20,
        backgroundColor: SURFACE,
        borderWidth: 1,
        borderColor: BORDER,
        overflow: 'hidden',
        paddingVertical: 6,
        paddingHorizontal: 0,
    },
    item: {
        backgroundColor: 'transparent',
        overflow: 'hidden',
    },
    itemOpen: {},
    sep: {
        height: 1,
        backgroundColor: BORDER,
        marginHorizontal: 0,
    },
    head: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 12,
    },
    glyphWrap: {
        flexShrink: 0,
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        position: 'relative',
        overflow: 'visible',
    },
    glyphSymbol: {
        fontSize: 18,
        lineHeight: 22,
        textAlign: 'center',
    },
    badgeWrap: {
        position: 'absolute',
        bottom: -4,
        right: -4,
        backgroundColor: '#1A1233',
        borderRadius: 8,
        padding: 1,
        borderWidth: 1,
        borderColor: BORDER_HI,
    },
    titleWrap: {
        flex: 1,
        minWidth: 0,
    },
    title: {
        fontFamily: fonts.body.semiBold,
        fontSize: 14,
        lineHeight: 19,
        color: TEXT,
        fontWeight: '600',
        marginBottom: 2,
    },
    summary: {
        fontFamily: fonts.body.regular,
        fontSize: 12,
        color: TEXT_3,
    },
    chevWrap: {
        width: 16,
        height: 16,
        flexShrink: 0,
    },
    chevWrapOpen: {
        transform: [{ rotate: '180deg' }],
    },
    body: {
        paddingTop: 0,
        paddingBottom: 16,
        paddingRight: 16,
        paddingLeft: 68, // aligns with title: head padding 16 + glyph 40 + gap 12
    },
    detail: {
        fontFamily: fonts.body.regular,
        fontSize: 13,
        lineHeight: 21,
        color: TEXT_3,
        marginBottom: spacing.md,
    },
    tags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    tag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 99,
        borderWidth: 1,
    },
    tagLabel: {
        fontFamily: fonts.body.semiBold,
        fontSize: 11,
        letterSpacing: 0.5,
    },
});
