import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Svg, { Polygon, Circle as SvgCircle, Line } from 'react-native-svg';
import { colors, fonts, spacing, radius } from '@/theme';

const STAR_BLUE = '#7DD3FC';

function ConstellationCorner() {
    return (
        <View style={styles.corner}>
            <Svg width={90} height={90} viewBox="0 0 100 100" fill="none">
                <Line x1="15" y1="10" x2="55" y2="28" stroke={STAR_BLUE} strokeWidth="0.8" opacity="0.45" />
                <Line x1="55" y1="28" x2="88" y2="12" stroke={STAR_BLUE} strokeWidth="0.8" opacity="0.4"  />
                <Line x1="55" y1="28" x2="72" y2="65" stroke={STAR_BLUE} strokeWidth="0.8" opacity="0.4"  />
                <Line x1="88" y1="12" x2="95" y2="50" stroke={STAR_BLUE} strokeWidth="0.8" opacity="0.35" />
                <Line x1="72" y1="65" x2="95" y2="50" stroke={STAR_BLUE} strokeWidth="0.8" opacity="0.35" />
                <Line x1="30" y1="55" x2="55" y2="28" stroke={STAR_BLUE} strokeWidth="0.8" opacity="0.3"  />
                <Line x1="30" y1="55" x2="72" y2="65" stroke={STAR_BLUE} strokeWidth="0.8" opacity="0.28" />
                <SvgCircle cx="15" cy="10" r="1.8" fill={STAR_BLUE} opacity="0.5"  />
                <SvgCircle cx="55" cy="28" r="2.4" fill={STAR_BLUE} opacity="0.65" />
                <SvgCircle cx="88" cy="12" r="1.6" fill={STAR_BLUE} opacity="0.5"  />
                <SvgCircle cx="72" cy="65" r="2.0" fill={STAR_BLUE} opacity="0.55" />
                <SvgCircle cx="95" cy="50" r="1.4" fill={STAR_BLUE} opacity="0.45" />
                <SvgCircle cx="30" cy="55" r="1.6" fill={STAR_BLUE} opacity="0.45" />
            </Svg>
        </View>
    );
}
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
                <ConstellationCorner />

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
