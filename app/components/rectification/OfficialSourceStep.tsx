/**
 * Step 1 — "source officielle" (spec §3).
 *
 * This screen comes before any collection on purpose, and it is not a
 * formality: for most users the birth time is sitting in a free public record,
 * and a document beats an inference every time. Walking someone through a
 * ten-event questionnaire when a two-minute online request would give them the
 * exact minute would be a worse product, so the wizard leads with that.
 */

import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Linking, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { GlassCard, GoldButton, GhostButton } from '@/components/ui';
import { colors, spacing, radius, typography } from '@/theme';
import type { SourceChoice } from '@/services/rectification';

/** Free official routes, per country, with the online procedure where there is one. */
const OFFICIAL_ROUTES: { country: string; label: string; detail: string; url?: string }[] = [
    {
        country: 'France',
        label: 'Copie intégrale de l’acte de naissance',
        detail: 'Gratuite, demande en ligne, quelques jours. C’est la copie intégrale qui porte l’heure — pas l’extrait simple.',
        url: 'https://www.service-public.fr/particuliers/vosdroits/R1406',
    },
    {
        country: 'Belgique',
        label: 'Extrait d’acte de naissance',
        detail: 'Via ta commune ou le guichet en ligne fédéral.',
        url: 'https://www.ibz.rrn.fgov.be/fr/documents-didentite/mon-dossier/',
    },
    {
        country: 'Suisse',
        label: 'Acte de naissance, office de l’état civil',
        detail: 'À demander à l’office du lieu de naissance.',
    },
    {
        country: 'Québec',
        label: 'Copie d’acte — Directeur de l’état civil',
        detail: 'Demande en ligne ; l’heure figure sur la copie d’acte.',
        url: 'https://www.etatcivil.gouv.qc.ca/fr/demande-certificat.html',
    },
];

const OTHER_LEADS = [
    'Le livret de famille',
    'Ton carnet de santé',
    'Le bracelet de maternité',
    'La mémoire de tes parents, ou de qui était présent',
];

interface OfficialSourceStepProps {
    onChoose: (choice: SourceChoice, time?: string) => void;
    busy?: boolean;
}

export function OfficialSourceStep({ onChoose, busy }: OfficialSourceStepProps) {
    const [enteringTime, setEnteringTime] = useState(false);
    const [hour, setHour] = useState('');
    const [minute, setMinute] = useState('');

    const timeValid =
        /^\d{1,2}$/.test(hour) &&
        /^\d{1,2}$/.test(minute) &&
        Number(hour) < 24 &&
        Number(minute) < 60;

    const submitTime = () => {
        if (!timeValid) return;
        onChoose('has_time', `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Ton heure est peut-être déjà écrite quelque part</Text>
            <Text style={styles.intro}>
                Avant d’essayer de l’estimer, ça vaut le coup d’aller la chercher : dans la plupart des pays
                elle figure sur un document que tu peux demander gratuitement.
            </Text>

            <GlassCard opacity="low" radius="xl" padding="lg">
                {OFFICIAL_ROUTES.map((route, index) => (
                    <View key={route.country} style={index > 0 ? styles.routeSpaced : undefined}>
                        <Text style={styles.routeCountry}>{route.country}</Text>
                        <Text style={styles.routeLabel}>{route.label}</Text>
                        <Text style={styles.routeDetail}>{route.detail}</Text>
                        {route.url ? (
                            <Pressable
                                style={styles.link}
                                onPress={() => Linking.openURL(route.url as string)}
                                hitSlop={8}
                            >
                                <Text style={styles.linkText}>Faire la demande</Text>
                                <Feather name="arrow-up-right" size={13} color={colors.primary} />
                            </Pressable>
                        ) : null}
                    </View>
                ))}
            </GlassCard>

            <View style={styles.leadsBlock}>
                <Text style={styles.leadsTitle}>Autres pistes</Text>
                {OTHER_LEADS.map((lead) => (
                    <View key={lead} style={styles.leadRow}>
                        <View style={styles.leadDot} />
                        <Text style={styles.leadText}>{lead}</Text>
                    </View>
                ))}
            </View>

            {enteringTime ? (
                <GlassCard opacity="medium" radius="xl" padding="lg">
                    <Text style={styles.timeTitle}>Quelle heure est indiquée ?</Text>
                    <View style={styles.timeRow}>
                        <TextInput
                            style={styles.timeInput}
                            value={hour}
                            onChangeText={(text) => setHour(text.replace(/\D/g, '').slice(0, 2))}
                            placeholder="07"
                            placeholderTextColor={colors.onSurfaceMuted}
                            keyboardType="number-pad"
                            maxLength={2}
                        />
                        <Text style={styles.timeSeparator}>:</Text>
                        <TextInput
                            style={styles.timeInput}
                            value={minute}
                            onChangeText={(text) => setMinute(text.replace(/\D/g, '').slice(0, 2))}
                            placeholder="42"
                            placeholderTextColor={colors.onSurfaceMuted}
                            keyboardType="number-pad"
                            maxLength={2}
                        />
                    </View>
                    <GoldButton
                        label="Enregistrer"
                        onPress={submitTime}
                        disabled={!timeValid || busy}
                        loading={busy}
                    />
                    <View style={styles.spacer} />
                    <GhostButton label="Annuler" onPress={() => setEnteringTime(false)} size="sm" />
                </GlassCard>
            ) : (
                <View style={styles.actions}>
                    <GoldButton label="J’ai mon heure" onPress={() => setEnteringTime(true)} disabled={busy} />
                    <GhostButton label="Je fais la demande" onPress={() => onChoose('requested')} disabled={busy} />
                    <GhostButton
                        label="Impossible — essayons quand même"
                        onPress={() => onChoose('impossible')}
                        disabled={busy}
                    />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: spacing.xxl,
    },
    title: {
        ...typography.headlineMd,
        color: colors.onSurface,
    },
    intro: {
        ...typography.bodyMd,
        color: colors.onSurfaceMuted,
        marginTop: -spacing.lg,
    },
    routeSpaced: {
        marginTop: spacing.xl,
    },
    routeCountry: {
        ...typography.labelSm,
        color: colors.primary,
        marginBottom: spacing.xs,
    },
    routeLabel: {
        ...typography.titleMd,
        color: colors.onSurface,
    },
    routeDetail: {
        ...typography.bodySmall,
        color: colors.onSurfaceMuted,
        marginTop: spacing.xs,
    },
    link: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginTop: spacing.sm,
    },
    linkText: {
        ...typography.labelSm,
        color: colors.primary,
    },
    leadsBlock: {
        gap: spacing.sm,
    },
    leadsTitle: {
        ...typography.labelMd,
        color: colors.onSurface,
        marginBottom: spacing.xs,
    },
    leadRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    leadDot: {
        width: 4,
        height: 4,
        borderRadius: radius.full,
        backgroundColor: colors.onSurfaceMuted,
    },
    leadText: {
        ...typography.bodySmall,
        color: colors.onSurfaceMuted,
    },
    actions: {
        gap: spacing.md,
    },
    timeTitle: {
        ...typography.titleMd,
        color: colors.onSurface,
        marginBottom: spacing.lg,
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        marginBottom: spacing.xl,
    },
    timeInput: {
        ...typography.headlineMd,
        color: colors.onSurface,
        textAlign: 'center',
        backgroundColor: colors.surfaceContainerHigh,
        borderRadius: radius.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        minWidth: 84,
    },
    timeSeparator: {
        ...typography.headlineMd,
        color: colors.onSurfaceMuted,
    },
    spacer: {
        height: spacing.md,
    },
});
