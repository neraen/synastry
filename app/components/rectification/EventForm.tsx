/**
 * Adding one life event (spec §5.2).
 *
 * One decision per screen, and the date is asked in the order human memory
 * actually works: year, then month, then day. Each level has an explicit
 * "je ne sais plus" — the wording matters, because a blank field reads as a
 * failure while a labelled button reads as a normal answer, and the spec is
 * clear that imprecision must be normalised rather than penalised.
 *
 * The precision level is never asked for. It is derived from how far down the
 * cascade the user got, server-side. Asking someone to classify their own
 * memory as "au mois près" would be jargon dressed as a form control.
 */

import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { CelestialChip, GoldButton, GhostButton, GlassCard } from '@/components/ui';
import { colors, spacing, radius, typography } from '@/theme';
import { EVENT_CATEGORIES, INTENSITY_LABELS, type EventInput, type Intensity } from '@/services/rectification';

const MONTHS = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const VALENCES: { key: NonNullable<EventInput['valence']>; label: string }[] = [
    { key: 'difficile', label: 'Difficile' },
    { key: 'heureux', label: 'Heureux' },
    { key: 'neutre', label: 'Neutre' },
];

type Screen = 'category' | 'year' | 'month' | 'day' | 'intensity' | 'character' | 'valence' | 'title';

const ORDER: Screen[] = ['category', 'year', 'month', 'day', 'intensity', 'character', 'valence', 'title'];

interface EventFormProps {
    onSave: (input: EventInput) => void;
    onCancel: () => void;
    busy?: boolean;
}

export function EventForm({ onSave, onCancel, busy }: EventFormProps) {
    const [screen, setScreen] = useState<Screen>('category');
    const [category, setCategory] = useState<string | null>(null);
    const [year, setYear] = useState('');
    const [month, setMonth] = useState<number | null>(null);
    const [day, setDay] = useState<number | null>(null);
    const [daySkipped, setDaySkipped] = useState(false);
    const [intensity, setIntensity] = useState<Intensity>('turning_point');
    const [sudden, setSudden] = useState(true);
    const [valence, setValence] = useState<EventInput['valence']>('neutre');
    const [title, setTitle] = useState('');

    const definition = useMemo(
        () => EVENT_CATEGORIES.find((c) => c.key === category),
        [category],
    );

    const advance = () => {
        const index = ORDER.indexOf(screen);
        // Skipping the month makes the day meaningless — jump straight past it.
        const skipDay = screen === 'month' && month === null;
        setScreen(ORDER[index + (skipDay ? 2 : 1)]);
    };

    const goBack = () => {
        const index = ORDER.indexOf(screen);
        if (index === 0) {
            onCancel();
            return;
        }
        setScreen(ORDER[index - 1]);
    };

    const yearValid = /^\d{4}$/.test(year) && Number(year) > 1900 && Number(year) <= new Date().getFullYear();

    const save = () => {
        onSave({
            year: Number(year),
            month,
            day,
            intensity,
            sudden,
            valence,
            category: category ?? 'autre',
            title: title.trim() || definition?.label || null,
        });
    };

    return (
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            {screen === 'category' && (
                <View style={styles.block}>
                    <Text style={styles.question}>Qu’est-ce qui s’est passé ?</Text>
                    <View style={styles.chips}>
                        {EVENT_CATEGORIES.map((item) => (
                            <View key={item.key}>
                                <CelestialChip
                                    label={item.label}
                                    selected={category === item.key}
                                    onPress={() => {
                                        setCategory(item.key);
                                        setSudden(item.sudden);
                                        setTitle(item.label);
                                        setScreen('year');
                                    }}
                                />
                                {/* Orients the user toward the events that carry the
                                    most signal, without explaining why. */}
                                {item.sudden ? <Text style={styles.badge}>précision ++</Text> : null}
                            </View>
                        ))}
                    </View>
                </View>
            )}

            {screen === 'year' && (
                <View style={styles.block}>
                    <Text style={styles.question}>En quelle année ?</Text>
                    <TextInput
                        style={styles.yearInput}
                        value={year}
                        onChangeText={(text) => setYear(text.replace(/\D/g, '').slice(0, 4))}
                        placeholder="2016"
                        placeholderTextColor={colors.onSurfaceMuted}
                        keyboardType="number-pad"
                        maxLength={4}
                    />
                    <GoldButton label="Continuer" onPress={advance} disabled={!yearValid} />
                </View>
            )}

            {screen === 'month' && (
                <View style={styles.block}>
                    <Text style={styles.question}>Quel mois ?</Text>
                    <View style={styles.chips}>
                        {MONTHS.map((label, index) => (
                            <CelestialChip
                                key={label}
                                label={label}
                                selected={month === index + 1}
                                onPress={() => {
                                    setMonth(index + 1);
                                    setScreen('day');
                                }}
                            />
                        ))}
                    </View>
                    <GhostButton
                        label="Je ne sais plus"
                        onPress={() => {
                            setMonth(null);
                            setDay(null);
                            setScreen('intensity');
                        }}
                        size="sm"
                    />
                </View>
            )}

            {screen === 'day' && (
                <View style={styles.block}>
                    <Text style={styles.question}>Quel jour ?</Text>

                    <View style={styles.dayGrid}>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((value) => (
                            <CelestialChip
                                key={value}
                                label={String(value)}
                                selected={day === value}
                                onPress={() => {
                                    setDay(value);
                                    setDaySkipped(false);
                                }}
                            />
                        ))}
                    </View>

                    {/* Never blocking, always concrete about what precision buys. */}
                    {daySkipped && definition ? (
                        <GlassCard opacity="low" radius="md" padding="md">
                            <View style={styles.hintRow}>
                                <Feather name="search" size={14} color={colors.primary} />
                                <Text style={styles.hintTitle}>Où retrouver la date</Text>
                            </View>
                            <Text style={styles.hintBody}>{definition.dayHint}</Text>
                            <Text style={styles.hintGain}>
                                Une date au jour près affine l’heure à la minute. Au mois près, elle ne sert qu’aux
                                cycles lents.
                            </Text>
                        </GlassCard>
                    ) : null}

                    <GoldButton label="Continuer" onPress={advance} disabled={day === null && !daySkipped} />
                    <GhostButton
                        label={daySkipped ? 'Continuer sans le jour' : 'Je ne sais plus'}
                        onPress={() => {
                            if (daySkipped) {
                                setDay(null);
                                advance();
                            } else {
                                setDay(null);
                                setDaySkipped(true);
                            }
                        }}
                        size="sm"
                    />
                </View>
            )}

            {screen === 'intensity' && (
                <View style={styles.block}>
                    <Text style={styles.question}>Quelle place ça a pris ?</Text>
                    <View style={styles.chips}>
                        {INTENSITY_LABELS.map((item) => (
                            <CelestialChip
                                key={item.key}
                                label={item.label}
                                selected={intensity === item.key}
                                onPress={() => {
                                    setIntensity(item.key);
                                    advance();
                                }}
                            />
                        ))}
                    </View>
                </View>
            )}

            {screen === 'character' && (
                <View style={styles.block}>
                    <Text style={styles.question}>C’est arrivé d’un coup, ou progressivement ?</Text>
                    <View style={styles.chips}>
                        <CelestialChip label="D’un coup" selected={sudden} onPress={() => setSudden(true)} />
                        <CelestialChip
                            label="Progressivement"
                            selected={!sudden}
                            onPress={() => setSudden(false)}
                        />
                    </View>
                    <GoldButton label="Continuer" onPress={advance} />
                </View>
            )}

            {screen === 'valence' && (
                <View style={styles.block}>
                    <Text style={styles.question}>Tu le vis comment, aujourd’hui ?</Text>
                    <Text style={styles.hint}>
                        Ça ne change rien au calcul — seulement la façon dont on t’en reparlera.
                    </Text>
                    <View style={styles.chips}>
                        {VALENCES.map((item) => (
                            <CelestialChip
                                key={item.key}
                                label={item.label}
                                selected={valence === item.key}
                                onPress={() => {
                                    setValence(item.key);
                                    advance();
                                }}
                            />
                        ))}
                    </View>
                </View>
            )}

            {screen === 'title' && (
                <View style={styles.block}>
                    <Text style={styles.question}>Tu veux le nommer ?</Text>
                    <GlassCard opacity="low" radius="md" padding="md">
                        <TextInput
                            style={styles.titleInput}
                            value={title}
                            onChangeText={setTitle}
                            placeholder={definition?.label ?? 'Un tournant'}
                            placeholderTextColor={colors.onSurfaceMuted}
                            maxLength={80}
                        />
                    </GlassCard>
                    <GoldButton label="Ajouter cet événement" onPress={save} loading={busy} disabled={busy} />
                </View>
            )}

            <GhostButton label={screen === 'category' ? 'Annuler' : 'Précédent'} onPress={goBack} size="sm" />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: spacing.xl,
        paddingBottom: spacing.xxxl,
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
    badge: {
        ...typography.labelSm,
        color: colors.primary,
        fontSize: 10,
        marginTop: spacing.xs,
        marginLeft: spacing.sm,
    },
    dayGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    yearInput: {
        ...typography.headlineLg,
        color: colors.onSurface,
        textAlign: 'center',
        backgroundColor: colors.surfaceContainerHigh,
        borderRadius: radius.md,
        paddingVertical: spacing.lg,
    },
    titleInput: {
        ...typography.bodyMd,
        color: colors.onSurface,
        padding: 0,
    },
    hintRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    hintTitle: {
        ...typography.labelMd,
        color: colors.onSurface,
    },
    hintBody: {
        ...typography.bodySmall,
        color: colors.onSurfaceMuted,
        marginTop: spacing.sm,
    },
    hintGain: {
        ...typography.bodySmall,
        color: colors.secondary,
        marginTop: spacing.sm,
    },
});
