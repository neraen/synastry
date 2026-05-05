/**
 * Push notification backend API calls
 */

import { api } from './api';

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
