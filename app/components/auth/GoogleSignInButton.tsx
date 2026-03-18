/**
 * Google Sign-In Button Component
 *
 * Gracefully handles the case when expo-auth-session native modules are not available.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
    Pressable,
    Text,
    View,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { loginWithGoogle } from '@/services/oauth';
import { User } from '@/services/auth';
import { spacing, borderRadius, typography, layout } from '@/theme';

// Environment variables
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

interface GoogleSignInButtonProps {
    onSuccess?: (user: User) => void;
    onError?: (error: string) => void;
    disabled?: boolean;
}

// Check if modules are available
let Google: typeof import('expo-auth-session/providers/google') | null = null;
let WebBrowser: typeof import('expo-web-browser') | null = null;
let modulesAvailable = false;

try {
    Google = require('expo-auth-session/providers/google');
    WebBrowser = require('expo-web-browser');
    WebBrowser?.maybeCompleteAuthSession();
    modulesAvailable = true;
} catch (e) {
    console.warn('Google Auth modules not available:', e);
}

export function GoogleSignInButton({
    onSuccess,
    onError,
    disabled = false,
}: GoogleSignInButtonProps) {
    // If modules aren't available, render a disabled button
    if (!modulesAvailable || !Google) {
        return (
            <Pressable
                disabled
                style={[styles.button, styles.disabled]}
                accessibilityRole="button"
                accessibilityLabel="Google Sign-In not available"
            >
                <View style={styles.content}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="logo-google" size={20} color="#4285F4" />
                    </View>
                    <Text style={styles.text}>Google (non disponible)</Text>
                </View>
            </Pressable>
        );
    }

    // Modules are available, use the real implementation
    return (
        <GoogleSignInButtonImpl
            onSuccess={onSuccess}
            onError={onError}
            disabled={disabled}
            Google={Google}
        />
    );
}

// Real implementation when modules are available
function GoogleSignInButtonImpl({
    onSuccess,
    onError,
    disabled,
    Google,
}: GoogleSignInButtonProps & {
    Google: typeof import('expo-auth-session/providers/google');
}) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
        clientId: GOOGLE_WEB_CLIENT_ID,
        iosClientId: GOOGLE_IOS_CLIENT_ID,
        androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    });

    // Handle the OAuth response
    useEffect(() => {
        if (response?.type === 'success') {
            const { id_token } = response.params;
            handleGoogleToken(id_token);
        } else if (response?.type === 'error') {
            const errorMessage = response.error?.message || 'Google sign-in failed';
            setError(errorMessage);
            onError?.(errorMessage);
            setIsLoading(false);
        } else if (response?.type === 'cancel' || response?.type === 'dismiss') {
            setIsLoading(false);
        }
    }, [response]);

    const handleGoogleToken = async (idToken: string) => {
        try {
            const user = await loginWithGoogle(idToken);
            setError(null);
            onSuccess?.(user);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to authenticate with Google';
            setError(errorMessage);
            onError?.(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const signIn = useCallback(async () => {
        if (!request) {
            const errorMessage = 'Google Sign-In is not configured';
            setError(errorMessage);
            onError?.(errorMessage);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            await promptAsync();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to start Google sign-in';
            setError(errorMessage);
            onError?.(errorMessage);
            setIsLoading(false);
        }
    }, [request, promptAsync, onError]);

    const isDisabled = disabled || isLoading;

    return (
        <Pressable
            onPress={signIn}
            disabled={isDisabled}
            style={({ pressed }) => [
                styles.button,
                pressed && styles.pressed,
                isDisabled && styles.disabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Se connecter avec Google"
            accessibilityState={{ disabled: isDisabled }}
        >
            {isLoading ? (
                <ActivityIndicator color="#757575" size="small" />
            ) : (
                <View style={styles.content}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="logo-google" size={20} color="#4285F4" />
                    </View>
                    <Text style={styles.text}>Continuer avec Google</Text>
                </View>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        height: layout.heights.button,
        backgroundColor: '#FFFFFF',
        borderRadius: borderRadius.button,
        borderWidth: 1,
        borderColor: '#DADCE0',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
        width: '100%',
    },
    pressed: {
        opacity: 0.8,
        backgroundColor: '#F8F9FA',
    },
    disabled: {
        opacity: 0.5,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        marginRight: spacing.md,
    },
    text: {
        ...typography.button,
        color: '#3C4043',
        fontWeight: '500',
    },
});

export default GoogleSignInButton;
