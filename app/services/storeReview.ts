/**
 * Native App Store / Play Store rating prompt.
 * Triggered after positive moments (e.g. a successful compatibility analysis),
 * throttled so the user is asked at most once, and only from the 2nd event.
 * Uses the native SKStoreReviewController sheet via expo-store-review.
 */

import * as StoreReview from 'expo-store-review';
import * as SecureStore from 'expo-secure-store';

const REQUESTED_KEY = 'store_review_requested';
const EVENT_COUNT_KEY = 'store_review_event_count';
const MIN_POSITIVE_EVENTS = 2;

/**
 * Record a positive moment and request the native review sheet
 * once enough events have occurred. Never throws.
 */
export async function recordPositiveEventAndMaybeAskReview(): Promise<void> {
    try {
        if (await SecureStore.getItemAsync(REQUESTED_KEY)) return;

        const count = parseInt((await SecureStore.getItemAsync(EVENT_COUNT_KEY)) ?? '0', 10) + 1;
        await SecureStore.setItemAsync(EVENT_COUNT_KEY, String(count));

        if (count < MIN_POSITIVE_EVENTS) return;
        if (!(await StoreReview.hasAction())) return;

        await StoreReview.requestReview();
        await SecureStore.setItemAsync(REQUESTED_KEY, '1');
    } catch {
        // Rating prompt is best-effort — never disrupt the user flow
    }
}
