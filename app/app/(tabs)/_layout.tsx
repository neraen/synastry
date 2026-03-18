import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { View, StyleSheet, Platform, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { colors, spacing, typography } from '@/theme';

export default function TabsLayout() {
    const insets = useSafeAreaInsets();
    const { isAuthenticated, isLoading } = useAuth();

    // Redirect to login if not authenticated
    if (!isLoading && !isAuthenticated) {
        return <Redirect href="/login" />;
    }

    // Calculate tab bar height with safe area
    const tabBarHeight = Platform.select({
        ios: 60 + insets.bottom,
        android: 64 + Math.max(insets.bottom, 8),
        default: 64,
    });

    const tabBarPaddingBottom = Platform.select({
        ios: insets.bottom > 0 ? insets.bottom : 8,
        android: Math.max(insets.bottom, 12),
        default: 8,
    });

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: colors.surface.elevated,
                    borderTopWidth: 1,
                    borderTopColor: colors.border.subtle,
                    height: tabBarHeight,
                    paddingBottom: tabBarPaddingBottom,
                    paddingTop: 8,
                    paddingHorizontal: spacing.sm,
                    // Shadow for iOS
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                    // Elevation for Android
                    elevation: 10,
                },
                tabBarActiveTintColor: colors.brand.primary,
                tabBarInactiveTintColor: colors.text.muted,
                tabBarLabelStyle: {
                    ...typography.caption,
                    fontSize: 11,
                    fontWeight: '500',
                    marginTop: 2,
                },
                tabBarItemStyle: {
                    paddingVertical: 4,
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    href: null, // Hide from tab bar, we'll use profile instead
                }}
            />
            <Tabs.Screen
                name="explore"
                options={{
                    href: null, // Hide explore tab
                }}
            />
            <Tabs.Screen
                name="daily-horoscope"
                options={{
                    title: 'Horoscope',
                    tabBarIcon: ({ focused }) => (
                        <Text style={[styles.tabEmoji, focused && styles.tabEmojiFocused]}>
                            🌟
                        </Text>
                    ),
                }}
            />
            <Tabs.Screen
                name="horoscope"
                options={{
                    title: 'Thème',
                    tabBarIcon: ({ focused }) => (
                        <Text style={[styles.tabEmoji, focused && styles.tabEmojiFocused]}>
                            🔮
                        </Text>
                    ),
                }}
            />
            <Tabs.Screen
                name="compatibility"
                options={{
                    title: 'Compatibilité',
                    tabBarIcon: ({ focused }) => (
                        <Text style={[styles.tabEmoji, focused && styles.tabEmojiFocused]}>
                            💕
                        </Text>
                    ),
                }}
            />
            <Tabs.Screen
                name="history"
                options={{
                    title: 'Historique',
                    tabBarIcon: ({ focused }) => (
                        <Text style={[styles.tabEmoji, focused && styles.tabEmojiFocused]}>
                            📜
                        </Text>
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profil',
                    tabBarIcon: ({ focused }) => (
                        <Text style={[styles.tabEmoji, focused && styles.tabEmojiFocused]}>
                            👤
                        </Text>
                    ),
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    tabEmoji: {
        fontSize: 24,
        lineHeight: 32,
        textAlign: 'center',
        opacity: 0.7,
        includeFontPadding: false,
    },
    tabEmojiFocused: {
        fontSize: 26,
        lineHeight: 34,
        opacity: 1,
        transform: [{ scale: 1.05 }],
    },
});
