import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { GlassCard, Starfield } from '@/components/ui';
import { FullPageLoader } from '@/components/loaders';
import { useAuth } from '@/contexts/AuthContext';
import { getActuAstro, AstroEvent } from '@/services/astrology';
import { colors, spacing, radius, fonts } from '@/theme';

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

const MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

function formatWhen(iso: string): string {
    const d = new Date(iso);
    return `${d.getDate()} ${MONTHS_FR[d.getMonth()]} · ${d.getHours().toString().padStart(2, '0')}h${d.getMinutes().toString().padStart(2, '0')}`;
}

function EventCard({ event }: { event: AstroEvent }) {
    const v = visualFor(event.type);
    const isPast = event.status === 'past';
    const isToday = event.status === 'today';

    const facts: string[] = [];
    if (event.signFr) facts.push(`${event.signFr}${event.degree != null ? ` ${event.degree}°` : ''}`);
    if (event.aspectType && event.sign2Fr) facts.push(`${event.sign2Fr}${event.degree2 != null ? ` ${event.degree2}°` : ''}`);

    return (
        <GlassCard opacity={isToday ? 'medium' : 'low'} radius="xl" style={[styles.card, isPast && styles.cardPast]}>
            <View style={styles.cardTop}>
                <View style={[styles.tile, { backgroundColor: v.color + '26', borderColor: v.color + '55' }]}>
                    <Feather name={v.icon} size={22} color={v.color} />
                </View>
                <View style={styles.cardMain}>
                    <View style={styles.typeRow}>
                        <Text style={[styles.typeLabel, { color: v.color }]}>{v.label.toUpperCase()}</Text>
                        {event.perso?.isHighlight && (
                            <View style={styles.chip}>
                                <Feather name="star" size={10} color={colors.text.inverse} />
                                <Text style={styles.chipText}>POUR TOI</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.cardTitle}>{event.title ?? v.label}</Text>
                    <Text style={styles.cardFacts}>
                        {formatWhen(event.exactAt)}{facts.length ? ` · ${facts.join(' · ')}` : ''}
                    </Text>
                </View>
                <Text style={[styles.when, isToday && styles.whenToday]}>
                    {isToday ? "Aujourd'hui" : isPast ? 'Passé' : 'À venir'}
                </Text>
            </View>

            {event.body && <Text style={styles.cardBody}>{event.body}</Text>}

            {event.perso?.hook ? (
                <View style={[styles.perso, isPast && styles.persoPast]}>
                    <Feather name="target" size={14} color={isPast ? colors.onSurfaceMuted : colors.primary} />
                    <Text style={styles.persoText}>{event.perso.hook}</Text>
                </View>
            ) : null}
        </GlassCard>
    );
}

function Section({ title, events, highlight }: { title: string; events: AstroEvent[]; highlight?: boolean }) {
    if (events.length === 0) return null;
    return (
        <View style={styles.section}>
            <Text style={[styles.sectionLabel, highlight && { color: colors.primary }]}>{title}</Text>
            {events.map((e) => <EventCard key={e.id} event={e} />)}
        </View>
    );
}

export default function ActuAstroScreen() {
    const { user: _user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState<AstroEvent[]>([]);
    const [monthLabel, setMonthLabel] = useState('');
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await getActuAstro();
            if (res.success && res.events) {
                setEvents(res.events);
                setMonthLabel(`${res.month ?? ''} ${res.year ?? ''}`.trim());
            } else {
                setError(res.error ?? 'Erreur');
            }
        } catch {
            setError('Erreur réseau');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    // Feed works without a birth profile too (collective prose only, no overlay).
    if (loading) return <FullPageLoader visible />;

    const today = events.filter((e) => e.status === 'today');
    const upcoming = events.filter((e) => e.status === 'upcoming');
    const past = events.filter((e) => e.status === 'past');
    const highlights = today.filter((e) => e.perso?.isHighlight);

    return (
        <SafeAreaView style={styles.screen} edges={['top']}>
            <Starfield />
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <View style={styles.monthHero}>
                    <Text style={styles.monthKicker}>ACTU ASTRO</Text>
                    <Text style={styles.monthName}>{monthLabel}</Text>
                    <Text style={styles.monthStats}>
                        {events.length} événements{highlights.length ? ` · ${highlights.length} temps fort pour toi` : ''}
                    </Text>
                </View>

                {error ? (
                    <Text style={styles.error}>{error}</Text>
                ) : (
                    <>
                        <Section title="AUJOURD'HUI" events={today} highlight />
                        <Section title="À VENIR" events={upcoming} />
                        <Section title="DÉJÀ PASSÉ" events={past} />
                        {events.length === 0 && (
                            <Text style={styles.empty}>Aucun événement ce mois-ci pour l'instant.</Text>
                        )}
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.surfaceLowest },
    scroll: { padding: spacing.lg, paddingBottom: spacing.xxl * 2, gap: spacing.md },
    monthHero: {
        borderRadius: radius.xl,
        padding: spacing.lg,
        marginBottom: spacing.md,
        backgroundColor: colors.surfaceLow,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    monthKicker: { color: colors.primary, fontSize: 11, letterSpacing: 2, fontFamily: fonts.body.regular, marginBottom: 6 },
    monthName: { color: colors.onSurface, fontSize: 32, fontFamily: fonts.display.regular, textTransform: 'capitalize' },
    monthStats: { color: colors.onSurfaceMuted, fontSize: 13, fontFamily: fonts.body.regular, marginTop: 8 },
    section: { gap: spacing.sm, marginBottom: spacing.md },
    sectionLabel: { color: colors.onSurfaceMuted, fontSize: 11, letterSpacing: 2, fontFamily: fonts.body.regular, marginVertical: spacing.sm },
    card: { gap: spacing.sm },
    cardPast: { opacity: 0.55 },
    cardTop: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
    tile: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    cardMain: { flex: 1, minWidth: 0 },
    typeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 },
    typeLabel: { fontSize: 10, letterSpacing: 1.2, fontFamily: fonts.body.regular },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
    chipText: { color: colors.text.inverse, fontSize: 9, letterSpacing: 1, fontFamily: fonts.body.regular },
    cardTitle: { color: colors.onSurface, fontSize: 19, fontFamily: fonts.display.regular, lineHeight: 22 },
    cardFacts: { color: colors.onSurfaceMuted, fontSize: 12, fontFamily: fonts.body.regular, marginTop: 6 },
    when: { color: colors.onSurfaceMuted, fontSize: 10, fontFamily: fonts.body.regular },
    whenToday: { color: colors.primary },
    cardBody: { color: colors.text.secondary, fontSize: 13.5, lineHeight: 20, fontFamily: fonts.body.regular },
    perso: {
        flexDirection: 'row', gap: 9, alignItems: 'flex-start',
        backgroundColor: colors.glow.gold, borderRadius: radius.md, padding: spacing.sm,
        borderLeftWidth: 3, borderLeftColor: colors.primary,
    },
    persoPast: { backgroundColor: colors.surfaceVariant, borderLeftColor: colors.onSurfaceMuted },
    persoText: { flex: 1, color: colors.text.secondary, fontSize: 12, lineHeight: 17, fontFamily: fonts.body.regular },
    error: { color: colors.error, fontFamily: fonts.body.regular, textAlign: 'center', marginTop: spacing.xl },
    empty: { color: colors.onSurfaceMuted, fontFamily: fonts.body.regular, textAlign: 'center', marginTop: spacing.xl },
});
