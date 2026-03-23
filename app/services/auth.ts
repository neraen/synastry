/**
 * Authentication Service for AstroMatch
 */

import { api } from './api';
import * as SecureStore from 'expo-secure-store';

// Storage keys
const TOKEN_KEY = 'astromatch_token';
const REFRESH_TOKEN_KEY = 'astromatch_refresh_token';
const USER_KEY = 'astromatch_user';

// Types
export interface BirthProfileData {
    id: number;
    firstName?: string;
    birthDate: string;
    birthTime?: string;
    birthCity: string;
    birthCountry?: string;
    latitude: number;
    longitude: number;
    timezone?: number;
}

export interface User {
    id: number;
    email: string;
    roles: string[];
    hasBirthProfile: boolean;
    birthProfile?: BirthProfileData | null;
    isPremium?: boolean;
    premiumUntil?: string | null; // ISO date string
}

export interface AuthTokens {
    token: string;
    refresh_token: string;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterData {
    email: string;
    password: string;
}

/**
 * Store tokens securely
 */
async function storeTokens(tokens: AuthTokens): Promise<void> {
    await SecureStore.setItemAsync(TOKEN_KEY, tokens.token);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refresh_token);
}

/**
 * Store user data
 */
async function storeUser(user: User): Promise<void> {
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

/**
 * Get stored token
 */
export async function getToken(): Promise<string | null> {
    return SecureStore.getItemAsync(TOKEN_KEY);
}

/**
 * Get stored refresh token
 */
export async function getRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

/**
 * Get stored user
 */
export async function getStoredUser(): Promise<User | null> {
    const data = await SecureStore.getItemAsync(USER_KEY);
    return data ? JSON.parse(data) : null;
}

/**
 * Clear all auth data
 */
export async function clearAuth(): Promise<void> {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
}

/**
 * Register a new user
 */
export async function register(data: RegisterData): Promise<User> {
    const response = await api.post<{ message: string; user: User }>('/api/register', {
        email: data.email,
        password: data.password,
    });
    return response.user;
}

/**
 * Login with email and password
 */
export async function login(credentials: LoginCredentials): Promise<User> {
    // Get JWT tokens
    const tokens = await api.post<AuthTokens>('/api/login', {
        username: credentials.email, // Symfony expects 'username'
        password: credentials.password,
    });

    // Store tokens
    await storeTokens(tokens);

    // Fetch user profile
    const user = await fetchProfile();
    await storeUser(user);

    return user;
}

/**
 * Logout - clear stored credentials
 */
export async function logout(): Promise<void> {
    await clearAuth();
}

/**
 * Fetch current user profile
 */
export async function fetchProfile(): Promise<User> {
    const token = await getToken();
    if (!token) {
        throw new Error('Not authenticated');
    }

    return api.get<User>('/api/me', {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
}

/**
 * Refresh the access token
 */
export async function refreshAccessToken(): Promise<string> {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
        throw new Error('No refresh token available');
    }

    const response = await api.post<AuthTokens>('/api/token/refresh', {
        refresh_token: refreshToken,
    });

    await storeTokens(response);
    return response.token;
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
    const token = await getToken();
    return !!token;
}

/**
 * Delete user account permanently
 */
export async function deleteAccount(): Promise<void> {
    const token = await getToken();
    if (!token) {
        throw new Error('Not authenticated');
    }

    await api.delete('/api/user/account', {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    // Clear local auth data after successful deletion
    await clearAuth();
}

/**
 * Make an authenticated API request
 */
export async function authFetch<T>(
    path: string,
    options: RequestInit & { body?: Record<string, unknown> } = {}
): Promise<T> {
    let token = await getToken();

    if (!token) {
        throw new Error('Not authenticated');
    }

    const headers = {
        ...options.headers,
        Authorization: `Bearer ${token}`,
    };

    try {
        return await api.get<T>(path, { ...options, headers });
    } catch (error: unknown) {
        // If token expired, try to refresh
        if (error instanceof Error && 'status' in error && (error as { status: number }).status === 401) {
            try {
                token = await refreshAccessToken();
                return await api.get<T>(path, {
                    ...options,
                    headers: { ...headers, Authorization: `Bearer ${token}` },
                });
            } catch {
                // Refresh failed, logout
                await logout();
                throw new Error('Session expired. Please login again.');
            }
        }
        throw error;
    }
}