import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Svg, { Polygon, Circle as SvgCircle, Line } from 'react-native-svg';
import { colors, fonts, spacing, radius } from '@/theme';
import type { CompatibilityAnalyse } from './types';

function StarIcon() {
    return (
        <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </Svg>
    );
}

function ChevIcon({ open }: { open: boolean }) {
    return (
        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
            <Svg viewBox="0 0 24 24">
                <Svg><Line x1="6" y1="9" x2="12" y2="15" /><Line x1="12" y1="15" x2="18" y2="9" /></Svg>
            </Svg>
        </Svg>
    );
}

interface Props {
    headline: string;
    summary: string[];
    longText: string[];
}

export function AnalyseCelesteV2({ headline, summary, longText }: Props) {
    const [open, setOpen] = useState(false);

    return (
        <View style={styles.section}>
            <View style={styles.card}>
                {/* Corner ornament */}
                <View style={styles.corner}>
                    <Svg width={60} height={60} viewBox="0 0 100 100" fill="none" stroke={`${colors.primary}30`} strokeWidth="1">
                        <SvgCircle cx="20" cy="20" r="1.5" fill={`${colors.primary}40`} />
                        <SvgCircle cx="50" cy="35" r="1.2" fill={`${colors.primary}30`} />
                        <SvgCircle cx="80" cy="25" r="1.8" fill={`${colors.primary}50`} />
                        <SvgCircle cx="70" cy="60" r="1.2" fill={`${colors.primary}30`} />
                        <SvgCircle cx="35" cy="70" r="1.5" fill={`${colors.primary}40`} />
                        <Line x1="20" y1="20" x2="50" y2="35" opacity="0.3" />
                        <Line x1="50" y1="35" x2="80" y2="25" opacity="0.3" />
                        <Line x1="50" y1="35" x2="70" y2="60" opacity="0.3" />
                        <Line x1="70" y1="60" x2="35" y2="70" opacity="0.3" />
                    </Svg>
                </View>

                {/* Kicker */}
                <View style={styles.kickerRow}>
                    <StarIcon />
                    <Text style={styles.kicker}> Analyse céleste</Text>
                </View>

                {/* Headline */}
                <Text style={styles.headline}>{headline}</Text>

                {/* Summary (always visible) */}
                {summary.map((p, i) => (
                    <Text key={i} style={styles.bodyText}>{p}</Text>
                ))}

                {/* Long text (revealed on expand) */}
                {open && (
                    <View style={styles.longTextWrap}>
                        {longText.map((p, i) => (
                            <Text key={i} style={styles.bodyText}>{p}</Text>
                        ))}
                    </View>
                )}

                {/* Read more button */}
                <Pressable style={styles.readMoreBtn} onPress={() => setOpen(!open)}>
                    <Text style={styles.readMoreText}>{open ? 'Réduire' : 'Lire la suite'}</Text>
                    <Text style={[styles.readMoreChev, open && { transform: [{ rotate: '180deg' }] }]}>›</Text>
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
    card: {
        backgroundColor: 'rgba(30, 19, 56, 0.55)',
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        padding: spacing.xl,
        overflow: 'hidden',
    },
    corner: {
        position: 'absolute',
        top: 0,
        right: 0,
        opacity: 0.6,
    },
    kickerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    kicker: {
        fontFamily: fonts.body.semiBold,
        fontSize: 10,
        letterSpacing: 1.5,
        color: colors.primary,
        textTransform: 'uppercase',
    },
    headline: {
        fontFamily: fonts.display.bold,
        fontSize: 20,
        lineHeight: 28,
        color: colors.onSurface,
        marginBottom: spacing.md,
    },
    bodyText: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        lineHeight: 22,
        color: `${colors.onSurface}CC`,
        marginBottom: spacing.sm,
    },
    longTextWrap: {
        marginTop: spacing.xs,
    },
    readMoreBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: spacing.md,
        alignSelf: 'flex-start',
    },
    readMoreText: {
        fontFamily: fonts.body.semiBold,
        fontSize: 13,
        color: colors.primary,
    },
    readMoreChev: {
        fontFamily: fonts.body.bold,
        fontSize: 18,
        color: colors.primary,
        transform: [{ rotate: '90deg' }],
        lineHeight: 20,
    },
});
