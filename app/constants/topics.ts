/**
 * Lyra conversation topics — mirrors the backend TopicLyra enum.
 * The user picks one when opening a new conversation; it focuses the AI context.
 */

export type TopicLyra = 'amour' | 'argent' | 'travail' | 'astrologie' | 'psychologie' | 'libre';

export interface TopicMeta {
    key: TopicLyra;
    emoji: string;
    label: string;
}

/** Tiles in display order (2×3 grid in the selector modal). */
export const TOPICS: TopicMeta[] = [
    { key: 'amour', emoji: '💕', label: 'Amour' },
    { key: 'argent', emoji: '💰', label: 'Argent' },
    { key: 'travail', emoji: '💼', label: 'Travail' },
    { key: 'astrologie', emoji: '🌙', label: 'Astrologie' },
    { key: 'psychologie', emoji: '🔮', label: 'Psychologie' },
    { key: 'libre', emoji: '✨', label: 'Libre' },
];

export const TOPIC_META: Record<TopicLyra, TopicMeta> = TOPICS.reduce(
    (acc, t) => { acc[t.key] = t; return acc; },
    {} as Record<TopicLyra, TopicMeta>,
);
