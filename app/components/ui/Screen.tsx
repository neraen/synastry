/**
 * Screen - Main screen wrapper component
 *
 * Handles SafeArea, backgrounds, scroll behavior, and keyboard avoidance
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '@/theme';

type ScreenVariant = 'static' | 'scroll' | 'form';

interface ScreenProps {
    children: ReactNode;
    variant?: ScreenVariant;
    backgroundImage?: ImageSourcePropType;
    backgroundColor?: string;
    edges?: ('top' | 'bottom' | 'left' | 'right')[];
    style?: ViewStyle;
    contentStyle?: ViewStyle;
    noPadding?: boolean;
    statusBarStyle?: 'light-content' | 'dark-content';
}

export function Screen({
    children,
    variant = 'scroll',
    backgroundImage,
    backgroundColor = colors.background.primary,
    edges = ['top', 'bottom'],
    style,
    contentStyle,
    noPadding = false,
    statusBarStyle = 'light-content',
}: ScreenProps) {
    const insets = useSafeAreaInsets();

    const containerStyle: ViewStyle = {
        flex: 1,
        backgroundColor,
    };

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

    const screenContent = (
        <SafeAreaView style={[containerStyle, style]} edges={edges}>
            <StatusBar barStyle={statusBarStyle} />
            {renderContent()}
        </SafeAreaView>
    );

    if (backgroundImage) {
        return (
            <View style={styles.flex}>
                <ImageBackground
                    source={backgroundImage}
                    style={styles.backgroundImage}
                    resizeMode="cover"
                >
                    {screenContent}
                </ImageBackground>
            </View>
        );
    }

    return screenContent;
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
    backgroundImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    staticContent: {
        flex: 1,
    },
});

export default Screen;
