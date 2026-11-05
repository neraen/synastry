/**
 * Push notification backend API calls
 */

import * as SecureStore from 'expo-secure-store';
import { authApi as api } from './sessionManager';

export const PUSH_TOKEN_KEY = 'lunestia_push_token';

export interface NotificationPreferences {
    enabled: boolean;
    transitsEnabled: boolean;
    skyEventsEnabled: boolean;
    dailyReminderEnabled: boolean;
    preferredHour: number;
    timezone: string;
}

export async function registerPushToken(token: string, platform: 'ios' | 'android'): Promise<void> {
    await api.post('/api/push/token', { token, platform });
}

export async function deregisterPushToken(token: string): Promise<void> {
    await api.delete(`/api/push/token/${encodeURIComponent(token)}`);
}

/**
 * Detaches this device from the current account. Must run while the session is
 * still valid, otherwise the device keeps receiving the previous user's pushes.
 * Best-effort: a failure must never block a logout.
 */
export async function unregisterDevicePushToken(): Promise<void> {
    try {
        const token = await SecureStore.getItemAsync(PUSH_TOKEN_KEY);
        if (!token) return;
        await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
        await deregisterPushToken(token);
    } catch (error) {
        console.warn('[Push] Failed to unregister token:', error);
    }
}

export async function getNotificationPreferences(): Promise<NotificationPreferences | null> {
    try {
        const res = await api.get<{ success: boolean; preferences: NotificationPreferences }>(
            '/api/push/preferences'
        );
        return res.preferences ?? null;
    } catch {
        return null;
    }
}

export async function updateNotificationPreferences(
    prefs: Partial<NotificationPreferences>
): Promise<NotificationPreferences | null> {
    try {
        const res = await api.put<{ success: boolean; preferences: NotificationPreferences }>(
            '/api/push/preferences',
            prefs as Record<string, unknown>
        );
        return res.preferences ?? null;
    } catch {
        return null;
    }
}
