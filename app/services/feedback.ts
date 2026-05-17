import { authApi } from './sessionManager';

export async function submitFeedback(
    contentType: 'chat' | 'horoscope' | 'natal',
    isPositive: boolean,
    contentRef: string,
): Promise<void> {
    await authApi.post('/api/feedback', { contentType, isPositive, contentRef });
}
