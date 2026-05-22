import React, { useEffect } from 'react';
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
  Ellipse,
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

export interface LoaderSaturnProps {
  size?: number;
  label?: string;
}

export function LoaderSaturn({ size = 180, label = 'Lecture du ciel…' }: LoaderSaturnProps) {
  const ringRot  = useSharedValue(0);
  const moonRot  = useSharedValue(0);
  const breath   = useSharedValue(0);

  useEffect(() => {
    // Ring SVG spins 8s
    ringRot.value = withRepeat(
      withTiming(360, { duration: 8000, easing: Easing.linear }),
      -1,
      false,
    );
    // Moon orbits 4.5s
    moonRot.value = withRepeat(
      withTiming(360, { duration: 4500, easing: Easing.linear }),
      -1,
      false,
    );
    // Aura breathing 4.5s
    breath.value = withRepeat(
      withTiming(1, { duration: 4500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, []);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${ringRot.value}deg` }],
  }));
  const moonStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${moonRot.value}deg` }],
  }));
  const auraStyle = useAnimatedStyle(() => ({
    opacity: 0.7 + breath.value * 0.3,
    transform: [{ scale: 0.98 + breath.value * 0.06 }],
  }));

  const half       = size / 2;
  const planetSize = size * 0.42;
  const planetOff  = (size - planetSize) / 2;
  const tiltSize   = size * 0.95;
  const tiltOff    = (size - tiltSize) / 2;
  const tiltHalf   = tiltSize / 2;
  const moonOffset = size * 0.43;

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
              <RadialGradient id="llsaAura" cx="50%" cy="50%" r="50%">
                <Stop offset="0%"   stopColor="#E5C266" stopOpacity="0.30" />
                <Stop offset="45%"  stopColor="#9B5CFF" stopOpacity="0.18" />
                <Stop offset="70%"  stopColor="#9B5CFF" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Circle cx="50" cy="50" r="50" fill="url(#llsaAura)" />
          </Svg>
        </Animated.View>

        {/* Micro-stars — seed=3 */}
        <MicroStars seed={3} size={size} />

        {/* Planet — 42% of size, z-order: rendered before ring */}
        <View
          style={{
            position: 'absolute',
            top: planetOff,
            left: planetOff,
            width: planetSize,
            height: planetSize,
          }}
        >
          <Svg width={planetSize} height={planetSize} viewBox="0 0 100 100">
            <Defs>
              {/* Base gold radial gradient, focal at top-left */}
              <RadialGradient id="llsaPlanet" cx="30%" cy="30%" r="70%">
                <Stop offset="0%"   stopColor="#F4DC95" stopOpacity="1" />
                <Stop offset="35%"  stopColor="#E5C266" stopOpacity="1" />
                <Stop offset="65%"  stopColor="#B89549" stopOpacity="1" />
                <Stop offset="100%" stopColor="#6B4F22" stopOpacity="1" />
              </RadialGradient>
              {/* Shading overlay: dark bottom-right */}
              <RadialGradient id="llsaShading" cx="70%" cy="70%" r="55%">
                <Stop offset="0%"   stopColor="#28140a" stopOpacity="0.55" />
                <Stop offset="100%" stopColor="#28140a" stopOpacity="0" />
              </RadialGradient>
              {/* Terminator: linear gradient 115° — transparent → dark purple */}
              {/* SVG coords for 115°: (sin115°≈0.906, cos115°≈-0.423) */}
              <LinearGradient id="llsaTerm" x1="4.7%" y1="28.9%" x2="95.3%" y2="71.2%">
                <Stop offset="50%" stopColor="#120A24" stopOpacity="0" />
                <Stop offset="95%" stopColor="#120A24" stopOpacity="0.50" />
              </LinearGradient>
              {/* Highlight: small bright ellipse top-left */}
              <RadialGradient id="llsaHi" cx="50%" cy="50%" r="50%">
                <Stop offset="0%"   stopColor="#FFF3D2" stopOpacity="0.6" />
                <Stop offset="70%"  stopColor="#FFF3D2" stopOpacity="0" />
              </RadialGradient>
            </Defs>

            {/* Planet body */}
            <Circle cx="50" cy="50" r="50" fill="url(#llsaPlanet)" />
            {/* Shadow overlay */}
            <Circle cx="50" cy="50" r="50" fill="url(#llsaShading)" />
            {/* Terminator overlay */}
            <Circle cx="50" cy="50" r="50" fill="url(#llsaTerm)" />
            {/* Highlight: top=14%, left=22%, width=22%, height=14% → cx=33 cy=21 rx=11 ry=7 */}
            <Ellipse cx="33" cy="21" rx="11" ry="7" fill="url(#llsaHi)" />
          </Svg>
        </View>

        {/* Ring tilt — 95% of size, STATIC -18deg, on top of planet */}
        <View
          style={{
            position: 'absolute',
            top: tiltOff,
            left: tiltOff,
            width: tiltSize,
            height: tiltSize,
            transform: [{ rotateZ: '-18deg' }],
          }}
        >
          {/* Ring SVG — spins 8s inside the tilt */}
          <Animated.View style={[{ width: tiltSize, height: tiltSize }, ringStyle]}>
            <Svg width={tiltSize} height={tiltSize} viewBox="0 0 200 200">
              <Defs>
                {/* Outer ring stroke gradient */}
                <LinearGradient id="llsaRing" x1="0" y1="0.5" x2="1" y2="0.5">
                  <Stop offset="0"   stopColor="#E5C266" stopOpacity="0.15" />
                  <Stop offset="0.5" stopColor="#F0D585" stopOpacity="0.95" />
                  <Stop offset="1"   stopColor="#E5C266" stopOpacity="0.15" />
                </LinearGradient>
                {/* Inner ring stroke gradient */}
                <LinearGradient id="llsaRingInner" x1="0" y1="0.5" x2="1" y2="0.5">
                  <Stop offset="0"   stopColor="#E5C266" stopOpacity="0" />
                  <Stop offset="0.5" stopColor="#B89549" stopOpacity="0.6" />
                  <Stop offset="1"   stopColor="#E5C266" stopOpacity="0" />
                </LinearGradient>
              </Defs>
              <Ellipse
                cx="100" cy="100" rx="86" ry="22"
                fill="none"
                stroke="url(#llsaRing)"
                strokeWidth="1.5"
              />
              <Ellipse
                cx="100" cy="100" rx="76" ry="17"
                fill="none"
                stroke="url(#llsaRingInner)"
                strokeWidth="1"
              />
            </Svg>
          </Animated.View>

          {/* Moon orbit — spins 4.5s, also inside the tilt */}
          <Animated.View
            style={[
              {
                position: 'absolute',
                top: 0,
                left: 0,
                width: tiltSize,
                height: tiltSize,
              },
              moonStyle,
            ]}
          >
            {/* Moon glow halo */}
            <View
              style={{
                position: 'absolute',
                top: tiltHalf - 10,
                left: tiltHalf - 10,
                width: 20,
                height: 20,
                borderRadius: 10,
                transform: [{ translateX: moonOffset }],
              }}
            >
              <Svg width={20} height={20} viewBox="0 0 100 100">
                <Defs>
                  <RadialGradient id="llsaMoonGlow" cx="50%" cy="50%" r="50%">
                    <Stop offset="0%"   stopColor="#E5C266" stopOpacity="0.85" />
                    <Stop offset="50%"  stopColor="#E5C266" stopOpacity="0.3" />
                    <Stop offset="100%" stopColor="#E5C266" stopOpacity="0" />
                  </RadialGradient>
                </Defs>
                <Circle cx="50" cy="50" r="50" fill="url(#llsaMoonGlow)" />
              </Svg>
            </View>

            {/* Moon body */}
            <View
              style={{
                position: 'absolute',
                top: tiltHalf - 5,
                left: tiltHalf - 5,
                width: 10,
                height: 10,
                borderRadius: 5,
                transform: [{ translateX: moonOffset }],
                shadowColor: '#E5C266',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.85,
                shadowRadius: 5,
              }}
            >
              <Svg width={10} height={10} viewBox="0 0 100 100">
                <Defs>
                  <RadialGradient id="llsaMoon" cx="30%" cy="30%" r="70%">
                    <Stop offset="0%"   stopColor="#FFF5D6" stopOpacity="1" />
                    <Stop offset="60%"  stopColor="#E5C266" stopOpacity="1" />
                    <Stop offset="100%" stopColor="#B89549" stopOpacity="1" />
                  </RadialGradient>
                </Defs>
                <Circle cx="50" cy="50" r="50" fill="url(#llsaMoon)" />
              </Svg>
            </View>
          </Animated.View>
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
