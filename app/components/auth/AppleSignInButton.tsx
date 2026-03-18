/**
 * Apple Sign-In Button Component
 * Uses the native AppleAuthenticationButton on iOS
 *
 * Gracefully handles the case when native modules are not available.
 */

import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useAppleAuth } from '@/hooks/useAppleAuth';
import { User } from '@/services/auth';
import { layout, borderRadius } from '@/theme';

// Dynamically import Apple Authentication
let AppleAuthentication: typeof import('expo-apple-authentication') | null = null;
let modulesAvailable = false;

try {
    AppleAuthentication = require('expo-apple-authentication');
    modulesAvailable = true;
} catch (e) {
    console.warn('expo-apple-authentication not available:', e);
}

interface AppleSignInButtonProps {
    onSuccess?: (user: User) => void;
    onError?: (error: string) => void;
    disabled?: boolean;
}

export function AppleSignInButton({
    onSuccess,
    onError,
    disabled = false,
}: AppleSignInButtonProps) {
    const { signIn, isLoading, isAvailable } = useAppleAuth({
        onSuccess,
        onError,
    });

    // Don't render on non-iOS platforms, if not available, or if modules aren't loaded
    if (Platform.OS !== 'ios' || !isAvailable || !modulesAvailable || !AppleAuthentication) {
        return null;
    }

    const isDisabled = disabled || isLoading;

    return (
        <View style={[styles.container, isDisabled && styles.disabled]}>
            <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={borderRadius.button}
                style={styles.button}
                onPress={signIn}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    button: {
        width: '100%',
        height: layout.heights.button,
    },
    disabled: {
        opacity: 0.5,
    },
});

export default AppleSignInButton;
