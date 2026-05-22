import React, { useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

// Deterministic pseudo-random number generator (mulberry32)
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface TwinkleStarProps {
  cx: number;
  cy: number;
  r: number;
  delay: number;
}

function TwinkleStar({ cx, cy, r, delay }: TwinkleStarProps) {
  const opacity = useSharedValue(0.15);

  useEffect(() => {
    opacity.value = withDelay(
      delay * 1000,
      withRepeat(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      ),
    );
  }, []);

  const animatedProps = useAnimatedProps(() => ({
    opacity: opacity.value,
  }));

  return <AnimatedCircle cx={cx} cy={cy} r={r} fill="#fff" animatedProps={animatedProps} />;
}

export interface MicroStarsProps {
  count?: number;
  seed?: number;
  size: number;
}

export function MicroStars({ count = 14, seed = 1, size }: MicroStarsProps) {
  const stars = useMemo(() => {
    const rng = mulberry32(seed * 9301 + 49297);
    return Array.from({ length: count }, () => {
      const r = Math.sqrt(rng()) * (size / 2 - 6) + 4;
      const a = rng() * Math.PI * 2;
      return {
        x: Math.cos(a) * r + size / 2,
        y: Math.sin(a) * r + size / 2,
        s: rng() * 1.4 + 0.5,
        d: rng() * 3,
      };
    });
  }, [count, seed, size]);

  return (
    <Svg
      style={StyleSheet.absoluteFillObject}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
    >
      {stars.map((star, i) => (
        <TwinkleStar key={i} cx={star.x} cy={star.y} r={star.s} delay={star.d} />
      ))}
    </Svg>
  );
}
