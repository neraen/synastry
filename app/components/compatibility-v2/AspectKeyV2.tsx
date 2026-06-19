import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { fonts, spacing } from '@/theme';
import { PlanetGlyph } from './PlanetSignGlyphs';
import type { CompatibilityAspectCle } from './types';

const GOLD = '#E5C266';
const GOLD_2 = '#F0D585';
const GOLD_DIM = '#B89549';
const PINK = '#E55A8C';
const TEXT_2 = '#BDB2D4';
const TEXT_3 = '#8A82A6';
const BORDER = 'rgba(255,255,255,0.07)';
const BORDER_HI = 'rgba(255,255,255,0.12)';

// Replace astrological unicode symbols that may render as boxes with text equivalents
function formatAspectName(name: string): string {
    return name
        .replace(/□/g, '· carré ·')
        .replace(/△/g, '· trigone ·')
        .replace(/☍/g, '· opposition ·')
        .replace(/⚹/g, '· sextile ·')
        .replace(/☌/g, '· conj. ·');
}

// Extract a short label for the aspect badge from the name
function extractAspectLabel(name: string): string {
    if (name.includes('☌') || name.toLowerCase().includes('conj')) return 'conj.';
    if (name.includes('□') || name.toLowerCase().includes('carré')) return 'carré';
    if (name.includes('△') || name.toLowerCase().includes('trigone')) return 'trig.';
    if (name.includes('☍') || name.toLowerCase().includes('oppos')) return 'oppos.';
    if (name.includes('⚹') || name.toLowerCase().includes('sextile')) return 'sext.';
    return '·';
}

interface Props extends CompatibilityAspectCle {}

export function AspectKeyV2({ planet_a, planet_b, name, desc }: Props) {
    const aspectLabel = extractAspectLabel(name);
    const formattedName = formatAspectName(name);

    return (
        <View style={styles.section}>
            {/* Section head */}
            <View style={styles.sectionHead}>
                <View style={styles.dot} />
                <Text style={styles.kicker}>Aspect clé</Text>
                <View style={styles.rule} />
            </View>

            <View style={styles.card}>
                {/* Planet visual */}
                <View style={styles.visual}>
                    <PlanetGlyph id={planet_a} size={48} />

                    <View style={styles.link}>
                        <View style={[styles.linkLine, { backgroundColor: GOLD_DIM }]} />
                        <View style={styles.conjBadge}>
                            <Text style={styles.conjText}>{aspectLabel}</Text>
                        </View>
                        <View style={[styles.linkLine, { backgroundColor: GOLD_DIM }]} />
                    </View>

                    <PlanetGlyph id={planet_b} size={48} />
                </View>

                <Text style={styles.name}>{formattedName}</Text>
                <Text style={styles.desc}>{desc}</Text>
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
        backgroundColor: PINK,
        shadowColor: PINK,
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
    rule: {
        flex: 1,
        height: 1,
        backgroundColor: BORDER,
    },
    card: {
        borderRadius: 16,
        backgroundColor: 'rgba(229,90,140,0.06)',
        borderWidth: 1,
        borderColor: BORDER_HI,
        paddingTop: 22,
        paddingBottom: 20,
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    visual: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
        marginTop: 4,
    },
    link: {
        flexDirection: 'row',
        alignItems: 'center',
        width: 72,
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    linkLine: {
        flex: 1,
        height: 1,
    },
    conjBadge: {
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 8,
        backgroundColor: '#120A24',
        borderWidth: 1,
        borderColor: GOLD,
        alignItems: 'center',
        justifyContent: 'center',
    },
    conjText: {
        fontFamily: fonts.body.semiBold,
        fontSize: 9,
        color: GOLD,
        letterSpacing: 0.5,
        fontWeight: '600',
    },
    name: {
        fontFamily: fonts.display.regular,
        fontSize: 17,
        lineHeight: 24,
        color: GOLD_2,
        fontStyle: 'italic',
        textAlign: 'center',
        marginBottom: 8,
    },
    desc: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        lineHeight: 22,
        color: TEXT_2,
        textAlign: 'justify',
        alignSelf: 'stretch',
    },
});
