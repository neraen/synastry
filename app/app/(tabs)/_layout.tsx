import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { colors, radius } from '@/theme';

function TabBarBackground() {
    return <View style={[StyleSheet.absoluteFill, styles.pillOverlay]} />;
}

function TabIcon({
    name,
    focused,
}: {
    name: keyof typeof Feather.glyphMap;
    focused: boolean;
}) {
    return (
        <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
            <Feather
                name={name}
                size={20}
                color={focused ? colors.primary : colors.onSurfaceMuted}
            />
        </View>
    );
}

export default function TabsLayout() {
    const insets = useSafeAreaInsets();
    const { isAuthenticated, isLoading } = useAuth();

    if (!isLoading && !isAuthenticated) {
        return <Redirect href="/login" />;
    }

    const tabBarHeight = 64 + (insets.bottom || 0);

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarShowLabel: false,
                tabBarBackground: () => <TabBarBackground />,
                tabBarStyle: {
                    height: tabBarHeight,
                    borderTopWidth: 0,
                    backgroundColor: 'rgba(28, 20, 46, 0.98)',
                    shadowColor: colors.primary,
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: 0.1,
                    shadowRadius: 16,
                    elevation: 12,
                },
                tabBarItemStyle: {
                    height: tabBarHeight,
                    paddingBottom: insets.bottom,
                    paddingTop: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                },
            }}
        >
            <Tabs.Screen name="index" options={{ href: null, headerShown: false }} />
            <Tabs.Screen name="explore" options={{ href: null }} />
            <Tabs.Screen
                name="daily-horoscope"
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabIcon name="sun" focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="horoscope"
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabIcon name="star" focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="compatibility"
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabIcon name="heart" focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="chat"
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabIcon name="message-circle" focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="transits"
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabIcon name="zap" focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen name="mirror" options={{ href: null }} />
            <Tabs.Screen name="history" options={{ href: null }} />
            <Tabs.Screen name="profile" options={{ href: null }} />
            <Tabs.Screen name="compatibility-result" options={{ href: null }} />
            <Tabs.Screen name="compatibility-result-v2" options={{ href: null }} />
            <Tabs.Screen name="partner-chart" options={{ href: null }} />
            <Tabs.Screen name="chat-history" options={{ href: null }} />
            <Tabs.Screen name="notification-preferences" options={{ href: null }} />
            <Tabs.Screen name="help" options={{ href: null }} />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    pillOverlay: {
        backgroundColor: 'rgba(28, 20, 46, 0.98)',
    },
    iconWrapper: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 18,
    },
    iconWrapperActive: {
        backgroundColor: 'rgba(233, 195, 73, 0.12)',
    },
});
