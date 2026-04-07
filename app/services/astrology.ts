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
    timezoneName?: string; // IANA name — backend uses this to recalculate DST-correct offset
    question?: string;
}

export interface CompatibilityDetails {
    headline?: string;
    resume?: string;
    forces?: string[];
    tensions?: string[];
    dimensions?: Record<string, { score: number; analyse: string }>;
    aspect_cle?: { planetes: string; impact: string };
    conseil?: string;
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
    compatibilityDetails?: CompatibilityDetails;
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
    compatibilityDetails: CompatibilityDetails | null;
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
    is_limited?: boolean;
    total_count?: number;
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

export interface PlanetInterpretationResponse {
    success: boolean;
    planet?: string;
    sign?: string;
    degree?: number;
    interpretation?: string;
    error?: string;
}

/**
 * Get AI explanation for a single natal planet placement (cached 90 days on backend)
 */
export async function getPlanetInterpretation(planet: string): Promise<PlanetInterpretationResponse> {
    return authApi.get<PlanetInterpretationResponse>(`/api/astrology/natal-chart/planet-interpretation/${encodeURIComponent(planet)}`);
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

// Upcoming Transits types
export interface UpcomingTransit {
    date: string;
    title: string;
    description: string;
    intensity: 'high' | 'medium' | 'low';
}

export interface UpcomingTransitsResponse {
    success: boolean;
    transits?: UpcomingTransit[];
    error?: string;
}

/**
 * Get 3 most significant upcoming transits (AI-generated)
 */
export async function getUpcomingTransits(): Promise<UpcomingTransitsResponse> {
    return authApi.get<UpcomingTransitsResponse>('/api/horoscope/transits');
}

// ─── Calendar Transits ─────────────────────────────────────────────────────────

export interface CalendarAspect {
    transit_planet: string;
    natal_planet: string;
    aspect_type: 'conjunction' | 'opposition' | 'trine' | 'square' | 'sextile';
    aspect_name: string;
    symbol: string;
    orb: number;
}

export interface CalendarTransitsResponse {
    success: boolean;
    days?: Record<string, CalendarAspect[]>;
    error?: string;
}

/**
 * Get transit aspects for every day of a month (astronomical, no AI)
 * @param month format: "YYYY-MM"
 */
export async function getCalendarTransits(month: string): Promise<CalendarTransitsResponse> {
    return authApi.get<CalendarTransitsResponse>(`/api/horoscope/calendar?month=${month}`);
}

export interface TransitInterpretationResponse {
    success: boolean;
    interpretation?: string;
    error?: string;
}

/**
 * Get AI-generated interpretation for a single transit aspect
 */
export async function getTransitInterpretation(aspect: CalendarAspect): Promise<TransitInterpretationResponse> {
    return authApi.post<TransitInterpretationResponse>('/api/horoscope/transit-interpretation', aspect as unknown as Record<string, unknown>);
}

// ─── Cosmic Headline ───────────────────────────────────────────────────────────

export interface CosmicHeadlineResponse {
    success: boolean;
    headline?: {
        title: string;
        subtitle: string;
        weekOf: string;
        generatedAt: string;
    };
    cached?: boolean;
    error?: string;
}

/**
 * Get the weekly cosmic headline (global, cached per locale per week)
 */
export async function getCosmicHeadline(): Promise<CosmicHeadlineResponse> {
    return authApi.get<CosmicHeadlineResponse>('/api/horoscope/headline');
}

// ─── Astrologer Chat ──────────────────────────────────────────────────────────

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    createdAt: Date;
}

export interface ChatResponse {
    success: boolean;
    message?: string;
    error?: string;
    remaining_messages?: number; // -1 = unlimited (premium)
    daily_limit_reached?: boolean;
}

export interface ChatPartner {
    id: number;
    partnerName: string;
    compatibilityScore: number | null;
}

export interface ChatPartnersResponse {
    success: boolean;
    partners?: ChatPartner[];
    error?: string;
}

/**
 * Send the full conversation history to Lyra (AI astrologer) and get a reply.
 * Stateless — full history is sent each time.
 */
export async function sendChatMessage(
    messages: Pick<ChatMessage, 'role' | 'content'>[],
    partnerHistoryId?: number
): Promise<ChatResponse> {
    return authApi.post<ChatResponse>('/api/chat', {
        messages,
        ...(partnerHistoryId ? { partnerHistoryId } : {}),
    });
}

/**
 * Get list of past compatibility partners for the chat context picker.
 */
export async function getChatPartners(): Promise<ChatPartnersResponse> {
    return authApi.get<ChatPartnersResponse>('/api/chat/partners');
}

// ─── Miroir Temporel ──────────────────────────────────────────────────────────

export interface MirrorAspect {
    transit_planet: string;
    natal_planet: string;
    aspect_type: 'conjunction' | 'opposition' | 'trine' | 'square' | 'sextile';
    orb_exact: number;
    intensity: number;
    symbol: string;
}

export interface UnlockedRange {
    min: number;
    max: number;
}

export interface MirrorTransitsData {
    age: number;
    target_date: string;
    target_year: number;
    natal_positions: Record<string, PlanetPosition>;
    transit_positions: Record<string, PlanetPosition>;
    aspects: MirrorAspect[];
    global_intensity: number;
}

export interface MirrorTransitsResponse {
    success: boolean;
    error?: string;
    unlocked_ranges?: UnlockedRange[];
    age?: number;
    target_date?: string;
    target_year?: number;
    natal_positions?: Record<string, PlanetPosition>;
    transit_positions?: Record<string, PlanetPosition>;
    aspects?: MirrorAspect[];
    global_intensity?: number;
}

export interface MirrorInterpretationResponse {
    success: boolean;
    interpretation?: string;
    error?: string;
    unlocked_ranges?: UnlockedRange[];
}

/**
 * Get transit positions + active aspects for a given age (no AI).
 */
export async function getMirrorTransits(age: number): Promise<MirrorTransitsResponse> {
    return authApi.get<MirrorTransitsResponse>(`/api/mirror/transits?age=${age}`);
}

/**
 * Get AI-generated interpretation of the energy at a given age.
 */
export async function getMirrorInterpretation(
    age: number,
    pinnedEvent?: string
): Promise<MirrorInterpretationResponse> {
    return authApi.post<MirrorInterpretationResponse>('/api/mirror/interpret', {
        age,
        ...(pinnedEvent ? { pinned_event: pinnedEvent } : {}),
    });
}
