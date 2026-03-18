/**
 * Session Manager
 * Handles token refresh and session expiry events
 */

import { getToken, getRefreshToken, clearAuth } from './auth';
import { api } from './api';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'astromatch_token';
const REFRESH_TOKEN_KEY = 'astromatch_refresh_token';

type SessionListener = () => void;

// Event listeners for session expiry
const sessionExpiredListeners: Set<SessionListener> = new Set();

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

/**
 * Subscribe to session expired events
 */
export function onSessionExpired(listener: SessionListener): () => void {
    sessionExpiredListeners.add(listener);
    return () => {
        sessionExpiredListeners.delete(listener);
    };
}

/**
 * Notify all listeners that session has expired
 */
function notifySessionExpired(): void {
    sessionExpiredListeners.forEach((listener) => {
        try {
            listener();
        } catch (error) {
            console.error('Error in session expired listener:', error);
        }
    });
}

/**
 * Try to refresh the access token
 * Returns the new token or null if refresh failed
 */
export async function tryRefreshToken(): Promise<string | null> {
    // If already refreshing, wait for that to complete
    if (isRefreshing && refreshPromise) {
        return refreshPromise;
    }

    isRefreshing = true;
    refreshPromise = (async () => {
        try {
            const refreshToken = await getRefreshToken();
            if (!refreshToken) {
                return null;
            }

            const response = await api.post<{ token: string; refresh_token: string }>(
                '/api/token/refresh',
                { refresh_token: refreshToken }
            );

            // Store new tokens
            await SecureStore.setItemAsync(TOKEN_KEY, response.token);
            await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, response.refresh_token);

            return response.token;
        } catch (error) {
            console.error('Token refresh failed:', error);
            return null;
        } finally {
            isRefreshing = false;
            refreshPromise = null;
        }
    })();

    return refreshPromise;
}

/**
 * Handle session expiry - clear auth and notify listeners
 */
export async function handleSessionExpired(): Promise<void> {
    await clearAuth();
    notifySessionExpired();
}

/**
 * Make an authenticated API request with automatic token refresh
 */
export async function authenticatedRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    body?: Record<string, unknown>
): Promise<T> {
    let token = await getToken();

    if (!token) {
        await handleSessionExpired();
        throw new Error('Not authenticated');
    }

    const headers = { Authorization: `Bearer ${token}` };

    try {
        switch (method) {
            case 'GET':
                return await api.get<T>(path, { headers });
            case 'POST':
                return await api.post<T>(path, body, { headers });
            case 'PUT':
                return await api.put<T>(path, body, { headers });
            case 'PATCH':
                return await api.patch<T>(path, body, { headers });
            case 'DELETE':
                return await api.delete<T>(path, { headers });
        }
    } catch (error: unknown) {
        // Check if it's a 401 error
        if (error instanceof Error && 'status' in error && (error as { status: number }).status === 401) {
            // Try to refresh the token
            const newToken = await tryRefreshToken();

            if (newToken) {
                // Retry the request with the new token
                const newHeaders = { Authorization: `Bearer ${newToken}` };
                switch (method) {
                    case 'GET':
                        return await api.get<T>(path, { headers: newHeaders });
                    case 'POST':
                        return await api.post<T>(path, body, { headers: newHeaders });
                    case 'PUT':
                        return await api.put<T>(path, body, { headers: newHeaders });
                    case 'PATCH':
                        return await api.patch<T>(path, body, { headers: newHeaders });
                    case 'DELETE':
                        return await api.delete<T>(path, { headers: newHeaders });
                }
            } else {
                // Refresh failed - session is expired
                await handleSessionExpired();
                throw new Error('Session expired');
            }
        }
        throw error;
    }
}

/**
 * Authenticated API helpers
 */
export const authApi = {
    get: <T>(path: string) => authenticatedRequest<T>('GET', path),
    post: <T>(path: string, body?: Record<string, unknown>) => authenticatedRequest<T>('POST', path, body),
    put: <T>(path: string, body?: Record<string, unknown>) => authenticatedRequest<T>('PUT', path, body),
    patch: <T>(path: string, body?: Record<string, unknown>) => authenticatedRequest<T>('PATCH', path, body),
    delete: <T>(path: string) => authenticatedRequest<T>('DELETE', path),
};
