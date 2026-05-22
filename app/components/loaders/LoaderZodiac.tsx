import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Line,
  Defs,
  RadialGradient,
  LinearGradient,
  Stop,
} from 'react-native-svg';
import { MicroStars } from './MicroStars';

const COLORS = {
  gold: '#E5C266',
  gold2: '#F0D585',
  goldDim: '#B89549',
  violet: '#9B5CFF',
};

export interface LoaderZodiacProps {
  size?: number;
  label?: string;
}

export function LoaderZodiac({ size = 180, label = 'Tracé de la carte…' }: LoaderZodiacProps) {
  const outerRot = useSharedValue(0);
  const innerRot = useSharedValue(0);
  const breath   = useSharedValue(0);

  useEffect(() => {
    // Outer ring: 9s, forward
    outerRot.value = withRepeat(
      withTiming(360, { duration: 9000, easing: Easing.linear }),
      -1,
      false,
    );
    // Inner ring: 14s, reverse
    innerRot.value = withRepeat(
      withTiming(-360, { duration: 14000, easing: Easing.linear }),
      -1,
      false,
    );
    // Aura breathing: 4.5s
    breath.value = withRepeat(
      withTiming(1, { duration: 4500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, []);

  const outerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${outerRot.value}deg` }],
  }));
  const innerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${innerRot.value}deg` }],
  }));
  const auraStyle = useAnimatedStyle(() => ({
    opacity: 0.7 + breath.value * 0.3,
    transform: [{ scale: 0.98 + breath.value * 0.06 }],
  }));

  // Precompute 12 zodiac tick marks (in viewBox space -100..100)
  const ticks = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => {
      const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
      return {
        x1: Math.cos(angle) * 72,
        y1: Math.sin(angle) * 72,
        x2: Math.cos(angle) * 80,
        y2: Math.sin(angle) * 80,
        isMajor: i % 3 === 0,
      };
    }),
  []);

  const half       = size / 2;
  const innerSize  = size * 0.70;
  const innerOff   = (size - innerSize) / 2;
  const centerSize = size * 0.22;
  const centerOff  = (size - centerSize) / 2;
  const centerR    = centerSize / 2;
  // Glow extends 40% of centerSize on each side → total 1.8× centerSize
  const glowSize   = centerSize * 1.8;
  const glowOff    = -centerSize * 0.4;

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: size, height: size }}>

        {/* Aura — behind everything */}
        <Animated.View
          style={[StyleSheet.absoluteFillObject, styles.auraContainer, auraStyle]}
          pointerEvents="none"
        >
          <Svg width={size * 0.8} height={size * 0.8} viewBox="0 0 100 100">
            <Defs>
              <RadialGradient id="llzAura" cx="50%" cy="50%" r="50%">
                <Stop offset="0%"   stopColor="#E5C266" stopOpacity="0.20" />
                <Stop offset="50%"  stopColor="#9B5CFF" stopOpacity="0.12" />
                <Stop offset="75%"  stopColor="#9B5CFF" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Circle cx="50" cy="50" r="50" fill="url(#llzAura)" />
          </Svg>
        </Animated.View>

        {/* Micro-stars — seed=5, count=10 */}
        <MicroStars seed={5} count={10} size={size} />

        {/* Outer ring — rotates 9s forward */}
        <Animated.View style={[StyleSheet.absoluteFillObject, outerStyle]}>
          <Svg
            width={size}
            height={size}
            viewBox="-100 -100 200 200"
            overflow="visible"
          >
            <Defs>
              {/* Diagonal linear gradient for the outer ring stroke */}
              <LinearGradient id="llzRing" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0"   stopColor="#E5C266" stopOpacity="0.1" />
                <Stop offset="0.5" stopColor="#F0D585" stopOpacity="0.9" />
                <Stop offset="1"   stopColor="#E5C266" stopOpacity="0.1" />
              </LinearGradient>
            </Defs>

            {/* Main outer circle */}
            <Circle
              cx={0} cy={0} r={78}
              fill="none"
              stroke="url(#llzRing)"
              strokeWidth={1}
            />

            {/* Inner dashed circle */}
            <Circle
              cx={0} cy={0} r={68}
              fill="none"
              stroke="rgba(229,194,102,0.18)"
              strokeWidth={0.5}
              strokeDasharray="2 6"
            />

            {/* 12 zodiac tick marks */}
            {ticks.map((t, i) => (
              <Line
                key={i}
                x1={t.x1} y1={t.y1}
                x2={t.x2} y2={t.y2}
                stroke="#E5C266"
                strokeOpacity={t.isMajor ? 0.95 : 0.4}
                strokeWidth={t.isMajor ? 1.6 : 0.9}
                strokeLinecap="round"
              />
            ))}

            {/* Bright marker at top */}
            <Circle cx={0} cy={-78} r={2.2} fill="#F0D585" />
            <Circle cx={0} cy={-78} r={5}   fill="#E5C266" opacity={0.25} />
          </Svg>
        </Animated.View>

        {/* Inner ring — counter-rotates 14s */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: innerOff,
              left: innerOff,
              width: innerSize,
              height: innerSize,
            },
            innerStyle,
          ]}
        >
          <Svg
            width={innerSize}
            height={innerSize}
            viewBox="-100 -100 200 200"
          >
            <Circle
              cx={0} cy={0} r={50}
              fill="none"
              stroke="rgba(229,194,102,0.5)"
              strokeWidth={0.8}
              strokeDasharray="3 8"
            />
          </Svg>
        </Animated.View>

        {/* Center planet — fixed, no animation */}
        <View
          style={{
            position: 'absolute',
            top: centerOff,
            left: centerOff,
            width: centerSize,
            height: centerSize,
            overflow: 'visible',
          }}
        >
          {/* Glow: inset -40% → extends 40% beyond center on each side */}
          <Svg
            style={{ position: 'absolute', top: glowOff, left: glowOff }}
            width={glowSize}
            height={glowSize}
            viewBox="0 0 100 100"
          >
            <Defs>
              <RadialGradient id="llzGlow" cx="50%" cy="50%" r="50%">
                <Stop offset="0%"   stopColor="#E5C266" stopOpacity="0.35" />
                <Stop offset="65%"  stopColor="#E5C266" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Circle cx="50" cy="50" r="50" fill="url(#llzGlow)" />
          </Svg>

          {/* Center circle with radial gradient */}
          <Svg width={centerSize} height={centerSize} viewBox="0 0 100 100">
            <Defs>
              <RadialGradient id="llzCenter" cx="30%" cy="30%" r="70%">
                <Stop offset="0%"   stopColor="#FFF5D6" stopOpacity="1" />
                <Stop offset="50%"  stopColor="#E5C266" stopOpacity="1" />
                <Stop offset="100%" stopColor="#6B4F22" stopOpacity="1" />
              </RadialGradient>
            </Defs>
            <Circle cx="50" cy="50" r="50" fill="url(#llzCenter)" />
          </Svg>
        </View>

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
  auraContainer: {
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
