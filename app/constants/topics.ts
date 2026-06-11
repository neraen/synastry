/**
 * Lyra conversation topics — mirrors the backend TopicLyra enum.
 * The user picks one when opening a new conversation; it focuses the AI context.
 */

import type { Feather } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { colors } from '@/theme';

type FeatherIconName = ComponentProps<typeof Feather>['name'];

export type TopicLyra = 'amour' | 'argent' | 'travail' | 'astrologie' | 'psychologie' | 'libre';

export interface TopicMeta {
    key: TopicLyra;
    icon: FeatherIconName;
    label: string;
    /** Short tagline shown under the label in the selector. */
    hint: string;
    /** Per-topic accent color (from the theme). */
    accent: string;
}

/** Tiles in display order (2×3 grid in the selector modal). */
export const TOPICS: TopicMeta[] = [
    { key: 'amour', icon: 'heart', label: 'Amour', hint: 'Cœur & relations', accent: colors.topics.amour },
    { key: 'argent', icon: 'dollar-sign', label: 'Argent', hint: 'Abondance & finances', accent: colors.topics.argent },
    { key: 'travail', icon: 'briefcase', label: 'Travail', hint: 'Carrière & ambition', accent: colors.topics.travail },
    { key: 'astrologie', icon: 'moon', label: 'Astrologie', hint: 'Transits & thème', accent: colors.topics.astrologie },
    { key: 'psychologie', icon: 'aperture', label: 'Psychologie', hint: 'Soi & introspection', accent: colors.topics.psychologie },
    { key: 'libre', icon: 'star', label: 'Libre', hint: 'Pose ta question', accent: colors.topics.libre },
];

export const TOPIC_META: Record<TopicLyra, TopicMeta> = TOPICS.reduce(
    (acc, t) => { acc[t.key] = t; return acc; },
    {} as Record<TopicLyra, TopicMeta>,
);
