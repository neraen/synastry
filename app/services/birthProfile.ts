/**
 * Birth Profile Service
 */

import { authApi } from './sessionManager';
import { cacheInvalidatePrefix } from './cache';
import { getStoredUser } from './auth';

export interface BirthProfile {
    id?: number;
    firstName?: string;
    birthDate: string; // YYYY-MM-DD
    birthTime?: string; // HH:MM
    birthCity: string;
    birthCountry?: string;
    latitude: number;
    longitude: number;
    timezone?: number;
    timezoneName?: string; // IANA timezone name (e.g., "Europe/Paris")
}

export interface BirthProfileResponse {
    hasProfile: boolean;
    profile: BirthProfile | null;
}

/**
 * Get current user's birth profile
 */
export async function getBirthProfile(): Promise<BirthProfileResponse> {
    return authApi.get<BirthProfileResponse>('/api/birth-profile');
}

/**
 * Save (create or update) birth profile.
 * Invalidates the natal chart section cache since birth data changed.
 */
export async function saveBirthProfile(profile: Omit<BirthProfile, 'id'>): Promise<BirthProfile> {
    const response = await authApi.post<{ message: string; profile: BirthProfile }>(
        '/api/birth-profile',
        profile as Record<string, unknown>
    );
    await _invalidateNatalCache();
    return response.profile;
}

/**
 * Delete birth profile.
 * Invalidates the natal chart section cache.
 */
export async function deleteBirthProfile(): Promise<void> {
    await authApi.delete('/api/birth-profile');
    await _invalidateNatalCache();
}

async function _invalidateNatalCache(): Promise<void> {
    try {
        const user = await getStoredUser();
        await cacheInvalidatePrefix(`natal_section_${user?.id ?? 'anon'}_`);
        // Also clear memory cache via the registered hook
        _onBirthProfileChanged?.();
    } catch {}
}

let _onBirthProfileChanged: (() => void) | null = null;

/** Called by astrology.ts to register its memory cache clear function. */
export function registerBirthProfileChangeHook(fn: () => void): void {
    _onBirthProfileChanged = fn;
}

/**
 * City search result from geocoding
 */
export interface CitySearchResult {
    name: string;
    country: string;
    latitude: number;
    longitude: number;
    timezone: number;
    timezoneName: string; // Store the timezone name for accurate historical calculations
}

/**
 * Search for cities (using Open-Meteo Geocoding API - free, no key required)
 */
export async function searchCities(query: string): Promise<CitySearchResult[]> {
    if (query.length < 2) {
        return [];
    }

    try {
        const response = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=10&language=fr&format=json`
        );

        if (!response.ok) {
            return [];
        }

        const data = await response.json();

        if (!data.results) {
            return [];
        }

        return data.results.map((r: {
            name: string;
            country: string;
            latitude: number;
            longitude: number;
            timezone: string;
        }) => ({
            name: r.name,
            country: r.country,
            latitude: r.latitude,
            longitude: r.longitude,
            timezone: getTimezoneOffset(r.timezone), // Default to current offset
            timezoneName: r.timezone, // Store name for later recalculation
        }));
    } catch {
        return [];
    }
}

/**
 * Convert timezone name to offset for a specific date
 * This is crucial for astrology: summer/winter time affects the calculation
 *
 * @param timezoneName - IANA timezone name (e.g., "Europe/Paris")
 * @param dateString - Optional date string in YYYY-MM-DD format to calculate historical offset
 */
export function getTimezoneOffset(timezoneName: string, dateString?: string): number {
    try {
        // Use the provided date or current date
        const date = dateString ? new Date(`${dateString}T12:00:00`) : new Date();

        // Get the UTC and local time representations
        const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
        const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezoneName }));

        // Calculate offset in hours
        return (tzDate.getTime() - utcDate.getTime()) / (1000 * 60 * 60);
    } catch {
        return 0;
    }
}

/**
 * Recalculate timezone offset for a specific birth date
 * Use this when saving a profile to ensure accurate historical timezone
 */
export function calculateTimezoneForBirthDate(
    timezoneName: string,
    birthDate: string
): number {
    return getTimezoneOffset(timezoneName, birthDate);
}