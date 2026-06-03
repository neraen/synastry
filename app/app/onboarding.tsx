/**
 * Onboarding — shown once after account creation.
 *
 * Step 0 : RGPD consent
 * Step 1 : Features guide (accordion)
 * Step 2 : Birth profile form
 * Step 3 : All set
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    ScrollView,
    Animated,
    Easing,
    Platform,
    Dimensions,
    KeyboardAvoidingView,
    Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Feather } from '@expo/vector-icons';
import Svg, {
    Circle,
    Path,
    Ellipse,
    Line,
    Defs,
    LinearGradient as SvgLinearGradient,
    RadialGradient,
    Stop,
} from 'react-native-svg';

import { useAuth } from '@/contexts/AuthContext';
import { GoldButton, GhostButton, AppDatePicker, AppTimePicker, CityAutocomplete } from '@/components/ui';
import { colors, spacing, radius, fonts } from '@/theme';
import { saveBirthProfile, CitySearchResult } from '@/services/birthProfile';

const { width: W } = Dimensions.get('window');
const STEPS = 4;

// ─── Star field ────────────────────────────────────────────────────────────────

function Starfield() {
    const stars = useMemo(
        () =>
            Array.from({ length: 36 }, () => ({
                top: Math.random() * 100,
                left: Math.random() * 100,
                size: Math.random() < 0.85 ? 1.2 : 2,
                peak: 0.25 + Math.random() * 0.55,
                delay: Math.random() * 4000,
                half: 1500 + Math.random() * 1000,
            })),
        [],
    );

    const anims = useRef(stars.map(() => new Animated.Value(0))).current;

    useEffect(() => {
        const loops = anims.map((anim, i) => {
            const { peak, delay, half } = stars[i];
            const loop = Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(anim, { toValue: peak, duration: half, useNativeDriver: true }),
                    Animated.timing(anim, { toValue: 0, duration: half, useNativeDriver: true }),
                ]),
            );
            loop.start();
            return loop;
        });
        return () => loops.forEach((l) => l.stop());
    }, []);

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {stars.map((s, i) => (
                <Animated.View
                    key={i}
                    style={{
                        position: 'absolute',
                        top: `${s.top}%`,
                        left: `${s.left}%`,
                        width: s.size,
                        height: s.size,
                        borderRadius: s.size / 2,
                        backgroundColor: '#fff',
                        opacity: anims[i],
                    }}
                />
            ))}
        </View>
    );
}

// ─── Progress dots ─────────────────────────────────────────────────────────────

function ProgressDots({ step }: { step: number }) {
    return (
        <View style={s.dots}>
            {Array.from({ length: STEPS }).map((_, i) => (
                <View
                    key={i}
                    style={[s.dot, i === step && s.dotActive, i < step && s.dotDone]}
                />
            ))}
        </View>
    );
}

// ─── Back button ───────────────────────────────────────────────────────────────

function BackButton({ visible, onPress }: { visible: boolean; onPress: () => void }) {
    return (
        <Pressable
            style={[s.backBtn, !visible && s.backBtnHidden]}
            onPress={onPress}
            hitSlop={8}
            pointerEvents={visible ? 'auto' : 'none'}
        >
            <Feather name="arrow-left" size={18} color={colors.onSurfaceMuted} />
        </Pressable>
    );
}

// ─── SVG Hero helpers ─────────────────────────────────────────────────────────

const HERO = 168; // px — rendered size of each hero container

/**
 * Twinkling stars — rendered as Animated.View dots so we can use
 * useNativeDriver: true and keep the JS thread free during transitions.
 */
function StarLayer({ seed = 0 }: { seed?: number }) {
    const positions = useMemo(
        () => [
            { cx: 32 + seed, cy: 56,  r: 1.3, dur: 3400, peak: 0.9 },
            { cx: 170 - seed, cy: 64, r: 1.0, dur: 2900, peak: 0.7 },
            { cx: 168,        cy: 152, r: 1.3, dur: 4000, peak: 0.85 },
            { cx: 36,         cy: 148, r: 1.0, dur: 3300, peak: 0.6 },
            { cx: 100,        cy: 28,  r: 0.9, dur: 3600, peak: 0.8 },
            { cx: 100,        cy: 178, r: 0.9, dur: 3100, peak: 0.7 },
        ],
        [seed],
    );
    const opacities = useRef(positions.map(() => new Animated.Value(0.1))).current;
    useEffect(() => {
        const loops = opacities.map((anim, i) => {
            const { dur, peak } = positions[i];
            const loop = Animated.loop(
                Animated.sequence([
                    Animated.timing(anim, { toValue: peak, duration: dur / 2, useNativeDriver: true }),
                    Animated.timing(anim, { toValue: 0.1,  duration: dur / 2, useNativeDriver: true }),
                ]),
            );
            loop.start();
            return loop;
        });
        return () => loops.forEach((l) => l.stop());
    }, []);
    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {positions.map((p, i) => {
                const diameter = Math.max(1.5, (p.r * 2 * HERO) / 200);
                return (
                    <Animated.View
                        key={i}
                        style={{
                            position: 'absolute',
                            left: (p.cx / 200) * HERO - diameter / 2,
                            top:  (p.cy / 200) * HERO - diameter / 2,
                            width: diameter,
                            height: diameter,
                            borderRadius: diameter / 2,
                            backgroundColor: '#fff',
                            opacity: opacities[i],
                        }}
                    />
                );
            })}
        </View>
    );
}

/**
 * Rotating layer helper.
 * Wraps a full-size SVG in an Animated.View that rotates around the container
 * centre (which maps to 100,100 in the 200×200 viewBox).
 * Uses useNativeDriver: true for smooth 60fps rotation.
 */
function RotatingLayer({
    duration,
    reverse = false,
    children,
}: {
    duration: number;
    reverse?: boolean;
    children: React.ReactNode;
}) {
    const rot = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        // 120 rotations without any loop reset — eliminates the 1-frame jump
        // that Animated.loop produces when it resets toValue → 0 via the JS thread.
        // At the slowest orbit (40 s/turn), this lasts ~80 minutes, far beyond any session.
        const REPS = 120;
        Animated.timing(rot, {
            toValue: REPS,
            duration: duration * REPS,
            easing: Easing.linear,
            useNativeDriver: true,
        }).start();
    }, []);
    const REPS = 120;
    const deg = rot.interpolate({
        inputRange:  [0, REPS],
        outputRange: reverse ? ['0deg', `${-360 * REPS}deg`] : ['0deg', `${360 * REPS}deg`],
    });
    return (
        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate: deg }] }]}>
            <Svg width={HERO} height={HERO} viewBox="0 0 200 200" style={StyleSheet.absoluteFill}>
                {children}
            </Svg>
        </Animated.View>
    );
}

// ─── Hero Shield (Step 0 — Privacy) ──────────────────────────────────────────

function HeroShield() {
    const float = useRef(new Animated.Value(0)).current;
    const orbitAngle = useRef(new Animated.Value(0)).current;

    // Pre-compute 64-step ellipse keyframes once (rx=80, ry=28 in SVG units → pixels)
    const { orbitInput, orbitTx, orbitTy } = useMemo(() => {
        const N = 64;
        const rx = (80 / 200) * HERO;
        const ry = (28 / 200) * HERO;
        const input = Array.from({ length: N + 1 }, (_, i) => i / N);
        return {
            orbitInput: input,
            orbitTx: input.map(t => rx * Math.cos(2 * Math.PI * t)),
            orbitTy: input.map(t => ry * Math.sin(2 * Math.PI * t)),
        };
    }, []);

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(float, { toValue: -4, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(float, { toValue: 0,  duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ]),
        ).start();
        Animated.loop(
            Animated.timing(orbitAngle, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: true }),
        ).start();
    }, []);

    const planetTx = orbitAngle.interpolate({ inputRange: orbitInput, outputRange: orbitTx });
    const planetTy = orbitAngle.interpolate({ inputRange: orbitInput, outputRange: orbitTy });
    const dotD = (2.6 / 200) * HERO * 2; // planet diameter in pixels

    // t ∈ [0, 0.5] → sin > 0 → bottom of ellipse → in FRONT of shield
    // t ∈ [0.5, 1] → sin < 0 → top of ellipse    → BEHIND shield
    // Small crossfade (~3% of period) to avoid a hard pop at the crossing points.
    const crossfade = [0, 0.03, 0.47, 0.5, 0.53, 0.97, 1] as const;
    const frontOpacity = orbitAngle.interpolate({ inputRange: [...crossfade], outputRange: [1, 1, 1, 0, 0, 0, 1] });
    const backOpacity  = orbitAngle.interpolate({ inputRange: [...crossfade], outputRange: [0, 0, 0, 1, 1, 1, 0] });

    const dotStyle = {
        position: 'absolute' as const,
        left: HERO / 2 - dotD / 2,
        top:  HERO / 2 - dotD / 2,
        width: dotD, height: dotD,
        borderRadius: dotD / 2,
        backgroundColor: '#F4DC95',
        transform: [{ translateX: planetTx }, { translateY: planetTy }],
    };

    return (
        <View style={s.heroWrap}>

            {/* Stars */}
            <StarLayer seed={2} />

            {/* Orbit ellipse + back half of planet (behind shield) */}
            <View style={[StyleSheet.absoluteFill, { transform: [{ rotate: '-18deg' }] }]}>
                <Svg width={HERO} height={HERO} viewBox="0 0 200 200" style={StyleSheet.absoluteFill}>
                    <Ellipse cx={100} cy={100} rx={80} ry={28}
                        stroke="rgba(229,194,102,0.32)" strokeWidth={1} fill="none" strokeDasharray="1.5 4" />
                </Svg>
                <Animated.View style={[dotStyle, { opacity: backOpacity }]} />
            </View>

            {/* Shield — floats up/down */}
            <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateY: float }] }]}>
                <Svg width={HERO} height={HERO} viewBox="0 0 200 200" style={s.heroSvgShadow}>
                    <Defs>
                        <SvgLinearGradient id="shGold" x1="0" y1="0" x2="0" y2="1">
                            <Stop offset="0%"   stopColor="#FFE9A8" />
                            <Stop offset="48%"  stopColor="#E5C266" />
                            <Stop offset="100%" stopColor="#8E6F31" />
                        </SvgLinearGradient>
                        <SvgLinearGradient id="shFace" x1="0" y1="0" x2="0" y2="1">
                            <Stop offset="0%"   stopColor="#2D1F5E" />
                            <Stop offset="100%" stopColor="#150B30" />
                        </SvgLinearGradient>
                        <RadialGradient id="shMoon" cx="40%" cy="40%" r="60%">
                            <Stop offset="0%"   stopColor="#FFE9A8" />
                            <Stop offset="100%" stopColor="#B89549" />
                        </RadialGradient>
                    </Defs>
                    <Path d="M100 52 L138 65 L138 102 C138 124 122 142 100 150 C78 142 62 124 62 102 L62 65 Z"
                        fill="url(#shGold)" />
                    <Path d="M100 62 L130 72 L130 102 C130 119 117 134 100 140 C83 134 70 119 70 102 L70 72 Z"
                        fill="url(#shFace)" />
                    <Path
                        d="M 85 100 a 15 15 0 1 0 30 0 a 15 15 0 1 0 -30 0 M 91 100 a 12 12 0 1 0 24 0 a 12 12 0 1 0 -24 0 Z"
                        fillRule="evenodd" fill="url(#shMoon)" />
                </Svg>
            </Animated.View>

            {/* Front half of planet (in front of shield) */}
            <View style={[StyleSheet.absoluteFill, { transform: [{ rotate: '-18deg' }] }]}>
                <Animated.View style={[dotStyle, { opacity: frontOpacity }]} />
            </View>
        </View>
    );
}

// ─── Hero Astrolabe (Step 1 — Guide) ─────────────────────────────────────────

function HeroAstrolabe() {
    const pointerOsc = useRef(new Animated.Value(0)).current;
    const discScale  = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pointerOsc, { toValue: 1,  duration: 5500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(pointerOsc, { toValue: 0,  duration: 5500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ]),
        ).start();
        Animated.loop(
            Animated.sequence([
                Animated.timing(discScale, { toValue: 28 / 24, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(discScale, { toValue: 1,       duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ]),
        ).start();
    }, []);

    const pointerDeg = pointerOsc.interpolate({ inputRange: [0, 1], outputRange: ['-6deg', '6deg'] });

    const ticks = useMemo(
        () =>
            Array.from({ length: 24 }, (_, i) => {
                const ang = (i * 15 * Math.PI) / 180;
                const isMajor = i % 2 === 0;
                const r1 = isMajor ? 60 : 62;
                return {
                    x1: 100 + Math.cos(ang) * r1, y1: 100 + Math.sin(ang) * r1,
                    x2: 100 + Math.cos(ang) * 68,  y2: 100 + Math.sin(ang) * 68,
                    major: isMajor,
                };
            }),
        [],
    );
    const zodiacDots = useMemo(
        () => [0, 60, 120, 180, 240, 300].map((a) => ({
            x: 100 + Math.cos((a * Math.PI) / 180) * 46,
            y: 100 + Math.sin((a * Math.PI) / 180) * 46,
        })),
        [],
    );
    const cardinalDots = useMemo(
        () => [0, 90, 180, 270].map((a) => ({
            cx: 100 + Math.cos((a * Math.PI) / 180) * 72,
            cy: 100 + Math.sin((a * Math.PI) / 180) * 72,
        })),
        [],
    );

    return (
        <View style={s.heroWrap}>
            {/* Stars */}
            <StarLayer />

            {/* Outer tick ring — rotates clockwise */}
            <RotatingLayer duration={48000}>
                <Circle cx={100} cy={100} r={68} stroke="rgba(229,194,102,0.40)" strokeWidth={1} fill="none" />
                <Circle cx={100} cy={100} r={60} stroke="rgba(229,194,102,0.16)" strokeWidth={1} fill="none" />
                {ticks.map((t, i) => (
                    <Line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
                        stroke={t.major ? '#E5C266' : 'rgba(229,194,102,0.5)'}
                        strokeWidth={t.major ? 1.4 : 1} strokeLinecap="round" />
                ))}
                {cardinalDots.map((d, i) => (
                    <Circle key={i} cx={d.cx} cy={d.cy} r={2.2} fill="#F4DC95" />
                ))}
            </RotatingLayer>

            {/* Mid dashed ring — counter-rotates */}
            <RotatingLayer duration={32000} reverse>
                <Circle cx={100} cy={100} r={46}
                    stroke="rgba(229,194,102,0.45)" strokeWidth={1} fill="none" strokeDasharray="2 3" />
                {zodiacDots.map((d, i) => (
                    <Circle key={i} cx={d.x} cy={d.y} r={1.6} fill="#F4DC95" />
                ))}
            </RotatingLayer>

            {/* Crossed pointers — oscillate */}
            <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate: pointerDeg }] }]}>
                <Svg width={HERO} height={HERO} viewBox="0 0 200 200" style={StyleSheet.absoluteFill}>
                    <Line x1={100} y1={30} x2={100} y2={170}
                        stroke="#E5C266" strokeWidth={1.6} strokeLinecap="round" opacity={0.75} />
                    <Line x1={30} y1={100} x2={170} y2={100}
                        stroke="#E5C266" strokeWidth={1.6} strokeLinecap="round" opacity={0.5} />
                    <Circle cx={100} cy={30} r={2.4} fill="#F4DC95" />
                    <Circle cx={100} cy={170} r={2} fill="#F4DC95" opacity={0.7} />
                </Svg>
            </Animated.View>

            {/* Central disc glow — pulses via scale */}
            <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale: discScale }] }]}>
                <Svg width={HERO} height={HERO} viewBox="0 0 200 200" style={StyleSheet.absoluteFill}>
                    <Circle cx={100} cy={100} r={24} fill="rgba(244,220,149,0.22)" />
                </Svg>
            </Animated.View>

            {/* Central disc static */}
            <Svg width={HERO} height={HERO} viewBox="0 0 200 200" style={StyleSheet.absoluteFill}>
                <Defs>
                    <RadialGradient id="asCore" cx="38%" cy="36%" r="65%">
                        <Stop offset="0%"   stopColor="#FFF4CC" />
                        <Stop offset="55%"  stopColor="#E5C266" />
                        <Stop offset="100%" stopColor="#7E6328" />
                    </RadialGradient>
                </Defs>
                <Circle cx={100} cy={100} r={16} fill="url(#asCore)" stroke="rgba(255,233,168,0.6)" strokeWidth={0.7} />
                <Path d="M100 86 L102.5 97.5 L114 100 L102.5 102.5 L100 114 L97.5 102.5 L86 100 L97.5 97.5 Z"
                    fill="#180E36" opacity={0.65} />
            </Svg>
        </View>
    );
}

// ─── Hero Finale (Step 3 — Done) ─────────────────────────────────────────────

function HeroFinale() {
    const pinScale  = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pinScale, { toValue: 1.6, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(pinScale, { toValue: 1,   duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ]),
        ).start();
    }, []);

    return (
        <View style={s.heroWrap}>
            {/* Inner glow — stopOpacity instead of rgba for react-native-svg compat */}
            <Svg width={HERO} height={HERO} viewBox="0 0 200 200" style={StyleSheet.absoluteFill}>
                <Defs>
                    <RadialGradient id="fnGlow" cx="100" cy="100" r="78" gradientUnits="userSpaceOnUse">
                        <Stop offset="0%"   stopColor="#F4DC95" stopOpacity={0.6} />
                        <Stop offset="55%"  stopColor="#F4DC95" stopOpacity={0.06} />
                        <Stop offset="100%" stopColor="#F4DC95" stopOpacity={0} />
                    </RadialGradient>
                </Defs>
                <Circle cx={100} cy={100} r={78} fill="url(#fnGlow)" />
            </Svg>

            <StarLayer />

            {/* Outer ring + planet — slow CW */}
            <RotatingLayer duration={38000}>
                <Circle cx={100} cy={100} r={76} stroke="rgba(229,194,102,0.18)" strokeWidth={1} fill="none" />
                <Circle cx={176} cy={100} r={3.2} fill="#F4DC95" />
            </RotatingLayer>

            {/* Mid dashed ring — CCW */}
            <RotatingLayer duration={26000} reverse>
                <Circle cx={100} cy={100} r={58}
                    stroke="rgba(229,194,102,0.32)" strokeWidth={1} fill="none" strokeDasharray="2 4" />
                <Circle cx={158} cy={100} r={2.4} fill="#F4DC95" />
                <Circle cx={42}  cy={100} r={1.8} fill="#F4DC95" opacity={0.8} />
            </RotatingLayer>

            {/* Inner ring — CW faster */}
            <RotatingLayer duration={18000}>
                <Circle cx={100} cy={100} r={40} stroke="rgba(229,194,102,0.5)" strokeWidth={1} fill="none" />
                <Circle cx={140} cy={100} r={2} fill="#F4DC95" />
            </RotatingLayer>

            {/* 4-point star — very slow CW */}
            <RotatingLayer duration={40000}>
                <Defs>
                    {/* gradientUnits=userSpaceOnUse for reliable rendering on RN (avoids objectBoundingBox issues) */}
                    <RadialGradient id="fnStar" cx="100" cy="88" r="42" gradientUnits="userSpaceOnUse">
                        <Stop offset="0%"   stopColor="#FFFAE0" />
                        <Stop offset="35%"  stopColor="#F4DC95" />
                        <Stop offset="100%" stopColor="#8E6F31" />
                    </RadialGradient>
                </Defs>
                <Path
                    d="M100 63.3 L106 88.8 c0.7 2.5 2.5 4.5 4.9 5.3 L136.8 100 L110.9 106 c-2.5 0.7 -4.2 2.8 -4.9 5.3 L100 136.8 L94.1 111.2 c-0.7 -2.5 -2.5 -4.5 -4.9 -5.3 L63.3 100 L89.1 94.1 c2.5 -0.7 4.2 -2.8 4.9 -5.3 Z"
                    fill="url(#fnStar)" opacity={0.95} />
            </RotatingLayer>

            {/* Center pinprick — pulses */}
            <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale: pinScale }] }]}>
                <Svg width={HERO} height={HERO} viewBox="0 0 200 200" style={StyleSheet.absoluteFill}>
                    <Circle cx={100} cy={100} r={2} fill="#FFFFFF" opacity={0.9} />
                </Svg>
            </Animated.View>
        </View>
    );
}

// ─── Feature accordion row ─────────────────────────────────────────────────────

function FeatureRow({
    icon,
    name,
    desc,
    isOpen,
    onPress,
}: {
    icon: keyof typeof Feather.glyphMap;
    name: string;
    desc: string;
    isOpen: boolean;
    onPress: () => void;
}) {
    const expand = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(expand, {
            toValue: isOpen ? 1 : 0,
            duration: 280,
            useNativeDriver: false,
        }).start();
    }, [isOpen]);

    return (
        <Pressable style={[s.featureRow, isOpen && s.featureRowOpen]} onPress={onPress}>
            <View style={s.featureRowTop}>
                <View style={[s.featureIcon, isOpen && s.featureIconOpen]}>
                    <Feather name={icon} size={18} color={colors.primary} />
                </View>
                <Text style={s.featureName}>{name}</Text>
                <View style={[s.featureHelp, isOpen && s.featureHelpOpen]}>
                    <Feather
                        name="help-circle"
                        size={14}
                        color={isOpen ? colors.primary : `${colors.onSurfaceMuted}80`}
                    />
                </View>
            </View>
            <Animated.View
                style={{
                    overflow: 'hidden',
                    maxHeight: expand.interpolate({ inputRange: [0, 1], outputRange: [0, 80] }),
                    opacity: expand,
                    marginTop: expand.interpolate({ inputRange: [0, 1], outputRange: [0, 10] }),
                }}
            >
                <Text style={s.featureDesc}>{desc}</Text>
            </Animated.View>
        </Pressable>
    );
}

// ─── Form field (text input) ───────────────────────────────────────────────────

function FormField({
    label,
    value,
    onChangeText,
    placeholder,
    hint,
    disabled,
}: {
    label: string;
    value: string;
    onChangeText: (v: string) => void;
    placeholder?: string;
    hint?: string;
    disabled?: boolean;
}) {
    const [focused, setFocused] = useState(false);
    return (
        <View>
            <Text style={s.formLabel}>{label}</Text>
            <View style={[s.formInput, focused && s.formInputFocused, disabled && { opacity: 0.5 }]}>
                <TextInput
                    style={s.formText}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={`${colors.onSurfaceMuted}60`}
                    editable={!disabled}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                />
            </View>
            {hint && <Text style={s.formHint}>{hint}</Text>}
        </View>
    );
}

// ─── Step 0 — RGPD consent ─────────────────────────────────────────────────────

function StepRGPD({ onContinue }: { onContinue: () => void }) {
    const { t } = useTranslation();
    const router = useRouter();
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [acceptAI, setAcceptAI] = useState(false);
    const ready = acceptTerms && acceptAI;

    type DataItem = { title: string; desc: string };
    const dataItems = t('onboarding.rgpd.dataItems', { returnObjects: true }) as DataItem[];
    const dataIcons: (keyof typeof Feather.glyphMap)[] = ['mail', 'user', 'calendar'];

    return (
        <View style={s.screenRoot}>
            <ScrollView contentContainerStyle={s.screenScroll} showsVerticalScrollIndicator={false}>
                <HeroShield />

                <View style={s.chipWrap}>
                    <View style={s.chip}>
                        <Text style={s.chipText}>{t('onboarding.rgpd.badge')}</Text>
                    </View>
                </View>

                <Text style={s.h1}>{t('onboarding.rgpd.title')}</Text>
                <Text style={s.lead}>{t('onboarding.rgpd.description')}</Text>

                <View style={s.card}>
                    <Text style={s.listTitle}>{t('onboarding.rgpd.dataTitle')}</Text>
                    <View style={s.dataList}>
                        {dataItems.map((item, i) => (
                            <View key={i} style={[s.dataRow, i > 0 && { marginTop: 14 }]}>
                                <View style={s.dataIconBox}>
                                    <Feather name={dataIcons[i] ?? 'star'} size={18} color={colors.primary} />
                                </View>
                                <View style={s.dataBody}>
                                    <Text style={s.dataItemTitle}>{item.title}</Text>
                                    <Text style={s.dataItemDesc}>{item.desc}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>

                <View style={s.consents}>
                    <Pressable
                        style={s.consentRow}
                        onPress={() => setAcceptTerms((v) => !v)}
                        hitSlop={8}
                    >
                        <View style={[s.checkbox, acceptTerms && s.checkboxChecked]}>
                            {acceptTerms && (
                                <Feather name="check" size={13} color={colors.surfaceLowest} />
                            )}
                        </View>
                        <Text style={s.consentText}>
                            {t('onboarding.rgpd.checkTerms')}{' '}
                            <Text
                                style={s.consentLink}
                                onPress={() => router.push('/privacy-policy')}
                            >
                                {t('onboarding.rgpd.privacyLink')}
                            </Text>
                        </Text>
                    </Pressable>

                    <Pressable
                        style={s.consentRow}
                        onPress={() => setAcceptAI((v) => !v)}
                        hitSlop={8}
                    >
                        <View style={[s.checkbox, acceptAI && s.checkboxChecked]}>
                            {acceptAI && (
                                <Feather name="check" size={13} color={colors.surfaceLowest} />
                            )}
                        </View>
                        <Text style={s.consentText}>{t('onboarding.rgpd.checkAI')}</Text>
                    </Pressable>
                </View>

                <View style={s.ctaInScroll}>
                    <GoldButton
                        label={t('onboarding.rgpd.cta')}
                        onPress={onContinue}
                        size="lg"
                        disabled={!ready}
                    />
                </View>
            </ScrollView>
        </View>
    );
}

// ─── Step 1 — Features guide ───────────────────────────────────────────────────

function StepGuide({ onContinue }: { onContinue: () => void }) {
    const { t } = useTranslation();
    const [open, setOpen] = useState<number | null>(null);

    const mockPages = t('onboarding.helpTip.mockPages', { returnObjects: true }) as string[];

    const featureIcons: (keyof typeof Feather.glyphMap)[] = [
        'target',
        'heart',
        'refresh-cw',
        'clock',
    ];
    const featureDescs = [
        'Ta carte du ciel à la minute près. Planètes, signes, maisons et aspects, le tout interactif.',
        'La synastrie : comment deux thèmes dialoguent. Forces, tensions et clés de relation.',
        "Ce que le ciel actuel active dans ton thème. Périodes-clés, fenêtres d'action.",
        'Une lecture comparée : passé · présent · futur, pour suivre ton évolution.',
    ];

    return (
        <View style={s.screenRoot}>
            <ScrollView contentContainerStyle={s.screenScroll} showsVerticalScrollIndicator={false}>
                <HeroAstrolabe />

                <View style={{ marginTop: 6 }}>
                    {mockPages.map((name, i) => (
                        <FeatureRow
                            key={i}
                            icon={featureIcons[i] ?? 'star'}
                            name={name}
                            desc={featureDescs[i] ?? ''}
                            isOpen={open === i}
                            onPress={() => setOpen(open === i ? null : i)}
                        />
                    ))}
                </View>

                <View style={[s.chipWrap, { marginTop: 20 }]}>
                    <View style={s.chip}>
                        <Text style={s.chipText}>{t('onboarding.helpTip.badge')}</Text>
                    </View>
                </View>
                <Text style={s.h1}>{t('onboarding.helpTip.title')}</Text>
                <Text style={s.lead}>{t('onboarding.helpTip.description')}</Text>

                <View style={s.ctaInScroll}>
                    <GoldButton label={t('onboarding.helpTip.cta')} onPress={onContinue} size="lg" />
                </View>
            </ScrollView>
        </View>
    );
}

// ─── Step 2 — Birth profile form ───────────────────────────────────────────────

function StepBirthProfile({
    onContinue,
    onSkip,
}: {
    onContinue: () => void;
    onSkip: () => void;
}) {
    const { t } = useTranslation();
    const { refreshUser } = useAuth();

    const [firstName, setFirstName] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [birthTime, setBirthTime] = useState('');
    const [birthCity, setBirthCity] = useState('');
    const [birthCountry, setBirthCountry] = useState('');
    const [latitude, setLatitude] = useState<number | null>(null);
    const [longitude, setLongitude] = useState<number | null>(null);
    const [timezone, setTimezone] = useState<number | null>(null);
    const [timezoneName, setTimezoneName] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | undefined>();

    const scrollRef = useRef<ScrollView>(null);
    const scrollYRef = useRef(0);

    const handleSelectCity = useCallback((city: CitySearchResult) => {
        setBirthCity(city.name);
        setBirthCountry(city.country);
        setLatitude(city.latitude);
        setLongitude(city.longitude);
        setTimezone(city.timezone);
        setTimezoneName(city.timezoneName);
    }, []);

    const handleClearCity = useCallback(() => {
        setBirthCity('');
        setBirthCountry('');
        setLatitude(null);
        setLongitude(null);
        setTimezone(null);
        setTimezoneName(null);
    }, []);

    const handleSave = useCallback(async () => {
        setError(undefined);
        if (!birthDate) {
            setError(t('birthProfile.birthDateRequired'));
            return;
        }
        if (!birthCity || latitude === null || longitude === null) {
            setError(t('birthProfile.birthCityRequired'));
            return;
        }
        setIsSaving(true);
        try {
            await saveBirthProfile({
                firstName: firstName || undefined,
                birthDate,
                birthTime: birthTime || undefined,
                birthCity,
                birthCountry: birthCountry || undefined,
                latitude,
                longitude,
                timezone: timezone ?? undefined,
                timezoneName: timezoneName ?? undefined,
            });
            await refreshUser();
            onContinue();
        } catch (err) {
            setError(err instanceof Error ? err.message : t('birthProfile.saveError'));
        } finally {
            setIsSaving(false);
        }
    }, [
        birthDate,
        birthCity,
        latitude,
        longitude,
        firstName,
        birthTime,
        birthCountry,
        timezone,
        timezoneName,
        refreshUser,
        onContinue,
        t,
    ]);

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
        >
            <ScrollView
                ref={scrollRef}
                contentContainerStyle={s.screenScroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                onScroll={(e) => {
                    scrollYRef.current = e.nativeEvent.contentOffset.y;
                }}
                scrollEventThrottle={16}
            >
                <View style={s.chipWrap}>
                    <View style={s.chip}>
                        <Text style={s.chipText}>Étape 3 / 4</Text>
                    </View>
                </View>
                <Text style={s.h1}>{t('onboarding.birth.title')}</Text>
                <Text style={s.lead}>{t('onboarding.birth.subtitle')}</Text>

                <View style={s.card}>
                    <FormField
                        label={t('birthProfile.firstName')}
                        value={firstName}
                        onChangeText={setFirstName}
                        placeholder={t('birthProfile.firstNamePlaceholder')}
                        hint={t('birthProfile.firstNameHint')}
                        disabled={isSaving}
                    />
                    <View style={{ height: 16 }} />
                    <AppDatePicker
                        label={t('birthProfile.birthDate')}
                        value={birthDate}
                        onChange={setBirthDate}
                        disabled={isSaving}
                        maximumDate={new Date()}
                        placeholder={t('birthProfile.birthDatePlaceholder')}
                    />
                    <View style={{ height: 16 }} />
                    <AppTimePicker
                        label={t('birthProfile.birthTime')}
                        value={birthTime}
                        onChange={setBirthTime}
                        disabled={isSaving}
                        hint={t('birthProfile.birthTimeHint')}
                        placeholder={t('birthProfile.birthTimePlaceholder')}
                    />
                    <View style={{ height: 16 }} />
                    <CityAutocomplete
                        label={t('birthProfile.birthCity')}
                        placeholder={t('birthProfile.birthCityPlaceholder')}
                        value={
                            birthCity
                                ? `${birthCity}${birthCountry ? `, ${birthCountry}` : ''}`
                                : ''
                        }
                        onSelect={handleSelectCity}
                        onClear={handleClearCity}
                        disabled={isSaving}
                        scrollRef={scrollRef}
                        scrollYRef={scrollYRef}
                    />
                </View>

                {!!error && (
                    <View style={s.errorBox}>
                        <Text style={s.errorText}>{error}</Text>
                    </View>
                )}

                <View style={s.ctaInScroll}>
                    <GoldButton
                        label={isSaving ? t('common.loading') : t('onboarding.birth.cta')}
                        onPress={handleSave}
                        loading={isSaving}
                        size="lg"
                    />
                    <GhostButton label={t('onboarding.birth.skip')} onPress={onSkip} />
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

// ─── Step 3 — All set ──────────────────────────────────────────────────────────

function StepDone({ onFinish }: { onFinish: () => void }) {
    const { t } = useTranslation();

    const feats = [
        { icon: '☽', label: t('onboarding.done.feature1') },
        { icon: '◈', label: t('onboarding.done.feature2') },
        { icon: '⟡', label: t('onboarding.done.feature3') },
        { icon: '✦', label: t('onboarding.done.feature4') },
    ];

    return (
        <View style={s.screenRoot}>
            <ScrollView
                contentContainerStyle={[s.screenScroll, { alignItems: 'center' }]}
                showsVerticalScrollIndicator={false}
            >
                <HeroFinale />

                <Text style={[s.h1, { textAlign: 'center' }]}>{t('onboarding.done.title')}</Text>
                <Text style={[s.lead, { textAlign: 'center' }]}>
                    {t('onboarding.done.subtitle')}
                </Text>

                <View style={s.featGrid}>
                    {feats.map((f, i) => (
                        <View key={i} style={s.featCard}>
                            <View style={s.featCardIcon}>
                                <Text style={s.featCardIconText}>{f.icon}</Text>
                            </View>
                            <Text style={s.featCardLabel}>{f.label}</Text>
                        </View>
                    ))}
                </View>

                <View style={[s.ctaInScroll, { width: '100%' }]}>
                    <GoldButton
                        label={t('onboarding.done.cta')}
                        onPress={onFinish}
                        size="lg"
                        rightIcon
                    />
                </View>
            </ScrollView>
        </View>
    );
}

// ─── Root ──────────────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
    const router = useRouter();

    const [step, setStep] = useState(0);
    const stepRef = useRef(0);

    // Pre-mount all screens at startup with staggered delays so no mounting
    // work happens during transitions.
    const [mounted, setMounted] = useState<boolean[]>([true, false, false, false]);
    useEffect(() => {
        const timers = [1, 2, 3].map((i) =>
            setTimeout(() => {
                setMounted((prev) => {
                    if (prev[i]) return prev;
                    const arr = [...prev];
                    arr[i] = true;
                    return arr;
                });
            }, i * 600),
        );
        return () => timers.forEach(clearTimeout);
    }, []);

    const SLIDE = 40;
    const screenAnims = useRef(
        Array.from({ length: STEPS }, (_, i) => ({
            opacity: new Animated.Value(i === 0 ? 1 : 0),
            tx: new Animated.Value(i === 0 ? 0 : SLIDE),
        })),
    ).current;

    const goTo = useCallback(
        (next: number) => {
            const current = stepRef.current;
            if (current === next) return;
            const dir = next > current ? 1 : -1;

            screenAnims[next].tx.setValue(dir * SLIDE);
            screenAnims[next].opacity.setValue(0);

            stepRef.current = next;
            setStep(next);

            Animated.parallel([
                Animated.timing(screenAnims[current].opacity, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(screenAnims[current].tx, {
                    toValue: -dir * SLIDE * 0.75,
                    duration: 250,
                    useNativeDriver: true,
                }),
                Animated.sequence([
                    Animated.delay(80),
                    Animated.parallel([
                        Animated.timing(screenAnims[next].opacity, {
                            toValue: 1,
                            duration: 320,
                            useNativeDriver: true,
                        }),
                        Animated.timing(screenAnims[next].tx, {
                            toValue: 0,
                            duration: 380,
                            useNativeDriver: true,
                        }),
                    ]),
                ]),
            ]).start(() => {
                screenAnims[current].tx.setValue(dir * SLIDE);
            });
        },
        [screenAnims],
    );

    const skipToApp = useCallback(() => {
        router.replace('/(tabs)');
    }, [router]);

    // Memoised so React doesn't reconcile the entire screen tree on every
    // setStep() call (which would compete with the transition animation).
    const screens = useMemo(
        () => [
            <StepRGPD onContinue={() => goTo(1)} />,
            <StepGuide onContinue={() => goTo(2)} />,
            <StepBirthProfile onContinue={() => goTo(3)} onSkip={skipToApp} />,
            <StepDone onFinish={skipToApp} />,
        ],
        [goTo, skipToApp],
    );

    return (
        <View style={s.root}>
            <LinearGradient
                colors={[colors.surfaceLowest, '#1e0f3a', colors.surfaceLowest]}
                locations={[0, 0.5, 1]}
                style={StyleSheet.absoluteFill}
            />

            <Starfield />

            <SafeAreaView style={s.safe}>
                <ProgressDots step={step} />
                <BackButton visible={step > 0} onPress={() => goTo(step - 1)} />

                <View style={s.screensContainer}>
                    {screens.map((screen, i) => (
                        <Animated.View
                            key={i}
                            style={[
                                s.screenSlot,
                                {
                                    opacity: screenAnims[i].opacity,
                                    transform: [{ translateX: screenAnims[i].tx }],
                                },
                            ]}
                            pointerEvents={i === step ? 'auto' : 'none'}
                            // Pre-composite each screen as a GPU texture so the
                            // slide/fade transition is handled entirely on the GPU.
                            renderToHardwareTextureAndroid
                            shouldRasterizeIOS
                        >
                            {mounted[i] ? screen : null}
                        </Animated.View>
                    ))}
                </View>
            </SafeAreaView>
        </View>
    );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const FEAT_CARD_W = (W - spacing.xl * 2 - spacing.md) / 2 - 1;

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.surfaceLowest },
    safe: { flex: 1 },

    // ── Progress ──────────────────────────────────────────────────────────────
    dots: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        paddingTop: spacing.lg,
        paddingBottom: spacing.md,
    },
    dot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: `${colors.onSurface}2e`,
    },
    dotDone: {
        backgroundColor: `${colors.primary}8c`,
    },
    dotActive: {
        width: 26,
        backgroundColor: colors.primary,
    },

    // ── Back button ───────────────────────────────────────────────────────────
    backBtn: {
        position: 'absolute',
        top: 12,
        left: 16,
        zIndex: 20,
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: `${colors.onSurface}0a`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backBtnHidden: {
        opacity: 0,
    },

    // ── Screens ───────────────────────────────────────────────────────────────
    screensContainer: { flex: 1 },
    screenSlot: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    screenRoot: { flex: 1 },
    screenScroll: {
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.md,
        paddingBottom: spacing.xxxl,
    },

    // ── SVG Heroes ────────────────────────────────────────────────────────────
    heroWrap: {
        width: 168,
        height: 168,
        alignSelf: 'center',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: spacing.xl,
        marginBottom: spacing.xl,
    },
    heroSvgShadow: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.18,
        shadowRadius: 22,
        elevation: 8,
    },

    // ── Chip badge ────────────────────────────────────────────────────────────
    chipWrap: { alignItems: 'center', marginBottom: 4 },
    chip: {
        backgroundColor: `${colors.primary}1a`,
        borderRadius: radius.full,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.xs,
        borderWidth: 1,
        borderColor: `${colors.primary}40`,
    },
    chipText: {
        fontFamily: fonts.body.bold,
        fontSize: 11,
        letterSpacing: 1.8,
        color: colors.primary,
        textTransform: 'uppercase',
    },

    // ── Typography ────────────────────────────────────────────────────────────
    h1: {
        fontFamily: fonts.display.bold,
        fontSize: 34,
        lineHeight: 40,
        color: '#EFE6FF',
        letterSpacing: -0.3,
        marginTop: 14,
        marginBottom: 12,
    },
    lead: {
        fontFamily: fonts.body.regular,
        fontSize: 15,
        lineHeight: 23,
        color: colors.onSurfaceMuted,
        marginBottom: 18,
        maxWidth: 320,
    },

    // ── Card ──────────────────────────────────────────────────────────────────
    card: {
        borderRadius: radius.xl,
        backgroundColor: `${colors.onSurface}06`,
        borderWidth: 1,
        borderColor: `${colors.onSurface}12`,
        padding: spacing.xl,
        marginBottom: spacing.md,
    },
    listTitle: {
        fontFamily: fonts.body.bold,
        fontSize: 11,
        letterSpacing: 1.8,
        textTransform: 'uppercase',
        color: `${colors.onSurfaceMuted}aa`,
        marginBottom: 14,
    },

    // ── RGPD data items ───────────────────────────────────────────────────────
    dataList: {
        gap: 0,
    },
    dataRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 14,
    },
    dataIconBox: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: `${colors.primary}14`,
        borderWidth: 1,
        borderColor: `${colors.primary}2e`,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    dataBody: {
        flex: 1,
    },
    dataItemTitle: {
        fontFamily: fonts.body.semiBold,
        fontSize: 14,
        color: colors.onSurface,
        marginBottom: 2,
    },
    dataItemDesc: {
        fontFamily: fonts.body.regular,
        fontSize: 13,
        color: colors.onSurfaceMuted,
        lineHeight: 19,
    },

    // ── Consents ──────────────────────────────────────────────────────────────
    consents: { gap: 14, marginTop: 18, marginBottom: 6 },
    consentRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        backgroundColor: `${colors.onSurface}0a`,
        borderWidth: 1.5,
        borderColor: `${colors.onSurfaceMuted}66`,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        marginTop: 2,
    },
    checkboxChecked: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    consentText: {
        flex: 1,
        fontFamily: fonts.body.regular,
        fontSize: 13,
        color: colors.onSurfaceMuted,
        lineHeight: 20,
    },
    consentLink: {
        color: colors.primary,
        textDecorationLine: 'underline',
    },

    // ── Feature rows ──────────────────────────────────────────────────────────
    featureRow: {
        padding: 14,
        borderRadius: radius.lg,
        backgroundColor: `${colors.onSurface}06`,
        borderWidth: 1,
        borderColor: `${colors.onSurface}12`,
        marginBottom: 10,
    },
    featureRowOpen: {
        backgroundColor: `${colors.primary}0a`,
        borderColor: `${colors.primary}40`,
    },
    featureRowTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    featureIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: `${colors.primary}1a`,
        borderWidth: 1,
        borderColor: `${colors.primary}38`,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    featureIconOpen: { backgroundColor: `${colors.primary}26` },
    featureName: {
        flex: 1,
        fontFamily: fonts.body.semiBold,
        fontSize: 15,
        color: colors.onSurface,
    },
    featureHelp: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: `${colors.onSurface}08`,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    featureHelpOpen: { backgroundColor: `${colors.primary}1a` },
    featureDesc: {
        fontFamily: fonts.body.regular,
        fontSize: 13,
        color: colors.onSurfaceMuted,
        lineHeight: 20,
        paddingHorizontal: 4,
    },

    // ── Form ──────────────────────────────────────────────────────────────────
    formLabel: {
        fontFamily: fonts.body.semiBold,
        fontSize: 13,
        color: colors.onSurface,
        letterSpacing: 0.2,
        marginBottom: spacing.sm,
    },
    formInput: {
        backgroundColor: `${colors.onSurface}0a`,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: `${colors.onSurface}1e`,
        minHeight: 52,
        paddingHorizontal: spacing.lg,
        justifyContent: 'center',
    },
    formInputFocused: {
        borderColor: `${colors.primary}99`,
        backgroundColor: `${colors.primary}0a`,
    },
    formText: {
        fontFamily: fonts.body.regular,
        fontSize: 15,
        color: colors.onSurface,
    },
    formHint: {
        fontFamily: fonts.body.regular,
        fontSize: 12,
        color: colors.onSurfaceMuted,
        marginTop: spacing.xs,
    },
    errorBox: {
        backgroundColor: `${colors.error}15`,
        borderRadius: radius.md,
        padding: spacing.md,
        marginTop: spacing.md,
    },
    errorText: {
        fontFamily: fonts.body.regular,
        fontSize: 13,
        color: colors.error,
        textAlign: 'center',
    },

    // ── Done screen ───────────────────────────────────────────────────────────
    featGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
        justifyContent: 'center',
        width: '100%',
        marginBottom: spacing.md,
    },
    featCard: {
        width: FEAT_CARD_W,
        backgroundColor: `${colors.onSurface}08`,
        borderRadius: radius.md,
        padding: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    featCardIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: `${colors.primary}1a`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    featCardIconText: { fontSize: 16, color: colors.primary },
    featCardLabel: {
        flex: 1,
        fontFamily: fonts.body.regular,
        fontSize: 12,
        color: colors.onSurface,
        lineHeight: 16,
    },

    // ── CTA ───────────────────────────────────────────────────────────────────
    ctaInScroll: { gap: spacing.md, marginTop: spacing.xl },
});
