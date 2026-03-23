/**
 * NavBar
 * Floating pill-shaped bottom navigation bar.
 */

import React, { memo, useRef, useEffect } from 'react';
import { View, Pressable, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, radius, shadows } from '@/theme';

type Tab = 'home' | 'matches' | 'insights' | 'profile';

interface NavBarProps {
    activeTab: Tab;
    onTabPress: (tab: Tab) => void;
}

interface TabConfig {
    key: Tab;
    icon: keyof typeof Feather.glyphMap;
}

const tabs: TabConfig[] = [
    { key: 'home', icon: 'moon' },
    { key: 'matches', icon: 'heart' },
    { key: 'insights', icon: 'trending-up' },
    { key: 'profile', icon: 'user' },
];

const NavTab = memo(function NavTab({
    tab,
    isActive,
    onPress,
}: {
    tab: TabConfig;
    isActive: boolean;
    onPress: () => void;
}) {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.spring(scaleAnim, {
            toValue: isActive ? 1.1 : 1,
            useNativeDriver: true,
            speed: 20,
            bounciness: 6,
        }).start();
    }, [isActive, scaleAnim]);

    return (
        <Pressable onPress={onPress} style={styles.tab}>
            <Animated.View
                style={[
                    styles.tabContent,
                    isActive && styles.tabContentActive,
                    { transform: [{ scale: scaleAnim }] },
                ]}
            >
                <Feather
                    name={tab.icon}
                    size={20}
                    color={isActive ? colors.primary : colors.onSurfaceMuted}
                />
            </Animated.View>
        </Pressable>
    );
});

export const NavBar = memo(function NavBar({
    activeTab,
    onTabPress,
}: NavBarProps) {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.wrapper, { paddingBottom: insets.bottom || spacing.lg }]}>
            <View style={styles.pill}>
                <View style={styles.pillOverlay} />
                {tabs.map((tab) => (
                    <NavTab
                        key={tab.key}
                        tab={tab}
                        isActive={activeTab === tab.key}
                        onPress={() => onTabPress(tab.key)}
                    />
                ))}
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        pointerEvents: 'box-none',
    },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 64,
        paddingHorizontal: spacing.sm,
        borderRadius: radius.full,
        overflow: 'hidden',
        ...shadows.ambientGlow,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 12,
    },
    pillOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(47, 36, 68, 0.75)',
    },
    tab: {
        width: 64,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabContent: {
        width: 40,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.full,
    },
    tabContentActive: {
        backgroundColor: 'rgba(233, 195, 73, 0.12)',
    },
});

export default NavBar;
