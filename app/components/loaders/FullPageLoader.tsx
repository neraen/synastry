import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { LoaderOrbitTrio } from './LoaderOrbitTrio';
import { LoaderZodiac } from './LoaderZodiac';
import { LoaderSaturn } from './LoaderSaturn';
import { LoaderEclipse } from './LoaderEclipse';
import { LoaderLunarPhases } from './LoaderLunarPhases';

export type LoaderVariant = 'transit' | 'natal' | 'profile' | 'synastry' | 'default';

export interface FullPageLoaderProps {
  /** When this transitions from true → false, the exit animation plays then the component unmounts. */
  visible: boolean;
  variant?: LoaderVariant;
  /** Override the loader's default label. */
  label?: string;
  /** Optional hint text displayed below the loader. */
  hint?: string;
  /** Loader size in dp. Default 200. */
  size?: number;
  /** Called once the exit animation completes and the overlay is gone. */
  onTransitionEnd?: () => void;
}

/**
 * Full-screen overlay loader.
 *
 * Usage:
 *   return (
 *     <View style={{ flex: 1 }}>
 *       <MyScreenContent />
 *       <FullPageLoader visible={isLoading} variant="transit" />
 *     </View>
 *   );
 *
 * The overlay sits above content (absolute fill, zIndex 999).
 * When `visible` goes false it plays a 400 ms fade-out + scale-down then
 * removes itself from the tree — no lingering z-index block.
 */
export function FullPageLoader({
  visible,
  variant = 'default',
  label,
  hint,
  size = 200,
  onTransitionEnd,
}: FullPageLoaderProps) {
  const [shouldRender, setShouldRender] = useState(visible);
  const fadeAnim = useSharedValue(visible ? 1 : 0);

  // All hooks BEFORE any conditional return (React rules).
  const overlayStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ scale: 0.95 + fadeAnim.value * 0.05 }],
  }));

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      fadeAnim.value = 1;
    } else {
      fadeAnim.value = withTiming(0, {
        duration: 400,
        easing: Easing.out(Easing.cubic),
      }, (finished) => {
        if (finished) {
          runOnJS(setShouldRender)(false);
          if (onTransitionEnd) runOnJS(onTransitionEnd)();
        }
      });
    }
  }, [visible]);

  if (!shouldRender) return null;

  function renderLoader() {
    switch (variant) {
      case 'transit':  return <LoaderOrbitTrio  size={size} label={label ?? 'Calcul des transits…'} />;
      case 'natal':    return <LoaderZodiac      size={size} label={label ?? 'Tracé de la carte…'} />;
      case 'profile':  return <LoaderSaturn      size={size} label={label ?? 'Lecture du ciel…'} />;
      case 'synastry': return <LoaderEclipse     size={size} label={label ?? 'Conjonction en cours…'} />;
      default:         return <LoaderLunarPhases size={size} label={label ?? 'Alignement des phases…'} />;
    }
  }

  return (
    <Animated.View style={[styles.overlay, overlayStyle]} pointerEvents="box-none">
      {/* Opaque backdrop */}
      <View style={styles.backdrop} pointerEvents="none" />
      {/* Loader centred on top */}
      <View style={styles.centred} pointerEvents="none">
        {renderLoader()}
        {!!hint && (
          <Text style={styles.hint}>{hint}</Text>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#120A24',
  },
  centred: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 24,
  },
  hint: {
    fontSize: 14,
    lineHeight: 22,
    color: 'rgba(189, 178, 212, 0.8)',
    textAlign: 'center',
    fontFamily: 'Manrope_400Regular',
  },
});
