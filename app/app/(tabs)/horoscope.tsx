import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import i18n from 'i18next';
import { useAuth } from '@/contexts/AuthContext';
import { GlassCard, GoldButton, GhostButton, TabHeader, HelpModal, NoBirthProfileCard, Starfield } from '@/components/ui';
import type { HelpSection } from '@/components/ui';
import { AstralHero } from '@/components/astral/AstralHero';
import { getNatalChart, NatalChart } from '@/services/astrology';
import { colors, spacing, radius, fonts } from '@/theme';

// ─── Help content ─────────────────────────────────────────────────────────────

const HOROSCOPE_HELP = (fr: boolean): HelpSection[] => [{
    key: 'natal',
    title: fr ? 'Thème natal' : 'Natal chart',
    items: [
        {
            name: fr ? 'Le thème natal' : 'The natal chart',
            symbolColor: colors.primary,
            description: fr
                ? "Votre carte du ciel au moment exact de votre naissance. La position de chaque planète dans un signe et une maison révèle différentes facettes de votre personnalité."
                : "Your sky map at the exact moment of your birth. Each planet's position in a sign and house reveals different facets of your personality.",
        },
        {
            symbol: '☉', symbolColor: '#e9c349',
            name: fr ? 'Les planètes' : 'Planets',
            description: fr
                ? "Chaque planète représente une énergie (Soleil = identité, Lune = émotions, Mars = action…). Appuyez sur une planète pour voir son interprétation détaillée par l'IA."
                : "Each planet represents an energy (Sun = identity, Moon = emotions, Mars = action…). Tap a planet to see its detailed AI interpretation.",
        },
        {
            symbol: '♈', symbolColor: '#c8bfff',
            name: fr ? 'Les signes' : 'Signs',
            description: fr
                ? "Le signe colore la façon dont une planète s'exprime. C'est le \"comment\". Ex : la Lune représente vos émotions — en Scorpion, vous les vivez intensément et en profondeur ; en Gémeaux, vous les exprimez avec légèreté et en parlant."
                : "The sign colors how a planet expresses itself — it's the \"how\". E.g.: the Moon represents your emotions — in Scorpio, you feel them deeply and intensely; in Gemini, you express them lightly, through words.",
        },
        {
            symbol: '⌂', symbolColor: '#a78bfa',
            name: fr ? 'Les maisons' : 'Houses',
            description: fr
                ? "Les 12 maisons correspondent aux domaines de vie (maison 1 = personnalité, maison 7 = relations, maison 10 = carrière…). La planète dans la maison agit dans ce domaine."
                : "The 12 houses correspond to life areas (house 1 = personality, house 7 = relationships, house 10 = career…). A planet in a house acts in that domain.",
        },
    ],
}];

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function HoroscopeTab() {
    const router = useRouter();
    const { isAuthenticated, user, isLoading: isAuthLoading } = useAuth();

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string>();
    const [chart, setChart] = useState<NatalChart | null>(null);
    const [helpVisible, setHelpVisible] = useState(false);

    useEffect(() => {
        if (isAuthLoading) return;
        if (isAuthenticated && user?.hasBirthProfile) loadChart();
        else setIsLoading(false);
    }, [isAuthenticated, user, isAuthLoading]);

    async function loadChart(refresh = false) {
        try {
            setError(undefined);
            const response = await getNatalChart(refresh);
            if (response.success && response.chart) {
                setChart(response.chart);
            } else {
                setError(response.error || 'Erreur de chargement du thème natal');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Une erreur est survenue');
        } finally {
            setIsLoading(false);
        }
    }

    // ── Loading ──
    if (isAuthLoading || isLoading) {
        return (
            <View style={styles.screen}>
                <SafeAreaView style={styles.safeArea} edges={['top']}>
                    <View style={styles.centered}>
                        <ActivityIndicator color={colors.primary} size="large" />
                        <Text style={styles.loadingText}>Calcul du thème natal…</Text>
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    // ── Not authenticated ──
    if (!isAuthenticated) {
        return (
            <View style={styles.screen}>
                <SafeAreaView style={styles.safeArea} edges={['top']}>
                    <View style={styles.centered}>
                        <Text style={styles.emptyText}>Connectez-vous pour accéder à votre thème natal.</Text>
                        <GoldButton label="Se connecter" onPress={() => router.push('/login')} />
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    // ── No birth profile ──
    if (!user?.hasBirthProfile) {
        return <NoBirthProfileCard />;
    }

    return (
        <View style={styles.screen}>
            <Starfield />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <TabHeader />

                    {/* ── Chip ────────────────────────────────────────────────── */}
                    <View style={styles.chipRow}>
                        <View style={styles.chip}>
                            <View style={styles.chipDot} />
                            <Text style={styles.chipText}>Portrait astral</Text>
                        </View>
                        <Pressable onPress={() => setHelpVisible(true)} hitSlop={12}>
                            <Feather name="help-circle" size={16} color={colors.onSurfaceMuted} />
                        </Pressable>
                    </View>

                    {/* ── Title ───────────────────────────────────────────────── */}
                    <Text style={styles.title}>Votre Portrait Astral</Text>
                    <Text style={styles.subtitle}>
                        Vos positions planétaires au moment exact de votre naissance.
                    </Text>

                    {/* ── Error ───────────────────────────────────────────────── */}
                    {error && (
                        <View style={styles.sectionPad}>
                            <GlassCard opacity="low" radius="xl">
                                <Text style={styles.errorText}>{error}</Text>
                                <View style={{ marginTop: spacing.lg }}>
                                    <GhostButton label="Réessayer" onPress={() => loadChart()} />
                                </View>
                            </GlassCard>
                        </View>
                    )}

                    {/* ── Portrait astral ──────────────────────────────────────── */}
                    {chart && (
                        <AstralHero positions={chart.planetaryPositions} outerPadding={20} />
                    )}

                    {/* ── Interpretation CTA ───────────────────────────────────── */}
                    {chart && (
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>INTERPRÉTATION</Text>
                            <GlassCard opacity="low" radius="xl">
                                <Text style={styles.interpGuide}>
                                    Explorez les positions de vos planètes au moment de votre naissance. Chaque planète révèle une facette de votre personnalité et de votre chemin de vie.
                                </Text>
                                <View style={{ marginTop: spacing.xl }}>
                                    <GoldButton
                                        label="Voir mon profil astro détaillé"
                                        onPress={() => router.push('/natal-chart-analysis')}
                                        rightIcon
                                    />
                                </View>
                            </GlassCard>
                        </View>
                    )}

                    <View style={{ height: 100 }} />
                </ScrollView>
            </SafeAreaView>

            <HelpModal
                visible={helpVisible}
                onClose={() => setHelpVisible(false)}
                title={i18n.language === 'fr' ? 'Guide — Thème natal' : 'Guide — Natal Chart'}
                sections={HOROSCOPE_HELP(i18n.language === 'fr')}
            />
        </View>
    );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.surfaceLowest },
    safeArea: { flex: 1 },
    scroll: { flex: 1 },
    scrollContent: { flexGrow: 1 },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.lg,
        paddingHorizontal: spacing.xl,
    },
    loadingText: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        color: colors.onSurfaceMuted,
    },
    emptyText: {
        fontFamily: fonts.body.regular,
        fontSize: 15,
        color: colors.onSurfaceMuted,
        textAlign: 'center',
        lineHeight: 22,
    },

    // Chip
    chipRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.xl,
        marginTop: spacing.xl,
        paddingHorizontal: spacing.xl,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: 6,
        borderRadius: radius.full,
        backgroundColor: colors.surfaceContainerHigh,
    },
    chipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
    chipText: {
        fontFamily: fonts.body.semiBold,
        fontSize: 10,
        letterSpacing: 1.5,
        color: colors.onSurfaceMuted,
        textTransform: 'uppercase',
    },

    // Title
    title: {
        fontFamily: fonts.display.bold,
        fontSize: 38,
        lineHeight: 46,
        color: colors.onSurface,
        letterSpacing: -0.5,
        marginBottom: spacing.md,
        paddingHorizontal: spacing.xl,
    },
    subtitle: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        lineHeight: 22,
        color: colors.onSurfaceMuted,
        maxWidth: 300,
        marginBottom: spacing.xl,
        paddingHorizontal: spacing.xl,
    },

    // Sections
    section: {
        marginTop: spacing.xxxl,
        marginBottom: spacing.xxl,
        paddingHorizontal: spacing.xl,
    },
    sectionPad: {
        marginBottom: spacing.xl,
        paddingHorizontal: spacing.xl,
    },
    sectionLabel: {
        fontFamily: fonts.body.semiBold,
        fontSize: 10,
        letterSpacing: 1.5,
        color: colors.onSurfaceMuted,
        textTransform: 'uppercase',
        marginBottom: spacing.md,
    },
    interpGuide: {
        fontFamily: fonts.body.regular,
        fontSize: 15,
        lineHeight: 24,
        color: colors.onSurfaceMuted,
    },
    errorText: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        color: colors.error,
        textAlign: 'center',
        lineHeight: 20,
    },
});
