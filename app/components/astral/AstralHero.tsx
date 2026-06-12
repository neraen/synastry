/**
 * AstralHero — hero block: avatar in diamond frame + key astrological stats.
 * Left col: Soleil, Lune, Ascendant, Affinités
 * Center:   Avatar diamant animé
 * Right col: Élément, Vénus, Mars, Maître
 */
import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    Image,
    Animated,
    StyleSheet,
    Dimensions,
} from 'react-native';
import Svg, { Circle, Line, Path, Polyline } from 'react-native-svg';
import { fonts } from '@/theme';
import type { PlanetPosition } from '@/services/astrology';

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
    gold:       '#E5C266',
    goldDim:    '#B89549',
    text:       '#ECE5F7',
    purple:     'rgba(155,92,255,0.20)',
    goldBorder: 'rgba(229,194,102,0.22)',
} as const;

// ─── Static data ───────────────────────────────────────────────────────────────

const SIGN_INFO: Record<string, { fr: string; element: string; ruler: string }> = {
    Aries:       { fr: 'Bélier',     element: 'Feu',   ruler: 'Mars'    },
    Taurus:      { fr: 'Taureau',    element: 'Terre', ruler: 'Vénus'   },
    Gemini:      { fr: 'Gémeaux',    element: 'Air',   ruler: 'Mercure' },
    Cancer:      { fr: 'Cancer',     element: 'Eau',   ruler: 'Lune'    },
    Leo:         { fr: 'Lion',       element: 'Feu',   ruler: 'Soleil'  },
    Virgo:       { fr: 'Vierge',     element: 'Terre', ruler: 'Mercure' },
    Libra:       { fr: 'Balance',    element: 'Air',   ruler: 'Vénus'   },
    Scorpio:     { fr: 'Scorpion',   element: 'Eau',   ruler: 'Pluton'  },
    Sagittarius: { fr: 'Sagittaire', element: 'Feu',   ruler: 'Jupiter' },
    Capricorn:   { fr: 'Capricorne', element: 'Terre', ruler: 'Saturne' },
    Aquarius:    { fr: 'Verseau',    element: 'Air',   ruler: 'Uranus'  },
    Pisces:      { fr: 'Poissons',   element: 'Eau',   ruler: 'Neptune' },
};

import { getSignAvatarBySign, Gender } from '@/utils/signAvatar';

const ELEMENT_COLOR: Record<string, string> = {
    Feu:   '#E89B4C',
    Terre: '#A3B86C',
    Air:   '#7DB5E8',
    Eau:   '#9B7BE8',
};

// ─── Avatar frame size ────────────────────────────────────────────────────────

const SCREEN_W    = Dimensions.get('window').width;
const AVATAR_W    = Math.min(SCREEN_W * 0.55, 220);
const AVATAR_H    = AVATAR_W * 1.1;
const AVATAR_CLIP = AVATAR_W - 16;

// ─── Sign SVG icons (portés depuis astro-glyphs.jsx) ─────────────────────────

interface SvgProps { size?: number; color?: string; }

const SIGN_SVGS: Record<string, (p: SvgProps) => React.ReactElement> = {
    Aries: ({ size = 14, color = C.gold }) => (
        <Svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M12 19V8M12 8c-1.5-3-5-3.5-7-2.5C3 6 3.5 9 5 10c1.5 1 4.5-1 7-2zM12 8c1.5-3 5-3.5 7-2.5C21 6 20.5 9 19 10c-1.5 1-4.5-1-7-2z" />
        </Svg>
    ),
    Taurus: ({ size = 14, color = C.gold }) => (
        <Svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Circle cx={12} cy={15} r={5} />
            <Path d="M5 5c1 2.5 3.5 5 7 5s6-2.5 7-5" />
        </Svg>
    ),
    Gemini: ({ size = 14, color = C.gold }) => (
        <Svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M5 4c2-1 4-1 6 0M13 4c2-1 4-1 6 0M5 20c2 1 4 1 6 0M13 20c2 1 4 1 6 0M8 4v16M16 4v16" />
        </Svg>
    ),
    Cancer: ({ size = 14, color = C.gold }) => (
        <Svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Circle cx={8} cy={10} r={2.5} />
            <Circle cx={16} cy={14} r={2.5} />
            <Path d="M3.5 9.5C5 5 9 4 12 4s7 1 8.5 5.5M20.5 14.5C19 19 15 20 12 20s-7-1-8.5-5.5" />
        </Svg>
    ),
    Leo: ({ size = 14, color = C.gold }) => (
        <Svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Circle cx={9} cy={9} r={4.5} />
            <Path d="M13 9c0 3-1 6-1 8.5 0 2 1.5 3 3 2.5s2-2 2-3.5" />
        </Svg>
    ),
    Virgo: ({ size = 14, color = C.gold }) => (
        <Svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M4 19V8c0-2 3-2 3 0v11M7 8c0-2 3-2 3 0v11M10 8c0-2 3-2 3 0v8c0 3 3 3 4 1.5s.5-3.5-1-4.5" />
            <Circle cx={17} cy={13} r={2.5} />
        </Svg>
    ),
    Libra: ({ size = 14, color = C.gold }) => (
        <Svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M5 17h14M4 13h6c0-3 1-5 2-5s2 2 2 5h6" />
        </Svg>
    ),
    Scorpio: ({ size = 14, color = C.gold }) => (
        <Svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M4 19V8c0-2 3-2 3 0v11M7 8c0-2 3-2 3 0v11M10 8c0-2 3-2 3 0v9l5 3" />
            <Polyline points="15 19 18 20 19 17" />
        </Svg>
    ),
    Sagittarius: ({ size = 14, color = C.gold }) => (
        <Svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Line x1={4} y1={20} x2={20} y2={4} />
            <Polyline points="13 4 20 4 20 11" />
            <Line x1={9} y1={11} x2={13} y2={15} />
        </Svg>
    ),
    Capricorn: ({ size = 14, color = C.gold }) => (
        <Svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M4 5l5 13 3-10 4 12" />
            <Circle cx={18} cy={16} r={3} />
        </Svg>
    ),
    Aquarius: ({ size = 14, color = C.gold }) => (
        <Svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M3 10l3-2 3 2 3-2 3 2 3-2 3 2M3 16l3-2 3 2 3-2 3 2 3-2 3 2" />
        </Svg>
    ),
    Pisces: ({ size = 14, color = C.gold }) => (
        <Svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M6 4c-1 3-1 13 0 16M18 4c1 3 1 13 0 16M4 12h16" />
        </Svg>
    ),
};

function SignIcon({ id, size = 14 }: { id?: string; size?: number }) {
    if (!id) return null;
    const Comp = SIGN_SVGS[id];
    if (!Comp) return null;
    return <Comp size={size} color={C.gold} />;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface StatItemProps {
    icon: string;
    label: string;
    value: string;
    signKey?: string;
    valueColor?: string;
    align?: 'left' | 'right';
}
function StatItem({ icon, label, value, signKey, valueColor, align = 'left' }: StatItemProps) {
    const isRight = align === 'right';
    return (
        <View style={[s.stat, isRight && s.statRight]}>
            <View style={[s.statLabelRow, isRight && s.statLabelRowRight]}>
                <Text style={s.statIcon}>{icon}</Text>
                <Text style={s.statLabel}>{label}</Text>
            </View>
            <View style={[s.statValueRow, isRight && s.statValueRowRight]}>
                <Text style={[s.statValue, valueColor ? { color: valueColor } : undefined]}>{value}</Text>
                <SignIcon id={signKey} size={15} />
            </View>
        </View>
    );
}

interface StatDualProps {
    icon: string;
    label: string;
    items: { value: string; signKey: string }[];
    align?: 'left' | 'right';
}
function StatDual({ icon, label, items, align = 'left' }: StatDualProps) {
    const isRight = align === 'right';
    return (
        <View style={[s.stat, isRight && s.statRight]}>
            <View style={[s.statLabelRow, isRight && s.statLabelRowRight]}>
                <Text style={s.statIcon}>{icon}</Text>
                <Text style={s.statLabel}>{label}</Text>
            </View>
            <View style={isRight ? s.statRight : undefined}>
                {items.map((it, i) => (
                    <View key={i} style={[s.statValueRow, isRight && s.statValueRowRight]}>
                        <Text style={s.statValue}>{it.value}</Text>
                        <SignIcon id={it.signKey} size={15} />
                    </View>
                ))}
            </View>
        </View>
    );
}

// ─── Twinkling dot ────────────────────────────────────────────────────────────

function TwinkleDot({ style, delay }: { style: object; delay: number }) {
    const opacity = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const anim = Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.timing(opacity, { toValue: 0.8, duration: 1500, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 0,   duration: 1500, useNativeDriver: true }),
            ])
        );
        anim.start();
        return () => anim.stop();
    }, []);
    return <Animated.View style={[s.twinkleDot, style, { opacity }]} />;
}

// ─── Main component ───────────────────────────────────────────────────────────

export interface AstralHeroProps {
    positions: Record<string, PlanetPosition>;
    /** Padding horizontal du screen parent — permet au hero de s'étendre jusqu'aux bords */
    outerPadding?: number;
    /** Variante d'avatar (féminin par défaut quand inconnu) */
    gender?: Gender | null;
}

export function AstralHero({ positions, outerPadding = 0, gender }: AstralHeroProps) {
    const floatAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const anim = Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim, { toValue: -5, duration: 3000, useNativeDriver: true }),
                Animated.timing(floatAnim, { toValue: 0,  duration: 3000, useNativeDriver: true }),
            ])
        );
        anim.start();
        return () => anim.stop();
    }, []);

    const sunKey   = positions.Sun?.Sign;
    const moonKey  = positions.Moon?.Sign;
    const ascKey   = positions.Ascendant?.Sign;
    const venusKey = positions.Venus?.Sign;
    const marsKey  = positions.Mars?.Sign;

    const sunInfo  = SIGN_INFO[sunKey]  ?? SIGN_INFO['Aquarius'];
    const moonInfo = SIGN_INFO[moonKey] ?? SIGN_INFO['Gemini'];
    const ascInfo  = SIGN_INFO[ascKey]  ?? SIGN_INFO['Cancer'];
    const venusInfo = SIGN_INFO[venusKey];
    const marsInfo  = SIGN_INFO[marsKey];

    const dominantElement = sunInfo?.element ?? 'Air';
    const masterName = sunInfo?.ruler ?? '';

    // Affinités : même élément que Soleil, hors signe solaire
    const affinities = Object.entries(SIGN_INFO)
        .filter(([key, info]) => info.element === sunInfo?.element && key !== sunKey)
        .map(([key, info]) => ({ value: info.fr, signKey: key }))
        .slice(0, 2);

    const avatarSrc = getSignAvatarBySign(sunKey, gender);

    return (
        <View style={[s.hero, { marginHorizontal: -outerPadding }]}>
            {/* ── Left column ──────────────────────────────────────────────── */}
            <View style={s.colLeft}>
                <StatItem icon="☉" label="Soleil"    value={sunInfo?.fr ?? '—'}  signKey={sunKey}   align="right" />
                <StatItem icon="☽" label="Lune"      value={moonInfo?.fr ?? '—'} signKey={moonKey}  align="right" />
                <StatItem icon="↑" label="Ascendant" value={ascInfo?.fr ?? '—'}  signKey={ascKey}   align="right" />
                <StatDual
                    icon="♡"
                    label="Affinités"
                    items={affinities.length ? affinities : [{ value: '—', signKey: '' }]}
                    align="right"
                />
            </View>

            {/* ── Avatar center ─────────────────────────────────────────────── */}
            <View style={[s.avatarFrame, { width: AVATAR_W, height: AVATAR_H }]}>
                <Animated.View style={[s.avatarImgWrap, { transform: [{ translateY: floatAnim }] }]}>
                    {avatarSrc ? (
                        <View style={{
                            width: AVATAR_CLIP,
                            height: AVATAR_CLIP,
                            borderRadius: AVATAR_CLIP / 2,
                            overflow: 'hidden',
                        }}>
                            <Image source={avatarSrc} style={{ width: AVATAR_CLIP, height: AVATAR_CLIP }} resizeMode="cover" />
                        </View>
                    ) : (
                        <SignIcon id={sunKey} size={AVATAR_W * 0.55} />
                    )}
                </Animated.View>

                <TwinkleDot style={{ top: '8%',    left: '12%'  }} delay={500}  />
                <TwinkleDot style={{ top: '18%',   right: '8%'  }} delay={1400} />
                <TwinkleDot style={{ bottom: '12%',left: '10%'  }} delay={2200} />
                <TwinkleDot style={{ bottom: '18%',right: '14%' }} delay={800}  />
            </View>

            {/* ── Right column ──────────────────────────────────────────────── */}
            <View style={s.colRight}>
                <StatItem icon="✦" label="Élément" value={dominantElement} valueColor={ELEMENT_COLOR[dominantElement]} align="left" />
                <StatItem icon="♀" label="Vénus"   value={venusInfo?.fr ?? '—'} signKey={venusKey} align="left" />
                <StatItem icon="♂" label="Mars"    value={marsInfo?.fr ?? '—'}  signKey={marsKey}  align="left" />
                <StatItem icon="★" label="Maître"  value={masterName}                              align="left" />
            </View>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    hero: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 0,
        marginVertical: 12,
    },
    colLeft: {
        flex: 1,
        alignItems: 'flex-end',
        gap: 22,
        paddingTop: 6,
        paddingLeft: 8,
    },
    colRight: {
        flex: 1,
        alignItems: 'flex-start',
        gap: 22,
        paddingTop: 6,
        paddingRight: 8,
    },

    // Stats
    stat:             { alignItems: 'flex-start', gap: 3 },
    statRight:        { alignItems: 'flex-end' },
    statLabelRow:     { flexDirection: 'row', alignItems: 'center', gap: 5 },
    statLabelRowRight:{ flexDirection: 'row-reverse' },
    statIcon: {
        fontSize: 13,
        color: C.goldDim,
        lineHeight: 16,
    },
    statLabel: {
        fontFamily: fonts.body.bold,
        fontSize: 9.5,
        letterSpacing: 1.8,
        textTransform: 'uppercase',
        color: C.goldDim,
        lineHeight: 12,
    },
    statValueRow:      { flexDirection: 'row', alignItems: 'center', gap: 5 },
    statValueRowRight: { flexDirection: 'row-reverse' },
    statValue: {
        fontFamily: fonts.body.semiBold,
        fontSize: 13.5,
        color: C.text,
        lineHeight: 17,
    },

    // Avatar frame
    avatarFrame: {
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarImgWrap: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Twinkling dot
    twinkleDot: {
        position: 'absolute',
        width: 3,
        height: 3,
        borderRadius: 99,
        backgroundColor: C.gold,
        shadowColor: C.gold,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 4,
    },
});
