/**
 * Step 2 — "fenêtre" (spec §4).
 *
 * Three questions, one decision per screen, to bound the search interval. The
 * dial's lit zone narrows after each answer, which is the first time the user
 * sees the thing react to them.
 *
 * Every question can be answered "aucune idée". That is not a fallback to
 * apologise for: it yields the full 24 h window, which the engine handles.
 * Guessing here would be worse than admitting ignorance — a window that
 * excludes the true time makes everything downstream meaningless, whereas a
 * window that is too wide only costs a second of computation.
 */

import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { CelestialChip, GoldButton, GhostButton, GlassCard } from '@/components/ui';
import { colors, spacing, typography } from '@/theme';
import { MEMORY_CHIPS, type WindowAnswers } from '@/services/rectification';

const DAY_NIGHT_CHIPS: { key: NonNullable<WindowAnswers['day_night']>; label: string }[] = [
    { key: 'jour', label: 'De jour' },
    { key: 'nuit', label: 'De nuit' },
    { key: 'aucune_idee', label: 'Aucune idée' },
];

interface WindowStepProps {
    initial?: WindowAnswers;
    onSubmit: (answers: WindowAnswers) => void;
    busy?: boolean;
}

export function WindowStep({ initial, onSubmit, busy }: WindowStepProps) {
    const [question, setQuestion] = useState(0);
    const [answers, setAnswers] = useState<WindowAnswers>(initial ?? {});

    const set = (patch: Partial<WindowAnswers>) => setAnswers((prev) => ({ ...prev, ...patch }));

    const next = () => setQuestion((q) => q + 1);
    const back = () => setQuestion((q) => Math.max(0, q - 1));

    return (
        <View style={styles.container}>
            <Text style={styles.progress}>Question {question + 1} sur 3</Text>

            {question === 0 && (
                <View style={styles.block}>
                    <Text style={styles.question}>Tu es né·e de jour ou de nuit ?</Text>
                    <Text style={styles.hint}>
                        C’est souvent la seule chose dont on est sûr, et ça coupe déjà la journée en deux.
                    </Text>
                    <View style={styles.chips}>
                        {DAY_NIGHT_CHIPS.map((chip) => (
                            <CelestialChip
                                key={chip.key}
                                label={chip.label}
                                selected={answers.day_night === chip.key}
                                onPress={() => {
                                    set({ day_night: chip.key });
                                    next();
                                }}
                            />
                        ))}
                    </View>
                </View>
            )}

            {question === 1 && (
                <View style={styles.block}>
                    <Text style={styles.question}>Un souvenir de famille, même vague ?</Text>
                    <Text style={styles.hint}>
                        « Tu es arrivée pendant le déjeuner », « ton père a raté le dernier métro »… même approximatif,
                        ça resserre.
                    </Text>
                    <View style={styles.chips}>
                        {MEMORY_CHIPS.map((chip) => (
                            <CelestialChip
                                key={chip.key}
                                label={chip.label}
                                selected={answers.memory === chip.key}
                                onPress={() => set({ memory: chip.key })}
                            />
                        ))}
                    </View>

                    <GlassCard opacity="low" radius="md" padding="md">
                        <TextInput
                            style={styles.note}
                            value={answers.memory_note ?? ''}
                            onChangeText={(text) => set({ memory_note: text })}
                            placeholder="Ce qu’on t’a raconté (optionnel)"
                            placeholderTextColor={colors.onSurfaceMuted}
                            multiline
                            maxLength={200}
                        />
                    </GlassCard>

                    <GoldButton label="Continuer" onPress={next} disabled={!answers.memory} />
                </View>
            )}

            {question === 2 && (
                <View style={styles.block}>
                    <Text style={styles.question}>La date de naissance est-elle certaine ?</Text>
                    <Text style={styles.hint}>
                        Une naissance juste avant ou après minuit est parfois déclarée le mauvais jour. Si tu as un
                        doute, on cherchera sur les deux dates.
                    </Text>
                    <View style={styles.chips}>
                        <CelestialChip
                            label="Oui, certaine"
                            selected={answers.date_certain === true}
                            onPress={() => set({ date_certain: true })}
                        />
                        <CelestialChip
                            label="J’ai un doute"
                            selected={answers.date_certain === false}
                            onPress={() => set({ date_certain: false })}
                        />
                    </View>

                    <GoldButton
                        label="Voir ma fenêtre"
                        onPress={() => onSubmit(answers)}
                        disabled={answers.date_certain === undefined || busy}
                        loading={busy}
                    />
                </View>
            )}

            {question > 0 && <GhostButton label="Précédent" onPress={back} size="sm" />}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: spacing.xl,
    },
    progress: {
        ...typography.labelSm,
        color: colors.onSurfaceMuted,
    },
    block: {
        gap: spacing.lg,
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
    chips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    note: {
        ...typography.bodyMd,
        color: colors.onSurface,
        minHeight: 64,
        textAlignVertical: 'top',
        padding: 0,
    },
});
