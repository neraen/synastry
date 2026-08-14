/**
 * Steps 4 and 5 — result and adoption (spec §9).
 *
 * Three outcomes, three genuinely different screens. The one that matters most
 * is the inconclusive case: it is never presented as a failure, and never as a
 * slightly-less-good estimate. A run below the coherence threshold has no time
 * on it at all — showing one "with a caveat" is precisely the
 * overfitting-dressed-as-precision the spec forbids.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { GlassCard, GoldButton } from '@/components/ui';
import { colors, spacing, radius, typography } from '@/theme';
import { formatUncertainty, type RectificationResult } from '@/services/rectification';

interface ResultStepProps {
    result: RectificationResult;
    onAdopt: () => void;
    onAddEvent: () => void;
    /** Enters the active loop — only meaningful on a multimodal result. */
    onStartLoop: () => void;
    onUpgrade: () => void;
    busy?: boolean;
}

export function ResultStep({ result, onAdopt, onAddEvent, onStartLoop, onUpgrade, busy }: ResultStepProps) {
    if (!result.premium) return <TeaserResult result={result} onUpgrade={onUpgrade} />;
    if (result.status === 'inconclusive') return <InconclusiveResult result={result} onAddEvent={onAddEvent} />;
    if (result.status === 'multimodal') {
        return <MultimodalResult result={result} onStartLoop={onStartLoop} busy={busy} />;
    }

    return <ConclusiveResult result={result} onAdopt={onAdopt} busy={busy} />;
}

/** §9.2 — a time, its uncertainty, its coherence, and why. */
function ConclusiveResult({
    result,
    onAdopt,
    busy,
}: {
    result: RectificationResult;
    onAdopt: () => void;
    busy?: boolean;
}) {
    const [expanded, setExpanded] = useState(false);
    const estimate = result.estimate!;

    return (
        <View style={styles.container}>
            <Text style={styles.label}>L’heure la plus cohérente avec tes événements</Text>

            {/* The margin is never optional next to the time. */}
            <View style={styles.headline}>
                <Text style={styles.time}>{estimate.time}</Text>
                <Text style={styles.margin}>{formatUncertainty(estimate.uncertainty_minutes)}</Text>
            </View>

            <Text style={styles.coherence}>
                cohérence {estimate.coherence}/100 · intervalle {estimate.from} → {estimate.to}
            </Text>

            {result.contributions && result.contributions.length > 0 ? (
                <GlassCard opacity="low" radius="xl" padding="lg">
                    <Pressable style={styles.expandRow} onPress={() => setExpanded((v) => !v)} hitSlop={8}>
                        <Text style={styles.expandLabel}>Pourquoi cette heure</Text>
                        <Feather
                            name={expanded ? 'chevron-up' : 'chevron-down'}
                            size={16}
                            color={colors.onSurfaceMuted}
                        />
                    </Pressable>

                    {expanded ? (
                        <View style={styles.contributions}>
                            {result.contributions.map((contribution, index) => (
                                <Text key={index} style={styles.contribution}>
                                    {contribution.text}
                                </Text>
                            ))}
                        </View>
                    ) : null}
                </GlassCard>
            ) : null}

            <View style={styles.actions}>
                <GoldButton
                    label={`Utiliser ${estimate.time} pour ma carte`}
                    onPress={onAdopt}
                    loading={busy}
                    disabled={busy}
                />
                <Text style={styles.adoptNote}>
                    Elle sera enregistrée comme heure estimée, avec sa marge. Tu pourras la remplacer à tout moment
                    par une heure exacte.
                </Text>
            </View>
        </View>
    );
}

/** §9.3 — two or three plausible times, side by side. Never averaged. */
function MultimodalResult({
    result,
    onStartLoop,
    busy,
}: {
    result: RectificationResult;
    onStartLoop: () => void;
    busy?: boolean;
}) {
    const candidates = result.candidate_times ?? [];
    const times = candidates.map((c) => c.time).join(' ou ');

    return (
        <View style={styles.container}>
            <Text style={styles.label}>Plusieurs heures tiennent la route</Text>
            <Text style={styles.body}>
                {candidates.length === 2 ? 'Deux heures possibles' : `${candidates.length} heures possibles`} :{' '}
                {times}. Quelques questions et on tranche.
            </Text>

            <View style={styles.candidateRow}>
                {candidates.map((candidate) => (
                    <GlassCard key={candidate.time} opacity="medium" radius="xl" padding="lg" style={styles.candidateCard}>
                        <Text style={styles.candidateTime}>{candidate.time}</Text>
                        <Text style={styles.candidateShare}>{Math.round(candidate.probability * 100)} %</Text>
                    </GlassCard>
                ))}
            </View>

            <GoldButton label="Répondre à quelques questions" onPress={onStartLoop} loading={busy} disabled={busy} />
        </View>
    );
}

/** §9.4 — constructive, never blaming, always with the way out. */
function InconclusiveResult({
    result,
    onAddEvent,
}: {
    result: RectificationResult;
    onAddEvent: () => void;
}) {
    return (
        <View style={styles.container}>
            <Text style={styles.label}>Pas encore assez cohérent</Text>
            <Text style={styles.body}>
                Tes événements ne convergent pas encore vers une heure unique. Ce n’est pas un échec : ça veut dire
                qu’on ne veut pas te donner un chiffre auquel on ne croit pas nous-mêmes.
            </Text>

            <GlassCard opacity="low" radius="xl" padding="lg">
                <Text style={styles.helpTitle}>Ce qui débloquerait le calcul</Text>
                {result.what_would_help.map((line) => (
                    <View key={line} style={styles.helpRow}>
                        <View style={styles.helpDot} />
                        <Text style={styles.helpText}>{line}</Text>
                    </View>
                ))}
            </GlassCard>

            <GoldButton label="Ajouter un événement" onPress={onAddEvent} />
        </View>
    );
}

/** §12 — free tier: the shape of the answer, none of the numbers. */
function TeaserResult({ result, onUpgrade }: { result: RectificationResult; onUpgrade: () => void }) {
    return (
        <View style={styles.container}>
            <Text style={styles.label}>Premier aperçu</Text>
            <Text style={styles.teaser}>{result.teaser?.label}</Text>
            <Text style={styles.body}>
                Avec tes événements on peut déjà situer ton Ascendant. Pour l’heure elle-même, sa marge et le
                détail du raisonnement, il faut le calcul complet.
            </Text>

            <GoldButton label="Débloquer le calcul complet" onPress={onUpgrade} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: spacing.xl,
    },
    label: {
        ...typography.labelMd,
        color: colors.onSurfaceMuted,
        textAlign: 'center',
    },
    headline: {
        alignItems: 'center',
        gap: spacing.xs,
    },
    time: {
        ...typography.displayMd,
        color: colors.onSurface,
    },
    margin: {
        ...typography.titleLg,
        color: colors.primary,
    },
    coherence: {
        ...typography.labelSm,
        color: colors.onSurfaceMuted,
        textAlign: 'center',
        marginTop: -spacing.md,
    },
    body: {
        ...typography.bodyMd,
        color: colors.onSurfaceMuted,
    },
    teaser: {
        ...typography.headlineMd,
        color: colors.onSurface,
        textAlign: 'center',
    },
    expandRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    expandLabel: {
        ...typography.titleMd,
        color: colors.onSurface,
    },
    contributions: {
        gap: spacing.lg,
        marginTop: spacing.lg,
    },
    contribution: {
        ...typography.bodySmall,
        color: colors.onSurfaceMuted,
    },
    actions: {
        gap: spacing.md,
    },
    adoptNote: {
        ...typography.labelSm,
        color: colors.onSurfaceMuted,
        textAlign: 'center',
    },
    candidateRow: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    candidateCard: {
        flex: 1,
        alignItems: 'center',
    },
    candidateTime: {
        ...typography.headlineMd,
        color: colors.onSurface,
    },
    candidateShare: {
        ...typography.labelSm,
        color: colors.primary,
        marginTop: spacing.xs,
    },
    helpTitle: {
        ...typography.titleMd,
        color: colors.onSurface,
        marginBottom: spacing.md,
    },
    helpRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.md,
        marginTop: spacing.sm,
    },
    helpDot: {
        width: 4,
        height: 4,
        borderRadius: radius.full,
        backgroundColor: colors.primary,
        marginTop: 7,
    },
    helpText: {
        ...typography.bodySmall,
        color: colors.onSurfaceMuted,
        flex: 1,
    },
});
