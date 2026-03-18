/**
 * Screen - Premium screen wrapper component
 *
 * Handles SafeArea, gradient backgrounds, scroll behavior, and keyboard avoidance
 * Supports glassmorphism design system
 */

import React, { ReactNode } from 'react';
import {
    View,
    ScrollView,
    StyleSheet,
    ImageBackground,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    ViewStyle,
    ImageSourcePropType,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, gradients } from '@/theme';

type ScreenVariant = 'static' | 'scroll' | 'form';
type BackgroundVariant = 'solid' | 'gradient' | 'cosmic' | 'aurora';

interface ScreenProps {
    children: ReactNode;
    variant?: ScreenVariant;
    backgroundImage?: ImageSourcePropType;
    backgroundVariant?: BackgroundVariant;
    backgroundColor?: string;
    gradientColors?: readonly string[];
    edges?: ('top' | 'bottom' | 'left' | 'right')[];
    style?: ViewStyle;
    contentStyle?: ViewStyle;
    noPadding?: boolean;
    statusBarStyle?: 'light-content' | 'dark-content';
    showStars?: boolean;
}

const BACKGROUND_GRADIENTS = {
    solid: [colors.background.primary, colors.background.primary],
    gradient: [colors.background.primary, colors.background.secondary],
    cosmic: ['#0F0B1F', '#1A1333', '#251D47'],
    aurora: ['#0F0B1F', '#1E1B4B', '#312E81'],
};

export function Screen({
    children,
    variant = 'scroll',
    backgroundImage,
    backgroundVariant = 'cosmic',
    backgroundColor,
    gradientColors,
    edges = ['top', 'bottom'],
    style,
    contentStyle,
    noPadding = false,
    statusBarStyle = 'light-content',
    showStars = false,
}: ScreenProps) {
    const insets = useSafeAreaInsets();

    const contentContainerStyle: ViewStyle = {
        flexGrow: 1,
        paddingHorizontal: noPadding ? 0 : spacing.screenPadding,
        paddingBottom: spacing.bottomSafeSpacing,
        ...contentStyle,
    };

    const renderContent = () => {
        switch (variant) {
            case 'static':
                return (
                    <View style={[styles.staticContent, contentContainerStyle]}>
                        {children}
                    </View>
                );

            case 'form':
                return (
                    <KeyboardAvoidingView
                        style={styles.flex}
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                    >
                        <ScrollView
                            style={styles.flex}
                            contentContainerStyle={contentContainerStyle}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            bounces={true}
                        >
                            {children}
                        </ScrollView>
                    </KeyboardAvoidingView>
                );

            case 'scroll':
            default:
                return (
                    <ScrollView
                        style={styles.flex}
                        contentContainerStyle={contentContainerStyle}
                        showsVerticalScrollIndicator={false}
                        bounces={true}
                    >
                        {children}
                    </ScrollView>
                );
        }
    };

    // Determine gradient colors
    const bgGradient = gradientColors || BACKGROUND_GRADIENTS[backgroundVariant];

    const screenContent = (
        <SafeAreaView style={[styles.flex, style]} edges={edges}>
            <StatusBar barStyle={statusBarStyle} />
            {renderContent()}
        </SafeAreaView>
    );

    // With background image
    if (backgroundImage) {
        return (
            <View style={styles.flex}>
                <ImageBackground
                    source={backgroundImage}
                    style={styles.backgroundImage}
                    resizeMode="cover"
                >
                    {/* Overlay for better text readability */}
                    <View style={styles.imageOverlay} />
                    {screenContent}
                </ImageBackground>
            </View>
        );
    }

    // With solid color
    if (backgroundColor) {
        return (
            <View style={[styles.flex, { backgroundColor }]}>
                {screenContent}
            </View>
        );
    }

    // With gradient background (default)
    return (
        <View style={styles.flex}>
            <LinearGradient
                colors={bgGradient as [string, string, ...string[]]}
                style={styles.gradient}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
            >
                {/* Ambient glow effects */}
                <View style={styles.glowTopRight} />
                <View style={styles.glowBottomLeft} />

                {screenContent}
            </LinearGradient>
        </View>
    );
}

// Screen header component for consistent headers
interface ScreenHeaderProps {
    title?: string;
    subtitle?: string;
    leftAction?: ReactNode;
    rightAction?: ReactNode;
    style?: ViewStyle;
}

export function ScreenHeader({
    title,
    subtitle,
    leftAction,
    rightAction,
    style,
}: ScreenHeaderProps) {
    return (
        <View style={[styles.header, style]}>
            <View style={styles.headerLeft}>
                {leftAction}
            </View>
            <View style={styles.headerCenter}>
                {/* Title and subtitle would go here */}
            </View>
            <View style={styles.headerRight}>
                {rightAction}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
    gradient: {
        flex: 1,
    },
    backgroundImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    imageOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(15, 11, 31, 0.3)',
    },
    staticContent: {
        flex: 1,
    },
    // Ambient glow effects
    glowTopRight: {
        position: 'absolute',
        top: -100,
        right: -100,
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: 'rgba(147, 51, 234, 0.15)',
    },
    glowBottomLeft: {
        position: 'absolute',
        bottom: -50,
        left: -100,
        width: 250,
        height: 250,
        borderRadius: 125,
        backgroundColor: 'rgba(236, 72, 153, 0.1)',
    },
    // Header styles
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
    },
    headerLeft: {
        width: 48,
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    headerRight: {
        width: 48,
        alignItems: 'flex-end',
    },
});

export default Screen;
