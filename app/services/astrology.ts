/**
 * Astrology Service
 */

import { authApi } from './sessionManager';
import { getToken, getStoredUser } from './auth';
import { getApiUrl } from './apiConfig';
import i18n from 'i18next';
import { cacheGet, cacheSet, cacheInvalidatePrefix } from './cache';
import { registerBirthProfileChangeHook } from './birthProfile';

// ─── Natal chart section cache ────────────────────────────────────────────────
// Two layers: memory (instant on back navigation) + file (persists across sessions)
const NATAL_SECTION_TTL = 7 * 24 * 3600; // 7 days in seconds
const natalSectionMemoryCache = new Map<string, NatalChartSectionResponse>();

// Register hook so birth profile changes clear the memory cache
registerBirthProfileChangeHook(() => natalSectionMemoryCache.clear());

async function getNatalSectionCacheKey(section: string): Promise<string> {
    const user = await getStoredUser();
    return `natal_section_${user?.id ?? 'anon'}_${section}`;
}

export async function invalidateNatalChartCache(): Promise<void> {
    natalSectionMemoryCache.clear();
    const user = await getStoredUser();
    await cacheInvalidatePrefix(`natal_section_${user?.id ?? 'anon'}_`);
}

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

export interface SunSignData {
    element: string;
    rulers: string[];
    affinities: string[];
}

export interface NatalChartResponse {
    success: boolean;
    chart?: NatalChart;
    sunSignData?: SunSignData;
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
    aspect_cle?: { description?: string; planetes?: string; impact: string };
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
 * Get short personality summary (Sun, Moon, Ascendant) — free, cached 90 days
 */
export async function getNatalChartSummary(): Promise<{ success: boolean; summary?: string; error?: string }> {
    return authApi.get<{ success: boolean; summary?: string; error?: string }>('/api/astrology/natal-chart/summary');
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
    response_id?: string;
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
    partnerHistoryId?: number,
    previousResponseId?: string
): Promise<ChatResponse> {
    return authApi.post<ChatResponse>('/api/chat', {
        messages,
        ...(partnerHistoryId ? { partnerHistoryId } : {}),
        ...(previousResponseId ? { previousResponseId } : {}),
    });
}

export interface ChatStreamResult {
    responseId: string | null;
    remainingMessages: number | null;
    dailyLimitReached: boolean;
}

/**
 * Send a chat message and receive the response as an SSE stream.
 * Calls onDelta for each text token as it arrives.
 */
export function sendChatMessageStream(
    messages: Pick<ChatMessage, 'role' | 'content'>[],
    partnerHistoryId: number | undefined,
    previousResponseId: string | undefined,
    onDelta: (delta: string) => void,
): Promise<ChatStreamResult> {
    return new Promise(async (resolve, reject) => {
        const token = await getToken();
        const locale = i18n.language || 'fr';

        let sseBuffer = '';
        let processedLength = 0;
        let responseId: string | null = null;
        let remainingMessages: number | null = null;
        let dailyLimitReached = false;
        let settled = false;

        const processText = (newText: string) => {
            sseBuffer += newText;
            const parts = sseBuffer.split('\n\n');
            sseBuffer = parts.pop() ?? '';
            for (const chunk of parts) {
                const dataLine = chunk.split('\n').find((l) => l.startsWith('data: '));
                if (!dataLine) continue;
                let data: any;
                try { data = JSON.parse(dataLine.slice(6)); } catch { continue; }
                if (data.type === 'delta') {
                    onDelta(data.content ?? '');
                } else if (data.type === 'done') {
                    responseId = data.response_id ?? null;
                    if (data.remaining_messages !== undefined) remainingMessages = data.remaining_messages;
                    dailyLimitReached = data.daily_limit_reached ?? false;
                } else if (data.type === 'error') {
                    if (!settled) { settled = true; reject(new Error(data.message ?? 'AI service error')); }
                }
            }
        };

        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${getApiUrl()}/api/chat/stream`);
        xhr.setRequestHeader('Content-Type', 'application/json');
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.setRequestHeader('Accept-Language', locale);
        xhr.timeout = 120000;

        // onprogress fires incrementally as chunks arrive — true streaming in React Native
        xhr.onprogress = () => {
            const newText = xhr.responseText.slice(processedLength);
            processedLength = xhr.responseText.length;
            if (newText) processText(newText);
        };

        xhr.onload = () => {
            if (settled) return;
            if (xhr.status >= 400) {
                settled = true;
                let errorData: any = {};
                try { errorData = JSON.parse(xhr.responseText); } catch {}
                const err: any = new Error(errorData.error ?? 'Stream error');
                err.status = xhr.status;
                err.payload = errorData;
                reject(err);
                return;
            }
            // Flush any remaining text not caught by onprogress
            const remaining = xhr.responseText.slice(processedLength);
            if (remaining) processText(remaining);
            settled = true;
            resolve({ responseId, remainingMessages, dailyLimitReached });
        };

        xhr.onerror = () => { if (!settled) { settled = true; reject(new Error('Network error')); } };
        xhr.ontimeout = () => { if (!settled) { settled = true; reject(new Error('Request timeout')); } };

        xhr.send(JSON.stringify({
            messages,
            ...(partnerHistoryId ? { partnerHistoryId } : {}),
            ...(previousResponseId ? { previousResponseId } : {}),
        }));
    });
}

/**
 * Get list of past compatibility partners for the chat context picker.
 */
export async function getChatPartners(): Promise<ChatPartnersResponse> {
    return authApi.get<ChatPartnersResponse>('/api/chat/partners');
}

// ─── Synastry V2 ──────────────────────────────────────────────────────────────

export interface SynastryV2Response {
    success: boolean;
    historyId?: number;
    user?: { name: string; initial: string; chart?: NatalChart };
    partner?: { name: string; initial: string };
    compatibilityScore?: { score_global: number; dimensions: Record<string, number> };
    analysis?: Record<string, unknown>;
    error?: string;
}

/**
 * Calculate synastry v2 (new structured format with dimensions, forces, vigilance, etc.)
 */
export async function calculateSynastryV2(partnerData: PartnerBirthData): Promise<SynastryV2Response> {
    return authApi.post<SynastryV2Response>(
        '/api/astrology/synastry-v2',
        partnerData as unknown as Record<string, unknown>
    );
}

const V2_DIM_NAMES: Record<string, string> = {
    amour: 'Amour',
    communication: 'Communication',
    conflits: 'Conflits',
    long_terme: 'Long terme',
    attirance: 'Attirance',
};

/**
 * Map a SynastryHistoryDetail (v2 entry) to CompatibilityV2Data for display.
 * The v2 JSON is stored in compatibilityDetails; global score in compatibilityScore.
 */
export function mapHistoryToV2Data(
    history: SynastryHistoryDetail,
    userName: string
): import('@/components/compatibility-v2/types').CompatibilityV2Data {
    const d = history.compatibilityDetails as Record<string, any> | null ?? {};
    const score = history.compatibilityScore ?? 0;

    // Dimensions: backend may store { value, detail } or { score, analyse } depending on version
    const rawDims: Record<string, any> = d.dimensions ?? {};
    const dimensions = Object.entries(rawDims).map(([id, dim]) => ({
        id,
        name: V2_DIM_NAMES[id] ?? id,
        value: typeof dim === 'object' ? (dim.value ?? dim.score ?? 0) : Number(dim ?? 0),
        detail: typeof dim === 'object' ? (dim.detail ?? dim.analyse ?? '') : '',
    }));

    return {
        userName,
        userInitial: userName.charAt(0).toUpperCase(),
        partnerName: history.partnerName,
        partnerInitial: history.partnerName.charAt(0).toUpperCase(),
        score: Math.round(score),
        tagline: d.tagline ?? '',
        dimensions,
        analyse: d.analyse ?? { headline: '', summary: [], long_text: [] },
        forces: d.forces ?? [],
        vigilance: d.vigilance ?? [],
        aspect_cle: d.aspect_cle ?? { planet_a: 'sun', planet_b: 'sun', name: '', desc: '' },
        conseil: d.conseil ?? { title: 'Conseil', text: '' },
    };
}

// ─── Partner Chart ────────────────────────────────────────────────────────────

export interface PartnerSummaryResponse {
    success: boolean;
    partnerName?: string;
    positions?: Record<string, PlanetPosition>;
    synthesis?: SynthesisData;
    summary?: string; // legacy field, kept for backward compat
    error?: string;
}

/**
 * Get personality summary + positions for a partner stored in synastry history.
 */
export async function getPartnerSummary(historyId: number): Promise<PartnerSummaryResponse> {
    return authApi.get<PartnerSummaryResponse>(`/api/astrology/partner-summary/${historyId}`);
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

export interface MirrorChapter {
    theme: string;
    glyph: string;
    accent: string;    // color key: 'gold' | 'violet' | 'pink' | 'blue', or raw hex
    text: string;
}

export interface MirrorMilestone {
    age: number;
    label: string;
    glyph: string;
}

export interface MirrorInterpretationResponse {
    success: boolean;
    interpretation?: string;       // legacy single-string format
    chapters?: MirrorChapter[];    // structured multi-chapter format
    milestones?: MirrorMilestone[];
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

// ─── Natal Chart Analysis ─────────────────────────────────────────────────────

export interface SynthesisAxis {
    title: string;
    description: string;
}

export interface SynthesisData {
    axes: SynthesisAxis[];
    portrait: string;
    notable_configs: string[];
}

export interface AspectInterpretation {
    planets: string;
    type: string;
    orb: number;
    interpretation: string;
}

export interface AspectsData {
    aspects: AspectInterpretation[];
}

export type NatalChartSectionContent = string | SynthesisData | AspectsData;

export interface NatalChartSectionResponse {
    success: boolean;
    section?: string;
    content?: NatalChartSectionContent;
    error?: string;
}

export interface NatalChartPregenerateResponse {
    success: boolean;
    generated?: string[];
    errors?: string[];
}

/**
 * Get a single section of the natal chart analysis.
 * Returns text for most sections, structured JSON for synthesis and aspects.
 * Results are cached in memory (session) and on disk (7 days).
 */
export async function getNatalChartAnalysisSection(
    section: string
): Promise<NatalChartSectionResponse> {
    const key = await getNatalSectionCacheKey(section);

    // 1. Memory cache hit → instant
    if (natalSectionMemoryCache.has(key)) {
        return natalSectionMemoryCache.get(key)!;
    }

    // 2. File cache hit → avoids network on app restart
    const cached = await cacheGet<NatalChartSectionResponse>(key);
    if (cached) {
        natalSectionMemoryCache.set(key, cached);
        return cached;
    }

    // 3. Fetch from API
    const result = await authApi.get<NatalChartSectionResponse>(
        `/api/natal-chart/section/${encodeURIComponent(section)}`
    );

    // Only cache successful responses (not premium errors, not failures)
    if (result.success && result.content) {
        natalSectionMemoryCache.set(key, result);
        cacheSet(key, result, NATAL_SECTION_TTL);
    }

    return result;
}

/**
 * Pre-generate all accessible sections in the background.
 */
export async function preGenerateNatalChartAnalysis(): Promise<NatalChartPregenerateResponse> {
    return authApi.post<NatalChartPregenerateResponse>('/api/natal-chart/pregenerate');
}

// ─── Home Insights ────────────────────────────────────────────────────────────

export interface WeeklyEnergy {
    titre: string;
    resume: string;
    intensite: number;
    domaines: string[];
    conseil: string;
}

export interface CurrentPeriod {
    titre: string;
    contenu: string[];
    tonalite: 'positive' | 'neutre' | 'tendu';
}

export interface HomeInsightsResponse {
    success: boolean;
    weeklyEnergy?: WeeklyEnergy | null;
    currentPeriod?: CurrentPeriod | null;
    error?: string;
}

/**
 * Get personalized weekly energy and current period insights for the home page.
 */
export async function getHomeInsights(): Promise<HomeInsightsResponse> {
    return authApi.get<HomeInsightsResponse>('/api/home/insights');
}
