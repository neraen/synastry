/**
 * Birth-time rectification wizard (spec §2).
 *
 * The screen holds no journey state of its own. It fetches the session, renders
 * whatever step the server reports, and re-renders whatever the server returns
 * after each answer. That is deliberate: the spec requires the journey to be
 * resumable at the exact step after the app is closed, and a wizard that tracks
 * its own position in component state cannot survive being killed.
 *
 * The only local state is the "adding an event" overlay, which is a sub-flow of
 * the collection step rather than a step of its own.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { TabHeader, GlassCard, GoldButton, GhostButton, Starfield } from '@/components/ui';
import { PrecisionDial } from '@/components/rectification/PrecisionDial';
import { OfficialSourceStep } from '@/components/rectification/OfficialSourceStep';
import { WindowStep } from '@/components/rectification/WindowStep';
import { CollectionStep } from '@/components/rectification/CollectionStep';
import { EventForm } from '@/components/rectification/EventForm';
import { ResultStep } from '@/components/rectification/ResultStep';
import { ActiveLoopStep } from '@/components/rectification/ActiveLoopStep';
import { colors, spacing, typography } from '@/theme';
import {
    getRectificationState,
    submitOfficialSource,
    submitWindow,
    addRectificationEvent,
    removeRectificationEvent,
    runRectification,
    adoptRectifiedTime,
    getNextQuestion,
    answerQuestion,
    type LoopAnswer,
    type EventInput,
    type RectificationState,
    type SourceChoice,
    type WindowAnswers,
} from '@/services/rectification';

export default function RectificationScreen() {
    const router = useRouter();

    const [state, setState] = useState<RectificationState | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [addingEvent, setAddingEvent] = useState(false);

    const fetchState = useCallback(
        () =>
            getRectificationState()
                .then(setState)
                .catch((e: Error) => setError(e.message))
                .finally(() => setLoading(false)),
        [],
    );

    useEffect(() => {
        fetchState();
    }, [fetchState]);

    const retry = () => {
        setLoading(true);
        setError(null);
        fetchState();
    };

    /**
     * Every mutation returns the whole state, so the screen never patches its
     * own copy — it replaces it. No divergence between client and server is
     * possible, which is what lets a half-finished journey be picked up on
     * another device.
     */
    const mutate = useCallback(async (action: () => Promise<RectificationState>) => {
        setBusy(true);
        setError(null);
        try {
            setState(await action());
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setBusy(false);
        }
    }, []);

    const onChooseSource = (choice: SourceChoice, time?: string) =>
        mutate(() => submitOfficialSource(choice, time));

    const onSubmitWindow = (answers: WindowAnswers) => mutate(() => submitWindow(answers));

    const onAddEvent = async (input: EventInput) => {
        await mutate(() => addRectificationEvent(input));
        setAddingEvent(false);
    };

    const onRemoveEvent = (index: number) =>
        Alert.alert('Retirer cet événement ?', 'Le calcul sera refait sans lui.', [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Retirer', style: 'destructive', onPress: () => mutate(() => removeRectificationEvent(index)) },
        ]);

    const onCalculate = () => mutate(runRectification);

    const onStartLoop = () => mutate(getNextQuestion);

    const onAnswerQuestion = (answer: LoopAnswer) => mutate(() => answerQuestion(answer));

    const onAdopt = () =>
        mutate(adoptRectifiedTime).then(() =>
            Alert.alert(
                'Heure enregistrée',
                'Ta carte utilise maintenant cette heure estimée. Un repère « heure estimée » apparaîtra partout où tes maisons sont affichées.',
            ),
        );

    if (loading) {
        return (
            <SafeAreaView style={styles.screen}>
                <Starfield />
                <View style={styles.centre}>
                    <ActivityIndicator color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    if (!state) {
        return (
            <SafeAreaView style={styles.screen}>
                <Starfield />
                <TabHeader onBack={() => router.back()} />
                <View style={styles.failure}>
                    <GlassCard opacity="medium" radius="xl" padding="lg">
                        <View style={styles.failureBody}>
                            <Text style={styles.failureTitle}>Le service est momentanément indisponible</Text>
                            <Text style={styles.failureText}>
                                Ton parcours n’a pas pu être chargé. Rien n’est perdu : tu reprendras exactement là où tu en étais.
                            </Text>
                            {__DEV__ && error ? <Text style={styles.error}>{error}</Text> : null}
                            <GhostButton label="Réessayer" onPress={retry} />
                        </View>
                    </GlassCard>
                </View>
            </SafeAreaView>
        );
    }

    const { session, dial } = state;
    const result = session.result;

    // The dial rides above the collection and result steps. It is pointedly
    // absent from the first screen, where there is nothing to be uncertain
    // about yet.
    const showDial = ['fenetre', 'collecte', 'resultat'].includes(session.step) && !addingEvent;

    return (
        <SafeAreaView style={styles.screen}>
            <Starfield />
            <TabHeader onBack={() => (addingEvent ? setAddingEvent(false) : router.back())} />

            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                {showDial ? (
                    <PrecisionDial
                        uncertaintyMinutes={dial.uncertainty_minutes}
                        window={session.window}
                        modeTime={result?.estimate?.time ?? null}
                        curve={result?.curve ?? null}
                        eventCount={dial.events}
                        caption={dial.missing[0] ?? `${dial.events} événement${dial.events > 1 ? 's' : ''} posé${dial.events > 1 ? 's' : ''}`}
                    />
                ) : null}

                {error ? (
                    <GlassCard opacity="medium" radius="md" padding="md">
                        <Text style={styles.error}>{error}</Text>
                    </GlassCard>
                ) : null}

                {addingEvent ? (
                    <EventForm onSave={onAddEvent} onCancel={() => setAddingEvent(false)} busy={busy} />
                ) : (
                    <StepBody
                        state={state}
                        busy={busy}
                        onChooseSource={onChooseSource}
                        onSubmitWindow={onSubmitWindow}
                        onStartAddEvent={() => setAddingEvent(true)}
                        onRemoveEvent={onRemoveEvent}
                        onCalculate={onCalculate}
                        onAdopt={onAdopt}
                        onStartLoop={onStartLoop}
                        onAnswerQuestion={onAnswerQuestion}
                        onDone={() => router.back()}
                    />
                )}

                <View style={styles.bottomSpacer} />
            </ScrollView>
        </SafeAreaView>
    );
}

interface StepBodyProps {
    state: RectificationState;
    busy: boolean;
    onChooseSource: (choice: SourceChoice, time?: string) => void;
    onSubmitWindow: (answers: WindowAnswers) => void;
    onStartAddEvent: () => void;
    onRemoveEvent: (index: number) => void;
    onCalculate: () => void;
    onAdopt: () => void;
    onStartLoop: () => void;
    onAnswerQuestion: (answer: LoopAnswer) => void;
    onDone: () => void;
}

function StepBody({
    state,
    busy,
    onChooseSource,
    onSubmitWindow,
    onStartAddEvent,
    onRemoveEvent,
    onCalculate,
    onAdopt,
    onStartLoop,
    onAnswerQuestion,
    onDone,
}: StepBodyProps) {
    const { session, dial } = state;

    switch (session.step) {
        case 'source_officielle':
            return <OfficialSourceStep onChoose={onChooseSource} busy={busy} />;

        case 'fenetre':
            return <WindowStep initial={session.window_answers} onSubmit={onSubmitWindow} busy={busy} />;

        case 'collecte':
        case 'calcul':
            return (
                <CollectionStep
                    events={session.events}
                    dial={dial}
                    onAdd={onStartAddEvent}
                    onRemove={onRemoveEvent}
                    onCalculate={onCalculate}
                    busy={busy}
                />
            );

        case 'boucle_active':
            // A question is on screen only while the loop still has one worth
            // asking; once it stops, the server clears it and the result stands.
            return session.pending_question ? (
                <ActiveLoopStep
                    question={session.pending_question}
                    questionNumber={session.asked_questions.length + 1}
                    onAnswer={onAnswerQuestion}
                    busy={busy}
                />
            ) : session.result ? (
                <ResultStep
                    result={session.result}
                    onAdopt={onAdopt}
                    onAddEvent={onStartAddEvent}
                    onStartLoop={onStartLoop}
                    busy={busy}
                />
            ) : null;

        case 'resultat':
        case 'adoption':
            return session.result ? (
                <ResultStep
                    result={session.result}
                    onAdopt={onAdopt}
                    onAddEvent={onStartAddEvent}
                    onStartLoop={onStartLoop}
                    busy={busy}
                />
            ) : (
                <CollectionStep
                    events={session.events}
                    dial={dial}
                    onAdd={onStartAddEvent}
                    onRemove={onRemoveEvent}
                    onCalculate={onCalculate}
                    busy={busy}
                />
            );

        case 'termine':
            return (
                <View style={styles.doneBlock}>
                    <Text style={styles.doneTitle}>
                        {session.known_time
                            ? `Ton heure de naissance est enregistrée : ${session.known_time}`
                            : 'Ton heure estimée est enregistrée'}
                    </Text>
                    <Text style={styles.doneBody}>
                        {session.known_time
                            ? 'C’est une heure exacte : tes maisons et ton Ascendant sont calculés sans marge d’erreur.'
                            : 'Tu peux l’affiner à tout moment en ajoutant un événement.'}
                    </Text>
                    <GoldButton label="Revenir à mon profil" onPress={onDone} />
                </View>
            );

        default:
            return null;
    }
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.surfaceLowest,
    },
    content: {
        paddingHorizontal: spacing.screenPadding,
        paddingTop: spacing.lg,
        gap: spacing.xxl,
    },
    centre: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    failure: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: spacing.screenPadding,
        paddingBottom: spacing.xxl,
    },
    failureBody: {
        gap: spacing.lg,
        alignItems: 'center',
    },
    failureTitle: {
        ...typography.headlineMd,
        color: colors.onSurface,
        textAlign: 'center',
    },
    failureText: {
        ...typography.bodyMd,
        color: colors.onSurfaceMuted,
        textAlign: 'center',
    },
    error: {
        ...typography.bodySmall,
        color: colors.error,
        textAlign: 'center',
    },
    doneBlock: {
        gap: spacing.lg,
    },
    doneTitle: {
        ...typography.headlineMd,
        color: colors.onSurface,
    },
    doneBody: {
        ...typography.bodyMd,
        color: colors.onSurfaceMuted,
    },
    bottomSpacer: {
        height: 120,
    },
});
