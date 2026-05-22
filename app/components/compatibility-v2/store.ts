import type { CompatibilityV2Data } from './types';

/**
 * Lightweight in-memory store for passing v2 data to the share screen.
 * Set before navigating to share-card-v2, read on mount there.
 */
let _data: CompatibilityV2Data | null = null;

export function setCompatibilityV2Data(data: CompatibilityV2Data): void {
    _data = data;
}

export function getCompatibilityV2Data(): CompatibilityV2Data | null {
    return _data;
}
