/**
 * Ton Ciel — l'expérience complète sur un ciel de naissance donné :
 * voûte interactive, chasse aux dix astres, révélation de la constellation,
 * emblème et nommage.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions, type LayoutChangeEvent,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Easing, useSharedValue, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';

import { useTranslation } from 'react-i18next';

import { colors, radius, spacing, typography } from '@/theme';
import { GhostButton, GlassCard, GoldButton } from '@/components/ui';
import { SkyCanvas, type SkyCanvasHandle } from '@/components/sky/SkyCanvas';
import { ConstellationEmblem } from '@/components/sky/ConstellationEmblem';
import { SkyPosterSheet } from '@/components/sky/SkyPosterSheet';
import {
    buildCompanion, buildSkyModel, meetingLabel, whereSentence,
    type Companion, type Meeting, type PlanetKey, type SkyBirth,
} from '@/components/sky/sky-model';

/** Quelqu'un qu'on peut inviter dans son ciel */
export type SkyPartner = { id: number; name: string };
export type PartnerPositions = Record<PlanetKey, { lon: number; lat?: number }>;

const REVEAL_MS = 9000;

type Phase = 'hunt' | 'revealing' | 'naming' | 'done';

type Props = {
    birth: SkyBirth;
    /** Ligne sous le titre : date, heure et lieu de naissance */
    subtitle: string;
    /** false : heure de naissance inconnue, le ciel affiché est celui d'une heure par défaut */
    timeKnown?: boolean;
    /** Reprise : astres déjà trouvés (bit i = astre i) et nom déjà donné */
    initialDiscovered?: number;
    initialName?: string | null;
    /** Appelé à chaque nouvel astre trouvé, avec le masque complet */
    onDiscover?: (discovered: number) => void;
    /** Enregistre le nom de la constellation ; renvoie false en cas d'échec */
    onName?: (name: string) => Promise<boolean>;
    /** Ciel à deux : personnes que l'on peut inviter (absent : fonction masquée) */
    partners?: SkyPartner[];
    /** Charge les astres d'une de ces personnes ; null en cas d'échec */
    loadPartner?: (id: number) => Promise<PartnerPositions | null>;
    /** Affiche un bouton de fermeture (écran ouvert hors des onglets) */
    onClose?: () => void;
    /** Marge basse du panneau ; par défaut la zone sûre de l'appareil */
    bottomInset?: number;
};

export function SkyExperience({
    birth, subtitle, timeKnown = true,
    initialDiscovered = 0, initialName = null, onDiscover, onName, partners, loadPartner, onClose, bottomInset,
}: Props) {
    const windowSize = useWindowDimensions();
    // La voûte occupe la place réellement disponible (moins la barre d'onglets, par exemple).
    const [size, setSize] = useState({ width: windowSize.width, height: windowSize.height });
    const { width, height } = size;
    const onLayout = (e: LayoutChangeEvent) => {
        const { width: w, height: h } = e.nativeEvent.layout;
        if (w > 0 && h > 0 && (Math.abs(w - width) > 1 || Math.abs(h - height) > 1)) setSize({ width: w, height: h });
    };
    const insets = useSafeAreaInsets();
    const { t, i18n } = useTranslation();
    const language = i18n.language;
    const model = useMemo(() => buildSkyModel(birth, language), [birth, language]);
    const canvasRef = useRef<SkyCanvasHandle>(null);
    // On ouvre le ciel tourné vers la Lune : le premier astre est à portée de doigt.
    const moon = model.planets[1];
    // Constellation déjà nommée : on retrouve son ciel tel qu'on l'a laissé, figure tracée.
    const reveal = useSharedValue(initialName ? 1 : 0);

    const [discovered, setDiscovered] = useState(initialDiscovered);
    const [selected, setSelected] = useState<number | null>(null);
    const [phase, setPhase] = useState<Phase>(initialName ? 'done' : 'hunt');
    const [name, setName] = useState(initialName ?? '');
    const [saving, setSaving] = useState(false);
    const [posterOpen, setPosterOpen] = useState(false);
    const [nameError, setNameError] = useState(false);
    // Ciel à deux
    const [picking, setPicking] = useState(false);
    const [duo, setDuo] = useState<Companion | null>(null);
    const [duoLoading, setDuoLoading] = useState<number | null>(null);
    const [duoError, setDuoError] = useState(false);
    const bottom = (bottomInset ?? insets.bottom) + spacing.lg;

    const total = model.planets.length;
    const found = model.planets.filter((_, i) => (discovered >> i) & 1).length;
    const allFound = found === total;
    const planet = selected !== null ? model.planets[selected] : null;

    const onTapPlanet = (index: number) => {
        if (phase === 'revealing') return;
        if (!((discovered >> index) & 1)) {
            const next = discovered | (1 << index);
            setDiscovered(next);
            onDiscover?.(next);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } else {
            Haptics.selectionAsync();
        }
        setSelected(index);
    };

    const giveHint = () => {
        const next = model.planets.find((_, i) => !((discovered >> i) & 1));
        if (next) canvasRef.current?.lookAt(next.azimuth, next.altitude);
    };

    const startReveal = () => {
        setSelected(null);
        setPhase('revealing');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        reveal.value = withTiming(1, { duration: REVEAL_MS, easing: Easing.inOut(Easing.quad) });
    };

    const engraveName = async () => {
        const clean = name.trim();
        if (!clean || saving) return;
        setSaving(true);
        setNameError(false);
        const ok = onName ? await onName(clean) : true;
        setSaving(false);
        if (ok) {
            setName(clean);
            setPhase('done');
        } else {
            setNameError(true);
        }
    };

    const invite = async (partner: SkyPartner) => {
        if (!loadPartner || duoLoading !== null) return;
        setDuoLoading(partner.id);
        setDuoError(false);
        const positions = await loadPartner(partner.id);
        setDuoLoading(null);
        if (!positions) {
            setDuoError(true);
            return;
        }
        const companion = buildCompanion(model, partner.name, positions);
        setDuo(companion);
        setPicking(false);
        setSelected(null);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const first = companion.meetings[0];
        if (first) canvasRef.current?.lookAt(first.azimuth, first.altitude);
    };

    const showMeeting = (meeting: Meeting) => {
        Haptics.selectionAsync();
        setSelected(null);
        canvasRef.current?.lookAt(meeting.azimuth, meeting.altitude);
    };

    const leaveDuo = () => {
        setDuo(null);
        setPicking(false);
        setDuoError(false);
    };

    useEffect(() => {
        if (phase !== 'revealing') return;
        const id = setTimeout(() => setPhase('naming'), REVEAL_MS + 400);
        return () => clearTimeout(id);
    }, [phase]);

    return (
        <GestureHandlerRootView style={styles.root} onLayout={onLayout}>
            <LinearGradient
                colors={[colors.sky.zenith, colors.surfaceLowest, colors.surfaceContainer]}
                style={StyleSheet.absoluteFill}
            />
            <SkyCanvas
                ref={canvasRef}
                model={model}
                width={width}
                height={height}
                discoveredMask={discovered}
                initialAzimuth={moon.azimuth}
                initialAltitude={Math.max(8, moon.altitude + 12)}
                reveal={reveal}
                companion={duo}
                hideLabels={phase === 'naming' || posterOpen}
                onTapPlanet={onTapPlanet}
            />

            {/* En-tête */}
            <View pointerEvents="box-none" style={[styles.header, { top: insets.top + spacing.sm }]}>
                {onClose && (
                    <Pressable onPress={onClose} hitSlop={12} style={styles.close}>
                        <Feather name="x" size={20} color={colors.onSurface} />
                    </Pressable>
                )}
                <View pointerEvents="none" style={styles.headerText}>
                    <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>{duo ? t('sky.duoTitle', { name: duo.name }) : name.trim() && phase === 'done' ? name.trim() : t('sky.title')}</Text>
                    <Text style={styles.subtitle}>{subtitle}</Text>
                </View>
                <View pointerEvents="none" style={styles.counter}>
                    <Text style={styles.counterText}>{found}/{total}</Text>
                </View>
            </View>

            {/* Panneau bas */}
            {phase !== 'revealing' && phase !== 'naming' && !posterOpen && (
                <View pointerEvents="box-none" style={[styles.bottom, { bottom }]}>
                    <GlassCard opacity="medium" radius="xl" padding="lg">
                        {planet ? (
                            <View style={styles.row}>
                                <View style={[styles.glyphDot, { backgroundColor: planet.color }]}>
                                    <Text style={styles.glyph}>{planet.glyph}</Text>
                                </View>
                                <View style={styles.flex}>
                                    <Text style={styles.cardTitle}>{t('sky.planetIn', { planet: planet.name, sign: planet.signName })}</Text>
                                    <Text style={styles.cardBody}>{whereSentence(planet)}</Text>
                                    <Text style={styles.cardMeta}>{t('sky.guardian', { star: planet.guardian.name })}</Text>
                                </View>
                            </View>
                        ) : duo ? (
                            <View>
                                <View style={styles.legend}>
                                    <View style={[styles.legendDot, { backgroundColor: colors.sky.constellation }]} />
                                    <Text style={styles.legendText}>{t('sky.legendYou')}</Text>
                                    <View style={[styles.legendDot, { backgroundColor: colors.sky.companion }]} />
                                    <Text style={styles.legendText}>{duo.name}</Text>
                                </View>
                                <Text style={styles.cardBody}>
                                    {duo.meetings.length === 0
                                        ? t('sky.duoNone', { name: duo.name })
                                        : t('sky.duoMeetings', { count: duo.meetings.length })}
                                </Text>
                                {duo.meetings.length > 0 && (
                                    <View style={styles.chips}>
                                        {duo.meetings.map((m) => (
                                            <Pressable
                                                key={`${m.mine.key}-${m.theirs.key}`}
                                                onPress={() => showMeeting(m)}
                                                style={styles.chip}
                                            >
                                                <Text style={styles.chipText}>{meetingLabel(m)}</Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                )}
                            </View>
                        ) : picking ? (
                            <View>
                                <Text style={styles.cardTitle}>{t('sky.duoButton')}</Text>
                                <Text style={styles.cardBody}>
                                    {partners && partners.length > 0
                                        ? t('sky.pickAsk')
                                        : t('sky.pickEmpty')}
                                </Text>
                                {partners && partners.length > 0 && (
                                    <View style={styles.chips}>
                                        {partners.map((p) => (
                                            <Pressable
                                                key={p.id}
                                                onPress={() => invite(p)}
                                                style={[styles.chip, duoLoading === p.id && styles.chipBusy]}
                                            >
                                                <Text style={styles.chipText}>{p.name}</Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                )}
                                {duoError && (
                                    <Text style={[styles.cardBody, styles.error]}>
                                        {t('sky.duoError')}
                                    </Text>
                                )}
                            </View>
                        ) : (
                            <Text style={styles.cardBody}>
                                {phase === 'done'
                                    ? t('sky.doneBody')
                                    : t('sky.huntBody')}
                                {phase === 'hunt' && !timeKnown ? t('sky.noTimeNote') : ''}
                            </Text>
                        )}
                        {phase === 'done' && !planet && !duo && !picking && (
                            <View style={styles.actions}>
                                <GoldButton label={t('sky.posterButton')} onPress={() => setPosterOpen(true)} size="md" />
                                {partners && loadPartner && (
                                    <GhostButton label={t('sky.duoButton')} onPress={() => setPicking(true)} size="sm" />
                                )}
                            </View>
                        )}
                        {phase === 'done' && !planet && (duo || picking) && (
                            <View style={styles.actions}>
                                <GhostButton label={t('sky.backButton')} onPress={leaveDuo} size="sm" />
                            </View>
                        )}
                        {phase === 'hunt' && (
                            <View style={styles.actions}>
                                {allFound
                                    ? <GoldButton label={t('sky.revealButton')} onPress={startReveal} size="md" />
                                    : <GhostButton label={t('sky.hintButton')} onPress={giveHint} size="sm" />}
                            </View>
                        )}
                    </GlassCard>
                </View>
            )}

            {/* Révélation : emblème + nom */}
            {phase === 'naming' && (
                <View style={[styles.sheet, { paddingBottom: bottom }]}>
                    <GlassCard opacity="high" radius="xl" padding="xl" style={styles.sheetCard}>
                        <ConstellationEmblem nodes={model.constellation} size={Math.min(width - 96, 260)} />
                        <Text style={styles.sheetTitle}>{t('sky.namingTitle')}</Text>
                        <Text style={[styles.cardBody, styles.center]}>
                            {t('sky.namingBody')}
                        </Text>
                        <TextInput
                            value={name}
                            onChangeText={setName}
                            placeholder={t('sky.namePlaceholder')}
                            placeholderTextColor={colors.onSurfaceMuted}
                            maxLength={28}
                            style={styles.input}
                            returnKeyType="done"
                        />
                        {nameError && (
                            <Text style={[styles.cardBody, styles.center, styles.error]}>
                                {t('sky.nameError')}
                            </Text>
                        )}
                        <GoldButton label={t('sky.engraveButton')} onPress={engraveName} loading={saving} disabled={!name.trim()} size="md" />
                    </GlassCard>
                </View>
            )}

            {/* Poster partageable */}
            {posterOpen && (
                <SkyPosterSheet
                    model={model}
                    title={name.trim() || t('sky.posterDefaultTitle')}
                    subtitle={subtitle}
                    width={width}
                    height={height}
                    bottomInset={bottomInset ?? insets.bottom}
                    onClose={() => setPosterOpen(false)}
                />
            )}
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: colors.sky.zenith,
    },
    flex: { flex: 1 },
    center: { textAlign: 'center' },
    error: { color: colors.error },
    header: {
        position: 'absolute',
        left: spacing.lg,
        right: spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    close: {
        width: 40,
        height: 40,
        borderRadius: radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface.glass,
    },
    headerText: { flex: 1 },
    title: {
        ...typography.titleMd,
        fontFamily: typography.headlineMd.fontFamily,
        color: colors.onSurface,
    },
    subtitle: {
        ...typography.labelSm,
        color: colors.onSurfaceMuted,
    },
    counter: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.full,
        backgroundColor: colors.glow.gold,
    },
    counterText: {
        ...typography.labelMd,
        color: colors.primary,
    },
    bottom: {
        position: 'absolute',
        left: spacing.lg,
        right: spacing.lg,
    },
    row: {
        flexDirection: 'row',
        gap: spacing.md,
        alignItems: 'flex-start',
    },
    glyphDot: {
        width: 44,
        height: 44,
        borderRadius: radius.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    glyph: {
        ...typography.titleMd,
        color: colors.surfaceLowest,
    },
    cardTitle: {
        ...typography.titleMd,
        fontFamily: typography.headlineMd.fontFamily,
        color: colors.onSurface,
    },
    cardBody: {
        ...typography.bodyMd,
        color: colors.onSurface,
    },
    cardMeta: {
        ...typography.labelSm,
        color: colors.primary,
        marginTop: spacing.xs,
    },
    actions: {
        marginTop: spacing.lg,
        alignItems: 'center',
        gap: spacing.md,
    },
    legend: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: radius.full,
    },
    legendText: {
        ...typography.labelSm,
        color: colors.onSurfaceMuted,
        marginRight: spacing.sm,
    },
    chips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginTop: spacing.md,
    },
    chip: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: radius.full,
        backgroundColor: colors.surfaceContainerHigh,
    },
    chipBusy: { opacity: 0.5 },
    chipText: {
        ...typography.labelMd,
        color: colors.onSurface,
    },
    sheet: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        justifyContent: 'flex-end',
        paddingHorizontal: spacing.lg,
        backgroundColor: colors.overlay.default,
    },
    sheetCard: {
        alignItems: 'center',
        gap: spacing.md,
    },
    sheetTitle: {
        ...typography.headlineMd,
        color: colors.onSurface,
    },
    input: {
        ...typography.bodyLg,
        alignSelf: 'stretch',
        textAlign: 'center',
        color: colors.onSurface,
        backgroundColor: colors.surfaceContainerHigh,
        borderRadius: radius.md,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
    },
});
