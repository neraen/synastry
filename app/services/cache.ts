/**
 * Simple TTL-based file cache using expo-file-system.
 * Keys are stored as individual JSON files in a dedicated cache directory.
 */

import * as FileSystem from 'expo-file-system';

const CACHE_DIR = `${FileSystem.documentDirectory}cache/`;

interface CacheEntry<T> {
    data: T;
    expiresAt: number; // unix ms
}

async function ensureCacheDir(): Promise<void> {
    const info = await FileSystem.getInfoAsync(CACHE_DIR);
    if (!info.exists) {
        await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
    }
}

function keyToPath(key: string): string {
    // Sanitize key → valid filename
    const safe = key.replace(/[^a-zA-Z0-9_-]/g, '_');
    return `${CACHE_DIR}${safe}.json`;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
    try {
        const path = keyToPath(key);
        const info = await FileSystem.getInfoAsync(path);
        if (!info.exists) return null;
        const raw = await FileSystem.readAsStringAsync(path);
        const entry: CacheEntry<T> = JSON.parse(raw);
        if (Date.now() > entry.expiresAt) {
            FileSystem.deleteAsync(path, { idempotent: true });
            return null;
        }
        return entry.data;
    } catch {
        return null;
    }
}

export async function cacheSet<T>(key: string, data: T, ttlSeconds: number): Promise<void> {
    try {
        await ensureCacheDir();
        const entry: CacheEntry<T> = { data, expiresAt: Date.now() + ttlSeconds * 1000 };
        await FileSystem.writeAsStringAsync(keyToPath(key), JSON.stringify(entry));
    } catch {
        // Non-fatal: cache write failures are silent
    }
}

export async function cacheDelete(key: string): Promise<void> {
    try {
        await FileSystem.deleteAsync(keyToPath(key), { idempotent: true });
    } catch {}
}

/** Invalidate all cache entries whose key starts with a given prefix */
export async function cacheInvalidatePrefix(prefix: string): Promise<void> {
    try {
        const info = await FileSystem.getInfoAsync(CACHE_DIR);
        if (!info.exists) return;
        const files = await FileSystem.readDirectoryAsync(CACHE_DIR);
        const safe = prefix.replace(/[^a-zA-Z0-9_-]/g, '_');
        await Promise.all(
            files
                .filter((f) => f.startsWith(safe))
                .map((f) => FileSystem.deleteAsync(`${CACHE_DIR}${f}`, { idempotent: true }))
        );
    } catch {}
}

/** Delete all cache entries (e.g. on logout) */
export async function cacheClearAll(): Promise<void> {
    try {
        const info = await FileSystem.getInfoAsync(CACHE_DIR);
        if (!info.exists) return;
        await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
    } catch {}
}
