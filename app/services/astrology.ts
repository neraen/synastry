/**
 * Astrology Service
 */

import { authApi } from './sessionManager';

// Types
export interface PlanetPosition {
    Position: number;
    Sign: string;
    Retrograde: string;
}

export interface NatalChart {
    id: number;
    planetaryPositions: Record<string, PlanetPosition>;
    interpretation: string | null;
    calculatedAt: string;
}

export interface NatalChartResponse {
    success: boolean;
    chart?: NatalChart;
    cached?: boolean;
    error?: string;
}

export interface InterpretationResponse {
    success: boolean;
    interpretation?: string;
    chart?: NatalChart;
    cached?: boolean;
    error?: string;
}

export interface PartnerBirthData {
    partnerName: string;
    birthDate: string; // YYYY-MM-DD
    birthTime?: string; // HH:MM
    birthCity: string;
    latitude: number;
    longitude: number;
    timezone?: number;
    question?: string;
}

export interface SynastryResponse {
    success: boolean;
    historyId?: number;
    user?: {
        name: string;
        chart: NatalChart;
    };
    partner?: {
        name: string;
        positions: Record<string, PlanetPosition>;
    };
    analysis?: string;
    compatibilityScore?: number;
    error?: string;
}

// History types
export interface SynastryHistorySummary {
    id: number;
    partnerName: string;
    compatibilityScore: number | null;
    createdAt: string;
}

export interface SynastryHistoryDetail {
    id: number;
    partnerName: string;
    partnerBirthData: {
        year: number;
        month: number;
        day: number;
        hours?: number;
        minutes?: number;
        latitude: number;
        longitude: number;
        timezone?: number;
    };
    analysis: string;
    compatibilityScore: number | null;
    compatibilityDetails: Record<string, unknown> | null;
    userPositions: Record<string, PlanetPosition> | null;
    partnerPositions: Record<string, PlanetPosition> | null;
    question: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface SynastryHistoryListResponse {
    success: boolean;
    histories?: SynastryHistorySummary[];
    count?: number;
    error?: string;
}

export interface SynastryHistoryDetailResponse {
    success: boolean;
    history?: SynastryHistoryDetail;
    error?: string;
}

// Daily Horoscope types
export interface DailyHoroscope {
    title: string;
    overview: string;
    love: string;
    energy: string;
    advice: string;
    date: string;
    cached: boolean;
}

export interface DailyHoroscopeResponse {
    success: boolean;
    horoscope?: DailyHoroscope;
    message?: string;
    error?: string;
}

/**
 * Get current user's natal chart
 */
export async function getNatalChart(refresh = false): Promise<NatalChartResponse> {
    const url = refresh ? '/api/astrology/natal-chart?refresh=true' : '/api/astrology/natal-chart';
    return authApi.get<NatalChartResponse>(url);
}

/**
 * Get AI interpretation of natal chart
 */
export async function getNatalChartInterpretation(): Promise<InterpretationResponse> {
    return authApi.get<InterpretationResponse>('/api/astrology/natal-chart/interpretation');
}

/**
 * Calculate synastry with partner
 */
export async function calculateSynastry(partnerData: PartnerBirthData): Promise<SynastryResponse> {
    return authApi.post<SynastryResponse>(
        '/api/astrology/synastry',
        partnerData as unknown as Record<string, unknown>
    );
}

/**
 * Get synastry history list
 */
export async function getSynastryHistory(limit = 50): Promise<SynastryHistoryListResponse> {
    return authApi.get<SynastryHistoryListResponse>(
        `/api/astrology/synastry/history?limit=${limit}`
    );
}

/**
 * Get a specific synastry history entry
 */
export async function getSynastryHistoryDetail(id: number): Promise<SynastryHistoryDetailResponse> {
    return authApi.get<SynastryHistoryDetailResponse>(
        `/api/astrology/synastry/history/${id}`
    );
}

/**
 * Delete a synastry history entry
 */
export async function deleteSynastryHistoryEntry(id: number): Promise<{ success: boolean; error?: string }> {
    return authApi.delete<{ success: boolean; error?: string }>(
        `/api/astrology/synastry/history/${id}`
    );
}

/**
 * Get daily horoscope
 */
export async function getDailyHoroscope(refresh = false): Promise<DailyHoroscopeResponse> {
    const url = refresh ? '/api/horoscope/daily?refresh=true' : '/api/horoscope/daily';
    return authApi.get<DailyHoroscopeResponse>(url);
}

/**
 * Get zodiac sign name in French
 */
export function getZodiacSignFr(sign: string): string {
    const signs: Record<string, string> = {
        'Aries': 'Bélier',
        'Taurus': 'Taureau',
        'Gemini': 'Gémeaux',
        'Cancer': 'Cancer',
        'Leo': 'Lion',
        'Virgo': 'Vierge',
        'Libra': 'Balance',
        'Scorpio': 'Scorpion',
        'Sagittarius': 'Sagittaire',
        'Capricorn': 'Capricorne',
        'Aquarius': 'Verseau',
        'Pisces': 'Poissons',
    };
    return signs[sign] || sign;
}

/**
 * Get planet name in French
 */
export function getPlanetNameFr(planet: string): string {
    const planets: Record<string, string> = {
        'Sun': 'Soleil',
        'Moon': 'Lune',
        'Mercury': 'Mercure',
        'Venus': 'Vénus',
        'Mars': 'Mars',
        'Jupiter': 'Jupiter',
        'Saturn': 'Saturne',
        'Uranus': 'Uranus',
        'Neptune': 'Neptune',
        'Pluto': 'Pluton',
        'Ascendant': 'Ascendant',
        'MC': 'Milieu du Ciel',
        'Descendant': 'Descendant',
        'IC': 'Fond du Ciel',
        'Chiron': 'Chiron',
        'Lilith': 'Lilith',
        'Mean Node': 'Noeud Nord',
        'True Node': 'Noeud Nord Vrai',
    };
    return planets[planet] || planet;
}

/**
 * Get main planets only (for simplified display)
 */
export function getMainPlanets(positions: Record<string, PlanetPosition>): Record<string, PlanetPosition> {
    const mainPlanets = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Ascendant'];
    const result: Record<string, PlanetPosition> = {};

    for (const planet of mainPlanets) {
        if (positions[planet]) {
            result[planet] = positions[planet];
        }
    }

    return result;
}

/**
 * Format degree to readable format (e.g., "24°27' Taureau")
 * Converts total zodiac position (0-360°) to position within sign (0-30°)
 */
export function formatDegree(position: number, sign: string): string {
    // Convert total zodiac position to position within sign (0-30°)
    const positionInSign = position % 30;
    const degrees = Math.floor(positionInSign);
    const minutes = Math.floor((positionInSign - degrees) * 60);
    return `${degrees}°${minutes.toString().padStart(2, '0')}' ${getZodiacSignFr(sign)}`;
}

// Share types
export interface CompatibilityShare {
    shareId: string;
    shareUrl: string;
    imageUrl: string;
}

export interface CreateShareResponse {
    success: boolean;
    share?: CompatibilityShare;
    cached?: boolean;
    error?: string;
}

export interface PublicShareData {
    shareId: string;
    nameOne: string;
    nameTwo: string;
    sunOne: string | null;
    sunTwo: string | null;
    moonOne: string | null;
    moonTwo: string | null;
    ascendantOne: string | null;
    ascendantTwo: string | null;
    compatibilityScore: number;
    summary: string;
    createdAt: string;
}

export interface PublicShareResponse {
    success: boolean;
    data?: PublicShareData;
    error?: string;
}

/**
 * Create a share link for a compatibility analysis
 */
export async function createCompatibilityShare(compatibilityId: number): Promise<CreateShareResponse> {
    return authApi.post<CreateShareResponse>(
        '/api/compatibility/share',
        { compatibilityId }
    );
}

/**
 * Get public share data (no auth required)
 */
export async function getPublicShare(shareId: string): Promise<PublicShareResponse> {
    return authApi.get<PublicShareResponse>(`/api/share/${shareId}`);
}
