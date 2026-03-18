/**
 * Hook for Apple Sign-In using expo-apple-authentication
 *
 * Gracefully handles the case when native modules are not available.
 */

import { useState, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import { loginWithApple, isAppleAuthSupported } from '@/services/oauth';
import { User } from '@/services/auth';

// Dynamically import Apple Authentication
let AppleAuthentication: typeof import('expo-apple-authentication') | null = null;
let modulesAvailable = false;

try {
    AppleAuthentication = require('expo-apple-authentication');
    modulesAvailable = true;
} catch (e) {
    console.warn('expo-apple-authentication not available:', e);
}

interface UseAppleAuthResult {
    signIn: () => Promise<void>;
    isLoading: boolean;
    error: string | null;
    isAvailable: boolean;
}

interface UseAppleAuthOptions {
    onSuccess?: (user: User) => void;
    onError?: (error: string) => void;
}

export function useAppleAuth(options: UseAppleAuthOptions = {}): UseAppleAuthResult {
    const { onSuccess, onError } = options;
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isAvailable, setIsAvailable] = useState(false);

    // Check actual availability on mount
    useEffect(() => {
        if (Platform.OS === 'ios' && modulesAvailable) {
            isAppleAuthSupported().then(setIsAvailable).catch(() => setIsAvailable(false));
        }
    }, []);

    const signIn = useCallback(async () => {
        if (!isAvailable || !modulesAvailable || !AppleAuthentication) {
            const errorMessage = 'Apple Sign-In is not available on this device';
            setError(errorMessage);
            onError?.(errorMessage);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const credential = await AppleAuthentication.signInAsync({
                requestedScopes: [
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL,
                ],
            });

            if (!credential.identityToken) {
                throw new Error('No identity token received from Apple');
            }

            // Apple only provides user info (name, email) on the first sign-in
            const userInfo = credential.email || credential.fullName ? {
                email: credential.email ?? undefined,
                fullName: credential.fullName ? {
                    givenName: credential.fullName.givenName ?? undefined,
                    familyName: credential.fullName.familyName ?? undefined,
                } : undefined,
            } : undefined;

            const user = await loginWithApple(credential.identityToken, userInfo);
            setError(null);
            onSuccess?.(user);
        } catch (err) {
            // Check if user cancelled
            if (err instanceof Error && err.message.includes('cancelled')) {
                setIsLoading(false);
                return;
            }

            // Handle AppleAuthentication errors
            if (typeof err === 'object' && err !== null && 'code' in err) {
                const appleError = err as { code: string };
                if (appleError.code === 'ERR_CANCELED' || appleError.code === '1001') {
                    setIsLoading(false);
                    return;
                }
            }

            const errorMessage = err instanceof Error ? err.message : 'Failed to authenticate with Apple';
            setError(errorMessage);
            onError?.(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [isAvailable, onSuccess, onError]);

    return {
        signIn,
        isLoading,
        error,
        isAvailable,
    };
}
