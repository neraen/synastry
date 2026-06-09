import { authApi } from './sessionManager';
import { ChatMessage } from './astrology';

export interface ChatSessionSummary {
    id: number;
    title: string;
    partnerHistoryId: number | null;
    createdAt: string;
    updatedAt: string;
}

export interface ChatSessionDetail extends ChatSessionSummary {
    messages: Pick<ChatMessage, 'role' | 'content'>[];
    lastResponseId?: string | null;
    topic?: string | null;
}

export interface ChatSessionListResponse {
    success: boolean;
    sessions?: ChatSessionSummary[];
    error?: string;
}

export interface ChatSessionDetailResponse {
    success: boolean;
    session?: ChatSessionDetail;
    can_reply?: boolean;
    error?: string;
}

export interface CreateChatSessionResponse {
    success: boolean;
    id?: number;
    title?: string;
    error?: string;
}

/**
 * Get all saved chat sessions for the current user
 */
export async function getChatSessions(): Promise<ChatSessionListResponse> {
    return authApi.get<ChatSessionListResponse>('/api/chat/sessions');
}

/**
 * Get a specific chat session with its messages
 */
export async function getChatSession(id: number): Promise<ChatSessionDetailResponse> {
    return authApi.get<ChatSessionDetailResponse>(`/api/chat/sessions/${id}`);
}

/**
 * Save a new chat session
 */
export async function createChatSession(
    title: string,
    messages: Pick<ChatMessage, 'role' | 'content'>[],
    partnerHistoryId?: number | null,
    topic?: string | null
): Promise<CreateChatSessionResponse> {
    return authApi.post<CreateChatSessionResponse>('/api/chat/sessions', {
        title,
        messages,
        partnerHistoryId,
        ...(topic ? { topic } : {}),
    });
}

/**
 * Update an existing chat session (auto-save)
 */
export async function updateChatSession(
    id: number,
    messages: Pick<ChatMessage, 'role' | 'content'>[],
    lastResponseId?: string | null
): Promise<{ success: boolean; error?: string }> {
    return authApi.put<{ success: boolean; error?: string }>(`/api/chat/sessions/${id}`, {
        messages,
        ...(lastResponseId !== undefined ? { lastResponseId } : {}),
    });
}

/**
 * Delete a chat session
 */
export async function deleteChatSession(id: number): Promise<{ success: boolean; error?: string }> {
    return authApi.delete<{ success: boolean; error?: string }>(`/api/chat/sessions/${id}`);
}
