/**
 * API Environment Configuration
 * Persists the selected API environment (local / prod) via SecureStore.
 */

import * as SecureStore from 'expo-secure-store';

const STORAGE_KEY = 'api_env';

export const LOCAL_URL = process.env.EXPO_PUBLIC_API_URL_LOCAL ?? 'http://192.168.1.12:8000';
export const PROD_URL = process.env.EXPO_PUBLIC_API_URL_PROD ?? 'https://astro-api.clement-silvestre.com';

type ApiEnv = 'local' | 'prod';

let currentUrl: string = PROD_URL;
let currentEnv: ApiEnv = 'prod';

export async function initApiConfig(): Promise<void> {
    try {
        const stored = (await SecureStore.getItemAsync(STORAGE_KEY)) as ApiEnv | null;
        const env: ApiEnv = stored === 'local' ? 'local' : 'prod';
        currentEnv = env;
        currentUrl = env === 'local' ? LOCAL_URL : PROD_URL;
    } catch {
        currentEnv = 'prod';
        currentUrl = PROD_URL;
    }
}

export function getApiUrl(): string {
    return currentUrl;
}

export function getApiEnv(): ApiEnv {
    return currentEnv;
}

export async function setApiEnv(env: ApiEnv): Promise<void> {
    currentEnv = env;
    currentUrl = env === 'local' ? LOCAL_URL : PROD_URL;
    await SecureStore.setItemAsync(STORAGE_KEY, env);
}