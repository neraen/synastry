/**
 * AI Model Configuration
 * Persists the selected OpenAI model (mini / pro) via SecureStore.
 * Same pattern as apiConfig.ts.
 */

import * as SecureStore from 'expo-secure-store';

const STORAGE_KEY = 'ai_model';

export type AiModel = 'mini' | 'pro';

export const MODEL_MINI = 'gpt-4.1-mini';
export const MODEL_PRO  = 'gpt-4o';

let currentModel: AiModel = 'mini';

export async function initAiModelConfig(): Promise<void> {
    try {
        const stored = await SecureStore.getItemAsync(STORAGE_KEY) as AiModel | null;
        currentModel = stored === 'pro' ? 'pro' : 'mini';
    } catch {
        currentModel = 'mini';
    }
}

export function getAiModel(): AiModel {
    return currentModel;
}

export async function setAiModel(model: AiModel): Promise<void> {
    currentModel = model;
    await SecureStore.setItemAsync(STORAGE_KEY, model);
}

/** Header value sent to the backend on every request. */
export function getAiModelHeader(): string {
    return currentModel === 'pro' ? MODEL_PRO : MODEL_MINI;
}