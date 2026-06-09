/**
 * Lyra conversation topics — mirrors the backend TopicLyra enum.
 * The user picks one when opening a new conversation; it focuses the AI context.
 */

import type { Feather } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

type FeatherIconName = ComponentProps<typeof Feather>['name'];

export type TopicLyra = 'amour' | 'argent' | 'travail' | 'astrologie' | 'psychologie' | 'libre';

export interface TopicMeta {
    key: TopicLyra;
    icon: FeatherIconName;
    label: string;
}

/** Tiles in display order (2×3 grid in the selector modal). */
export const TOPICS: TopicMeta[] = [
    { key: 'amour', icon: 'heart', label: 'Amour' },
    { key: 'argent', icon: 'dollar-sign', label: 'Argent' },
    { key: 'travail', icon: 'briefcase', label: 'Travail' },
    { key: 'astrologie', icon: 'moon', label: 'Astrologie' },
    { key: 'psychologie', icon: 'aperture', label: 'Psychologie' },
    { key: 'libre', icon: 'star', label: 'Libre' },
];

export const TOPIC_META: Record<TopicLyra, TopicMeta> = TOPICS.reduce(
    (acc, t) => { acc[t.key] = t; return acc; },
    {} as Record<TopicLyra, TopicMeta>,
);
