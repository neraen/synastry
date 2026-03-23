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
                    backgroundColor: 'transparent',
                    shadowColor: colors.primary,
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: 0.1,
                    shadowRadius: 16,
                    elevation: 12,
                },
                tabBarItemStyle: {
                    height: 64,
                    paddingVertical: 0,
                    alignItems: 'center',
                    justifyContent: 'center',
                },
            }}
        >
            <Tabs.Screen name="index" options={{ href: null }} />
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
                name="history"
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabIcon name="clock" focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabIcon name="user" focused={focused} />
                    ),
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    pillOverlay: {
        backgroundColor: 'rgba(47, 36, 68, 0.95)',
    },
    iconWrapper: {
        width: 40,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.full,
    },
    iconWrapperActive: {
        backgroundColor: 'rgba(233, 195, 73, 0.12)',
    },
});
