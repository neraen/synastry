/**
 * API Client for AstroMatch backend
 */

import i18n from '@/i18n';
import { getApiUrl } from './apiConfig';


interface RequestOptions extends Omit<RequestInit, 'body'> {
    body?: Record<string, unknown>;
    /**
     * Aborts the request after this many ms. Prevents a silently dropped
     * connection (e.g. when the screen sleeps) from leaving the fetch — and
     * the UI loader that awaits it — hung forever.
     */
    timeoutMs?: number;
}

interface ApiError extends Error {
    status?: number;
    payload?: unknown;
    /** True when the request was aborted by the timeoutMs guard. */
    isTimeout?: boolean;
}

/**
 * Normalize URL by ensuring proper path joining
 */
function buildUrl(path: string): string {
    const base = getApiUrl().replace(/\/$/, '');
    const endpoint = path.startsWith('/') ? path : `/${path}`;
    return `${base}${endpoint}`;
}

/**
 * Core request function
 */
async function request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = buildUrl(path);
    const { body, headers: customHeaders, timeoutMs, ...rest } = options;

    // Get current language for API requests
    const currentLanguage = i18n.language || 'fr';

    const headers: HeadersInit = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Accept-Language': currentLanguage,
        ...customHeaders,
    };

    // Optional timeout: abort the fetch after timeoutMs so a hung connection
    // can never block the awaiting UI indefinitely.
    const controller = timeoutMs ? new AbortController() : undefined;
    const timeoutId = controller
        ? setTimeout(() => controller.abort(), timeoutMs)
        : undefined;

    const config: RequestInit = {
        ...rest,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller ? controller.signal : rest.signal,
    };

    try {
        const response = await fetch(url, config);

        const contentType = response.headers.get('content-type') || '';
        const payload = contentType.includes('application/json')
            ? await response.json()
            : await response.text();

        if (!response.ok) {
            // The backend returns errors as { error: "..." }; some endpoints use
            // { message: "..." }. Surface whichever is present so the real reason
            // reaches the UI instead of a generic "Request failed with status N".
            const message = typeof payload === 'string'
                ? payload
                : (payload as { error?: string; message?: string })?.error
                    || (payload as { message?: string })?.message
                    || `Request failed with status ${response.status}`;
            const error: ApiError = new Error(message);
            error.status = response.status;
            error.payload = payload;
            throw error;
        }

        return payload as T;
    } catch (err) {
        // Distinguish a timeout-abort from other network errors so callers can
        // show a friendly "took too long" message instead of a raw abort error.
        if (controller?.signal.aborted) {
            const timeoutError: ApiError = new Error('La requête a expiré. Vérifie ta connexion et réessaie.');
            timeoutError.isTimeout = true;
            throw timeoutError;
        }
        throw err;
    } finally {
        if (timeoutId) clearTimeout(timeoutId);
    }
}

/**
 * API methods
 */
export const api = {
    get: <T = unknown>(path: string, options?: Omit<RequestOptions, 'body'>) =>
        request<T>(path, { ...options, method: 'GET' }),

    post: <T = unknown>(path: string, body?: Record<string, unknown>, options?: Omit<RequestOptions, 'body'>) =>
        request<T>(path, { ...options, method: 'POST', body }),

    put: <T = unknown>(path: string, body?: Record<string, unknown>, options?: Omit<RequestOptions, 'body'>) =>
        request<T>(path, { ...options, method: 'PUT', body }),

    patch: <T = unknown>(path: string, body?: Record<string, unknown>, options?: Omit<RequestOptions, 'body'>) =>
        request<T>(path, { ...options, method: 'PATCH', body }),

    delete: <T = unknown>(path: string, options?: Omit<RequestOptions, 'body'>) =>
        request<T>(path, { ...options, method: 'DELETE' }),
};

/**
 * Get the configured API URL (useful for debugging)
 */
export { getApiUrl } from './apiConfig';

export default api;