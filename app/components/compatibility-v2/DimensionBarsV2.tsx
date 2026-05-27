import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated, StyleSheet } from 'react-native';
import Svg, { Path, Polygon, Circle as SvgCircle, Line, Polyline } from 'react-native-svg';
import { fonts, spacing } from '@/theme';
import type { CompatibilityDimension } from './types';

const VIOLET_2 = '#C39BFF';
const TEXT = '#ECE5F7';
const TEXT_2 = '#BDB2D4';
const TEXT_3 = '#8A82A6';
const TEXT_4 = '#5C5478';
const SURFACE = 'rgba(255,255,255,0.028)';
const BORDER = 'rgba(255,255,255,0.07)';
const BORDER_HI = 'rgba(255,255,255,0.12)';

const DIM_CONFIG: Record<string, { color: string; soft: string }> = {
    amour:         { color: '#E55A8C', soft: 'rgba(229,90,140,0.16)' },
    communication: { color: '#5DA9F5', soft: 'rgba(93,169,245,0.16)' },
    conflits:      { color: '#E89B4C', soft: 'rgba(232,155,76,0.16)' },
    long_terme:    { color: '#4ADE80', soft: 'rgba(74,222,128,0.14)' },
    attirance:     { color: '#9B5CFF', soft: 'rgba(155,92,255,0.16)' },
};

const ICON_SIZE = 15;
const iconProps = {
    width: ICON_SIZE, height: ICON_SIZE,
    viewBox: '0 0 24 24', fill: 'none',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
};

function DimIcon({ id, color }: { id: string; color: string }) {
    const s = { stroke: color, strokeWidth: '2' };
    switch (id) {
        case 'amour':
            return <Svg {...iconProps}><Path {...s} d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></Svg>;
        case 'communication':
            return <Svg {...iconProps}><Path {...s} d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></Svg>;
        case 'conflits':
            return <Svg {...iconProps}><Polyline {...s} points="22 12 18 12 15 21 9 3 6 12 2 12" /></Svg>;
        case 'long_terme':
            return <Svg {...iconProps}><SvgCircle {...s} cx="12" cy="5" r="2" /><Line {...s} x1="12" y1="7" x2="12" y2="22" /><Path {...s} d="M5 12a7 7 0 0 0 14 0" /><Line {...s} x1="9" y1="12" x2="15" y2="12" /></Svg>;
        case 'attirance':
            return <Svg {...iconProps}><Polygon {...s} points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></Svg>;
        default:
            return null;
    }
}

function ChevronDown({ color }: { color: string }) {
    return (
        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M6 9l6 6 6-6" />
        </Svg>
    );
}

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
                        duration: 1400,
                        delay: 100 + i * 80,
                        useNativeDriver: false,
                    }),
                ),
            ).start();
        }, 220);
        return () => clearTimeout(id);
    }, []);

    return (
        <View style={styles.section}>
            {/* Section head: dot + kicker + rule */}
            <View style={styles.sectionHead}>
                <View style={styles.dot} />
                <Text style={styles.kicker}>Compatibilité par dimension</Text>
                <View style={styles.rule} />
            </View>

            <View style={styles.card}>
                {data.map((d, i) => {
                    const conf = DIM_CONFIG[d.id] ?? { color: '#9B5CFF', soft: 'rgba(155,92,255,0.14)' };
                    const open = openIdx === i;
                    return (
                        <View key={d.id}>
                            <Pressable
                                style={styles.row}
                                onPress={() => setOpenIdx(open ? null : i)}
                                android_ripple={{ color: `${conf.color}10` }}
                            >
                                <View style={styles.rowHead}>
                                    <View style={[styles.iconWrap, { backgroundColor: conf.soft }]}>
                                        <DimIcon id={d.id} color={conf.color} />
                                    </View>
                                    <Text style={styles.dimName}>{d.name}</Text>
                                    <Text style={[styles.dimValue, { color: conf.color }]}>{d.value}%</Text>
                                    <View style={[styles.chevWrap, open && styles.chevWrapOpen]}>
                                        <ChevronDown color={TEXT_4} />
                                    </View>
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
        backgroundColor: VIOLET_2,
        shadowColor: VIOLET_2,
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
        paddingHorizontal: 16,
        paddingVertical: 4,
        overflow: 'hidden',
    },
    row: {
        paddingVertical: 14,
        paddingHorizontal: 4,
    },
    rowHead: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 10,
    },
    iconWrap: {
        width: 28,
        height: 28,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    dimName: {
        flex: 1,
        fontFamily: fonts.body.medium,
        fontSize: 14,
        color: TEXT,
        fontWeight: '500',
    },
    dimValue: {
        fontFamily: fonts.body.bold,
        fontSize: 14,
        fontWeight: '700',
    },
    chevWrap: {
        width: 16,
        height: 16,
        marginLeft: 6,
    },
    chevWrapOpen: {
        transform: [{ rotate: '180deg' }],
    },
    barTrack: {
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 99,
        overflow: 'hidden',
    },
    barFill: {
        height: 4,
        borderRadius: 99,
    },
    detail: {
        paddingBottom: 10,
        paddingHorizontal: 4,
    },
    detailText: {
        fontFamily: fonts.body.regular,
        fontSize: 13,
        lineHeight: 20,
        color: TEXT_2,
    },
    sep: {
        height: 1,
        backgroundColor: BORDER,
    },
});
