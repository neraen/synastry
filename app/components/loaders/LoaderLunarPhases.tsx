import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  RadialGradient,
  LinearGradient,
  ClipPath,
  G,
  Stop,
} from 'react-native-svg';
import { MicroStars } from './MicroStars';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface LoaderLunarPhasesProps {
  size?: number;
  label?: string;
}

/**
 * Lunar Phases loader — a dark shadow sweeps across the golden moon disc,
 * cycling through new moon → crescent → full → crescent → new.
 *
 * Key techniques:
 *   - SVG <ClipPath> clips the phase shadow to the moon disc boundary
 *   - useAnimatedProps (not useAnimatedStyle) animates the shadow circle's `cx`
 *   - Arc and aura are separate Animated.Views outside the clip
 */
export function LoaderLunarPhases({ size = 180, label = 'Alignement des phases…' }: LoaderLunarPhasesProps) {
  const phase      = useSharedValue(0);
  const arcRot     = useSharedValue(0);
  const breath     = useSharedValue(0);

  useEffect(() => {
    // Phase shadow — 5 s, ease-in-out, bounces left ↔ right
    phase.value = withRepeat(
      withTiming(1, { duration: 5000, easing: Easing.inOut(Easing.ease) }),
      -1, true,
    );
    // Arc spin — 6 s, linear
    arcRot.value = withRepeat(
      withTiming(360, { duration: 6000, easing: Easing.linear }),
      -1, false,
    );
    // Aura breath — 4.5 s
    breath.value = withRepeat(
      withTiming(1, { duration: 4500, easing: Easing.inOut(Easing.ease) }),
      -1, true,
    );
  }, []);

  // Shadow cx goes from -50 (all the way left, covers disc) to 150 (all right)
  // viewBox is 0 0 100 100, so disc occupies [0,100].
  // shadow circle has r=52, so at cx=-50 it fully covers; at cx=150 fully clear.
  const shadowProps = useAnimatedProps(() => ({
    cx: interpolate(phase.value, [0, 1], [-50, 150]),
  }));

  const arcStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${arcRot.value}deg` }],
  }));

  const auraStyle = useAnimatedStyle(() => ({
    opacity: 0.7 + breath.value * 0.3,
    transform: [{ scale: 0.98 + breath.value * 0.06 }],
  }));

  const moonSize = size * 0.50;
  const arcSize  = size;

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: size, height: size }}>

        {/* Micro-stars */}
        <MicroStars seed={7} size={size} />

        {/* Aura — breathing glow behind the moon */}
        <Animated.View
          style={[StyleSheet.absoluteFillObject, styles.centred, auraStyle]}
          pointerEvents="none"
        >
          <Svg width={size * 0.8} height={size * 0.8} viewBox="0 0 100 100">
            <Defs>
              <RadialGradient id="llmpAura" cx="50%" cy="50%" r="50%">
                <Stop offset="0%"  stopColor="#F0D585" stopOpacity="0.28" />
                <Stop offset="50%" stopColor="#9B5CFF" stopOpacity="0.10" />
                <Stop offset="70%" stopColor="#9B5CFF" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Circle cx="50" cy="50" r="50" fill="url(#llmpAura)" />
          </Svg>
        </Animated.View>

        {/* Moon disc + phase shadow + craters — all clipped to disc bounds */}
        <View style={[StyleSheet.absoluteFillObject, styles.centred]} pointerEvents="none">
          <Svg width={moonSize} height={moonSize} viewBox="0 0 100 100">
            <Defs>
              <RadialGradient id="llmpMoon" cx="30%" cy="30%" r="80%">
                <Stop offset="0%"  stopColor="#FFF6DA" stopOpacity="1" />
                <Stop offset="40%" stopColor="#F0D585" stopOpacity="1" />
                <Stop offset="90%" stopColor="#C29A3F" stopOpacity="1" />
              </RadialGradient>
              {/* Inset shading overlay */}
              <RadialGradient id="llmpShading" cx="75%" cy="75%" r="60%">
                <Stop offset="0%"   stopColor="#50280A" stopOpacity="0.35" />
                <Stop offset="100%" stopColor="#50280A" stopOpacity="0" />
              </RadialGradient>
              {/* ClipPath = the moon circle boundary */}
              <ClipPath id="llmpMoonClip">
                <Circle cx="50" cy="50" r="50" />
              </ClipPath>
            </Defs>

            <G clipPath="url(#llmpMoonClip)">
              {/* Moon surface */}
              <Circle cx="50" cy="50" r="50" fill="url(#llmpMoon)" />
              {/* Inset shadow for 3D feel */}
              <Circle cx="50" cy="50" r="50" fill="url(#llmpShading)" />

              {/* Craters — rendered before shadow so they disappear under it */}
              {/* crater 1: top 22% left 30% w/h 14% → cx=37 cy=29 r=7 */}
              <Circle cx="37" cy="29" r="7"
                fill="rgba(80,50,15,0.40)" />
              {/* crater 2: top 55% left 55% w/h 9% → cx=59.5 cy=59.5 r=4.5 */}
              <Circle cx="59" cy="59" r="4.5"
                fill="rgba(80,50,15,0.35)" />
              {/* crater 3: top 65% left 25% w/h 7% → cx=28.5 cy=68.5 r=3.5 */}
              <Circle cx="28" cy="68" r="3.5"
                fill="rgba(80,50,15,0.30)" />
              {/* crater 4: top 35% left 62% w/h 6% → cx=65 cy=38 r=3 */}
              <Circle cx="65" cy="38" r="3"
                fill="rgba(80,50,15,0.30)" />

              {/* Phase shadow — dark circle sweeping left → right */}
              {/* r=52 (slightly larger than disc radius) so it fully covers */}
              <AnimatedCircle
                animatedProps={shadowProps}
                cy="50"
                r="52"
                fill="#120A24"
                fillOpacity="0.94"
              />
              {/* Violet tint on shadow edge for depth */}
              <AnimatedCircle
                animatedProps={shadowProps}
                cy="50"
                r="52"
                fill="none"
                stroke="#9B5CFF"
                strokeWidth="6"
                strokeOpacity="0.12"
              />
            </G>
          </Svg>
        </View>

        {/* Progress arc — rotates around the moon, NOT clipped */}
        <Animated.View
          style={[StyleSheet.absoluteFillObject, arcStyle]}
          pointerEvents="none"
        >
          <Svg width={arcSize} height={arcSize} viewBox="0 0 200 200">
            <Defs>
              <LinearGradient id="llmpArc" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0"   stopColor="#E5C266" stopOpacity="0" />
                <Stop offset="0.6" stopColor="#E5C266" stopOpacity="0.85" />
                <Stop offset="1"   stopColor="#F0D585" stopOpacity="1" />
              </LinearGradient>
            </Defs>
            <Circle
              cx="100" cy="100" r="86"
              fill="none"
              stroke="url(#llmpArc)"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeDasharray="160 380"
            />
          </Svg>
        </Animated.View>

      </View>

      {/* Label */}
      {label ? (
        <View style={styles.labelRow}>
          <View style={styles.labelLine} />
          <Text style={styles.labelText}>{label.toUpperCase()}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  centred: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 22,
  },
  labelLine: {
    width: 10,
    height: 1,
    backgroundColor: '#B89549',
    marginRight: 8,
  },
  labelText: {
    fontSize: 12,
    letterSpacing: 2.64,
    color: '#B89549',
    fontWeight: '600',
  },
});
