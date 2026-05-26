/**
 * Transits Screen
 * - "Upcoming" tab: AI-generated transit predictions (timeline)
 * - "Calendar" tab: month calendar with color-coded aspect dots per day
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    RefreshControl,
    Pressable,
    Modal,
    Dimensions,
    TouchableWithoutFeedback,
    TextInput,
} from 'react-native';

const { width: SCREEN_WIDTH, height: WINDOW_HEIGHT } = Dimensions.get('window');
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import { cacheGet, cacheSet, cacheInvalidatePrefix } from '@/services/cache';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, spacing, radius, fonts } from '@/theme';
import { GlassCard, GoldButton, GhostButton, FormattedText, TabHeader, HelpModal, NoBirthProfileCard, Starfield } from '@/components/ui';
import { LoaderOrbitTrio, LoaderSaturn } from '@/components/loaders';
import { useAuth } from '@/contexts/AuthContext';
import { usePremium } from '@/hooks/usePremium';
import { router } from 'expo-router';
import {
    getUpcomingTransits,
    getCalendarTransits,
    getTransitInterpretation,
    getMirrorTransits,
    getMirrorInterpretation,
    getPlanetNameFr,
    getZodiacSignFr,
    UpcomingTransit,
    CalendarAspect,
    type MirrorAspect,
    type MirrorTransitsData,
    type MirrorChapter,
    type MirrorMilestone,
    type UnlockedRange,
} from '@/services/astrology';

// ─── Aspect color config ──────────────────────────────────────────────────────

const ASPECT_COLORS: Record<string, string> = {
    conjunction: '#e9c349',  // gold
    trine:       '#4ade80',  // green
    sextile:     '#60a5fa',  // blue
    square:      '#fb923c',  // orange
    opposition:  '#cf6679',  // red-pink
};

function aspectColor(type: string): string {
    return ASPECT_COLORS[type] ?? colors.onSurfaceMuted;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMonth(year: number, month: number, locale: string): string {
    return new Date(year, month - 1, 1).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', {
        month: 'long',
        year: 'numeric',
    });
}

/** Returns Mon=0 … Sun=6 for the first day of the month */
function firstDayOffset(year: number, month: number): number {
    const dow = new Date(year, month - 1, 1).getDay(); // 0=Sun … 6=Sat
    return (dow + 6) % 7; // shift so Mon=0
}

function daysInMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate();
}

function prevMonth(year: number, month: number): { year: number; month: number } {
    return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

function nextMonth(year: number, month: number): { year: number; month: number } {
    return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

function toMonthKey(year: number, month: number): string {
    return `${year}-${String(month).padStart(2, '0')}`;
}

function toDateKey(year: number, month: number, day: number): string {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// ─── Sub-components: Timeline ─────────────────────────────────────────────────

const getIntensityConfig = (t: (k: string) => string) => ({
    high:   { color: colors.primary,        label: t('transits.intensityHigh'),   dotSize: 12 },
    medium: { color: colors.secondary,      label: t('transits.intensityMedium'), dotSize: 10 },
    low:    { color: colors.onSurfaceMuted, label: t('transits.intensityLow'),    dotSize: 8  },
});

function TransitItem({ transit, isLast }: { transit: UpcomingTransit; isLast: boolean }) {
    const { t } = useTranslation();
    const cfg = (getIntensityConfig(t))[transit.intensity] ?? getIntensityConfig(t).medium;

    return (
        <View style={styles.transitRow}>
            <View style={styles.timelineCol}>
                <View style={[styles.dot, {
                    width: cfg.dotSize, height: cfg.dotSize,
                    borderRadius: cfg.dotSize / 2,
                    backgroundColor: cfg.color,
                    shadowColor: cfg.color,
                }]} />
                {!isLast && <View style={styles.line} />}
            </View>
            <GlassCard opacity="low" radius="xl" style={styles.transitCard}>
                <View style={styles.transitHeader}>
                    <View style={[styles.intensityBadge, { backgroundColor: `${cfg.color}18` }]}>
                        <Text style={[styles.intensityLabel, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                    <Text style={styles.transitDate}>{transit.date}</Text>
                </View>
                <Text style={styles.transitTitle}>{transit.title}</Text>
                <Text style={styles.transitDesc}>{transit.description}</Text>
            </GlassCard>
        </View>
    );
}

// ─── Sub-components: Calendar ─────────────────────────────────────────────────

const DOW_LABELS_FR = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const DOW_LABELS_EN = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function CalendarGrid({
    year,
    month,
    days,
    selectedDay,
    onSelectDay,
    locale,
}: {
    year: number;
    month: number;
    days: Record<string, CalendarAspect[]>;
    selectedDay: number | null;
    onSelectDay: (day: number) => void;
    locale: string;
}) {
    const offset  = firstDayOffset(year, month);
    const numDays = daysInMonth(year, month);
    const cells   = offset + numDays;
    const rows    = Math.ceil(cells / 7);
    const dowLabels = locale === 'fr' ? DOW_LABELS_FR : DOW_LABELS_EN;
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;

    return (
        <View style={styles.calGrid}>
            {/* DOW header */}
            <View style={styles.calDowRow}>
                {dowLabels.map((l, i) => (
                    <View key={i} style={styles.calDowCell}>
                        <Text style={styles.calDowText}>{l}</Text>
                    </View>
                ))}
            </View>

            {/* Day rows */}
            {Array.from({ length: rows }).map((_, row) => (
                <View key={row} style={styles.calRow}>
                    {Array.from({ length: 7 }).map((_, col) => {
                        const cellIndex = row * 7 + col;
                        const day = cellIndex - offset + 1;
                        if (day < 1 || day > numDays) {
                            return <View key={col} style={styles.calCell} />;
                        }
                        const dateKey  = toDateKey(year, month, day);
                        const aspects  = days[dateKey] ?? [];
                        const isToday  = isCurrentMonth && today.getDate() === day;
                        const isSel    = selectedDay === day;
                        const topAspects = aspects.slice(0, 3);

                        return (
                            <Pressable
                                key={col}
                                style={[styles.calCell, isSel && styles.calCellSelected]}
                                onPress={() => onSelectDay(day)}
                            >
                                <Text style={[
                                    styles.calDayNum,
                                    isToday && styles.calDayToday,
                                    isSel   && styles.calDaySelected,
                                ]}>
                                    {day}
                                </Text>
                                {topAspects.length > 0 && (
                                    <View style={styles.calDots}>
                                        {topAspects.map((a, i) => (
                                            <View
                                                key={i}
                                                style={[styles.calDot, { backgroundColor: aspectColor(a.aspect_type) }]}
                                            />
                                        ))}
                                    </View>
                                )}
                            </Pressable>
                        );
                    })}
                </View>
            ))}
        </View>
    );
}

function AspectRow({
    aspect,
    locale,
    onPress,
}: {
    aspect: CalendarAspect;
    locale: string;
    onPress: () => void;
}) {
    const { t } = useTranslation();
    const color = aspectColor(aspect.aspect_type);
    const transitName = locale === 'fr'
        ? t(`planets.${aspect.transit_planet}`, { defaultValue: aspect.transit_planet })
        : aspect.transit_planet;
    const natalName = locale === 'fr'
        ? t(`planets.${aspect.natal_planet}`, { defaultValue: aspect.natal_planet })
        : aspect.natal_planet;

    return (
        <Pressable style={({ pressed }) => [styles.aspectRow, pressed && { opacity: 0.7 }]} onPress={onPress}>
            <View style={[styles.aspectTypeDot, { backgroundColor: `${color}22` }]}>
                <Text style={[styles.aspectSymbol, { color }]}>{aspect.symbol}</Text>
            </View>
            <View style={styles.aspectInfo}>
                <Text style={styles.aspectTitle}>
                    {transitName} <Text style={{ color }}>{aspect.aspect_name}</Text> {natalName}
                </Text>
                <Text style={styles.aspectOrb}>{aspect.orb.toFixed(1)}° {t('transits.orbLabel')}</Text>
            </View>
            <Feather name="chevron-right" size={14} color={colors.onSurfaceMuted} style={{ opacity: 0.5 }} />
        </Pressable>
    );
}

// ─── Interpretation Modal ──────────────────────────────────────────────────────

function InterpretationModal({
    aspect,
    locale,
    onClose,
}: {
    aspect: CalendarAspect | null;
    locale: string;
    onClose: () => void;
}) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [text, setText] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!aspect) return;
        setText(null);
        setError(null);
        setLoading(true);
        getTransitInterpretation(aspect)
            .then(res => {
                if (res.success && res.interpretation) setText(res.interpretation);
                else setError(res.error ?? t('common.error'));
            })
            .catch(() => setError(t('common.error')))
            .finally(() => setLoading(false));
    }, [aspect]);

    if (!aspect) return null;

    const color = aspectColor(aspect.aspect_type);
    const transitName = locale === 'fr'
        ? t(`planets.${aspect.transit_planet}`, { defaultValue: aspect.transit_planet })
        : aspect.transit_planet;
    const natalName = locale === 'fr'
        ? t(`planets.${aspect.natal_planet}`, { defaultValue: aspect.natal_planet })
        : aspect.natal_planet;

    return (
        <Modal visible transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <TouchableWithoutFeedback onPress={onClose}>
                    <View style={StyleSheet.absoluteFill} />
                </TouchableWithoutFeedback>
                <View style={styles.modalSheet}>
                    <View style={styles.modalHandle} />
                    <View style={styles.modalHeader}>
                        <View style={[styles.modalAspectBadge, { backgroundColor: `${color}20` }]}>
                            <Text style={[styles.modalSymbol, { color }]}>{aspect.symbol}</Text>
                        </View>
                        <View style={styles.modalTitleWrap}>
                            <Text style={styles.modalTitle}>
                                {transitName}{' '}
                                <Text style={{ color }}>{aspect.aspect_name}</Text>{' '}
                                {natalName}
                            </Text>
                            <Text style={styles.modalOrb}>{aspect.orb.toFixed(1)}° {t('transits.orbLabel')}</Text>
                        </View>
                        <Pressable onPress={onClose} hitSlop={12} style={styles.modalCloseBtn}>
                            <Feather name="x" size={18} color={colors.onSurfaceMuted} />
                        </Pressable>
                    </View>
                    <View style={styles.modalContent}>
                        {loading && (
                            <View style={styles.modalLoading}>
                                <ActivityIndicator color={colors.primary} />
                            </View>
                        )}
                        {!loading && error && (
                            <Text style={styles.modalError}>{error}</Text>
                        )}
                        {!loading && text && (
                            <Text style={styles.modalText}>{text}</Text>
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ─── Help Modal ──────────────────────────────────────────────────────────────

const ASPECTS_INFO = (fr: boolean) => [
    {
        symbol: '☌',
        name: fr ? 'Conjonction' : 'Conjunction',
        angle: '0°',
        color: ASPECT_COLORS.conjunction,
        desc: fr
            ? 'Fusion totale de deux énergies. Le transit amplifie et intensifie le principe natal — pour le meilleur ou pour le pire. C\'est le moment d\'agir sur ce que la planète représente.'
            : 'Total fusion of two energies. The transit amplifies the natal principle — for better or worse. A powerful moment to act on what that planet represents.',
    },
    {
        symbol: '☍',
        name: fr ? 'Opposition' : 'Opposition',
        angle: '180°',
        color: ASPECT_COLORS.opposition,
        desc: fr
            ? 'Tension entre deux pôles opposés. Invite à trouver l\'équilibre entre des besoins contradictoires. Souvent révélateur de conflits extérieurs ou de projections sur les autres.'
            : 'Tension between two opposite poles. Invites balance between conflicting needs. Often reveals external conflicts or projections onto others.',
    },
    {
        symbol: '△',
        name: fr ? 'Trigone' : 'Trine',
        angle: '120°',
        color: ASPECT_COLORS.trine,
        desc: fr
            ? 'Harmonie naturelle et facilité de flux. Les choses avancent sans effort. Excellent pour créer, développer et profiter des opportunités — mais peut inciter à la passivité.'
            : 'Natural harmony and easy flow. Things progress effortlessly. Excellent for creating and seizing opportunities — though it can invite passivity.',
    },
    {
        symbol: '□',
        name: fr ? 'Carré' : 'Square',
        angle: '90°',
        color: ASPECT_COLORS.square,
        desc: fr
            ? 'Friction et défi qui pousse à l\'action. C\'est un moteur de croissance : inconfortable, mais puissant pour briser les blocages et bâtir quelque chose de durable.'
            : 'Friction that pushes you to act. A growth engine: uncomfortable but powerful for breaking blocks and building something lasting.',
    },
    {
        symbol: '⚹',
        name: 'Sextile',
        angle: '60°',
        color: ASPECT_COLORS.sextile,
        desc: fr
            ? 'Opportunité douce et coopération. Une énergie favorable qui demande un léger effort pour être activée. Propice aux échanges, aux nouvelles connexions et à l\'apprentissage.'
            : 'Soft opportunity and cooperation. A favorable energy that needs a small push to activate. Good for exchanges, new connections, and learning.',
    },
];

const PLANETS_INFO = (fr: boolean) => [
    { symbol: '☉', name: fr ? 'Soleil' : 'Sun',     color: '#e9c349', desc: fr ? 'Identité profonde, vitalité, ego, volonté. Représente qui vous êtes en essence et ce qui vous donne de l\'énergie.'     : 'Core identity, vitality, ego, will. Represents who you truly are and what gives you energy.' },
    { symbol: '☽', name: fr ? 'Lune' : 'Moon',       color: '#c8bfff', desc: fr ? 'Émotions, instincts, mémoire, besoins intérieurs. Gouverne votre monde émotionnel et vos réactions instinctives.'       : 'Emotions, instincts, memory, inner needs. Governs your emotional world and instinctive reactions.' },
    { symbol: '☿', name: fr ? 'Mercure' : 'Mercury', color: '#60a5fa', desc: fr ? 'Pensée, communication, logique, déplacements. Influence la façon dont vous apprenez, parlez et traitez l\'information.' : 'Thought, communication, logic, travel. Influences how you learn, speak, and process information.' },
    { symbol: '♀', name: fr ? 'Vénus' : 'Venus',     color: '#f472b6', desc: fr ? 'Amour, beauté, valeurs, plaisir, argent. Gouverne vos attractions, ce qui vous plaît et votre rapport à l\'abondance.'   : 'Love, beauty, values, pleasure, money. Governs your attractions and your relationship to abundance.' },
    { symbol: '♂', name: fr ? 'Mars' : 'Mars',       color: '#fb923c', desc: fr ? 'Énergie, désir, action, courage, conflit. La planète qui vous pousse à agir, à conquérir et à défendre ce qui compte.'   : 'Energy, desire, action, courage, conflict. The planet that drives you to act, conquer, and defend what matters.' },
    { symbol: '♃', name: fr ? 'Jupiter' : 'Jupiter', color: '#4ade80', desc: fr ? 'Expansion, chance, sagesse, foi, excès. Apporte croissance et opportunités là où il transite — parfois jusqu\'à l\'exagération.' : 'Expansion, luck, wisdom, faith, excess. Brings growth and opportunity where it transits — sometimes to excess.' },
    { symbol: '♄', name: fr ? 'Saturne' : 'Saturn',  color: '#a78bfa', desc: fr ? 'Discipline, limites, karma, durée, responsabilité. Enseigne par les contraintes et récompense l\'effort patient sur le long terme.' : 'Discipline, limits, karma, time, responsibility. Teaches through constraints and rewards patient effort over time.' },
    { symbol: '♅', name: fr ? 'Uranus' : 'Uranus',   color: '#38bdf8', desc: fr ? 'Révolution, liberté, innovation, ruptures soudaines. Brise les structures établies pour libérer un potentiel plus authentique.' : 'Revolution, freedom, innovation, sudden breaks. Shatters established structures to free a more authentic potential.' },
    { symbol: '♆', name: fr ? 'Neptune' : 'Neptune', color: '#818cf8', desc: fr ? 'Spiritualité, intuition, illusion, dissolution. Dissout les frontières du moi et ouvre à la transcendance — ou à la confusion.' : 'Spirituality, intuition, illusion, dissolution. Dissolves ego boundaries, opening to transcendence — or confusion.' },
    { symbol: 'ASC', name: fr ? 'Ascendant' : 'Ascendant', color: colors.onSurfaceMuted, desc: fr ? 'Masque social, première impression, apparence extérieure. Le point de l\'horizon Est au moment de votre naissance — comment le monde vous perçoit.' : 'Social mask, first impression, outer appearance. The eastern horizon at birth — how the world perceives you.' },
];


// ─── Mirror: In-memory session cache ──────────────────────────────────────────
// Keyed by age, survives tab switches within the same app session.
const mirrorTransitsCache = new Map<number, MirrorTransitsData>();

// ─── Mirror: Constants & types ────────────────────────────────────────────────

const MAX_AGE = 80;
const PINS_FILE = `${FileSystem.documentDirectory}mirror_pins.json`;

// ─── Mirror: Variante A constants ─────────────────────────────────────────────

const MIRROR_DECADES = [0, 10, 20, 30, 40, 50, 60, 70, 80] as const;

const DEFAULT_MILESTONES: MirrorMilestone[] = [
    { age: 0,  label: 'Naissance',            glyph: '✦' },
    { age: 7,  label: 'Enfance',              glyph: '☉' },
    { age: 14, label: 'Adolescence',          glyph: '☿' },
    { age: 18, label: 'Émancipation',         glyph: '♂' },
    { age: 21, label: 'Quête',                glyph: '♃' },
    { age: 25, label: 'Premiers choix',       glyph: '♀' },
    { age: 29, label: 'Retour de Saturne',    glyph: '♄' },
    { age: 35, label: 'Conscience',           glyph: '♇' },
    { age: 42, label: 'Mi-parcours',          glyph: '♅' },
    { age: 50, label: 'Maturité',             glyph: '☉' },
    { age: 58, label: '2e retour de Saturne', glyph: '♄' },
    { age: 70, label: 'Récolte',              glyph: '♃' },
];

// Chapter accent colors: use theme primary for gold, theme accent.pink for pink,
// and specific values for violet/blue that have no theme equivalent.
const CHAPTER_ACCENT_MAP: Record<string, string> = {
    gold:   colors.primary,
    violet: '#9B5CFF',
    pink:   colors.accent.pink,
    blue:   '#5DA9F5',
};
const CHAPTER_DEFAULT_ACCENTS = [colors.primary, '#9B5CFF', colors.accent.pink, '#5DA9F5'];

function resolveChapterAccent(accent: string | undefined, index: number): string {
    if (!accent) return CHAPTER_DEFAULT_ACCENTS[index % 4];
    if (CHAPTER_ACCENT_MAP[accent]) return CHAPTER_ACCENT_MAP[accent];
    // Accept raw hex/rgba from API directly
    if (accent.startsWith('#') || accent.startsWith('rgba') || accent.startsWith('rgb')) return accent;
    return CHAPTER_DEFAULT_ACCENTS[index % 4];
}

interface PinnedEvent {
    age: number;
    label: string;
}

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

// ─── Mirror: Pin Modal ────────────────────────────────────────────────────────

function MirrorPinModal({ visible, initialValue, onSave, onClose }: {
    visible: boolean; initialValue: string; onSave: (label: string) => void; onClose: () => void;
}) {
    const { t } = useTranslation();
    const [text, setText] = useState(initialValue);
    useEffect(() => { if (visible) setText(initialValue); }, [visible, initialValue]);
    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={mirrorStyles.modalOverlay}>
                <TouchableWithoutFeedback onPress={onClose}>
                    <View style={StyleSheet.absoluteFill} />
                </TouchableWithoutFeedback>
                <View style={mirrorStyles.modalSheet}>
                    <Text style={mirrorStyles.modalTitle}>{t('mirror.pinModalTitle')}</Text>
                    <TextInput
                        style={mirrorStyles.pinInput}
                        value={text}
                        onChangeText={setText}
                        placeholder={t('mirror.pinModalPlaceholder')}
                        placeholderTextColor={colors.onSurfaceMuted}
                        multiline
                        autoFocus
                    />
                    <GoldButton label={t('mirror.pinModalSave')} onPress={() => { onSave(text); onClose(); }} />
                </View>
            </View>
        </Modal>
    );
}

// ─── Mirror: Premium Modal ────────────────────────────────────────────────────

function MirrorPremiumModal({ visible, unlockedRanges, onClose }: {
    visible: boolean; unlockedRanges: UnlockedRange[]; onClose: () => void;
}) {
    const { t } = useTranslation();
    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={mirrorStyles.modalOverlay}>
                <TouchableWithoutFeedback onPress={onClose}>
                    <View style={StyleSheet.absoluteFill} />
                </TouchableWithoutFeedback>
                <View style={mirrorStyles.modalSheet}>
                    <Feather name="lock" size={32} color={colors.primary} style={mirrorStyles.lockIcon} />
                    <Text style={mirrorStyles.premiumTitle}>{t('mirror.premiumTitle')}</Text>
                    <Text style={mirrorStyles.premiumSubtitle}>{t('mirror.premiumSubtitle')}</Text>
                    <Text style={mirrorStyles.unlockedLabel}>{t('mirror.premiumUnlocked')}</Text>
                    {unlockedRanges.map((r, i) => (
                        <Text key={i} style={mirrorStyles.unlockedRange}>{'  '}• {r.min}–{r.max} ans</Text>
                    ))}
                    <View style={mirrorStyles.premiumActions}>
                        <GoldButton label={t('mirror.premiumCta')} onPress={() => { onClose(); router.push('/premium'); }} />
                        <GhostButton label={t('common.cancel')} onPress={onClose} />
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ─── Mirror: Active Aspects ───────────────────────────────────────────────────

const MIRROR_ASPECT_COLORS: Record<string, string> = {
    conjunction: '#2dd4bf',
    trine:       '#a78bfa',
    sextile:     '#9ca3af',
    square:      '#fb923c',
    opposition:  '#fbbf24',
};

function MirrorActiveAspects({ aspects }: { aspects: MirrorAspect[] }) {
    const { t, i18n } = useTranslation();
    const isFr = i18n.language.startsWith('fr');

    return (
        <GlassCard style={mirrorStyles.card}>
            <Text style={mirrorStyles.sectionTitle}>{t('mirror.activeAspectsTitle')}</Text>
            {aspects.length === 0 ? (
                <Text style={mirrorStyles.emptyText}>{t('mirror.noAspects')}</Text>
            ) : (
                aspects.map((aspect, i) => {
                    const color = MIRROR_ASPECT_COLORS[aspect.aspect_type] ?? '#9ca3af';
                    const transit = isFr ? getPlanetNameFr(aspect.transit_planet) : aspect.transit_planet;
                    const natal   = isFr ? getPlanetNameFr(aspect.natal_planet)   : aspect.natal_planet;
                    const type    = t(`mirror.aspectTypes.${aspect.aspect_type}`, { defaultValue: aspect.aspect_type });
                    return (
                        <View key={i} style={mirrorStyles.mirrorAspectRow}>
                            <View style={mirrorStyles.intensityBarBg}>
                                <View style={[mirrorStyles.intensityBarFill, {
                                    width: `${Math.round(aspect.intensity * 100)}%`,
                                    backgroundColor: color,
                                }]} />
                            </View>
                            <View style={mirrorStyles.aspectInfoRow}>
                                <Text style={mirrorStyles.aspectGlyph}>{aspect.symbol}</Text>
                                <Text style={mirrorStyles.planetLabel}>{transit}</Text>
                                <Text style={mirrorStyles.aspectTypeLabel}>{type}</Text>
                                <Text style={mirrorStyles.planetLabel}>{natal}</Text>
                                <View style={[mirrorStyles.orbBadge, { backgroundColor: color + '22', borderColor: color }]}>
                                    <Text style={[mirrorStyles.orbBadgeText, { color }]}>{aspect.orb_exact.toFixed(1)}°</Text>
                                </View>
                            </View>
                        </View>
                    );
                })
            )}
        </GlassCard>
    );
}

// ─── Mirror: Transit Grid ─────────────────────────────────────────────────────

const MIRROR_MAIN_PLANETS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];

function MirrorTransitGrid({ positions }: {
    positions: Record<string, { Position: number; Sign: string; Retrograde: string }>;
}) {
    const { t, i18n } = useTranslation();
    const isFr = i18n.language.startsWith('fr');
    return (
        <GlassCard style={mirrorStyles.card}>
            <Text style={mirrorStyles.sectionTitle}>{t('mirror.transitPositionsTitle')}</Text>
            <View style={mirrorStyles.planetGrid}>
                {MIRROR_MAIN_PLANETS.map((planet) => {
                    const data = positions[planet];
                    if (!data) return null;
                    return (
                        <View key={planet} style={mirrorStyles.planetCell}>
                            <Text style={mirrorStyles.planetCellName}>{isFr ? getPlanetNameFr(planet) : planet}</Text>
                            <Text style={mirrorStyles.planetCellSign}>
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

// ─── Mirror: Chapter Card ─────────────────────────────────────────────────────

function MirrorChapterCard({ chapter, index, total }: {
    chapter: MirrorChapter;
    index: number;
    total: number;
}) {
    const accent = resolveChapterAccent(chapter.accent, index);
    const isFirst = index === 0;

    return (
        <View style={[
            mirrorStyles.chapterCard,
            { borderColor: isFirst ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.07)' },
        ]}>
            {/* Glass top-edge highlight */}
            <View style={mirrorStyles.chapterTopHighlight} />
            {/* Ambient glow top-right on first card */}
            {isFirst && (
                <View
                    pointerEvents="none"
                    style={[mirrorStyles.chapterGoldGlow, { backgroundColor: `${accent}0D` }]}
                />
            )}
            <View style={mirrorStyles.chapterCardInner}>
                {/* Header: glyph badge + theme label + counter */}
                <View style={mirrorStyles.chapterHead}>
                    <View style={[mirrorStyles.glyphBadge, {
                        backgroundColor: `${accent}14`,
                        borderColor: `${accent}33`,
                    }]}>
                        <Text style={[mirrorStyles.glyphText, { color: accent }]}>
                            {chapter.glyph}
                        </Text>
                    </View>
                    <Text style={mirrorStyles.chapterTheme}>{chapter.theme}</Text>
                    <Text style={mirrorStyles.chapterStep}>
                        {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
                    </Text>
                </View>
                {/* Body — drop cap only for first chapter */}
                {isFirst ? (
                    <View style={mirrorStyles.chapterBodyRow}>
                        <Text style={[mirrorStyles.dropCap, { color: accent }]}>
                            {chapter.text.charAt(0)}
                        </Text>
                        <Text style={[mirrorStyles.chapterText, { flex: 1 }]}>
                            {chapter.text.slice(1)}
                        </Text>
                    </View>
                ) : (
                    <Text style={mirrorStyles.chapterText}>{chapter.text}</Text>
                )}
            </View>
        </View>
    );
}

// ─── Mirror: Tab Content ──────────────────────────────────────────────────────

function MirrorTabContent() {
    const { user } = useAuth();
    const { t } = useTranslation();
    const userId = user?.id;

    const birthYear = useMemo(() => {
        const bd = user?.birthProfile?.birthDate;
        if (!bd) return new Date().getFullYear() - 30;
        return new Date(bd).getFullYear();
    }, [user?.birthProfile?.birthDate]);

    const initialAge = useMemo<number>(() => {
        const bd = user?.birthProfile?.birthDate;
        if (!bd) return 30;
        const years = (Date.now() - new Date(bd).getTime()) / (365.25 * 24 * 3600 * 1000);
        return Math.max(0, Math.min(MAX_AGE, Math.floor(years)));
    }, [user?.birthProfile?.birthDate]);

    const [age, setAge] = useState<number>(initialAge);
    const [mirrorTransits, setMirrorTransits] = useState<MirrorTransitsData | null>(null);
    const [chapters, setChapters] = useState<MirrorChapter[]>([]);
    const [interpretation, setInterpretation] = useState<string>('');
    const [milestones, setMilestones] = useState<MirrorMilestone[]>(DEFAULT_MILESTONES);
    const [isLoadingTransits, setIsLoadingTransits] = useState(false);
    const [isLoadingInterp, setIsLoadingInterp] = useState(false);
    const [unlockedRanges, setUnlockedRanges] = useState<UnlockedRange[] | null>(null);
    const [showPremiumModal, setShowPremiumModal] = useState(false);
    const [pinnedEvents, setPinnedEvents] = useState<PinnedEvent[]>([]);
    const [showPinModal, setShowPinModal] = useState(false);
    const [thumbFeedback, setThumbFeedback] = useState<'up' | 'down' | null>(null);

    const decade = Math.floor(age / 10) * 10;
    const milestoneByAge = useMemo(() => new Map(milestones.map(m => [m.age, m])), [milestones]);
    const milestoneAges = useMemo(() => new Set(milestones.map(m => m.age)), [milestones]);
    const currentMilestone = milestoneByAge.get(age);
    const displayYear = mirrorTransits?.target_year ?? (birthYear + age);
    const currentPin = pinnedEvents.find((p) => p.age === age);
    const hasContent = chapters.length > 0 || !!interpretation;

    useEffect(() => { loadPins().then(setPinnedEvents); }, []);

    // Flush cache when birth profile changes
    const prevBirthProfileKey = useRef<string | null>(null);
    const birthProfileKey = user?.birthProfile
        ? `${user.birthProfile.birthDate}_${user.birthProfile.birthCity}`
        : null;
    useEffect(() => {
        if (
            prevBirthProfileKey.current !== null &&
            birthProfileKey !== null &&
            prevBirthProfileKey.current !== birthProfileKey &&
            userId
        ) {
            mirrorTransitsCache.clear();
            cacheInvalidatePrefix(`u${userId}_mirror`);
            setMirrorTransits(null);
            setChapters([]);
            setInterpretation('');
        }
        prevBirthProfileKey.current = birthProfileKey;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [birthProfileKey]);

    const handlePremiumError = useCallback((err: unknown) => {
        const payload = (err as any)?.payload;
        if ((err as any)?.status === 403 && payload?.error === 'premium_required') {
            setUnlockedRanges(payload.unlocked_ranges ?? []);
            setShowPremiumModal(true);
        }
    }, []);

    const fetchTransits = useCallback(async (targetAge: number) => {
        const memCached = mirrorTransitsCache.get(targetAge);
        if (memCached) {
            setMirrorTransits(memCached);
            setUnlockedRanges(null);
            return;
        }
        setIsLoadingTransits(true);
        setMirrorTransits(null);
        try {
            const res = await getMirrorTransits(targetAge);
            const data: MirrorTransitsData = {
                age: res.age!,
                target_date: res.target_date!,
                target_year: res.target_year!,
                natal_positions: res.natal_positions!,
                transit_positions: res.transit_positions!,
                aspects: res.aspects,
                global_intensity: res.global_intensity!,
            };
            mirrorTransitsCache.set(targetAge, data);
            setMirrorTransits(data);
            setUnlockedRanges(null);
        } catch (err) {
            handlePremiumError(err);
        } finally {
            setIsLoadingTransits(false);
        }
    }, [handlePremiumError]);

    const fetchInterpretation = useCallback(async (targetAge: number) => {
        // Cache key — AI interpretations are expensive, TTL 7 days, scoped by user
        const cacheKey = `u${userId}_mirror_interp_${targetAge}`;
        const cached = await cacheGet<string>(cacheKey);
        if (cached) {
            setInterpretation(cached);
            setChapters([]);
            return;
        }
        setIsLoadingInterp(true);
        setChapters([]);
        setInterpretation('');
        setThumbFeedback(null);
        try {
            const pin = pinnedEvents.find((p) => p.age === targetAge);
            const res = await getMirrorInterpretation(targetAge, pin?.label);
            if (res.milestones?.length) setMilestones(res.milestones);
            if (res.chapters?.length) {
                setChapters(res.chapters);
            } else if (res.interpretation) {
                setInterpretation(res.interpretation);
                // Don't cache pinned-event interpretations (personalised to the note)
                if (!pin?.label && userId) {
                    await cacheSet(cacheKey, res.interpretation, 7 * 24 * 3600);
                }
            }
        } catch (err) {
            handlePremiumError(err);
        } finally {
            setIsLoadingInterp(false);
        }
    }, [pinnedEvents, handlePremiumError, userId]);

    useEffect(() => {
        setAge(initialAge);
        fetchTransits(initialAge);
        fetchInterpretation(initialAge);
    }, [initialAge]);

    const handleAgeChange = useCallback((newAge: number) => {
        setAge(newAge);
        fetchTransits(newAge);
        fetchInterpretation(newAge);
    }, [fetchTransits, fetchInterpretation]);

    const handleSavePin = useCallback(async (label: string) => {
        const updated = [
            ...pinnedEvents.filter((p) => p.age !== age),
            ...(label.trim() ? [{ age, label: label.trim() }] : []),
        ];
        setPinnedEvents(updated);
        await savePins(updated);
    }, [age, pinnedEvents]);

    return (
        <View style={mirrorStyles.tabContent}>
            {/* ── Picker card ── */}
            <GlassCard style={mirrorStyles.pickerCard}>

                {/* Header: âge (gauche) + année/intensité (droite) */}
                <View style={mirrorStyles.pickerHeader}>
                    <View style={mirrorStyles.ageStack}>
                        <View style={mirrorStyles.ageRow}>
                            <Text style={mirrorStyles.contextAge}>{age}</Text>
                            <Text style={mirrorStyles.contextSuffix}>ans</Text>
                        </View>
                        {currentMilestone && (
                            <View style={mirrorStyles.milestoneTag}>
                                <Text style={mirrorStyles.milestoneGlyph}>{currentMilestone.glyph}</Text>
                                <Text style={mirrorStyles.milestoneName}>{currentMilestone.label}</Text>
                            </View>
                        )}
                    </View>
                    <View style={mirrorStyles.pickerRight}>
                        <View style={mirrorStyles.yearBadge}>
                            {isLoadingTransits
                                ? <ActivityIndicator size="small" color={colors.primary} />
                                : <Text style={mirrorStyles.yearBadgeText}>{displayYear}</Text>
                            }
                        </View>
                        {mirrorTransits && (
                            <View style={mirrorStyles.intensityRow}>
                                <View style={mirrorStyles.intensityTrack}>
                                    <View style={[mirrorStyles.intensityFill, {
                                        width: `${Math.round(mirrorTransits.global_intensity * 100)}%`,
                                    }]} />
                                </View>
                                <Text style={mirrorStyles.intensityPct}>
                                    {Math.round(mirrorTransits.global_intensity * 100)}%
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Decade pills — horizontal scroll */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={mirrorStyles.decadesScroll}
                    contentContainerStyle={mirrorStyles.decadesContent}
                >
                    {MIRROR_DECADES.map(d => {
                        const isActiveDec = decade === d;
                        return (
                            <Pressable
                                key={d}
                                style={[mirrorStyles.decadePill, isActiveDec && mirrorStyles.decadePillActive]}
                                onPress={() => { if (!isActiveDec) handleAgeChange(d); }}
                            >
                                <Text style={[mirrorStyles.decadeText, isActiveDec && mirrorStyles.decadeTextActive]}>
                                    {d}–{d + 9}
                                </Text>
                            </Pressable>
                        );
                    })}
                </ScrollView>

                {/* Year grid — 10 cellules égales */}
                <View style={mirrorStyles.yearsRow}>
                    {Array.from({ length: 10 }, (_, i) => decade + i).map(y => {
                        const isActive = age === y;
                        const isMilestone = milestoneAges.has(y);
                        const m = milestoneByAge.get(y);
                        return (
                            <Pressable
                                key={y}
                                style={[mirrorStyles.yearBtn, isActive && mirrorStyles.yearBtnActive]}
                                onPress={() => { if (y !== age) handleAgeChange(y); }}
                            >
                                {/* Indicateur milestone en haut */}
                                <View style={mirrorStyles.yearTopSlot}>
                                    {isMilestone && (
                                        <Text style={[mirrorStyles.yearMilestoneGlyph, isActive && mirrorStyles.yearMilestoneGlyphActive]}>
                                            {m?.glyph ?? '·'}
                                        </Text>
                                    )}
                                </View>
                                <Text style={[mirrorStyles.yearNum, isActive && mirrorStyles.yearNumActive]}>
                                    {y}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
            </GlassCard>

            {/* ── Loading state ── */}
            {isLoadingInterp && (
                <View style={mirrorStyles.loadingWrap}>
                    <LoaderSaturn size={160} label={t('mirror.interpretationLoading')} />
                </View>
            )}

            {/* ── Chapter cards (new structured format) ── */}
            {!isLoadingInterp && chapters.length > 0 && (
                <View style={mirrorStyles.chaptersWrap}>
                    {chapters.map((c, i) => (
                        <MirrorChapterCard key={i} chapter={c} index={i} total={chapters.length} />
                    ))}
                </View>
            )}

            {/* ── Fallback: legacy plain interpretation text ── */}
            {!isLoadingInterp && chapters.length === 0 && !!interpretation && (
                <GlassCard style={mirrorStyles.card}>
                    <Text style={mirrorStyles.sectionTitle}>{t('mirror.interpretationTitle')}</Text>
                    <FormattedText text={interpretation} style={mirrorStyles.interpText} />
                </GlassCard>
            )}

            {/* ── Pinned event indicator ── */}
            {currentPin && (
                <GlassCard style={mirrorStyles.card}>
                    <View style={mirrorStyles.pinCard}>
                        <Feather name="bookmark" size={14} color={colors.primary} />
                        <Text style={mirrorStyles.pinText}>{t('mirror.pinnedEventLabel', { label: currentPin.label })}</Text>
                    </View>
                </GlassCard>
            )}

            {/* ── Pin CTA ── */}
            {hasContent && (
                <Pressable
                    style={({ pressed }) => [mirrorStyles.pinCta, pressed && { opacity: 0.7 }]}
                    onPress={() => setShowPinModal(true)}
                >
                    <Feather name="bookmark" size={14} color={colors.onSurface} />
                    <Text style={mirrorStyles.pinCtaText}>{t('mirror.pinButton')}</Text>
                </Pressable>
            )}

            {/* ── Feedback ── */}
            {hasContent && !isLoadingInterp && (
                <View style={mirrorStyles.feedbackRow}>
                    <Text style={mirrorStyles.feedbackLabel}>
                        {t('mirror.feedbackLabel', { defaultValue: 'Cette lecture résonne-t-elle ?' })}
                    </Text>
                    <View style={mirrorStyles.feedbackBtns}>
                        <Pressable
                            style={[mirrorStyles.feedbackBtn, thumbFeedback === 'up' && mirrorStyles.feedbackBtnActive]}
                            onPress={() => setThumbFeedback(thumbFeedback === 'up' ? null : 'up')}
                        >
                            <Feather
                                name="thumbs-up"
                                size={14}
                                color={thumbFeedback === 'up' ? colors.primary : colors.onSurfaceMuted}
                            />
                        </Pressable>
                        <Pressable
                            style={[mirrorStyles.feedbackBtn, thumbFeedback === 'down' && mirrorStyles.feedbackBtnActive]}
                            onPress={() => setThumbFeedback(thumbFeedback === 'down' ? null : 'down')}
                        >
                            <Feather
                                name="thumbs-down"
                                size={14}
                                color={thumbFeedback === 'down' ? colors.primary : colors.onSurfaceMuted}
                            />
                        </Pressable>
                    </View>
                </View>
            )}

            {/* ── Positions des transits ── */}
            {mirrorTransits && (
                <MirrorTransitGrid positions={mirrorTransits.transit_positions} />
            )}

            {/* ── Aspects actifs ── */}
            {mirrorTransits && mirrorTransits.aspects.length > 0 && (
                <MirrorActiveAspects aspects={mirrorTransits.aspects} />
            )}

            {/* ── Modals ── */}
            <MirrorPinModal
                visible={showPinModal}
                initialValue={currentPin?.label ?? ''}
                onSave={handleSavePin}
                onClose={() => setShowPinModal(false)}
            />
            {unlockedRanges && (
                <MirrorPremiumModal
                    visible={showPremiumModal}
                    unlockedRanges={unlockedRanges}
                    onClose={() => setShowPremiumModal(false)}
                />
            )}
        </View>
    );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function TransitsScreen() {
    const { t, i18n } = useTranslation();
    const { isPremium } = usePremium();
    const { user } = useAuth();
    const userId = user?.id;
    const locale = i18n.language?.startsWith('fr') ? 'fr' : 'en';

    // Tab state
    const [activeTab, setActiveTab] = useState<'timeline' | 'calendar' | 'mirror'>('timeline');

    const rootRef = useRef<View>(null);
    const tabsRef = useRef<View>(null);
    const scrollRef = useRef<ScrollView>(null);

    // Mirror lazy-mount: mount once the user first visits the tab
    const [mirrorEverVisited, setMirrorEverVisited] = useState(false);
    useEffect(() => {
        if (activeTab === 'mirror') setMirrorEverVisited(true);
    }, [activeTab]);

    // Timeline state
    const [transits, setTransits] = useState<UpcomingTransit[]>([]);
    const [tlLoading, setTlLoading] = useState(true);
    const [tlRefreshing, setTlRefreshing] = useState(false);
    const [tlError, setTlError] = useState<string | null>(null);

    // Interpretation modal state
    const [selectedAspect, setSelectedAspect] = useState<CalendarAspect | null>(null);

    // Help modal state
    const [helpVisible, setHelpVisible] = useState(false);

    // Calendar state
    const now = new Date();
    const [calYear, setCalYear] = useState(now.getFullYear());
    const [calMonth, setCalMonth] = useState(now.getMonth() + 1);
    const [calData, setCalData] = useState<Record<string, Record<string, CalendarAspect[]>>>({}); // key: "YYYY-MM"
    const [calLoading, setCalLoading] = useState(false);
    const [calError, setCalError] = useState<string | null>(null);
    const [selectedDay, setSelectedDay] = useState<number | null>(now.getDate());

    // ── Load timeline ──
    const loadTimeline = useCallback(async (isRefresh = false) => {
        // Skip if already loaded and not a manual refresh
        if (transits.length > 0 && !isRefresh) return;
        if (!isRefresh && userId) {
            const cached = await cacheGet<UpcomingTransit[]>(`u${userId}_upcoming_transits`);
            if (cached) { setTransits(cached); setTlLoading(false); return; }
        }
        if (isRefresh) setTlRefreshing(true);
        else setTlLoading(true);
        setTlError(null);
        try {
            const res = await getUpcomingTransits();
            if (res.success && res.transits) {
                setTransits(res.transits);
                if (userId) await cacheSet(`u${userId}_upcoming_transits`, res.transits, 24 * 3600);
            } else {
                setTlError(res.error ?? t('transits.loadError'));
            }
        } catch {
            setTlError(t('transits.loadError'));
        } finally {
            setTlLoading(false);
            setTlRefreshing(false);
        }
    }, [transits.length, t]);

    useEffect(() => { loadTimeline(); }, [loadTimeline]);

    // ── Load calendar month ──
    const loadCalendar = useCallback(async (year: number, month: number) => {
        const key = toMonthKey(year, month);
        if (calData[key]) return; // already loaded
        setCalLoading(true);
        setCalError(null);
        try {
            const res = await getCalendarTransits(key);
            if (res.success && res.days) {
                setCalData(prev => ({ ...prev, [key]: res.days! }));
            } else {
                setCalError(res.error ?? t('transits.calendarLoadError'));
            }
        } catch {
            setCalError(t('transits.calendarLoadError'));
        } finally {
            setCalLoading(false);
        }
    }, [calData, t]);

    useEffect(() => {
        if (activeTab === 'calendar') loadCalendar(calYear, calMonth);
    // loadCalendar is stable given calData key guard handles re-runs
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, calYear, calMonth]);

    // ── Navigate months ──
    const goToPrevMonth = () => {
        const p = prevMonth(calYear, calMonth);
        setCalYear(p.year);
        setCalMonth(p.month);
        setSelectedDay(null);
    };
    const goToNextMonth = () => {
        const n = nextMonth(calYear, calMonth);
        setCalYear(n.year);
        setCalMonth(n.month);
        setSelectedDay(null);
    };

    // ── Current calendar data ──
    const currentMonthKey = toMonthKey(calYear, calMonth);
    const currentDays = calData[currentMonthKey] ?? {};

    // ── Filter & pagination state ──
    const [aspectFilter, setAspectFilter] = useState<string | null>(null);
    const [aspectsExpanded, setAspectsExpanded] = useState(false);

    // Reset filter when day changes
    useEffect(() => {
        setAspectFilter(null);
        setAspectsExpanded(false);
    }, [selectedDay, calYear, calMonth]);

    // ── Selected day aspects ──
    const allSelectedAspects = useMemo(() => {
        if (!selectedDay) return [];
        const key = toDateKey(calYear, calMonth, selectedDay);
        return currentDays[key] ?? [];
    }, [selectedDay, calYear, calMonth, currentDays]);

    const filteredAspects = useMemo(() => {
        if (!aspectFilter) return allSelectedAspects;
        return allSelectedAspects.filter(a => a.aspect_type === aspectFilter);
    }, [allSelectedAspects, aspectFilter]);

    const ASPECTS_LIMIT = 5;
    const visibleAspects = aspectsExpanded ? filteredAspects : filteredAspects.slice(0, ASPECTS_LIMIT);
    const hiddenCount = filteredAspects.length - ASPECTS_LIMIT;

    // Types present in this day (for filter pills)
    const presentTypes = useMemo(() => {
        const types = new Set(allSelectedAspects.map(a => a.aspect_type));
        return Object.keys(ASPECT_COLORS).filter(t => types.has(t));
    }, [allSelectedAspects]);

    if (!user?.hasBirthProfile) {
        return <NoBirthProfileCard />;
    }

    return (
        <View ref={rootRef} style={styles.root}>
            <Starfield />
            <SafeAreaView style={styles.safe} edges={['top']}>
                <TabHeader />

                <ScrollView
                    ref={scrollRef}
                    contentContainerStyle={styles.scroll}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        activeTab === 'timeline' ? (
                            <RefreshControl
                                refreshing={tlRefreshing}
                                onRefresh={() => loadTimeline(true)}
                                tintColor={colors.primary}
                            />
                        ) : undefined
                    }
                >
                    {/* Hero — dynamic per tab */}
                    <View style={styles.hero}>
                        <Text style={styles.heroTitle}>
                            {activeTab === 'timeline' ? t('transits.heroTitle')
                             : activeTab === 'calendar' ? t('transits.calendarHeroTitle')
                             : t('transits.mirrorHeroTitle')}
                        </Text>
                        <Text style={styles.heroSubtitle}>
                            {activeTab === 'timeline' ? t('transits.heroSubtitle')
                             : activeTab === 'calendar' ? t('transits.calendarHeroSubtitle')
                             : t('transits.mirrorHeroSubtitle')}
                        </Text>
                    </View>

                    {/* Tab toggle */}
                    <View style={styles.tabToggleWrap}>
                        <View ref={tabsRef} style={styles.tabToggle}>
                            <View style={styles.tabBtnWrap}>
                                <Pressable
                                    style={[styles.tabBtn, activeTab === 'timeline' && styles.tabBtnActive]}
                                    onPress={() => setActiveTab('timeline')}
                                >
                                    <Feather
                                        name="zap"
                                        size={13}
                                        color={activeTab === 'timeline' ? colors.surfaceLowest : colors.onSurfaceMuted}
                                    />
                                    <Text style={[styles.tabBtnText, activeTab === 'timeline' && styles.tabBtnTextActive]}>
                                        {t('transits.timelineTab')}
                                    </Text>
                                </Pressable>
                            </View>
                            <View style={styles.tabBtnWrap}>
                                <Pressable
                                    style={[styles.tabBtn, activeTab === 'calendar' && styles.tabBtnActive]}
                                    onPress={() => setActiveTab('calendar')}
                                >
                                    <Feather
                                        name="calendar"
                                        size={13}
                                        color={activeTab === 'calendar' ? colors.surfaceLowest : colors.onSurfaceMuted}
                                    />
                                    <Text style={[styles.tabBtnText, activeTab === 'calendar' && styles.tabBtnTextActive]}>
                                        {t('transits.calendarTab')}
                                    </Text>
                                </Pressable>
                            </View>
                            <View style={styles.tabBtnWrap}>
                                <Pressable
                                    style={[styles.tabBtn, activeTab === 'mirror' && styles.tabBtnActive]}
                                    onPress={() => setActiveTab('mirror')}
                                >
                                    <Feather
                                        name="clock"
                                        size={13}
                                        color={activeTab === 'mirror' ? colors.surfaceLowest : colors.onSurfaceMuted}
                                    />
                                    <Text style={[styles.tabBtnText, activeTab === 'mirror' && styles.tabBtnTextActive]}>
                                        {t('transits.mirrorTab')}
                                    </Text>
                                </Pressable>
                            </View>
                        </View>
                        <View>
                            <Pressable onPress={() => setHelpVisible(true)} hitSlop={12} style={styles.helpBtn}>
                                <Feather name="help-circle" size={18} color={colors.onSurfaceMuted} />
                            </Pressable>
                        </View>
                    </View>

                    {/* ── Timeline tab ── */}
                    {activeTab === 'timeline' && (
                        <>
                            <View style={styles.aiBadgeWrap}>
                                <View style={styles.aiBadge}>
                                    <View style={styles.aiBadgeDot} />
                                    <Text style={styles.aiBadgeText}>{t('transits.aiBadge')}</Text>
                                </View>
                            </View>

                            {tlLoading && (
                                <View style={styles.inlineLoaderWrap}>
                                    <LoaderOrbitTrio size={200} label={t('transits.heroTitle')} />
                                </View>
                            )}

                            {!tlLoading && tlError && (
                                <GlassCard opacity="low" radius="xl" style={styles.errorCard}>
                                    <Feather name="alert-circle" size={32} color={colors.error} />
                                    <Text style={styles.errorText}>{tlError}</Text>
                                    <Pressable onPress={() => loadTimeline()} style={styles.retryBtn}>
                                        <Text style={styles.retryText}>{t('transits.retry')}</Text>
                                    </Pressable>
                                </GlassCard>
                            )}

                            {!tlLoading && !tlError && transits.length > 0 && (
                                <View style={styles.timeline}>
                                    {transits.map((tr, i) => (
                                        <TransitItem key={i} transit={tr} isLast={i === transits.length - 1} />
                                    ))}
                                </View>
                            )}

                            {!tlLoading && !tlError && (
                                <Text style={styles.pullHint}>{t('transits.pullHint')}</Text>
                            )}
                        </>
                    )}

                    {/* ── Calendar tab ── */}
                    {activeTab === 'calendar' && !isPremium && (
                        <View style={styles.calendarLockedWrap}>
                            <Feather name="lock" size={32} color={colors.primary} style={{ opacity: 0.8 }} />
                            <Text style={styles.calendarLockedTitle}>{t('premium.calendarLockedTitle')}</Text>
                            <Text style={styles.calendarLockedSubtitle}>{t('premium.calendarLockedSubtitle')}</Text>
                            <GoldButton
                                label={t('premium.calendarLockedCta')}
                                onPress={() => router.push({ pathname: '/premium', params: { source: 'transit_calendar' } })}
                            />
                        </View>
                    )}

                    {activeTab === 'calendar' && isPremium && (
                        <View style={styles.calendarSection}>

                            {/* Month navigation */}
                            <View style={styles.calNavRow}>
                                <Pressable onPress={goToPrevMonth} style={styles.calNavBtn} hitSlop={12}>
                                    <Feather name="chevron-left" size={20} color={colors.onSurface} />
                                </Pressable>
                                <Text style={styles.calMonthLabel}>
                                    {formatMonth(calYear, calMonth, locale)}
                                </Text>
                                <Pressable onPress={goToNextMonth} style={styles.calNavBtn} hitSlop={12}>
                                    <Feather name="chevron-right" size={20} color={colors.onSurface} />
                                </Pressable>
                            </View>

                            {/* Legend */}
                            <View style={styles.legendRow}>
                                {Object.entries(ASPECT_COLORS).map(([type, color]) => (
                                    <View key={type} style={styles.legendItem}>
                                        <View style={[styles.legendDot, { backgroundColor: color }]} />
                                        <Text style={styles.legendText}>
                                            {type === 'conjunction' ? (locale === 'fr' ? 'Conj.' : 'Conj.') :
                                             type === 'opposition'  ? (locale === 'fr' ? 'Oppos.' : 'Oppos.') :
                                             type === 'trine'       ? (locale === 'fr' ? 'Trigone' : 'Trine') :
                                             type === 'square'      ? (locale === 'fr' ? 'Carré' : 'Square') :
                                                                      (locale === 'fr' ? 'Sextile' : 'Sextile')}
                                        </Text>
                                    </View>
                                ))}
                            </View>

                            {/* Calendar grid */}
                            {calLoading ? (
                                <View style={styles.calLoadingWrap}>
                                    <LoaderOrbitTrio size={160} label={t('transits.calendarHeroTitle')} />
                                </View>
                            ) : calError ? (
                                <GlassCard opacity="low" radius="xl" style={styles.errorCard}>
                                    <Text style={styles.errorText}>{calError}</Text>
                                    <Pressable
                                        onPress={() => {
                                            setCalData(prev => {
                                                const next = { ...prev };
                                                delete next[currentMonthKey];
                                                return next;
                                            });
                                            loadCalendar(calYear, calMonth);
                                        }}
                                        style={styles.retryBtn}
                                    >
                                        <Text style={styles.retryText}>{t('transits.retry')}</Text>
                                    </Pressable>
                                </GlassCard>
                            ) : (
                                <GlassCard opacity="low" radius="xl" style={styles.calCard}>
                                    <CalendarGrid
                                        year={calYear}
                                        month={calMonth}
                                        days={currentDays}
                                        selectedDay={selectedDay}
                                        onSelectDay={setSelectedDay}
                                        locale={locale}
                                    />
                                </GlassCard>
                            )}

                            {/* Selected day detail */}
                            {selectedDay !== null && !calLoading && (
                                <View style={styles.dayDetail}>
                                    <Text style={styles.dayDetailTitle}>
                                        {selectedDay}{' '}
                                        {new Date(calYear, calMonth - 1, selectedDay).toLocaleDateString(
                                            locale === 'fr' ? 'fr-FR' : 'en-US',
                                            { month: 'long' }
                                        )}
                                    </Text>

                                    {allSelectedAspects.length === 0 ? (
                                        <Text style={styles.noAspectsText}>{t('transits.calendarNoAspects')}</Text>
                                    ) : (
                                        <>
                                            {/* Type filter pills */}
                                            {presentTypes.length > 1 && (
                                                <ScrollView
                                                    horizontal
                                                    showsHorizontalScrollIndicator={false}
                                                    contentContainerStyle={styles.filterRow}
                                                >
                                                    <Pressable
                                                        style={[styles.filterPill, !aspectFilter && styles.filterPillActive]}
                                                        onPress={() => { setAspectFilter(null); setAspectsExpanded(false); }}
                                                    >
                                                        <Text style={[styles.filterPillText, !aspectFilter && styles.filterPillTextActive]}>
                                                            {locale === 'fr' ? 'Tous' : 'All'}
                                                        </Text>
                                                    </Pressable>
                                                    {presentTypes.map(type => {
                                                        const color = aspectColor(type);
                                                        const active = aspectFilter === type;
                                                        const label = type === 'conjunction' ? (locale === 'fr' ? 'Conj.' : 'Conj.')
                                                            : type === 'opposition' ? (locale === 'fr' ? 'Oppos.' : 'Oppos.')
                                                            : type === 'trine'      ? (locale === 'fr' ? 'Trigone' : 'Trine')
                                                            : type === 'square'     ? (locale === 'fr' ? 'Carré' : 'Square')
                                                            : 'Sextile';
                                                        return (
                                                            <Pressable
                                                                key={type}
                                                                style={[styles.filterPill, active && { backgroundColor: `${color}25`, borderColor: `${color}60` }]}
                                                                onPress={() => { setAspectFilter(active ? null : type); setAspectsExpanded(false); }}
                                                            >
                                                                <View style={[styles.filterDot, { backgroundColor: color }]} />
                                                                <Text style={[styles.filterPillText, active && { color }]}>{label}</Text>
                                                            </Pressable>
                                                        );
                                                    })}
                                                </ScrollView>
                                            )}

                                            {/* Aspect list */}
                                            <GlassCard opacity="low" radius="xl" style={styles.aspectsCard}>
                                                {filteredAspects.length === 0 ? (
                                                    <Text style={styles.noAspectsText}>{locale === 'fr' ? 'Aucun aspect de ce type' : 'No aspects of this type'}</Text>
                                                ) : (
                                                    <>
                                                        {visibleAspects.map((a, i) => (
                                                            <View key={i}>
                                                                <AspectRow aspect={a} locale={locale} onPress={() => setSelectedAspect(a)} />
                                                                {i < visibleAspects.length - 1 && <View style={styles.aspectDivider} />}
                                                            </View>
                                                        ))}
                                                        {!aspectsExpanded && hiddenCount > 0 && (
                                                            <>
                                                                <View style={styles.aspectDivider} />
                                                                <Pressable
                                                                    style={styles.showMoreBtn}
                                                                    onPress={() => setAspectsExpanded(true)}
                                                                >
                                                                    <Text style={styles.showMoreText}>
                                                                        {locale === 'fr' ? `Voir ${hiddenCount} de plus` : `Show ${hiddenCount} more`}
                                                                    </Text>
                                                                    <Feather name="chevron-down" size={13} color={colors.primary} />
                                                                </Pressable>
                                                            </>
                                                        )}
                                                    </>
                                                )}
                                            </GlassCard>
                                        </>
                                    )}
                                </View>
                            )}
                        </View>
                    )}

                    {/* ── Mirror tab ── mounted once, hidden when not active to preserve state */}
                    {mirrorEverVisited && (
                        <View
                            style={[styles.mirrorWrap, { display: activeTab === 'mirror' ? 'flex' : 'none' }]}
                        >
                            <MirrorTabContent />
                        </View>
                    )}

                    <View style={{ height: 80 }} />
                </ScrollView>

                <InterpretationModal
                    aspect={selectedAspect}
                    locale={locale}
                    onClose={() => setSelectedAspect(null)}
                />
                <HelpModal
                    visible={helpVisible}
                    onClose={() => setHelpVisible(false)}
                    title={locale === 'fr' ? 'Guide astrologique' : 'Astrology guide'}
                    sections={[
                        {
                            key: 'aspects',
                            title: locale === 'fr' ? 'Aspects' : 'Aspects',
                            items: ASPECTS_INFO(locale === 'fr').map(a => ({
                                symbol: a.symbol, symbolColor: a.color,
                                name: a.name, badge: a.angle, description: a.desc,
                            })),
                        },
                        {
                            key: 'planets',
                            title: locale === 'fr' ? 'Planètes' : 'Planets',
                            items: PLANETS_INFO(locale === 'fr').map(p => ({
                                symbol: p.symbol, symbolColor: p.color,
                                name: p.name, description: p.desc,
                            })),
                        },
                    ]}
                />

            </SafeAreaView>

        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.surfaceLowest },
    safe: { flex: 1 },
    scroll: { flexGrow: 1 },

    // Hero
    hero: {
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.xl,
        marginBottom: spacing.xl,
    },
    heroTitle: {
        fontFamily: fonts.display.bold,
        fontSize: 38,
        lineHeight: 46,
        color: colors.onSurface,
        letterSpacing: -0.5,
        marginBottom: spacing.md,
    },
    heroSubtitle: {
        fontFamily: fonts.body.regular,
        fontSize: 15,
        lineHeight: 22,
        color: colors.onSurfaceMuted,
    },

    // Tab toggle
    tabToggleWrap: {
        paddingHorizontal: spacing.xl,
        marginBottom: spacing.xxl,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    tabToggle: {
        flexDirection: 'row',
        backgroundColor: colors.surfaceContainerHigh,
        borderRadius: radius.full,
        padding: 3,
        flex: 1,
    },
    tabBtnWrap: {
        flex: 1,
    },
    tabBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.md,
        paddingVertical: 8,
        borderRadius: radius.full,
    },
    tabBtnActive: {
        backgroundColor: colors.primary,
    },
    tabBtnText: {
        fontFamily: fonts.body.semiBold,
        fontSize: 12,
        color: colors.onSurfaceMuted,
        letterSpacing: 0.3,
    },
    tabBtnTextActive: {
        color: colors.surfaceLowest,
    },

    // AI Badge
    aiBadgeWrap: {
        paddingHorizontal: spacing.xl,
        marginBottom: spacing.xxl,
    },
    aiBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: spacing.sm,
        backgroundColor: colors.surfaceContainerHigh,
        borderRadius: radius.full,
        paddingHorizontal: spacing.md,
        paddingVertical: 6,
    },
    aiBadgeDot: {
        width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary,
    },
    aiBadgeText: {
        fontFamily: fonts.body.semiBold,
        fontSize: 9,
        letterSpacing: 1.5,
        color: colors.onSurfaceMuted,
        textTransform: 'uppercase',
    },

    // Timeline
    timeline: { paddingHorizontal: spacing.xl },
    transitRow: {
        flexDirection: 'row',
        gap: spacing.lg,
        marginBottom: spacing.xxl,
    },
    timelineCol: {
        alignItems: 'center',
        width: 12,
        paddingTop: spacing.lg,
    },
    dot: {
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 6,
        elevation: 4,
    },
    line: {
        flex: 1,
        width: 1,
        backgroundColor: colors.outline,
        opacity: 0.25,
        marginTop: spacing.sm,
    },
    transitCard: { flex: 1 },
    transitHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    intensityBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 3,
        borderRadius: radius.full,
    },
    intensityLabel: {
        fontFamily: fonts.body.semiBold,
        fontSize: 9,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
    },
    transitDate: {
        fontFamily: fonts.body.semiBold,
        fontSize: 10,
        letterSpacing: 1,
        color: colors.onSurfaceMuted,
        textTransform: 'uppercase',
    },
    transitTitle: {
        fontFamily: fonts.display.regular,
        fontSize: 17,
        color: colors.onSurface,
        marginBottom: spacing.sm,
        letterSpacing: 0.2,
    },
    transitDesc: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        lineHeight: 20,
        color: colors.onSurfaceMuted,
    },

    // Skeleton
    skeletonWrap: { paddingHorizontal: spacing.xl },
    skeletonCard: {
        flex: 1,
        borderRadius: radius.xl,
        backgroundColor: colors.surfaceLow,
        opacity: 0.5,
    },

    // Error
    errorCard: {
        marginHorizontal: spacing.xl,
        alignItems: 'center',
        gap: spacing.lg,
    },
    errorText: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        color: colors.onSurfaceMuted,
        textAlign: 'center',
        lineHeight: 20,
    },
    retryBtn: {
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: radius.full,
        backgroundColor: `${colors.primary}20`,
    },
    retryText: {
        fontFamily: fonts.body.semiBold,
        fontSize: 13,
        color: colors.primary,
        letterSpacing: 0.5,
    },

    // Pull hint
    pullHint: {
        fontFamily: fonts.body.regular,
        fontSize: 12,
        color: `${colors.onSurfaceMuted}60`,
        textAlign: 'center',
        marginTop: spacing.sm,
    },

    // Calendar section
    calendarSection: {
        paddingHorizontal: spacing.xl,
        gap: spacing.lg,
    },
    calendarLockedWrap: {
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.xxl * 2,
        alignItems: 'center',
        gap: spacing.lg,
    },
    calendarLockedTitle: {
        fontFamily: fonts.display.bold,
        fontSize: 20,
        color: colors.onSurface,
        textAlign: 'center',
    },
    calendarLockedSubtitle: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        color: colors.onSurfaceMuted,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: spacing.md,
    },

    // Month nav
    calNavRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.sm,
    },
    calNavRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    calNavBtn: {
        padding: spacing.sm,
        borderRadius: radius.full,
        backgroundColor: colors.surfaceContainerHigh,
    },
    helpBtn: {
        padding: spacing.sm,
    },
    calMonthLabel: {
        fontFamily: fonts.display.regular,
        fontSize: 18,
        color: colors.onSurface,
        letterSpacing: 0.3,
        textTransform: 'capitalize',
    },

    // Legend
    legendRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
        marginBottom: spacing.sm,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    legendDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
    },
    legendText: {
        fontFamily: fonts.body.regular,
        fontSize: 10,
        color: colors.onSurfaceMuted,
        letterSpacing: 0.3,
    },

    // Calendar card
    calCard: {
        padding: spacing.md,
    },
    inlineLoaderWrap: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xxxl,
    },
    calLoadingWrap: {
        alignItems: 'center',
        paddingVertical: spacing.xxxl,
    },

    // Calendar grid
    calGrid: {
        gap: 4,
    },
    calDowRow: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    calDowCell: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 4,
    },
    calDowText: {
        fontFamily: fonts.body.semiBold,
        fontSize: 10,
        color: colors.onSurfaceMuted,
        letterSpacing: 0.5,
    },
    calRow: {
        flexDirection: 'row',
        gap: 2,
    },
    calCell: {
        flex: 1,
        aspectRatio: 0.85,
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: 5,
        borderRadius: radius.md,
        gap: 3,
    },
    calCellSelected: {
        backgroundColor: `${colors.primary}18`,
    },
    calDayNum: {
        fontFamily: fonts.body.regular,
        fontSize: 12,
        color: colors.onSurface,
        lineHeight: 16,
    },
    calDayToday: {
        fontFamily: fonts.body.bold,
        color: colors.primary,
    },
    calDaySelected: {
        color: colors.primary,
    },
    calDots: {
        flexDirection: 'row',
        gap: 2,
        flexWrap: 'nowrap',
    },
    calDot: {
        width: 5,
        height: 5,
        borderRadius: 3,
    },

    // Day detail
    dayDetail: {
        gap: spacing.md,
        marginTop: spacing.sm,
    },
    dayDetailTitle: {
        fontFamily: fonts.display.regular,
        fontSize: 20,
        color: colors.onSurface,
        letterSpacing: 0.2,
        textTransform: 'capitalize',
    },
    noAspectsText: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        color: colors.onSurfaceMuted,
        textAlign: 'center',
        paddingVertical: spacing.xl,
    },
    aspectsCard: {
        gap: 0,
    },

    // Filter pills
    filterRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        paddingVertical: 2,
    },
    filterPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: spacing.md,
        paddingVertical: 6,
        borderRadius: radius.full,
        backgroundColor: colors.surfaceContainerHigh,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    filterPillActive: {
        backgroundColor: `${colors.primary}20`,
        borderColor: `${colors.primary}50`,
    },
    filterPillText: {
        fontFamily: fonts.body.semiBold,
        fontSize: 11,
        color: colors.onSurfaceMuted,
        letterSpacing: 0.3,
    },
    filterPillTextActive: {
        color: colors.primary,
    },
    filterDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },

    // Show more
    showMoreBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.md,
    },
    showMoreText: {
        fontFamily: fonts.body.semiBold,
        fontSize: 12,
        color: colors.primary,
        letterSpacing: 0.3,
    },

    // Aspect row
    aspectRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.sm,
    },
    aspectTypeDot: {
        width: 36,
        height: 36,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    aspectSymbol: {
        fontSize: 16,
        lineHeight: 20,
    },
    aspectInfo: {
        flex: 1,
    },
    aspectTitle: {
        fontFamily: fonts.body.medium,
        fontSize: 13,
        color: colors.onSurface,
        lineHeight: 18,
    },
    aspectOrb: {
        fontFamily: fonts.body.regular,
        fontSize: 11,
        color: colors.onSurfaceMuted,
        marginTop: 2,
    },
    aspectTypeBadge: {
        width: 24,
        height: 24,
        borderRadius: radius.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    aspectDotSmall: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    aspectDivider: {
        height: 1,
        backgroundColor: colors.surfaceContainerHigh,
        marginHorizontal: -spacing.lg,
    },

    // Help Modal
    // Interpretation Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    modalSheet: {
        backgroundColor: colors.surfaceContainer,
        borderTopLeftRadius: radius.xl,
        borderTopRightRadius: radius.xl,
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.xxxl,
        paddingTop: spacing.md,
    },
    modalHandle: {
        width: 36,
        height: 4,
        borderRadius: radius.full,
        backgroundColor: colors.outline,
        alignSelf: 'center',
        marginBottom: spacing.xl,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        marginBottom: spacing.xl,
    },
    modalAspectBadge: {
        width: 48,
        height: 48,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalSymbol: {
        fontSize: 22,
        lineHeight: 26,
    },
    modalTitleWrap: {
        flex: 1,
    },
    modalTitle: {
        fontFamily: fonts.display.regular,
        fontSize: 17,
        color: colors.onSurface,
        lineHeight: 22,
    },
    modalOrb: {
        fontFamily: fonts.body.regular,
        fontSize: 12,
        color: colors.onSurfaceMuted,
        marginTop: 2,
    },
    modalCloseBtn: {
        padding: spacing.xs,
    },
    modalContent: {
        minHeight: 80,
    },
    modalLoading: {
        alignItems: 'center',
        paddingVertical: spacing.xxl,
    },
    modalText: {
        fontFamily: fonts.body.regular,
        fontSize: 15,
        lineHeight: 24,
        color: colors.onSurface,
    },
    modalError: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        color: colors.error,
        textAlign: 'center',
        paddingVertical: spacing.xl,
    },

    // Mirror tab wrapper
    mirrorWrap: {
        paddingHorizontal: spacing.xl,
    },
});

// ─── Mirror Styles ────────────────────────────────────────────────────────────

const mirrorStyles = StyleSheet.create({
    tabContent: { gap: 0 },
    card: { marginBottom: 16 },

    // ── Picker card ──────────────────────────────────────────────────────────
    pickerCard: { marginBottom: 16 },

    // Header: âge à gauche, badge année à droite
    pickerHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    ageStack: { gap: 6 },
    ageRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
    contextAge: { fontFamily: fonts.display.bold, fontSize: 52, color: colors.onSurface, lineHeight: 56 },
    contextSuffix: { fontFamily: fonts.body.regular, fontSize: 14, color: colors.onSurfaceMuted, paddingBottom: 4 },
    // Milestone tag sous l'âge
    milestoneTag: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: radius.full,
        backgroundColor: `${colors.primary}12`,
        alignSelf: 'flex-start',
    },
    milestoneGlyph: { fontSize: 12, color: colors.primary },
    milestoneName: { fontFamily: fonts.body.semiBold, fontSize: 11, color: colors.primary, letterSpacing: 0.3 },
    // Côté droit : badge année + barre intensité
    pickerRight: { alignItems: 'flex-end', gap: 8, paddingTop: 4 },
    yearBadge: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 14, paddingVertical: 7,
        borderRadius: radius.full,
        backgroundColor: `${colors.primary}12`,
        borderWidth: 1, borderColor: `${colors.primary}30`,
        minWidth: 72, justifyContent: 'center',
    },
    yearBadgeText: { fontFamily: fonts.body.bold, fontSize: 15, color: colors.primary, letterSpacing: 0.5 },
    intensityRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    intensityTrack: { width: 64, height: 3, backgroundColor: colors.surfaceVariant, borderRadius: radius.full, overflow: 'hidden' },
    intensityFill: { height: '100%', backgroundColor: colors.primary, borderRadius: radius.full },
    intensityPct: { fontFamily: fonts.body.semiBold, fontSize: 11, color: colors.primary },

    // Decade pills
    decadesScroll: { marginBottom: 12 },
    decadesContent: { flexDirection: 'row', gap: 5, paddingVertical: 2 },
    decadePill: {
        paddingHorizontal: 13, paddingVertical: 7,
        borderRadius: radius.full,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    },
    decadePillActive: {
        backgroundColor: `${colors.primary}15`,
        borderColor: `${colors.primary}55`,
    },
    decadeText: { fontFamily: fonts.body.semiBold, fontSize: 11, color: colors.onSurfaceMuted, letterSpacing: 0.4 },
    decadeTextActive: { color: colors.primary },

    // Year grid — cellules avec fond + glyph milestone au-dessus
    yearsRow: { flexDirection: 'row', gap: 4 },
    yearBtn: {
        flex: 1,
        alignItems: 'center',
        paddingBottom: 9,
        borderRadius: radius.md,
        backgroundColor: colors.surfaceContainerHigh,
        overflow: 'hidden',
    },
    yearBtnActive: {
        backgroundColor: colors.primary,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.4,
        shadowRadius: 7,
        elevation: 5,
    },
    // Slot fixe au-dessus du chiffre pour aligner les boutons avec ou sans glyph
    yearTopSlot: { height: 16, justifyContent: 'flex-end', marginBottom: 3 },
    yearMilestoneGlyph: { fontSize: 9, color: colors.primary, lineHeight: 12, opacity: 0.8 },
    yearMilestoneGlyphActive: { color: colors.surfaceLowest, opacity: 1 },
    yearNum: { fontFamily: fonts.body.semiBold, fontSize: 12, color: colors.onSurfaceMuted },
    yearNumActive: { color: colors.surfaceLowest, fontFamily: fonts.body.bold },

    // ── Chapter cards ────────────────────────────────────────────────────────
    chaptersWrap: { gap: 12, marginBottom: 16 },
    chapterCard: {
        backgroundColor: 'rgba(30, 19, 56, 0.40)',
        borderRadius: radius.xl,
        borderWidth: 1,
        overflow: 'hidden',
    },
    chapterTopHighlight: {
        position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
    },
    chapterGoldGlow: {
        position: 'absolute', top: -30, right: -30, width: 130, height: 130, borderRadius: 65,
    },
    chapterCardInner: { padding: spacing.xl },
    chapterHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
    glyphBadge: { width: 28, height: 28, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    glyphText: { fontSize: 15, lineHeight: 20 },
    chapterTheme: {
        flex: 1,
        fontFamily: fonts.body.semiBold, fontSize: 10, letterSpacing: 2.4,
        color: colors.onSurface, textTransform: 'uppercase',
    },
    chapterStep: { fontFamily: fonts.body.regular, fontSize: 10, color: colors.onSurfaceMuted, letterSpacing: 1 },
    chapterBodyRow: { flexDirection: 'row', alignItems: 'flex-start' },
    dropCap: { fontFamily: fonts.display.bold, fontSize: 46, lineHeight: 42, marginRight: 6 },
    chapterText: { fontFamily: fonts.body.regular, fontSize: 14, lineHeight: 23, color: colors.onSurface },

    // ── Pin CTA ──────────────────────────────────────────────────────────────
    pinCta: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        paddingVertical: 14, borderRadius: 14,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
        marginBottom: 16,
    },
    pinCtaText: {
        fontFamily: fonts.body.semiBold, fontSize: 11,
        letterSpacing: 2.16, textTransform: 'uppercase', color: colors.onSurface,
    },

    // ── Feedback ─────────────────────────────────────────────────────────────
    feedbackRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 10, marginBottom: 24,
    },
    feedbackLabel: { fontFamily: fonts.body.regular, fontSize: 13, color: colors.onSurfaceMuted },
    feedbackBtns: { flexDirection: 'row', gap: 8 },
    feedbackBtn: {
        width: 32, height: 32, borderRadius: 10,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
        alignItems: 'center', justifyContent: 'center',
    },
    feedbackBtnActive: { backgroundColor: `${colors.primary}20`, borderColor: `${colors.primary}50` },

    // ── Loading ───────────────────────────────────────────────────────────────
    loadingWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, marginBottom: 16 },
    loadingText: { fontFamily: fonts.body.regular, fontSize: 14, color: colors.onSurfaceMuted },

    // ── Interprétation fallback (format texte brut) ───────────────────────────
    sectionTitle: { fontFamily: fonts.display.medium, fontSize: 15, color: colors.onSurface, marginBottom: 12 },
    emptyText: { fontFamily: fonts.body.regular, fontSize: 13, color: colors.onSurfaceMuted, textAlign: 'center', paddingVertical: 8 },
    interpText: { fontFamily: fonts.body.regular, fontSize: 15, lineHeight: 24, color: colors.onSurface },

    // ── Pinned event ──────────────────────────────────────────────────────────
    pinCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    pinText: { fontFamily: fonts.body.regular, fontSize: 14, color: colors.onSurface, flex: 1, lineHeight: 20 },

    // ── Transit grid ──────────────────────────────────────────────────────────
    planetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    planetCell: { backgroundColor: colors.surfaceVariant, borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 6, minWidth: 76 },
    planetCellName: { fontFamily: fonts.body.regular, fontSize: 10, color: colors.onSurfaceMuted, marginBottom: 2 },
    planetCellSign: { fontFamily: fonts.body.semiBold, fontSize: 13, color: colors.onSurface },

    // ── Aspects actifs ────────────────────────────────────────────────────────
    mirrorAspectRow: { marginBottom: 12 },
    intensityBarBg: { height: 3, backgroundColor: colors.surfaceVariant, borderRadius: radius.full, overflow: 'hidden', marginBottom: 6 },
    intensityBarFill: { height: '100%', borderRadius: radius.full },
    aspectInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    aspectGlyph: { fontSize: 16, color: colors.primary },
    planetLabel: { fontFamily: fonts.body.semiBold, fontSize: 13, color: colors.onSurface },
    aspectTypeLabel: { fontFamily: fonts.body.regular, fontSize: 12, color: colors.onSurfaceMuted, fontStyle: 'italic' },
    orbBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.full, borderWidth: 1, flexShrink: 0 },
    orbBadgeText: { fontFamily: fonts.body.semiBold, fontSize: 10 },

    // ── Modals ────────────────────────────────────────────────────────────────
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: colors.surfaceContainerHigh, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: 24, paddingBottom: 40, gap: 16 },
    modalTitle: { fontFamily: fonts.display.bold, fontSize: 18, color: colors.onSurface },
    pinInput: { backgroundColor: colors.surfaceVariant, borderRadius: radius.md, padding: 12, fontFamily: fonts.body.regular, fontSize: 14, color: colors.onSurface, minHeight: 80, textAlignVertical: 'top' },
    lockIcon: { alignSelf: 'center' },
    premiumTitle: { fontFamily: fonts.display.bold, fontSize: 20, color: colors.onSurface, textAlign: 'center' },
    premiumSubtitle: { fontFamily: fonts.body.regular, fontSize: 14, color: colors.onSurfaceMuted, textAlign: 'center', lineHeight: 20 },
    unlockedLabel: { fontFamily: fonts.body.semiBold, fontSize: 13, color: colors.onSurfaceMuted },
    unlockedRange: { fontFamily: fonts.body.regular, fontSize: 13, color: colors.onSurface },
    premiumActions: { gap: 10, marginTop: 4 },
});