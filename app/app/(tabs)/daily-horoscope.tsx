// Home tab ("Aujourd'hui"). Since the Actu astro pivot this screen no longer
// shows a per-user daily horoscope: it surfaces the Actu astro "temps fort" and a
// discreet "humeur du jour". (Route kept as /daily-horoscope to avoid churn; can
// be renamed to /today later.)
import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { GlassCard, NoBirthProfileCard, Starfield } from '@/components/ui';
import { FullPageLoader } from '@/components/loaders';
import { getActuAstro, getMoodToday, AstroEvent, MoodToday } from '@/services/astrology';
import { colors, spacing, radius, fonts } from '@/theme';

function visualColor(type: string): string {
    if (type.startsWith('lunation')) return colors.events.lunaison;
    if (type.startsWith('eclipse')) return colors.events.eclipse;
    if (type.startsWith('retrograde')) return colors.events.retro;
    if (type === 'ingression') return colors.events.ingression;
    return colors.events.aspect;
}

function visualIcon(type: string): keyof typeof Feather.glyphMap {
    if (type === 'lunation_full' || type === 'eclipse_lunar') return 'moon';
    if (type.startsWith('lunation') || type.startsWith('eclipse')) return 'circle';
    if (type.startsWith('retrograde')) return 'rotate-ccw';
    if (type === 'ingression') return 'arrow-right-circle';
    return 'triangle';
}

export default function TodayHome() {
    const router = useRouter();
    const { isAuthenticated, user, isLoading: isAuthLoading } = useAuth();

    const [loading, setLoading] = useState(true);
    const [highlight, setHighlight] = useState<AstroEvent | null>(null);
    const [mood, setMood] = useState<MoodToday | null>(null);

    const load = useCallback(async () => {
        try {
            const [actu, moodRes] = await Promise.all([getActuAstro(), getMoodToday()]);
            if (actu.success && actu.events?.length) {
                // Best upcoming/today event: prefer a personal highlight, else most relevant soon.
                const soon = actu.events.filter((e) => e.status !== 'past');
                soon.sort((a, b) => {
                    const ra = a.perso?.relevance ?? 0;
                    const rb = b.perso?.relevance ?? 0;
                    return rb - ra;
                });
                setHighlight(soon[0] ?? null);
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

    const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

    return (
        <SafeAreaView style={styles.screen} edges={['top']}>
            <Starfield />
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <View style={styles.greet}>
                    <Text style={styles.hello}>Bonjour{user?.birthProfile?.firstName ? `, ${user.birthProfile.firstName}` : ''}</Text>
                    <Text style={styles.date}>{today}</Text>
                </View>

                {/* Actu astro — temps fort (strong, the flagship surface) */}
                {highlight && (
                    <GlassCard opacity="medium" radius="xl" style={styles.feature}>
                        <Text style={styles.featureKicker}>ACTU ASTRO · TEMPS FORT</Text>
                        <View style={styles.featureBody}>
                            <View style={[styles.featureTile, { backgroundColor: visualColor(highlight.type) + '26', borderColor: visualColor(highlight.type) + '66' }]}>
                                <Feather name={visualIcon(highlight.type)} size={26} color={visualColor(highlight.type)} />
                            </View>
                            <View style={styles.featureMain}>
                                <Text style={styles.featureTitle}>{highlight.title ?? highlight.signFr}</Text>
                                {highlight.perso?.hook ? (
                                    <Text style={styles.featureMeta} numberOfLines={2}>{highlight.perso.hook}</Text>
                                ) : null}
                            </View>
                        </View>
                        <Pressable style={styles.cta} onPress={() => router.push('/actu-astro')}>
                            <Text style={styles.ctaText}>Voir le mois</Text>
                            <Feather name="arrow-right" size={15} color={colors.text.inverse} />
                        </Pressable>
                    </GlassCard>
                )}

                {/* Humeur du jour — deliberately small + quiet */}
                {mood && (
                    <View style={styles.humeur}>
                        <View style={styles.humeurGlyph}>
                            <Feather name="moon" size={16} color={colors.onSurfaceMuted} />
                        </View>
                        <View style={styles.humeurBody}>
                            <Text style={styles.humeurLabel}>
                                HUMEUR DU JOUR{mood.tone ? <Text style={styles.humeurTone}>  · {mood.tone}</Text> : null}
                            </Text>
                            <Text style={styles.humeurText}>{mood.text}</Text>
                        </View>
                    </View>
                )}

                <Text style={styles.note}>L'humeur du jour est une touche, pas une prédiction.</Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.surfaceLowest },
    scroll: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
    greet: { marginBottom: spacing.lg },
    hello: { color: colors.onSurface, fontSize: 27, fontFamily: fonts.display.regular },
    date: { color: colors.onSurfaceMuted, fontSize: 13, fontFamily: fonts.body.regular, marginTop: 4, textTransform: 'capitalize' },
    feature: { marginBottom: spacing.lg, gap: spacing.md },
    featureKicker: { color: colors.primary, fontSize: 10, letterSpacing: 1.8, fontFamily: fonts.body.regular },
    featureBody: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
    featureTile: { width: 54, height: 54, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    featureMain: { flex: 1, minWidth: 0 },
    featureTitle: { color: colors.onSurface, fontSize: 21, fontFamily: fonts.display.regular, lineHeight: 24 },
    featureMeta: { color: colors.text.secondary, fontSize: 12.5, fontFamily: fonts.body.regular, marginTop: 4 },
    cta: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: colors.primary, borderRadius: 99, paddingVertical: 12,
    },
    ctaText: { color: colors.text.inverse, fontSize: 14, fontFamily: fonts.body.regular },
    humeur: {
        flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start',
        backgroundColor: colors.surfaceVariant, borderRadius: radius.lg, padding: spacing.md,
    },
    humeurGlyph: {
        width: 30, height: 30, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center',
        backgroundColor: colors.surfaceContainerHigh,
    },
    humeurBody: { flex: 1, minWidth: 0 },
    humeurLabel: { color: colors.onSurfaceMuted, fontSize: 10, letterSpacing: 1.6, fontFamily: fonts.body.regular, marginBottom: 5 },
    humeurTone: { color: colors.onSurfaceMuted, letterSpacing: 0 },
    humeurText: { color: colors.text.secondary, fontSize: 13, lineHeight: 19, fontFamily: fonts.body.regular },
    note: { color: colors.onSurfaceMuted, fontSize: 10.5, textAlign: 'center', marginTop: spacing.lg, fontFamily: fonts.body.regular },
});
