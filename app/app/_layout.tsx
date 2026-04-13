import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { ThemeProvider, Theme } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';
import { configurePurchases, identifyPurchasesUser, resetPurchasesUser } from '@/services/purchases';
import { initApiConfig } from '@/services/apiConfig';
import { initAiModelConfig } from '@/services/aiModelConfig';

// Fonts
import {
    useFonts as useNotoSerif,
    NotoSerif_400Regular,
    NotoSerif_500Medium,
    NotoSerif_600SemiBold,
    NotoSerif_700Bold,
} from '@expo-google-fonts/noto-serif';
import {
    useFonts as useEBGaramond,
    EBGaramond_400Regular,
    EBGaramond_500Medium,
    EBGaramond_500Medium_Italic,
    EBGaramond_600SemiBold,
    EBGaramond_700Bold,
} from '@expo-google-fonts/eb-garamond';
import {
    useFonts as useManrope,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
} from '@expo-google-fonts/manrope';

// Initialize i18n (must be imported before components that use translations)
import '@/i18n';

import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { colors } from '@/theme';

// Keep splash screen visible while fonts load
SplashScreen.preventAutoHideAsync();

// Initialize RevenueCat immediately at module load (before any component renders)
// so that identifyPurchasesUser() is never called before configure().
configurePurchases();

// ─── RevenueCat initializer ───────────────────────────────────────────────────
// Placed inside AuthProvider so it can access the user context.
function PurchasesInitializer() {
    const { user } = useAuth();
    useEffect(() => {
        if (user?.id) {
            identifyPurchasesUser(String(user.id));
        } else {
            resetPurchasesUser();
        }
    }, [user?.id]);
    return null;
}

export const unstable_settings = {
    anchor: '(tabs)',
};

// Custom dark theme matching our design system
const LunestiaTheme: Theme = {
    dark: true,
    colors: {
        primary: colors.primary,
        background: colors.surface.default,
        card: colors.surfaceContainer,
        text: colors.onSurface,
        border: colors.outline,
        notification: colors.error,
    },
    fonts: {
        regular: {
            fontFamily: 'EBGaramond_400Regular',
            fontWeight: '400',
        },
        medium: {
            fontFamily: 'EBGaramond_500Medium',
            fontWeight: '500',
        },
        bold: {
            fontFamily: 'EBGaramond_700Bold',
            fontWeight: '700',
        },
        heavy: {
            fontFamily: 'EBGaramond_700Bold',
            fontWeight: '700',
        },
    },
};

// Font loading screen
function FontLoadingScreen() {
    return (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
        </View>
    );
}

export default function RootLayout() {
    // Load Noto Serif fonts (display/headlines)
    const [notoSerifLoaded, notoSerifError] = useNotoSerif({
        NotoSerif_400Regular,
        NotoSerif_500Medium,
        NotoSerif_600SemiBold,
        NotoSerif_700Bold,
    });

    // Load EB Garamond fonts (body/reading text)
    const [garamondLoaded, garamondError] = useEBGaramond({
        EBGaramond_400Regular,
        EBGaramond_500Medium,
        EBGaramond_500Medium_Italic,
        EBGaramond_600SemiBold,
        EBGaramond_700Bold,
    });

    // Load Manrope fonts (buttons/labels/UI)
    const [manropeLoaded, manropeError] = useManrope({
        Manrope_400Regular,
        Manrope_500Medium,
        Manrope_600SemiBold,
        Manrope_700Bold,
    });

    const fontsLoaded = notoSerifLoaded && garamondLoaded && manropeLoaded;
    const fontError = notoSerifError || garamondError || manropeError;

    // Initialize API config once at startup
    useEffect(() => {
        initApiConfig();
        initAiModelConfig();

        // Catch unhandled promise rejections so they don't silently crash the app
        const handler = (event: { reason?: unknown }) => {
            console.error('[UnhandledRejection]', event.reason);
        };
        // @ts-ignore
        if (typeof global !== 'undefined') {
            // @ts-ignore
            global.ErrorUtils?.setGlobalHandler?.((error: Error, isFatal: boolean) => {
                console.error('[GlobalError]', isFatal ? 'FATAL' : 'non-fatal', error?.message, error?.stack);
            });
        }
        return () => {};
    }, []);

    useEffect(() => {
        if (fontsLoaded || fontError) {
            SplashScreen.hideAsync();
        }
    }, [fontsLoaded, fontError]);

    // Show loading screen while fonts are loading
    if (!fontsLoaded && !fontError) {
        return <FontLoadingScreen />;
    }

    return (
        <ErrorBoundary>
        <SafeAreaProvider>
            <AuthProvider>
                <PurchasesInitializer />
                <ThemeProvider value={LunestiaTheme}>
                    <Stack>
                        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                        <Stack.Screen name="demo" options={{ headerShown: false }} />
                        <Stack.Screen name="login" options={{ headerShown: false, presentation: 'modal' }} />
                        <Stack.Screen name="signup" options={{ headerShown: false, presentation: 'modal' }} />
                        <Stack.Screen name="birth-profile" options={{ headerShown: false, presentation: 'modal' }} />
                        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
                        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
                        <Stack.Screen name="premium" options={{ headerShown: false, presentation: 'modal' }} />
                        {/* Legal Screens */}
                        <Stack.Screen name="privacy-policy" options={{ headerShown: false, presentation: 'modal' }} />
                        <Stack.Screen name="terms-of-service" options={{ headerShown: false, presentation: 'modal' }} />
                        <Stack.Screen name="legal-notice" options={{ headerShown: false, presentation: 'modal' }} />
                    </Stack>
                    <StatusBar style="light" />
                </ThemeProvider>
            </AuthProvider>
        </SafeAreaProvider>
        </ErrorBoundary>
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        backgroundColor: colors.surface.default,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
