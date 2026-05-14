import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts as useSerif,
  DMSerifDisplay_400Regular,
} from '@expo-google-fonts/dm-serif-display';
import {
  useFonts as useSans,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';

import { ThemeAstralScreen } from './src/screens/ThemeAstralScreen';
import { tokens } from './src/theme/tokens';

export default function App() {
  const [serifLoaded] = useSerif({ DMSerifDisplay_400Regular });
  const [sansLoaded]  = useSans({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  if (!serifLoaded || !sansLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.color.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={tokens.color.gold} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <ThemeAstralScreen />
    </SafeAreaProvider>
  );
}
