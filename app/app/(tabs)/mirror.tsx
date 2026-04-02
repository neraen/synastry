import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import { useTranslation } from 'react-i18next';
import { Feather } from '@expo/vector-icons';

import { useAuth } from '@/contexts/AuthContext';
import { GlassCard, GoldButton, GhostButton, TabHeader, FormattedText } from '@/components/ui';
import { colors, radius, fonts } from '@/theme';
import {
    getMirrorTransits,
    getMirrorInterpretation,
    getPlanetNameFr,
    getZodiacSignFr,
    type MirrorAspect,
    type MirrorTransitsData,
    type UnlockedRange,
} from '@/services/astrology';

// ─── Constants ────────────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAX_AGE = 80;
const H_PADDING = 24;
const PINS_FILE = `${FileSystem.documentDirectory}mirror_pins.json`;

const ASPECT_COLORS: Record<string, string> = {
    conjunction: '#2dd4bf',
    trine:       '#a78bfa',
    sextile:     '#9ca3af',
    square:      '#fb923c',
    opposition:  '#fbbf24',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface PinnedEvent {
    age: number;
    label: string;
}

// ─── Persistence ──────────────────────────────────────────────────────────────

async function loadPins(): Promise<PinnedEvent[]> {
    try {
        const info = await FileSystem.getInfoAsync(PINS_FILE);
        if (!info.exists) return [];
        const raw = await FileSystem.readAsStringAsync(PINS_FILE);
        return JSON.parse(raw) as PinnedEvent[];
    } catch {
        return [];
    }
}

async function savePins(pins: PinnedEvent[]): Promise<void> {
    await FileSystem.writeAsStringAsync(PINS_FILE, JSON.stringify(pins));
}

// ─── Age Slider ───────────────────────────────────────────────────────────────

function AgeSlider({
    age,
    onAgeChange,
    onSlidingComplete,
    unlockedRanges,
}: {
    age: number;
    onAgeChange: (age: number) => void;
    onSlidingComplete: (age: number) => void;
    unlockedRanges: UnlockedRange[] | null;
}) {
    const trackRef = useRef<View>(null);
    const trackWidth = useRef(SCREEN_WIDTH - H_PADDING * 2 - 24);
    const trackPageX = useRef(0);
    const [trackWidthState, setTrackWidthState] = useState(trackWidth.current);

    const thumbLeft = (age / MAX_AGE) * trackWidthState;

    const pageXToAge = (pageX: number): number => {
        const localX = pageX - trackPageX.current;
        const clamped = Math.max(0, Math.min(trackWidth.current, localX));
        return Math.round((clamped / trackWidth.current) * MAX_AGE);
    };

    const isCurrentAgeLocked = (): boolean => {
        if (!unlockedRanges) return false;
        return !unlockedRanges.some((r) => age >= r.min && age <= r.max);
    };

    const trackColor = isCurrentAgeLocked() ? colors.onSurfaceMuted : colors.primary;

    return (
        <View style={sliderStyles.container}>
            <View
                ref={trackRef}
                style={sliderStyles.track}
                onLayout={() => {
                    trackRef.current?.measure((_x, _y, width, _h, pageX) => {
                        trackWidth.current = width;
                        trackPageX.current = pageX;
                        setTrackWidthState(width);
                    });
                }}
                onStartShouldSetResponder={() => true}
                onMoveShouldSetResponder={() => true}
                onResponderGrant={(e) => {
                    onAgeChange(pageXToAge(e.nativeEvent.pageX));
                }}
                onResponderMove={(e) => {
                    onAgeChange(pageXToAge(e.nativeEvent.pageX));
                }}
                onResponderRelease={(e) => {
                    const finalAge = pageXToAge(e.nativeEvent.pageX);
                    onAgeChange(finalAge);
                    onSlidingComplete(finalAge);
                }}
                onResponderTerminate={(e) => {
                    const finalAge = pageXToAge(e.nativeEvent.pageX);
                    onSlidingComplete(finalAge);
                }}
            >
                {/* Filled portion */}
                <View style={[sliderStyles.fill, { width: thumbLeft, backgroundColor: trackColor }]} />

                {/* Locked zone overlays */}
                {unlockedRanges && (
                    <LockedZones trackWidth={trackWidthState} unlockedRanges={unlockedRanges} />
                )}

                {/* Thumb */}
                <View
                    style={[
                        sliderStyles.thumb,
                        { left: thumbLeft - 12, backgroundColor: trackColor },
                    ]}
                />
            </View>

            {/* Tick labels */}
            <View style={sliderStyles.ticks}>
                {([0, 10, 20, 30, 40, 50, 60, 70, 80] as const).map((tick) => (
                    <Text
                        key={tick}
                        style={[sliderStyles.tick, tick === age && sliderStyles.tickActive]}
                    >
                        {tick}
                    </Text>
                ))}
            </View>
        </View>
    );
}

function LockedZones({
    trackWidth,
    unlockedRanges,
}: {
    trackWidth: number;
    unlockedRanges: UnlockedRange[];
}) {
    const locked: Array<{ start: number; end: number }> = [];
    const sorted = [...unlockedRanges].sort((a, b) => a.min - b.min);

    let cursor = 0;
    for (const r of sorted) {
        if (r.min > cursor) locked.push({ start: cursor, end: r.min });
        cursor = r.max + 1;
    }
    if (cursor <= MAX_AGE) locked.push({ start: cursor, end: MAX_AGE });

    return (
        <>
            {locked.map((zone, i) => (
                <View
                    key={i}
                    style={[
                        sliderStyles.lockedZone,
                        {
                            left: (zone.start / MAX_AGE) * trackWidth,
                            width: ((zone.end - zone.start) / MAX_AGE) * trackWidth,
                        },
                    ]}
                />
            ))}
        </>
    );
}

const sliderStyles = StyleSheet.create({
    container: { paddingVertical: 8 },
    track: {
        height: 6,
        backgroundColor: colors.surfaceVariant,
        borderRadius: radius.full,
        position: 'relative',
        marginHorizontal: 12,
        overflow: 'visible',
    },
    fill: {
        position: 'absolute',
        left: 0,
        top: 0,
        height: '100%',
        borderRadius: radius.full,
    },
    thumb: {
        width: 24,
        height: 24,
        borderRadius: 12,
        position: 'absolute',
        top: -9,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
        elevation: 4,
    },
    lockedZone: {
        position: 'absolute',
        top: 0,
        height: '100%',
        backgroundColor: 'rgba(255,255,255,0.12)',
    },
    ticks: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 12,
        marginHorizontal: 12,
    },
    tick: {
        fontFamily: fonts.body.regular,
        fontSize: 10,
        color: colors.onSurfaceMuted,
    },
    tickActive: {
        color: colors.primary,
        fontFamily: fonts.body.bold,
    },
});

// ─── ActiveAspects ────────────────────────────────────────────────────────────

function ActiveAspects({ aspects }: { aspects: MirrorAspect[] }) {
    const { t, i18n } = useTranslation();
    const isFr = i18n.language.startsWith('fr');

    return (
        <GlassCard style={styles.card}>
            <Text style={styles.sectionTitle}>{t('mirror.activeAspectsTitle')}</Text>
            {aspects.length === 0 ? (
                <Text style={styles.emptyText}>{t('mirror.noAspects')}</Text>
            ) : (
                aspects.map((aspect, i) => {
                    const color = ASPECT_COLORS[aspect.aspect_type] ?? '#9ca3af';
                    const transit = isFr ? getPlanetNameFr(aspect.transit_planet) : aspect.transit_planet;
                    const natal = isFr ? getPlanetNameFr(aspect.natal_planet) : aspect.natal_planet;
                    const type = t(`mirror.aspectTypes.${aspect.aspect_type}`, { defaultValue: aspect.aspect_type });

                    return (
                        <View key={i} style={styles.aspectRow}>
                            {/* Intensity bar */}
                            <View style={styles.intensityBarBg}>
                                <View
                                    style={[
                                        styles.intensityBarFill,
                                        { width: `${Math.round(aspect.intensity * 100)}%`, backgroundColor: color },
                                    ]}
                                />
                            </View>
                            {/* Info row */}
                            <View style={styles.aspectInfoRow}>
                                <Text style={styles.aspectSymbol}>{aspect.symbol}</Text>
                                <Text style={styles.planetLabel}>{transit}</Text>
                                <Text style={styles.aspectTypeLabel}>{type}</Text>
                                <Text style={styles.planetLabel}>{natal}</Text>
                                <View style={[styles.badge, { backgroundColor: color + '22', borderColor: color }]}>
                                    <Text style={[styles.badgeText, { color }]}>{aspect.orb_exact.toFixed(1)}°</Text>
                                </View>
                            </View>
                        </View>
                    );
                })
            )}
        </GlassCard>
    );
}

// ─── Transit grid ─────────────────────────────────────────────────────────────

const MAIN_PLANETS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];

function TransitGrid({
    positions,
}: {
    positions: Record<string, { Position: number; Sign: string; Retrograde: string }>;
}) {
    const { t, i18n } = useTranslation();
    const isFr = i18n.language.startsWith('fr');

    return (
        <GlassCard style={styles.card}>
            <Text style={styles.sectionTitle}>{t('mirror.transitPositionsTitle')}</Text>
            <View style={styles.planetGrid}>
                {MAIN_PLANETS.map((planet) => {
                    const data = positions[planet];
                    if (!data) return null;
                    return (
                        <View key={planet} style={styles.planetCell}>
                            <Text style={styles.planetCellName}>
                                {isFr ? getPlanetNameFr(planet) : planet}
                            </Text>
                            <Text style={styles.planetCellSign}>
                                {isFr ? getZodiacSignFr(data.Sign) : data.Sign}
                                {data.Retrograde === 'Yes' ? ' ℞' : ''}
                            </Text>
                        </View>
                    );
                })}
            </View>
        </GlassCard>
    );
}

// ─── Pin Modal ────────────────────────────────────────────────────────────────

function PinModal({
    visible,
    initialValue,
    onSave,
    onClose,
}: {
    visible: boolean;
    initialValue: string;
    onSave: (label: string) => void;
    onClose: () => void;
}) {
    const { t } = useTranslation();
    const [text, setText] = useState(initialValue);

    useEffect(() => {
        if (visible) setText(initialValue);
    }, [visible, initialValue]);

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.modalOverlay}>
                <TouchableWithoutFeedback onPress={onClose}>
                    <View style={StyleSheet.absoluteFill} />
                </TouchableWithoutFeedback>
                <View style={styles.modalSheet}>
                    <Text style={styles.modalTitle}>{t('mirror.pinModalTitle')}</Text>
                    <TextInput
                        style={styles.pinInput}
                        value={text}
                        onChangeText={setText}
                        placeholder={t('mirror.pinModalPlaceholder')}
                        placeholderTextColor={colors.onSurfaceMuted}
                        multiline
                        autoFocus
                    />
                    <GoldButton
                        label={t('mirror.pinModalSave')}
                        onPress={() => {
                            onSave(text);
                            onClose();
                        }}
                    />
                </View>
            </View>
        </Modal>
    );
}

// ─── Premium Modal ────────────────────────────────────────────────────────────

function PremiumModal({
    visible,
    unlockedRanges,
    onClose,
}: {
    visible: boolean;
    unlockedRanges: UnlockedRange[];
    onClose: () => void;
}) {
    const { t } = useTranslation();

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.modalOverlay}>
                <TouchableWithoutFeedback onPress={onClose}>
                    <View style={StyleSheet.absoluteFill} />
                </TouchableWithoutFeedback>
                <View style={styles.modalSheet}>
                    <Feather name="lock" size={32} color={colors.primary} style={styles.lockIcon} />
                    <Text style={styles.premiumTitle}>{t('mirror.premiumTitle')}</Text>
                    <Text style={styles.premiumSubtitle}>{t('mirror.premiumSubtitle')}</Text>

                    <Text style={styles.unlockedLabel}>{t('mirror.premiumUnlocked')}</Text>
                    {unlockedRanges.map((r, i) => (
                        <Text key={i} style={styles.unlockedRange}>
                            {'  '}• {r.min}–{r.max} ans
                        </Text>
                    ))}

                    <View style={styles.premiumActions}>
                        <GoldButton
                            label={t('mirror.premiumCta')}
                            onPress={() => {
                                onClose();
                                router.push('/premium');
                            }}
                        />
                        <GhostButton label={t('common.cancel')} onPress={onClose} />
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MirrorScreen() {
    const { user } = useAuth();
    const { t } = useTranslation();

    const initialAge = useMemo<number>(() => {
        const bd = user?.birthProfile?.birthDate;
        if (!bd) return 30;
        const years = (Date.now() - new Date(bd).getTime()) / (365.25 * 24 * 3600 * 1000);
        return Math.max(0, Math.min(MAX_AGE, Math.floor(years)));
    }, [user?.birthProfile?.birthDate]);

    const [age, setAge] = useState<number>(initialAge);
    const [transits, setTransits] = useState<MirrorTransitsData | null>(null);
    const [interpretation, setInterpretation] = useState<string>('');
    const [isLoadingTransits, setIsLoadingTransits] = useState(false);
    const [isLoadingInterp, setIsLoadingInterp] = useState(false);
    const [unlockedRanges, setUnlockedRanges] = useState<UnlockedRange[] | null>(null);
    const [showPremiumModal, setShowPremiumModal] = useState(false);
    const [pinnedEvents, setPinnedEvents] = useState<PinnedEvent[]>([]);
    const [showPinModal, setShowPinModal] = useState(false);

    const currentPin = pinnedEvents.find((p) => p.age === age);

    useEffect(() => {
        loadPins().then(setPinnedEvents);
    }, []);

    useEffect(() => {
        setAge(initialAge);
        fetchTransits(initialAge);
        fetchInterpretation(initialAge);
    }, [initialAge]);

    const handlePremiumError = useCallback((err: unknown) => {
        const payload = (err as any)?.payload;
        if ((err as any)?.status === 403 && payload?.error === 'premium_required') {
            setUnlockedRanges(payload.unlocked_ranges ?? []);
            setShowPremiumModal(true);
        }
    }, []);

    const fetchTransits = useCallback(async (targetAge: number) => {
        setIsLoadingTransits(true);
        setTransits(null);
        setInterpretation('');
        try {
            const res = await getMirrorTransits(targetAge);
            setTransits({
                age: res.age!,
                target_date: res.target_date!,
                target_year: res.target_year!,
                natal_positions: res.natal_positions!,
                transit_positions: res.transit_positions!,
                aspects: res.aspects,
                global_intensity: res.global_intensity!,
            });
            setUnlockedRanges(null);
        } catch (err) {
            handlePremiumError(err);
        } finally {
            setIsLoadingTransits(false);
        }
    }, [handlePremiumError]);

    const fetchInterpretation = useCallback(
        async (targetAge: number) => {
            setIsLoadingInterp(true);
            setInterpretation('');
            try {
                const pin = pinnedEvents.find((p) => p.age === targetAge);
                const res = await getMirrorInterpretation(targetAge, pin?.label);
                if (res.interpretation) {
                    setInterpretation(res.interpretation);
                }
            } catch (err) {
                handlePremiumError(err);
            } finally {
                setIsLoadingInterp(false);
            }
        },
        [pinnedEvents, handlePremiumError]
    );

    const handleSavePin = useCallback(
        async (label: string) => {
            const updated = [
                ...pinnedEvents.filter((p) => p.age !== age),
                ...(label.trim() ? [{ age, label: label.trim() }] : []),
            ];
            setPinnedEvents(updated);
            await savePins(updated);
        },
        [age, pinnedEvents]
    );

    return (
        <View style={styles.screen}>
            <SafeAreaView style={styles.safeArea}>
            <TabHeader />
            <View style={styles.titleBlock}>
                <Text style={styles.pageTitle}>{t('mirror.title')}</Text>
                <Text style={styles.pageSubtitle}>{t('mirror.subtitle')}</Text>
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* ── Slider card ─────────────────────────────────────────── */}
                <GlassCard style={styles.card}>
                    <View style={styles.ageRow}>
                        <Text style={styles.ageBig}>{t('mirror.ageLabel', { age })}</Text>
                        {transits && (
                            <Text style={styles.yearBadge}>
                                {t('mirror.yearLabel', { year: transits.target_year })}
                            </Text>
                        )}
                    </View>

                    {transits && (
                        <View style={styles.intensityRow}>
                            <Text style={styles.intensityLabel}>
                                {t('mirror.intensityLabel')}
                            </Text>
                            <View style={styles.intensityTrack}>
                                <View
                                    style={[
                                        styles.intensityFill,
                                        { width: `${Math.round(transits.global_intensity * 100)}%` },
                                    ]}
                                />
                            </View>
                            <Text style={styles.intensityPct}>
                                {Math.round(transits.global_intensity * 100)}%
                            </Text>
                        </View>
                    )}

                    <AgeSlider
                        age={age}
                        onAgeChange={setAge}
                        onSlidingComplete={(a) => {
                            fetchTransits(a);
                            fetchInterpretation(a);
                        }}
                        unlockedRanges={unlockedRanges}
                    />

                    <Text style={styles.sliderHint}>{t('mirror.sliderHint')}</Text>
                    {isLoadingTransits && (
                        <ActivityIndicator color={colors.primary} style={{ marginTop: 12 }} />
                    )}
                </GlassCard>

                {/* ── Transit positions ────────────────────────────────────── */}
                {transits && <TransitGrid positions={transits.transit_positions} />}

                {/* ── Active aspects ───────────────────────────────────────── */}
                {transits && <ActiveAspects aspects={transits.aspects} />}

                {/* ── Interpretation ───────────────────────────────────────── */}
                <GlassCard style={styles.card}>
                    <Text style={styles.sectionTitle}>{t('mirror.interpretationTitle')}</Text>
                    {isLoadingInterp ? (
                        <View style={styles.interpRow}>
                            <ActivityIndicator color={colors.primary} />
                            <Text style={styles.interpLoadingText}>
                                {t('mirror.interpretationLoading')}
                            </Text>
                        </View>
                    ) : interpretation ? (
                        <FormattedText text={interpretation} style={styles.interpText} />
                    ) : (
                        <Text style={styles.emptyText}>{t('mirror.sliderHint')}</Text>
                    )}
                </GlassCard>

                {/* ── Pinned event ─────────────────────────────────────────── */}
                {currentPin && (
                    <GlassCard style={styles.card}>
                        <View style={styles.pinCard}>
                            <Feather name="bookmark" size={14} color={colors.primary} />
                            <Text style={styles.pinText}>
                                {t('mirror.pinnedEventLabel', { label: currentPin.label })}
                            </Text>
                        </View>
                    </GlassCard>
                )}
                <View style={styles.pinBtnRow}>
                    <GhostButton
                        label={t('mirror.pinButton')}
                        onPress={() => setShowPinModal(true)}
                    />
                </View>

                <View style={{ height: 120 }} />
            </ScrollView>
            </SafeAreaView>

            {/* ── Modals ──────────────────────────────────────────────────── */}
            <PinModal
                visible={showPinModal}
                initialValue={currentPin?.label ?? ''}
                onSave={handleSavePin}
                onClose={() => setShowPinModal(false)}
            />

            {unlockedRanges && (
                <PremiumModal
                    visible={showPremiumModal}
                    unlockedRanges={unlockedRanges}
                    onClose={() => setShowPremiumModal(false)}
                />
            )}
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.surfaceLowest,
    },
    safeArea: { flex: 1 },
    scroll: { flex: 1 },
    scrollContent: {
        paddingHorizontal: H_PADDING,
        flexGrow: 1,
    },
    titleBlock: {
        paddingHorizontal: H_PADDING,
        paddingTop: 4,
        paddingBottom: 12,
        gap: 4,
    },
    pageTitle: {
        fontFamily: fonts.display.bold,
        fontSize: 24,
        color: colors.onSurface,
    },
    pageSubtitle: {
        fontFamily: fonts.body.regular,
        fontSize: 13,
        color: colors.onSurfaceMuted,
    },

    // ── Card ──
    card: {
        marginBottom: 16,
    },

    // ── Age row ──
    ageRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 12,
        marginBottom: 8,
    },
    ageBig: {
        fontFamily: fonts.display.bold,
        fontSize: 26,
        color: colors.onSurface,
    },
    yearBadge: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        color: colors.onSurfaceMuted,
    },

    // ── Intensity ──
    intensityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    intensityLabel: {
        fontFamily: fonts.body.regular,
        fontSize: 12,
        color: colors.onSurfaceMuted,
    },
    intensityTrack: {
        flex: 1,
        height: 4,
        backgroundColor: colors.surfaceVariant,
        borderRadius: radius.full,
        overflow: 'hidden',
    },
    intensityFill: {
        height: '100%',
        backgroundColor: colors.primary,
        borderRadius: radius.full,
    },
    intensityPct: {
        fontFamily: fonts.body.semiBold,
        fontSize: 12,
        color: colors.primary,
    },
    sliderHint: {
        fontFamily: fonts.body.regular,
        fontSize: 12,
        color: colors.onSurfaceMuted,
        textAlign: 'center',
        marginTop: 4,
    },

    // ── Section title ──
    sectionTitle: {
        fontFamily: fonts.display.medium,
        fontSize: 15,
        color: colors.onSurface,
        marginBottom: 12,
    },
    emptyText: {
        fontFamily: fonts.body.regular,
        fontSize: 13,
        color: colors.onSurfaceMuted,
        textAlign: 'center',
        paddingVertical: 8,
    },

    // ── Planets grid ──
    planetGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    planetCell: {
        backgroundColor: colors.surfaceVariant,
        borderRadius: radius.md,
        paddingHorizontal: 10,
        paddingVertical: 6,
        minWidth: 76,
    },
    planetCellName: {
        fontFamily: fonts.body.regular,
        fontSize: 10,
        color: colors.onSurfaceMuted,
        marginBottom: 2,
    },
    planetCellSign: {
        fontFamily: fonts.body.semiBold,
        fontSize: 13,
        color: colors.onSurface,
    },

    // ── Aspects ──
    aspectRow: {
        marginBottom: 12,
    },
    intensityBarBg: {
        height: 3,
        backgroundColor: colors.surfaceVariant,
        borderRadius: radius.full,
        overflow: 'hidden',
        marginBottom: 6,
    },
    intensityBarFill: {
        height: '100%',
        borderRadius: radius.full,
    },
    aspectInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'wrap',
    },
    aspectSymbol: {
        fontSize: 16,
        color: colors.primary,
    },
    planetLabel: {
        fontFamily: fonts.body.semiBold,
        fontSize: 13,
        color: colors.onSurface,
    },
    aspectTypeLabel: {
        fontFamily: fonts.body.regular,
        fontSize: 12,
        color: colors.onSurfaceMuted,
        fontStyle: 'italic',
    },
    badge: {
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: radius.full,
        borderWidth: 1,
        flexShrink: 0,
    },
    badgeText: {
        fontFamily: fonts.body.semiBold,
        fontSize: 10,
    },

    // ── Interpretation ──
    interpRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 4,
    },
    interpLoadingText: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        color: colors.onSurfaceMuted,
    },
    interpText: {
        fontFamily: fonts.body.regular,
        fontSize: 15,
        lineHeight: 24,
        color: colors.onSurface,
    },

    // ── Pin ──
    pinCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
    },
    pinText: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        color: colors.onSurface,
        flex: 1,
        lineHeight: 20,
    },
    pinBtnRow: {
        marginBottom: 16,
    },

    // ── Modals ──
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    modalSheet: {
        backgroundColor: colors.surfaceContainerHigh,
        borderTopLeftRadius: radius.xl,
        borderTopRightRadius: radius.xl,
        padding: 24,
        paddingBottom: 40,
        gap: 16,
    },
    modalTitle: {
        fontFamily: fonts.display.bold,
        fontSize: 18,
        color: colors.onSurface,
    },
    pinInput: {
        backgroundColor: colors.surfaceVariant,
        borderRadius: radius.md,
        padding: 12,
        fontFamily: fonts.body.regular,
        fontSize: 14,
        color: colors.onSurface,
        minHeight: 80,
        textAlignVertical: 'top',
    },

    // ── Premium modal ──
    lockIcon: {
        alignSelf: 'center',
    },
    premiumTitle: {
        fontFamily: fonts.display.bold,
        fontSize: 20,
        color: colors.onSurface,
        textAlign: 'center',
    },
    premiumSubtitle: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        color: colors.onSurfaceMuted,
        textAlign: 'center',
        lineHeight: 20,
    },
    unlockedLabel: {
        fontFamily: fonts.body.semiBold,
        fontSize: 13,
        color: colors.onSurfaceMuted,
    },
    unlockedRange: {
        fontFamily: fonts.body.regular,
        fontSize: 13,
        color: colors.onSurface,
    },
    premiumActions: {
        gap: 10,
        marginTop: 4,
    },
});