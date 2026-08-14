/**
 * Step 5 — the active loop (spec §8).
 *
 * One generated question per screen, five answers, and the dial tightening
 * underneath. Nothing here reveals why *this* period is being asked about: the
 * user is being asked about their life, not about a transit. Naming the
 * mechanism would bias the answer as well as break the no-jargon rule.
 *
 * "Rien de spécial" is presented as a first-class answer rather than a way out,
 * because it is one — it carries as much information as a "yes".
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GhostButton, GoldButton, GlassCard } from '@/components/ui';
import { colors, spacing, typography } from '@/theme';
import type { LoopAnswer, LoopQuestion } from '@/services/rectification';

const ANSWERS: { key: LoopAnswer; label: string; primary?: boolean }[] = [
    { key: 'rien', label: 'Rien de spécial' },
    { key: 'difficile', label: 'Une période difficile' },
    { key: 'heureux', label: 'Une période heureuse' },
    { key: 'tournant', label: 'Un vrai tournant', primary: true },
    { key: 'sais_pas', label: 'Je ne sais plus' },
];

interface ActiveLoopStepProps {
    question: LoopQuestion;
    questionNumber: number;
    onAnswer: (answer: LoopAnswer) => void;
    busy?: boolean;
}

export function ActiveLoopStep({ question, questionNumber, onAnswer, busy }: ActiveLoopStepProps) {
    return (
        <View style={styles.container}>
            <Text style={styles.counter}>Question {questionNumber}</Text>

            <Text style={styles.question}>{question.question}</Text>

            <Text style={styles.hint}>
                Réponds au plus juste. « Rien de spécial » nous apprend autant qu’un oui.
            </Text>

            <View style={styles.answers}>
                {ANSWERS.map((answer) =>
                    answer.primary ? (
                        <GoldButton
                            key={answer.key}
                            label={answer.label}
                            onPress={() => onAnswer(answer.key)}
                            disabled={busy}
                        />
                    ) : (
                        <GhostButton
                            key={answer.key}
                            label={answer.label}
                            onPress={() => onAnswer(answer.key)}
                            disabled={busy}
                        />
                    ),
                )}
            </View>

            <GlassCard opacity="low" radius="md" padding="md">
                <Text style={styles.note}>
                    Ces questions sont choisies pour être celles qui départagent le mieux les heures encore
                    possibles. Il en faut trois à cinq en général.
                </Text>
            </GlassCard>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: spacing.lg,
    },
    counter: {
        ...typography.labelSm,
        color: colors.onSurfaceMuted,
    },
    question: {
        ...typography.headlineMd,
        color: colors.onSurface,
    },
    hint: {
        ...typography.bodySmall,
        color: colors.onSurfaceMuted,
        marginTop: -spacing.sm,
    },
    answers: {
        gap: spacing.md,
        marginTop: spacing.sm,
    },
    note: {
        ...typography.labelSm,
        color: colors.onSurfaceMuted,
    },
});
