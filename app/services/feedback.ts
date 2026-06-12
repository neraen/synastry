import { authApi } from './sessionManager';

export async function submitFeedback(
    contentType: 'chat' | 'horoscope' | 'natal',
    isPositive: boolean,
    contentRef: string,
): Promise<void> {
    await authApi.post('/api/feedback', { contentType, isPositive, contentRef });
}

/**
 * Report an inappropriate AI response (App Store guideline 1.2).
 */
export async function reportChatMessage(message: string, reason?: string): Promise<void> {
    await authApi.post('/api/chat/report', { message, reason });
}
