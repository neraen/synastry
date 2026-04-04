/**
 * API Client for AstroMatch backend
 */

import i18n from '@/i18n';
import { getApiUrl } from './apiConfig';
import { getAiModelHeader } from './aiModelConfig';

interface RequestOptions extends Omit<RequestInit, 'body'> {
    body?: Record<string, unknown>;
}

interface ApiError extends Error {
    status?: number;
    payload?: unknown;
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
    const { body, headers: customHeaders, ...rest } = options;

    // Get current language for API requests
    const currentLanguage = i18n.language || 'fr';

    const headers: HeadersInit = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Accept-Language': currentLanguage,
        'X-Ai-Model': getAiModelHeader(),
        ...customHeaders,
    };

    const config: RequestInit = {
        ...rest,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    };

    const response = await fetch(url, config);

    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json')
        ? await response.json()
        : await response.text();

    if (!response.ok) {
        const message = typeof payload === 'string'
            ? payload
            : (payload as { message?: string })?.message || `Request failed with status ${response.status}`;
        const error: ApiError = new Error(message);
        error.status = response.status;
        error.payload = payload;
        throw error;
    }

    return payload as T;
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