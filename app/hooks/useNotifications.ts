import { useEffect, useRef } from 'react';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { registerPushToken } from '@/services/pushNotifications';
import { useAuth } from '@/contexts/AuthContext';

const PUSH_TOKEN_KEY = 'lunestia_push_token';

// Configure how notifications behave when the app is in the foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: true,
    }),
});

/**
 * Initializes push notifications:
 * - Requests permission on physical devices
 * - Sends/refreshes the Expo push token to the backend
 * - Handles deep-link navigation when a notification is tapped
 */
export function useNotifications() {
    const { isAuthenticated } = useAuth();
    const router = useRouter();
    const notificationListener = useRef<Notifications.EventSubscription | null>(null);
    const responseListener    = useRef<Notifications.EventSubscription | null>(null);

    useEffect(() => {
        if (!isAuthenticated) return;

        registerForPushNotifications();

        // Foreground: notification received while app is open
        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            // Badge count is updated automatically via shouldSetBadge: true
            console.log('[Push] Notification received:', notification.request.content.title);
        });

        // Background/killed: user tapped the notification
        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            const data = response.notification.request.content.data as Record<string, string> | undefined;
            handleNotificationNavigation(data, router);
        });

        return () => {
            notificationListener.current?.remove();
            responseListener.current?.remove();
        };
    }, [isAuthenticated]);
}

async function registerForPushNotifications(): Promise<void> {
    // Push tokens only work on physical devices
    if (!Device.isDevice) {
        console.log('[Push] Skipping: not a physical device');
        return;
    }

    // Android: create notification channel
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'Lunestia',
            importance: Notifications.AndroidImportance.DEFAULT,
        });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.log('[Push] Permission not granted');
        return;
    }

    try {
        const tokenData = await Notifications.getExpoPushTokenAsync();
        const token = tokenData.data;

        // Check if token changed since last registration
        const storedToken = await SecureStore.getItemAsync(PUSH_TOKEN_KEY);
        if (storedToken === token) return; // No change needed

        const platform: 'ios' | 'android' = Platform.OS === 'ios' ? 'ios' : 'android';
        await registerPushToken(token, platform);

        await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token);
        console.log('[Push] Token registered:', token.slice(0, 40) + '...');
    } catch (error) {
        console.error('[Push] Failed to register token:', error);
    }
}

function handleNotificationNavigation(
    data: Record<string, string> | undefined,
    router: ReturnType<typeof useRouter>
): void {
    if (!data?.screen) return;

    switch (data.screen) {
        case 'transits':
            router.push('/(tabs)/transits');
            break;
        case 'horoscope':
            router.push('/(tabs)/horoscope');
            break;
        case 'compatibility':
            router.push('/(tabs)/compatibility');
            break;
        default:
            router.push('/(tabs)');
    }
}
