import { ThemeProvider, Theme } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

// Initialize i18n (must be imported before components that use translations)
import '@/i18n';

import { AuthProvider } from '@/contexts/AuthContext';
import { colors } from '@/theme';

export const unstable_settings = {
    anchor: '(tabs)',
};

// Custom dark theme matching our design system
const AstroMatchTheme: Theme = {
    dark: true,
    colors: {
        primary: colors.brand.primary,
        background: colors.background.primary,
        card: colors.background.secondary,
        text: colors.text.primary,
        border: colors.border.subtle,
        notification: colors.status.error,
    },
    fonts: {
        regular: {
            fontFamily: 'System',
            fontWeight: '400',
        },
        medium: {
            fontFamily: 'System',
            fontWeight: '500',
        },
        bold: {
            fontFamily: 'System',
            fontWeight: '700',
        },
        heavy: {
            fontFamily: 'System',
            fontWeight: '800',
        },
    },
};

export default function RootLayout() {
    return (
        <SafeAreaProvider>
            <AuthProvider>
                <ThemeProvider value={AstroMatchTheme}>
                    <Stack>
                        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                        <Stack.Screen name="login" options={{ headerShown: false, presentation: 'modal' }} />
                        <Stack.Screen name="signup" options={{ headerShown: false, presentation: 'modal' }} />
                        <Stack.Screen name="birth-profile" options={{ headerShown: false, presentation: 'modal' }} />
                        <Stack.Screen name="natal-chart" options={{ headerShown: false }} />
                        <Stack.Screen name="synastry" options={{ headerShown: false }} />
                        <Stack.Screen name="synastry-detail" options={{ headerShown: false }} />
                        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
                        {/* Legal Screens */}
                        <Stack.Screen name="privacy-policy" options={{ headerShown: false, presentation: 'modal' }} />
                        <Stack.Screen name="terms-of-service" options={{ headerShown: false, presentation: 'modal' }} />
                        <Stack.Screen name="legal-notice" options={{ headerShown: false, presentation: 'modal' }} />
                    </Stack>
                    <StatusBar style="light" />
                </ThemeProvider>
            </AuthProvider>
        </SafeAreaProvider>
    );
}
