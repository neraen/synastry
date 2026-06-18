// Actu astro feed — month header + dated event feed (today / upcoming / past) with
// deterministic perso hooks, plus a discreet "humeur du jour". Reached from the
// horoscope tab's "Actu astro" button and from sky-event push deep-links.
import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { NoBirthProfileCard, Starfield, TabHeader } from '@/components/ui';
import { FullPageLoader } from '@/components/loaders';
import { getActuAstro, getMoodToday, AstroEvent, MoodToday } from '@/services/astrology';
import { colors, spacing, radius, fonts } from '@/theme';

// ─── Symbol maps (frontend, mirrors PlanetaryCalculator) ────────────────────────
const SIGN_SYMBOL: Record<string, string> = {
    'Bélier': '♈', 'Taureau': '♉', 'Gémeaux': '♊', 'Cancer': '♋',
    'Lion': '♌', 'Vierge': '♍', 'Balance': '♎', 'Scorpion': '♏',
    'Sagittaire': '♐', 'Capricorne': '♑', 'Verseau': '♒', 'Poissons': '♓',
};

// ─── Event-type visual system (one icon + hue per family) ───────────────────────
type EventVisual = { icon: keyof typeof Feather.glyphMap; color: string; label: string };
function visualFor(type: string): EventVisual {
    switch (type) {
        case 'lunation_full': return { icon: 'moon', color: colors.events.lunaison, label: 'Pleine lune' };
        case 'lunation_new': return { icon: 'circle', color: colors.events.lunaison, label: 'Nouvelle lune' };
        case 'eclipse_solar': return { icon: 'circle', color: colors.events.eclipse, label: 'Éclipse solaire' };
        case 'eclipse_lunar': return { icon: 'moon', color: colors.events.eclipse, label: 'Éclipse lunaire' };
        case 'retrograde_start': return { icon: 'rotate-ccw', color: colors.events.retro, label: 'Rétrograde' };
        case 'retrograde_end': return { icon: 'rotate-cw', color: colors.events.retro, label: 'Reprise directe' };
        case 'ingression': return { icon: 'arrow-right-circle', color: colors.events.ingression, label: 'Ingression' };
        case 'aspect': return { icon: 'triangle', color: colors.events.aspect, label: 'Aspect' };
        default: return { icon: 'star', color: colors.primary, label: 'Événement' };
    }
}

const WEEKDAYS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

function cap(s: string): string {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function whenBadge(event: AstroEvent): string {
    if (event.status === 'today') return "Aujourd'hui";
    if (event.status === 'past') return 'Passé';
    const days = Math.max(1, Math.ceil((new Date(event.exactAt).getTime() - Date.now()) / 86400000));
    return `Dans ${days} j`;
}

function whenText(event: AstroEvent): string {
    const d = new Date(event.exactAt);
    const time = `${d.getHours().toString().padStart(2, '0')}h${d.getMinutes().toString().padStart(2, '0')}`;
    if (event.status === 'today') {
        return d.getHours() >= 17 ? `Ce soir · ${time}` : `Aujourd'hui · ${time}`;
    }
    return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

// Subtle gradient glow overlay (approximates the mockup's radial glow in RN).
function Glow({ palette }: { palette: 'month' | 'gold' }) {
    const cols =
        palette === 'month'
            ? [colors.primary + '22', 'transparent', colors.secondaryContainer + '2E'] as const
            : [colors.primary + '26', 'transparent'] as const;
    return (
        <LinearGradient
            colors={cols}
            start={{ x: 1, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
        />
    );
}

// ─── Event card ──────────────────────────────────────────────────────────────
function EventCard({ event }: { event: AstroEvent }) {
    const v = visualFor(event.type);
    const isPast = event.status === 'past';
    const isToday = event.status === 'today';
    const isHero = isToday && (event.perso?.isHighlight ?? false);

    const facts: React.ReactNode[] = [<Text key="when" style={styles.factStrong}>{whenText(event)}</Text>];
    if (event.signFr) {
        facts.push(
            <Text key="s1" style={styles.factMuted}>
                {' · '}<Text style={styles.glyph}>{SIGN_SYMBOL[event.signFr] ?? ''}</Text> {event.signFr}
                {event.degree != null ? ` ${event.degree}°` : ''}
            </Text>
        );
    }
    if (event.aspectType && event.sign2Fr) {
        facts.push(
            <Text key="s2" style={styles.factMuted}>
                {' · '}<Text style={styles.glyph}>{SIGN_SYMBOL[event.sign2Fr] ?? ''}</Text> {event.sign2Fr}
                {event.degree2 != null ? ` ${event.degree2}°` : ''}
            </Text>
        );
    }

    return (
        <View style={[styles.ev, isHero && styles.evHero, isPast && styles.evPast]}>
            {isHero && <Glow palette="gold" />}
            <View style={styles.evTop}>
                <View style={[
                    styles.tile, isHero && styles.tileHero,
                    { backgroundColor: v.color + '26', borderColor: v.color + '55' },
                ]}>
                    <Feather name={v.icon} size={isHero ? 24 : 21} color={v.color} />
                </View>

                <View style={styles.evMain}>
                    <View style={styles.typeRow}>
                        <Text style={[styles.typeLabel, { color: v.color }]}>{v.label.toUpperCase()}</Text>
                        {event.perso?.isHighlight && (
                            <View style={styles.chip}>
                                <Feather name="star" size={9} color={colors.text.inverse} />
                                <Text style={styles.chipText}>POUR TOI</Text>
                            </View>
                        )}
                    </View>
                    <Text style={[styles.evTitle, isHero && styles.evTitleHero]}>{event.title ?? v.label}</Text>
                    <Text style={styles.evFacts}>{facts}</Text>
                </View>

                <Text style={[styles.when, isToday && styles.whenToday]}>{whenBadge(event)}</Text>
            </View>

            {event.body && !isPast && <Text style={styles.evBody}>{event.body}</Text>}

            {event.perso?.hook ? (
                <View style={[styles.perso, isPast && styles.persoPast]}>
                    <Feather name="target" size={14} color={isPast ? colors.onSurfaceMuted : colors.primary} style={{ marginTop: 1 }} />
                    <Text style={styles.persoText}>{event.perso.hook}</Text>
                </View>
            ) : null}
        </View>
    );
}

function FeedLabel({ children, today }: { children: string; today?: boolean }) {
    return (
        <View style={styles.feedLabelRow}>
            <Text style={[styles.feedLabel, today && styles.feedLabelToday]}>{children}</Text>
            <View style={[styles.feedLine, today && styles.feedLineToday]} />
        </View>
    );
}

// ─── Screen ──────────────────────────────────────────────────────────────────
export default function ActuAstroScreen() {
    const router = useRouter();
    const { isAuthenticated, user, isLoading: isAuthLoading } = useAuth();

    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState<AstroEvent[]>([]);
    const [monthLabel, setMonthLabel] = useState('');
    const [yearLabel, setYearLabel] = useState<number | null>(null);
    const [mood, setMood] = useState<MoodToday | null>(null);

    const load = useCallback(async () => {
        try {
            const [actu, moodRes] = await Promise.all([getActuAstro(), getMoodToday()]);
            if (actu.success && actu.events) {
                setEvents(actu.events);
                setMonthLabel(actu.month ?? '');
                setYearLabel(actu.year ?? null);
            }
            if (moodRes.success) setMood(moodRes.mood ?? null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated) load();
        else setLoading(false);
    }, [isAuthenticated, load]);

    if (isAuthLoading || loading) return <FullPageLoader visible />;
    if (!user?.hasBirthProfile) return <NoBirthProfileCard />;

    const today = events.filter((e) => e.status === 'today');
    const upcoming = events.filter((e) => e.status === 'upcoming');
    const past = events.filter((e) => e.status === 'past');
    const highlightCount = today.filter((e) => e.perso?.isHighlight).length;

    return (
        <SafeAreaView style={styles.screen} edges={['top']}>
            <Starfield />
            <TabHeader onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/daily-horoscope'))} />
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                {/* Month hero */}
                <View style={styles.monthHero}>
                    <Glow palette="month" />
                    <View style={styles.monthKickerRow}>
                        <Feather name="compass" size={13} color={colors.primary} />
                        <Text style={styles.monthKicker}>ACTU ASTRO</Text>
                    </View>
                    <Text style={styles.monthName}>
                        {cap(monthLabel)} <Text style={styles.monthYear}>{yearLabel ?? ''}</Text>
                    </Text>
                    <Text style={styles.monthStats}>
                        <Text style={styles.monthStatStrong}>{events.length}</Text> événements
                        {highlightCount > 0 ? (
                            <Text>{'   ·   '}<Text style={styles.monthStatGold}>{highlightCount}</Text> temps fort pour toi</Text>
                        ) : null}
                    </Text>
                </View>

                {/* Horoscope — humeur du jour, discreet, just under the month card */}
                {mood && (
                    <View style={styles.humeur}>
                        <View style={styles.humeurGlyph}>
                            <Feather name="moon" size={16} color={colors.onSurfaceMuted} />
                        </View>
                        <View style={styles.humeurBody}>
                            <Text style={styles.humeurLabel}>HOROSCOPE</Text>
                            <Text style={styles.humeurText}>{mood.text}</Text>
                        </View>
                    </View>
                )}

                {/* Feed */}
                {today.length > 0 && (
                    <>
                        <FeedLabel today>AUJOURD'HUI</FeedLabel>
                        {today.map((e) => <EventCard key={e.id} event={e} />)}
                    </>
                )}
                {upcoming.length > 0 && (
                    <>
                        <FeedLabel>À VENIR</FeedLabel>
                        {upcoming.map((e) => <EventCard key={e.id} event={e} />)}
                    </>
                )}
                {past.length > 0 && (
                    <>
                        <FeedLabel>DÉJÀ PASSÉ</FeedLabel>
                        {past.map((e) => <EventCard key={e.id} event={e} />)}
                    </>
                )}
                {events.length === 0 && (
                    <Text style={styles.empty}>Le ciel se prépare — les événements du mois arrivent bientôt.</Text>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.surfaceLowest },
    scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing.xxl * 2 },

    monthHero: {
        position: 'relative', overflow: 'hidden',
        borderRadius: radius.xl, padding: spacing.lg, marginTop: spacing.lg, marginBottom: spacing.md,
        backgroundColor: colors.surfaceLow, borderWidth: 1, borderColor: colors.border.subtle,
    },
    monthKickerRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 },
    monthKicker: { color: colors.primary, fontSize: 10, letterSpacing: 2, fontFamily: fonts.body.bold },
    monthName: { color: colors.onSurface, fontSize: 34, fontFamily: fonts.display.regular },
    monthYear: { color: colors.primaryContainer, fontSize: 19 },
    monthStats: { color: colors.text.secondary, fontSize: 12, fontFamily: fonts.body.regular, marginTop: 10 },
    monthStatStrong: { color: colors.onSurface, fontFamily: fonts.body.bold },
    monthStatGold: { color: colors.primary, fontFamily: fonts.body.bold },

    feedLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: spacing.lg, marginBottom: spacing.sm },
    feedLabel: { color: colors.onSurfaceMuted, fontSize: 10.5, letterSpacing: 2, fontFamily: fonts.body.bold },
    feedLabelToday: { color: colors.primary },
    feedLine: { flex: 1, height: 1, backgroundColor: colors.border.subtle },
    feedLineToday: { backgroundColor: colors.glow.gold },

    ev: {
        position: 'relative', overflow: 'hidden',
        borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, gap: spacing.sm,
        backgroundColor: colors.surfaceLow, borderWidth: 1, borderColor: colors.border.subtle,
    },
    evHero: {
        backgroundColor: colors.surfaceContainer, borderColor: colors.glow.gold,
        shadowColor: colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.18, shadowRadius: 20, elevation: 6,
    },
    evPast: { opacity: 0.55 },
    evTop: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
    tile: { width: 42, height: 42, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    tileHero: { width: 48, height: 48 },
    evMain: { flex: 1, minWidth: 0 },
    typeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 },
    typeLabel: { fontSize: 9.5, letterSpacing: 1.2, fontFamily: fonts.body.bold },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 99 },
    chipText: { color: colors.text.inverse, fontSize: 8.5, letterSpacing: 1, fontFamily: fonts.body.bold },
    evTitle: { color: colors.onSurface, fontSize: 19, fontFamily: fonts.display.regular, lineHeight: 22, marginTop: 1 },
    evTitleHero: { fontSize: 23, lineHeight: 26 },
    evFacts: { color: colors.text.secondary, fontSize: 11.5, fontFamily: fonts.body.regular, marginTop: 7 },
    factStrong: { color: colors.onSurface, fontFamily: fonts.body.semiBold },
    factMuted: { color: colors.text.secondary },
    glyph: { color: colors.primary, fontSize: 13 },
    when: { color: colors.onSurfaceMuted, fontSize: 10, fontFamily: fonts.body.bold },
    whenToday: { color: colors.primary },
    evBody: { color: colors.text.secondary, fontSize: 13, lineHeight: 19, fontFamily: fonts.body.regular },

    perso: {
        flexDirection: 'row', gap: 9, alignItems: 'flex-start',
        backgroundColor: colors.glow.gold, borderRadius: radius.md, padding: spacing.sm,
        borderLeftWidth: 3, borderLeftColor: colors.primary,
    },
    persoPast: { backgroundColor: colors.surfaceVariant, borderLeftColor: colors.onSurfaceMuted },
    persoText: { flex: 1, color: colors.text.secondary, fontSize: 12, lineHeight: 17, fontFamily: fonts.body.regular },

    empty: { color: colors.onSurfaceMuted, fontFamily: fonts.body.regular, textAlign: 'center', marginTop: spacing.xl, marginBottom: spacing.lg },

    humeur: {
        flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start', marginTop: spacing.sm,
        backgroundColor: colors.surfaceVariant, borderRadius: radius.lg, padding: spacing.md,
    },
    humeurGlyph: { width: 30, height: 30, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceContainerHigh },
    humeurBody: { flex: 1, minWidth: 0 },
    humeurLabel: { color: colors.onSurfaceMuted, fontSize: 9.5, letterSpacing: 1.6, fontFamily: fonts.body.bold, marginBottom: 5 },
    humeurText: { color: colors.text.secondary, fontSize: 12.5, lineHeight: 18, fontFamily: fonts.body.regular },
});
