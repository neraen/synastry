import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated, StyleSheet } from 'react-native';
import Svg, { Path, Polygon, Circle as SvgCircle, Line, Polyline } from 'react-native-svg';
import { colors, fonts, spacing, radius } from '@/theme';
import type { CompatibilityDimension } from './types';

// ─── Dimension config ─────────────────────────────────────────────────────────

const DIM_CONFIG: Record<string, { color: string }> = {
    amour:         { color: '#EC4899' },
    communication: { color: '#60A5FA' },
    conflits:      { color: '#F59E0B' },
    long_terme:    { color: colors.primary },
    attirance:     { color: '#A855F7' },
};

const ICON_SIZE = 18;
const iconProps = { width: ICON_SIZE, height: ICON_SIZE, viewBox: '0 0 24 24', fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

function DimIcon({ id, color }: { id: string; color: string }) {
    const s = { stroke: color, strokeWidth: '2' };
    switch (id) {
        case 'amour':
            return <Svg {...iconProps}><Path {...s} d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></Svg>;
        case 'communication':
            return <Svg {...iconProps}><Path {...s} d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></Svg>;
        case 'conflits':
            return <Svg {...iconProps}><Polyline {...s} points="22 12 18 12 15 21 9 3 6 12 2 12"/></Svg>;
        case 'long_terme':
            return <Svg {...iconProps}><SvgCircle {...s} cx="12" cy="5" r="2"/><Line {...s} x1="12" y1="7" x2="12" y2="22"/><Path {...s} d="M5 12a7 7 0 0 0 14 0"/><Line {...s} x1="9" y1="12" x2="15" y2="12"/></Svg>;
        case 'attirance':
            return <Svg {...iconProps}><Polygon {...s} points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></Svg>;
        default:
            return null;
    }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
    data: CompatibilityDimension[];
}

export function DimensionBarsV2({ data }: Props) {
    const [openIdx, setOpenIdx] = useState<number | null>(null);
    const animWidths = useRef(data.map(() => new Animated.Value(0))).current;

    useEffect(() => {
        const id = setTimeout(() => {
            Animated.parallel(
                data.map((d, i) =>
                    Animated.timing(animWidths[i], {
                        toValue: d.value,
                        duration: 700,
                        delay: i * 80,
                        useNativeDriver: false,
                    }),
                ),
            ).start();
        }, 300);
        return () => clearTimeout(id);
    }, []);

    return (
        <View style={styles.section}>
            <View style={styles.sectionHead}>
                <Text style={styles.kicker}>Compatibilité par dimension</Text>
            </View>
            <View style={styles.card}>
                {data.map((d, i) => {
                    const conf = DIM_CONFIG[d.id] ?? { color: colors.primary };
                    const open = openIdx === i;
                    return (
                        <View key={d.id}>
                            <Pressable
                                style={styles.row}
                                onPress={() => setOpenIdx(open ? null : i)}
                                android_ripple={{ color: `${colors.primary}10` }}
                            >
                                <View style={styles.rowHead}>
                                    <View style={[styles.iconWrap, { backgroundColor: `${conf.color}18` }]}>
                                        <DimIcon id={d.id} color={conf.color} />
                                    </View>
                                    <Text style={styles.dimName}>{d.name}</Text>
                                    <Text style={[styles.dimValue, { color: conf.color }]}>{d.value}%</Text>
                                    <Text style={[styles.chev, open && styles.chevOpen]}>›</Text>
                                </View>
                                <View style={styles.barTrack}>
                                    <Animated.View
                                        style={[
                                            styles.barFill,
                                            {
                                                backgroundColor: conf.color,
                                                width: animWidths[i].interpolate({
                                                    inputRange: [0, 100],
                                                    outputRange: ['0%', '100%'],
                                                }),
                                            },
                                        ]}
                                    />
                                </View>
                            </Pressable>
                            {open && (
                                <View style={styles.detail}>
                                    <Text style={styles.detailText}>{d.detail}</Text>
                                </View>
                            )}
                            {i < data.length - 1 && <View style={styles.sep} />}
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
    card: {
        backgroundColor: 'rgba(30, 19, 56, 0.55)',
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        overflow: 'hidden',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.sm,
    },
    row: {
        paddingVertical: spacing.md,
    },
    rowHead: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    iconWrap: {
        width: 32,
        height: 32,
        borderRadius: radius.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dimName: {
        flex: 1,
        fontFamily: fonts.body.medium,
        fontSize: 14,
        color: colors.onSurface,
    },
    dimValue: {
        fontFamily: fonts.body.semiBold,
        fontSize: 14,
    },
    chev: {
        fontFamily: fonts.body.bold,
        fontSize: 18,
        color: colors.onSurfaceMuted,
        transform: [{ rotate: '90deg' }],
    },
    chevOpen: {
        transform: [{ rotate: '-90deg' }],
    },
    barTrack: {
        height: 6,
        backgroundColor: `${colors.surfaceContainerHighest}`,
        borderRadius: 3,
        overflow: 'hidden',
    },
    barFill: {
        height: 6,
        borderRadius: 3,
        opacity: 0.85,
    },
    detail: {
        paddingBottom: spacing.md,
        paddingHorizontal: 2,
    },
    detailText: {
        fontFamily: fonts.body.regular,
        fontSize: 13,
        lineHeight: 20,
        color: colors.onSurfaceMuted,
    },
    sep: {
        height: 1,
        backgroundColor: `${colors.outline}20`,
    },
});
