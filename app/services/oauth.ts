/**
 * OAuth Service for AstroMatch
 * Handles Google and Apple Sign-In with backend token exchange
 */

import { api } from './api';
import { AuthTokens, User, getToken } from './auth';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Dynamically import Apple Authentication
let AppleAuthentication: typeof import('expo-apple-authentication') | null = null;
try {
    AppleAuthentication = require('expo-apple-authentication');
} catch (e) {
    console.warn('expo-apple-authentication not available:', e);
}

// Storage keys (same as auth.ts)
const TOKEN_KEY = 'astromatch_token';
const REFRESH_TOKEN_KEY = 'astromatch_refresh_token';
const USER_KEY = 'astromatch_user';

/**
 * Store tokens and fetch user profile after OAuth login
 */
async function completeOAuthLogin(tokens: AuthTokens): Promise<User> {
    // Store tokens
    await SecureStore.setItemAsync(TOKEN_KEY, tokens.token);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refresh_token);

    // Fetch user profile
    const user = await api.get<User>('/api/me', {
        headers: {
            Authorization: `Bearer ${tokens.token}`,
        },
    });

    // Store user
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));

    return user;
}

/**
 * Login with Google OAuth
 * @param idToken - The Google ID token obtained from the OAuth flow
 */
export async function loginWithGoogle(idToken: string): Promise<User> {
    const tokens = await api.post<AuthTokens>('/api/auth/google', {
        id_token: idToken,
    });

    return completeOAuthLogin(tokens);
}

/**
 * Login with Apple OAuth
 * @param idToken - The Apple ID token obtained from Sign in with Apple
 * @param user - Optional user info (only provided on first sign-in)
 */
export async function loginWithApple(
    idToken: string,
    user?: { email?: string; fullName?: { givenName?: string; familyName?: string } }
): Promise<User> {
    const tokens = await api.post<AuthTokens>('/api/auth/apple', {
        id_token: idToken,
        user: user,
    });

    return completeOAuthLogin(tokens);
}

/**
 * Check if Apple Sign In is available on this device
 */
export function isAppleAuthAvailable(): boolean {
    return Platform.OS === 'ios' && AppleAuthentication !== null;
}

/**
 * Check if Apple Sign In is actually supported (async check)
 */
export async function isAppleAuthSupported(): Promise<boolean> {
    if (Platform.OS !== 'ios' || !AppleAuthentication) {
        return false;
    }
    try {
        return await AppleAuthentication.isAvailableAsync();
    } catch {
        return false;
    }
}
