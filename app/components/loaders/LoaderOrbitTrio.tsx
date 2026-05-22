import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { MicroStars } from './MicroStars';

const COLORS = {
  gold: '#E5C266',
  goldDim: '#B89549',
  violet: '#9B5CFF',
  white: '#ECE5F7',
};

export interface LoaderOrbitTrioProps {
  size?: number;
  label?: string;
}

export function LoaderOrbitTrio({ size = 180, label = 'Calcul des transits…' }: LoaderOrbitTrioProps) {
  const auraBreath = useSharedValue(0);
  const coreBreath = useSharedValue(0);
  const rot1 = useSharedValue(0);
  const rot2 = useSharedValue(0);
  const rot3 = useSharedValue(0);

  useEffect(() => {
    // Aura breathing: 4.5s
    auraBreath.value = withRepeat(
      withTiming(1, { duration: 4500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    // Core breathing: 2.4s
    coreBreath.value = withRepeat(
      withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    // Orbit 1: 3.4s, normal direction
    rot1.value = withRepeat(
      withTiming(360, { duration: 3400, easing: Easing.linear }),
      -1,
      false,
    );
    // Orbit 2: 5.6s, reverse direction
    rot2.value = withRepeat(
      withTiming(-360, { duration: 5600, easing: Easing.linear }),
      -1,
      false,
    );
    // Orbit 3: 8.2s, normal direction
    rot3.value = withRepeat(
      withTiming(360, { duration: 8200, easing: Easing.linear }),
      -1,
      false,
    );
  }, []);

  const auraStyle = useAnimatedStyle(() => ({
    opacity: 0.7 + auraBreath.value * 0.3,
    transform: [{ scale: 0.98 + auraBreath.value * 0.06 }],
  }));

  const coreStyle = useAnimatedStyle(() => ({
    opacity: 0.7 + coreBreath.value * 0.3,
    transform: [{ scale: 0.98 + coreBreath.value * 0.06 }],
  }));

  const orbit1Style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rot1.value}deg` }],
  }));
  const orbit2Style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rot2.value}deg` }],
  }));
  const orbit3Style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rot3.value}deg` }],
  }));

  const half = size / 2;
  const coreSize = size * 0.16;
  const coreR = coreSize / 2;

  // Orbit radii: 20%, 31%, 42% of size
  const r1 = size * 0.20;
  const r2 = size * 0.31;
  const r3 = size * 0.42;

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: size, height: size }}>

        {/* Aura — radial gradient gold→violet, breathes at 4.5s */}
        <Animated.View
          style={[StyleSheet.absoluteFillObject, styles.auraContainer, auraStyle]}
          pointerEvents="none"
        >
          <Svg width={size * 0.8} height={size * 0.8} viewBox="0 0 100 100">
            <Defs>
              <RadialGradient id="lloAura" cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor="#E5C266" stopOpacity="0.32" />
                <Stop offset="40%" stopColor="#9B5CFF" stopOpacity="0.16" />
                <Stop offset="70%" stopColor="#9B5CFF" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Circle cx="50" cy="50" r="50" fill="url(#lloAura)" />
          </Svg>
        </Animated.View>

        {/* Orbit paths — three concentric faint circles */}
        <Svg
          style={StyleSheet.absoluteFillObject}
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
        >
          <Circle cx={half} cy={half} r={r1} fill="none" stroke="rgba(229,194,102,0.10)" strokeWidth={0.8} />
          <Circle cx={half} cy={half} r={r2} fill="none" stroke="rgba(229,194,102,0.08)" strokeWidth={0.8} />
          <Circle cx={half} cy={half} r={r3} fill="none" stroke="rgba(229,194,102,0.06)" strokeWidth={0.8} />
        </Svg>

        {/* Micro-stars decorative field */}
        <MicroStars seed={11} size={size} />

        {/* Orbit 1 — gold planet, 9px, 3.4s, forward */}
        <Animated.View style={[StyleSheet.absoluteFillObject, orbit1Style]}>
          <View
            style={[
              styles.planet,
              {
                top: half - 4.5,
                left: half - 4.5,
                width: 9,
                height: 9,
                borderRadius: 4.5,
                backgroundColor: COLORS.gold,
                transform: [{ translateX: r1 }],
                shadowColor: COLORS.gold,
                shadowOpacity: 0.9,
                shadowRadius: 5,
              },
            ]}
          />
        </Animated.View>

        {/* Orbit 2 — violet planet, 7px, 5.6s, reverse */}
        <Animated.View style={[StyleSheet.absoluteFillObject, orbit2Style]}>
          <View
            style={[
              styles.planet,
              {
                top: half - 3.5,
                left: half - 3.5,
                width: 7,
                height: 7,
                borderRadius: 3.5,
                backgroundColor: COLORS.violet,
                transform: [{ translateX: r2 }],
                shadowColor: COLORS.violet,
                shadowOpacity: 0.8,
                shadowRadius: 5,
              },
            ]}
          />
        </Animated.View>

        {/* Orbit 3 — white planet, 5px, 8.2s, forward */}
        <Animated.View style={[StyleSheet.absoluteFillObject, orbit3Style]}>
          <View
            style={[
              styles.planet,
              {
                top: half - 2.5,
                left: half - 2.5,
                width: 5,
                height: 5,
                borderRadius: 2.5,
                backgroundColor: COLORS.white,
                transform: [{ translateX: r3 }],
                shadowColor: '#FFFFFF',
                shadowOpacity: 0.9,
                shadowRadius: 4,
              },
            ]}
          />
        </Animated.View>

        {/* Core + flare — breathes at 2.4s */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: half - coreR,
              left: half - coreR,
              width: coreSize,
              height: coreSize,
              overflow: 'visible',
            },
            coreStyle,
          ]}
        >
          {/* Flare: inset: -60% → extends 60% beyond core on each side */}
          <Svg
            style={{
              position: 'absolute',
              top: -coreSize * 0.6,
              left: -coreSize * 0.6,
            }}
            width={coreSize * 2.2}
            height={coreSize * 2.2}
            viewBox="0 0 100 100"
          >
            <Defs>
              <RadialGradient id="lloFlare" cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor="#E5C266" stopOpacity="0.4" />
                <Stop offset="60%" stopColor="#E5C266" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Circle cx="50" cy="50" r="50" fill="url(#lloFlare)" />
          </Svg>

          {/* Core circle with radial gradient */}
          <Svg width={coreSize} height={coreSize} viewBox="0 0 100 100">
            <Defs>
              <RadialGradient id="lloCore" cx="35%" cy="35%" r="65%">
                <Stop offset="0%" stopColor="#FFF5D6" stopOpacity="1" />
                <Stop offset="55%" stopColor="#E5C266" stopOpacity="1" />
                <Stop offset="100%" stopColor="#B89549" stopOpacity="1" />
              </RadialGradient>
            </Defs>
            <Circle cx="50" cy="50" r="50" fill="url(#lloCore)" />
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
  auraContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  planet: {
    position: 'absolute',
    shadowOffset: { width: 0, height: 0 },
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
