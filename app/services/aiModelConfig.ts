/**
 * AI Model Configuration
 * Persists the selected AI model (OpenAI or Anthropic) via SecureStore.
 * Same pattern as apiConfig.ts.
 */

import * as SecureStore from 'expo-secure-store';

const STORAGE_KEY = 'ai_model';

export type AiModel = 'mini' | 'pro' | 'mini5' | 'claude-sonnet' | 'claude-haiku';

export const MODEL_MINI          = 'gpt-4.1-mini';
export const MODEL_PRO           = 'gpt-4o';
export const MODEL_MINI5         = 'gpt-5-mini';
export const MODEL_CLAUDE_SONNET = 'claude-sonnet-4-20250514';
export const MODEL_CLAUDE_HAIKU  = 'claude-haiku-4-5-20251001';

const VALID_MODELS: AiModel[] = ['mini', 'pro', 'mini5', 'claude-sonnet', 'claude-haiku'];

let currentModel: AiModel = 'mini';

export async function initAiModelConfig(): Promise<void> {
    try {
        const stored = await SecureStore.getItemAsync(STORAGE_KEY) as AiModel | null;
        currentModel = stored && VALID_MODELS.includes(stored) ? stored : 'mini';
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
    if (currentModel === 'pro')           return MODEL_PRO;
    if (currentModel === 'mini5')         return MODEL_MINI5;
    if (currentModel === 'claude-sonnet') return MODEL_CLAUDE_SONNET;
    if (currentModel === 'claude-haiku')  return MODEL_CLAUDE_HAIKU;
    return MODEL_MINI;
}