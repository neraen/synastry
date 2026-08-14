/**
 * Step 3 — "collecte" (spec §5).
 *
 * The dial sits above this list permanently and is the whole motivation loop:
 * the calculate button stays visible even below the threshold, but instead of
 * being greyed out with no explanation it states the exact shortfall — "il te
 * manque 1 événement" — which is the difference between a blocked user and a
 * user who knows what to do next.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { GlassCard, GoldButton, GhostButton } from '@/components/ui';
import { colors, spacing, typography } from '@/theme';
import type { DialState, RectificationEvent } from '@/services/rectification';

const PRECISION_LABELS: Record<string, string> = {
    day: 'au jour',
    week: 'à la semaine',
    month: 'au mois',
    year: 'à l’année',
};

interface CollectionStepProps {
    events: RectificationEvent[];
    dial: DialState;
    premium: boolean;
    freeMaxEvents: number;
    onAdd: () => void;
    onRemove: (index: number) => void;
    onCalculate: () => void;
    onUpgrade: () => void;
    busy?: boolean;
}

export function CollectionStep({
    events,
    dial,
    premium,
    freeMaxEvents,
    onAdd,
    onRemove,
    onCalculate,
    onUpgrade,
    busy,
}: CollectionStepProps) {
    const atFreeLimit = !premium && events.length >= freeMaxEvents;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Tes événements</Text>
                <Text style={styles.subtitle}>
                    Les moments non planifiés — un accident, une rupture, un licenciement — sont ceux qui situent
                    le mieux ton heure.
                </Text>
            </View>

            {events.length === 0 ? (
                <GlassCard opacity="low" radius="xl" padding="lg">
                    <Text style={styles.emptyText}>
                        Rien pour l’instant. Commence par le tournant dont tu te souviens le mieux — c’est souvent
                        celui dont tu retrouveras la date exacte.
                    </Text>
                </GlassCard>
            ) : (
                <GlassCard opacity="low" radius="xl" padding="none">
                    {events.map((event, index) => (
                        <View key={`${event.date}-${index}`}>
                            {index > 0 ? <View style={styles.separator} /> : null}
                            <View style={styles.row}>
                                <View style={styles.rowInfo}>
                                    <Text style={styles.rowTitle}>{event.title || event.category || 'Événement'}</Text>
                                    <Text style={styles.rowMeta}>
                                        {formatDate(event)} · daté {PRECISION_LABELS[event.precision] ?? ''}
                                        {event.precision === 'day' ? ' ✦' : ''}
                                    </Text>
                                </View>
                                <Pressable onPress={() => onRemove(index)} hitSlop={12} disabled={busy}>
                                    <Feather name="x" size={16} color={colors.onSurfaceMuted} />
                                </Pressable>
                            </View>
                        </View>
                    ))}
                </GlassCard>
            )}

            {atFreeLimit ? (
                <GlassCard opacity="medium" radius="xl" padding="lg">
                    <Text style={styles.limitTitle}>
                        {freeMaxEvents} événements, c’est la limite de la version gratuite
                    </Text>
                    <Text style={styles.limitBody}>
                        Avec {freeMaxEvents} événements on peut déjà cerner ton Ascendant. Pour une heure précise et
                        le détail du raisonnement, il en faut plus.
                    </Text>
                    <View style={styles.spacer} />
                    <GoldButton label="Débloquer le calcul complet" onPress={onUpgrade} />
                </GlassCard>
            ) : (
                <GhostButton label="Ajouter un événement" onPress={onAdd} disabled={busy} />
            )}

            <View style={styles.footer}>
                {/* Visible even when it cannot run — and it says why. */}
                <GoldButton
                    label={dial.ready ? 'Lancer le calcul' : 'Il manque des éléments'}
                    onPress={onCalculate}
                    disabled={!dial.ready || busy}
                    loading={busy}
                />
                {dial.missing.length > 0 ? (
                    <View style={styles.missingBlock}>
                        {dial.missing.map((line) => (
                            <Text key={line} style={styles.missingLine}>
                                {line}
                            </Text>
                        ))}
                    </View>
                ) : null}
            </View>
        </View>
    );
}

function formatDate(event: RectificationEvent): string {
    const [year, month, day] = event.date.split('-');

    if (event.precision === 'year') return year;
    if (event.precision === 'month') return `${month}/${year}`;

    return `${day}/${month}/${year}`;
}

const styles = StyleSheet.create({
    container: {
        gap: spacing.xl,
    },
    header: {
        gap: spacing.sm,
    },
    title: {
        ...typography.headlineMd,
        color: colors.onSurface,
    },
    subtitle: {
        ...typography.bodySmall,
        color: colors.onSurfaceMuted,
    },
    emptyText: {
        ...typography.bodyMd,
        color: colors.onSurfaceMuted,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.lg,
        gap: spacing.md,
    },
    rowInfo: {
        flex: 1,
        gap: spacing.xs,
    },
    rowTitle: {
        ...typography.titleMd,
        color: colors.onSurface,
    },
    rowMeta: {
        ...typography.labelSm,
        color: colors.onSurfaceMuted,
    },
    // Same faint background shift the profile screen uses — a tint, not a rule.
    separator: {
        height: 1,
        backgroundColor: `${colors.outline}20`,
        marginHorizontal: spacing.lg,
    },
    limitTitle: {
        ...typography.titleMd,
        color: colors.onSurface,
    },
    limitBody: {
        ...typography.bodySmall,
        color: colors.onSurfaceMuted,
        marginTop: spacing.sm,
    },
    spacer: {
        height: spacing.lg,
    },
    footer: {
        gap: spacing.md,
    },
    missingBlock: {
        gap: spacing.xs,
    },
    missingLine: {
        ...typography.labelSm,
        color: colors.onSurfaceMuted,
        textAlign: 'center',
    },
});
