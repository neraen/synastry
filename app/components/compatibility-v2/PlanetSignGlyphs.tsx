import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Polygon, Circle as SvgCircle, Line, Polyline, Rect } from 'react-native-svg';
import { colors } from '@/theme';
import type { TagIcon } from './types';

// ─── Planet symbols (unicode) ─────────────────────────────────────────────────

const PLANET_SYMBOLS: Record<string, string> = {
    sun: '☉',
    moon: '☽',
    mercury: '☿',
    venus: '♀',
    mars: '♂',
    jupiter: '♃',
    saturn: '♄',
    uranus: '♅',
    neptune: '♆',
    pluto: '♇',
};

const PLANET_COLORS: Record<string, string> = {
    sun: '#F59E0B',
    moon: '#C8BFFF',
    mercury: '#60A5FA',
    venus: '#EC4899',
    mars: '#EF4444',
    jupiter: '#8B5CF6',
    saturn: '#6B7280',
    uranus: '#06B6D4',
    neptune: '#3B82F6',
    pluto: '#A855F7',
};

// ─── Sign symbols (unicode) ───────────────────────────────────────────────────

const SIGN_SYMBOLS: Record<string, string> = {
    aries: '♈',
    taurus: '♉',
    gemini: '♊',
    cancer: '♋',
    leo: '♌',
    virgo: '♍',
    libra: '♎',
    scorpio: '♏',
    sagittarius: '♐',
    capricorn: '♑',
    aquarius: '♒',
    pisces: '♓',
};

// ─── PlanetGlyph ──────────────────────────────────────────────────────────────

interface GlyphProps {
    id: string;
    size?: number;
}

export function PlanetGlyph({ id, size = 40 }: GlyphProps) {
    const symbol = PLANET_SYMBOLS[id] ?? '★';
    const color = PLANET_COLORS[id] ?? colors.primary;
    const bg = `${color}22`;

    return (
        <View style={[styles.glyphContainer, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
            <Text style={[styles.glyphSymbol, { fontSize: size * 0.42, color }]}>{symbol}</Text>
        </View>
    );
}

// ─── SignGlyph ────────────────────────────────────────────────────────────────

export function SignGlyph({ id, size = 22 }: GlyphProps) {
    const symbol = SIGN_SYMBOLS[id] ?? '✦';
    return (
        <View style={[styles.signContainer, { width: size, height: size, borderRadius: size / 2 }]}>
            <Text style={[styles.signSymbol, { fontSize: size * 0.55 }]}>{symbol}</Text>
        </View>
    );
}

// ─── Tag Icons (SVG) ─────────────────────────────────────────────────────────

const TAG_ICON_SIZE = 12;

export function TagIconSvg({ icon, color = colors.onSurface }: { icon: TagIcon; color?: string }) {
    const s = TAG_ICON_SIZE;
    const stroke = { stroke: color, strokeWidth: '1.8', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };

    switch (icon) {
        case 'sparkle':
            return (
                <Svg width={s} height={s} viewBox="0 0 24 24" {...stroke}>
                    <Path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z" />
                </Svg>
            );
        case 'bolt':
            return (
                <Svg width={s} height={s} viewBox="0 0 24 24" {...stroke}>
                    <Polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </Svg>
            );
        case 'heart':
            return (
                <Svg width={s} height={s} viewBox="0 0 24 24" {...stroke}>
                    <Path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </Svg>
            );
        case 'anchor':
            return (
                <Svg width={s} height={s} viewBox="0 0 24 24" {...stroke}>
                    <SvgCircle cx="12" cy="5" r="2" />
                    <Line x1="12" y1="7" x2="12" y2="22" />
                    <Path d="M5 12a7 7 0 0 0 14 0" />
                    <Line x1="9" y1="12" x2="15" y2="12" />
                </Svg>
            );
        case 'pulse':
            return (
                <Svg width={s} height={s} viewBox="0 0 24 24" {...stroke}>
                    <Polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </Svg>
            );
        case 'chat':
            return (
                <Svg width={s} height={s} viewBox="0 0 24 24" {...stroke}>
                    <Path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </Svg>
            );
        default:
            return null;
    }
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    glyphContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    glyphSymbol: {
        lineHeight: undefined,
        textAlign: 'center',
    },
    signContainer: {
        backgroundColor: `${colors.secondary}33`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    signSymbol: {
        color: colors.secondary,
        lineHeight: undefined,
        textAlign: 'center',
    },
});
