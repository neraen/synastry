import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { fonts, spacing } from '@/theme';

const GOLD = '#E5C266';
const TEXT = '#ECE5F7';
const TEXT_2 = '#BDB2D4';
const TEXT_3 = '#8A82A6';
const BORDER = 'rgba(255,255,255,0.07)';
const BORDER_HI = 'rgba(255,255,255,0.12)';
const SURFACE = 'rgba(255,255,255,0.028)';

interface Props {
    headline: string;
    summary: string[];
    longText: string[];
}

export function AnalyseCelesteV2({ headline, summary, longText }: Props) {
    const [open, setOpen] = useState(false);

    return (
        <View style={styles.section}>
            {/* Section head */}
            <View style={styles.sectionHead}>
                <View style={styles.dot} />
                <Text style={styles.kicker}>Analyse céleste</Text>
                <View style={styles.rule} />
            </View>

            <View style={styles.card}>
                <Text style={styles.headline}>{headline}</Text>

                {summary.map((p, i) => (
                    <Text key={i} style={styles.bodyText}>{p}</Text>
                ))}

                {open && (
                    <View style={styles.longTextWrap}>
                        {longText.map((p, i) => (
                            <Text key={i} style={styles.bodyText}>{p}</Text>
                        ))}
                    </View>
                )}

                <Pressable style={styles.readMoreBtn} onPress={() => setOpen(!open)}>
                    <Text style={styles.readMoreText}>{open ? 'Réduire' : 'Lire la suite'}</Text>
                    <Text style={[styles.readMoreChev, open && styles.readMoreChevOpen]}>›</Text>
                </Pressable>
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
        backgroundColor: GOLD,
        shadowColor: GOLD,
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
        borderRadius: 20,
        backgroundColor: SURFACE,
        borderWidth: 1,
        borderColor: BORDER,
        paddingTop: 22,
        paddingBottom: 22,
        paddingHorizontal: 20,
    },
    headline: {
        fontFamily: fonts.display.bold,
        fontSize: 23,
        lineHeight: 29,
        color: TEXT,
        marginBottom: 14,
    },
    bodyText: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        lineHeight: 22,
        color: TEXT_2,
        marginBottom: 12,
    },
    longTextWrap: {
        marginTop: 4,
    },
    readMoreBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 14,
        alignSelf: 'flex-start',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 99,
        borderWidth: 1,
        borderColor: BORDER_HI,
        backgroundColor: 'rgba(255,255,255,0.04)',
    },
    readMoreText: {
        fontFamily: fonts.body.semiBold,
        fontSize: 12,
        letterSpacing: 0.6,
        color: GOLD,
        fontWeight: '600',
    },
    readMoreChev: {
        fontFamily: fonts.body.bold,
        fontSize: 16,
        color: GOLD,
        lineHeight: 18,
        transform: [{ rotate: '90deg' }],
    },
    readMoreChevOpen: {
        transform: [{ rotate: '-90deg' }],
    },
});
