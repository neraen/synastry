import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Line,
  Defs,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import { MicroStars } from './MicroStars';

export interface LoaderEclipseProps {
  size?: number;
  label?: string;
}

/**
 * Eclipse loader — a dark moon sweeps across a gold sun, briefly revealing
 * a luminous corona ring at the moment of totality.
 *
 * A single `transit` shared value (0 → 1, alternating) drives both:
 *   - the moon's translateX  (left edge → right edge of canvas)
 *   - the corona's opacity/scale  (flash only when transit ≈ 0.5)
 *
 * Z-order (JSX render order, last = topmost):
 *   trail → corona → sun → moon
 */
export function LoaderEclipse({ size = 180, label = 'Conjonction en cours…' }: LoaderEclipseProps) {
  const transit = useSharedValue(0);

  useEffect(() => {
    transit.value = withRepeat(
      withTiming(1, { duration: 5000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true, // reverse: moon bounces left ↔ right smoothly
    );
  }, []);

  const sunSize    = size * 0.36;
  const moonSize   = size * 0.36;
  const coronaSize = size * 0.60;

  // Moon slides from -55% to +55% of `size` horizontally
  const moonStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(transit.value, [0, 1], [-size * 0.55, size * 0.55]) },
    ],
  }));

  // Corona flashes only when the moon is centred (transit ≈ 0.5)
  const coronaStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      transit.value,
      [0, 0.38, 0.46, 0.50, 0.54, 0.62, 1],
      [0,    0,    0,    1,    0,    0,   0],
      'clamp',
    );
    const scale = interpolate(
      transit.value,
      [0, 0.40, 0.50, 0.60, 1],
      [0.95, 0.95, 1.02, 0.95, 0.95],
      'clamp',
    );
    return { opacity, transform: [{ scale }] };
  });

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: size, height: size }}>

        {/* Micro-stars */}
        <MicroStars seed={2} size={size} />

        {/* Trail — decorative dashed guide line */}
        <Svg
          style={StyleSheet.absoluteFillObject}
          viewBox="0 0 200 200"
          pointerEvents="none"
        >
          <Line
            x1="20" y1="100" x2="180" y2="100"
            stroke="rgba(229,194,102,0.18)"
            strokeWidth="0.6"
            strokeDasharray="2 6"
          />
        </Svg>

        {/* Corona — annular ring, visible only during totality */}
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            styles.centred,
            coronaStyle,
          ]}
          pointerEvents="none"
        >
          <Svg width={coronaSize} height={coronaSize} viewBox="0 0 100 100">
            <Defs>
              {/* Ring shape: transparent centre → gold band → transparent edge */}
              <RadialGradient id="llecCorona" cx="50%" cy="50%" r="50%">
                <Stop offset="0%"   stopColor="#E5C266" stopOpacity="0" />
                <Stop offset="38%"  stopColor="#E5C266" stopOpacity="0" />
                <Stop offset="44%"  stopColor="#E5C266" stopOpacity="0.65" />
                <Stop offset="60%"  stopColor="#E5C266" stopOpacity="0" />
                <Stop offset="100%" stopColor="#E5C266" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Circle cx="50" cy="50" r="50" fill="url(#llecCorona)" />
          </Svg>
        </Animated.View>

        {/* Sun — fixed at centre, z-order: above corona */}
        <View style={[StyleSheet.absoluteFillObject, styles.centred]} pointerEvents="none">
          <Svg width={sunSize} height={sunSize} viewBox="0 0 100 100">
            <Defs>
              <RadialGradient id="llecSun" cx="30%" cy="30%" r="70%">
                <Stop offset="0%"   stopColor="#FFF5D6" stopOpacity="1" />
                <Stop offset="35%"  stopColor="#F0D585" stopOpacity="1" />
                <Stop offset="70%"  stopColor="#E5C266" stopOpacity="1" />
                <Stop offset="100%" stopColor="#B89549" stopOpacity="1" />
              </RadialGradient>
              {/* Soft glow halo behind the sun disc */}
              <RadialGradient id="llecSunGlow" cx="50%" cy="50%" r="50%">
                <Stop offset="0%"   stopColor="#E5C266" stopOpacity="0.50" />
                <Stop offset="55%"  stopColor="#E5C266" stopOpacity="0.15" />
                <Stop offset="100%" stopColor="#E5C266" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            {/* Glow rendered first so the disc sits on top */}
            <Circle cx="50" cy="50" r="50" fill="url(#llecSunGlow)" />
            <Circle cx="50" cy="50" r="36" fill="url(#llecSun)" />
          </Svg>
        </View>

        {/* Moon — translates horizontally across the sun */}
        <Animated.View
          style={[StyleSheet.absoluteFillObject, styles.centred, moonStyle]}
          pointerEvents="none"
        >
          <Svg width={moonSize} height={moonSize} viewBox="0 0 100 100">
            <Defs>
              <RadialGradient id="llecMoon" cx="65%" cy="40%" r="70%">
                <Stop offset="0%"   stopColor="#2E1F55" stopOpacity="1" />
                <Stop offset="60%"  stopColor="#160C2E" stopOpacity="1" />
                <Stop offset="100%" stopColor="#0A0518" stopOpacity="1" />
              </RadialGradient>
              {/* Subtle inset shadow on the leading edge */}
              <RadialGradient id="llecMoonEdge" cx="20%" cy="50%" r="60%">
                <Stop offset="0%"   stopColor="#000000" stopOpacity="0.5" />
                <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
              </RadialGradient>
              {/* Gold rim highlight (very faint, mimics 1px border) */}
              <RadialGradient id="llecMoonRim" cx="50%" cy="50%" r="50%">
                <Stop offset="85%"  stopColor="#E5C266" stopOpacity="0" />
                <Stop offset="97%"  stopColor="#E5C266" stopOpacity="0.18" />
                <Stop offset="100%" stopColor="#E5C266" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Circle cx="50" cy="50" r="50" fill="url(#llecMoon)" />
            <Circle cx="50" cy="50" r="50" fill="url(#llecMoonEdge)" />
            <Circle cx="50" cy="50" r="50" fill="url(#llecMoonRim)" />
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
