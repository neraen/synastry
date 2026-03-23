import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { ThemeProvider, Theme } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';
import { configurePurchases, identifyPurchasesUser, resetPurchasesUser } from '@/services/purchases';

// Fonts
import {
    useFonts as useNotoSerif,
    NotoSerif_400Regular,
    NotoSerif_500Medium,
    NotoSerif_600SemiBold,
    NotoSerif_700Bold,
} from '@expo-google-fonts/noto-serif';
import {
    useFonts as useManrope,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';

// Initialize i18n (must be imported before components that use translations)
import '@/i18n';

import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { colors } from '@/theme';

// Keep splash screen visible while fonts load
SplashScreen.preventAutoHideAsync();

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
const AstroMatchTheme: Theme = {
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
            fontFamily: 'Manrope_400Regular',
            fontWeight: '400',
        },
        medium: {
            fontFamily: 'Manrope_500Medium',
            fontWeight: '500',
        },
        bold: {
            fontFamily: 'Manrope_700Bold',
            fontWeight: '700',
        },
        heavy: {
            fontFamily: 'Manrope_800ExtraBold',
            fontWeight: '800',
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

    // Load Manrope fonts (body/UI text)
    const [manropeLoaded, manropeError] = useManrope({
        Manrope_400Regular,
        Manrope_500Medium,
        Manrope_600SemiBold,
        Manrope_700Bold,
        Manrope_800ExtraBold,
    });

    const fontsLoaded = notoSerifLoaded && manropeLoaded;
    const fontError = notoSerifError || manropeError;

    // Initialize RevenueCat once at startup
    useEffect(() => { configurePurchases(); }, []);

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
        <SafeAreaProvider>
            <AuthProvider>
                <PurchasesInitializer />
                <ThemeProvider value={AstroMatchTheme}>
                    <Stack>
                        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                        <Stack.Screen name="demo" options={{ headerShown: false }} />
                        <Stack.Screen name="login" options={{ headerShown: false, presentation: 'modal' }} />
                        <Stack.Screen name="signup" options={{ headerShown: false, presentation: 'modal' }} />
                        <Stack.Screen name="birth-profile" options={{ headerShown: false, presentation: 'modal' }} />
<Stack.Screen name="synastry" options={{ headerShown: false }} />
                        <Stack.Screen name="synastry-detail" options={{ headerShown: false }} />
                        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
                        <Stack.Screen name="premium" options={{ headerShown: false, presentation: 'modal' }} />
                        <Stack.Screen name="transits" options={{ headerShown: false }} />
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

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        backgroundColor: colors.surface.default,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
