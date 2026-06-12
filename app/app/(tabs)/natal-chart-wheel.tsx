/**
 * Thème Astral — Portrait astral de l'utilisateur
 */
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { AstralHero } from '@/components/astral/AstralHero';
import { GlassCard, GoldButton, TabHeader } from '@/components/ui';
import { getNatalChart } from '@/services/astrology';
import { useAuth } from '@/contexts/AuthContext';
import { colors, fonts, spacing } from '@/theme';

// ─── Design tokens ────────────────────────────────────────────────────────────

const T = {
    bg:      '#120A24',
    card:    '#1F1740',
    border:  'rgba(255,255,255,0.07)',
    gold:    '#E5C266',
    text:    '#ECE5F7',
    text2:   '#BDB2D4',
} as const;

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function NatalChartWheelScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const [positions, setPositions] = useState<Record<string, any> | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        getNatalChart()
            .then(res => {
                if (res.success && res.chart?.planetaryPositions) {
                    setPositions(res.chart.planetaryPositions);
                } else {
                    setError(res.error ?? 'Erreur de chargement');
                }
            })
            .catch(() => setError('Impossible de charger le thème natal'))
            .finally(() => setLoading(false));
    }, []);

    return (
        <View style={[s.root, { paddingTop: insets.top }]}>
            <ScrollView
                style={s.scroll}
                contentContainerStyle={[s.scrollContent, { paddingBottom: 48 + insets.bottom }]}
                showsVerticalScrollIndicator={false}
            >
                <TabHeader onBack={() => router.back()} />

                {/* ── Chip ────────────────────────────────────────────────── */}
                <View style={s.chipRow}>
                    <View style={s.chip}>
                        <View style={s.chipDot} />
                        <Text style={s.chipText}>Portrait astral</Text>
                    </View>
                </View>

                {/* ── Title ───────────────────────────────────────────────── */}
                <Text style={s.title}>Votre Portrait Astral</Text>
                <Text style={s.subtitle}>
                    Vos positions planétaires au moment exact de votre naissance.
                </Text>

                {/* ── Content ─────────────────────────────────────────────── */}
                {loading && (
                    <View style={s.centered}>
                        <ActivityIndicator color={T.gold} size="large" />
                    </View>
                )}

                {error && (
                    <View style={s.centered}>
                        <Text style={s.errorText}>{error}</Text>
                    </View>
                )}

                {positions && <AstralHero positions={positions} outerPadding={20} gender={user?.birthProfile?.gender} />}

                {/* ── CTA portrait ─────────────────────────────────────────── */}
                {positions && (
                    <View style={s.section}>
                        <Text style={s.sectionLabel}>INTERPRÉTATION</Text>
                        <GlassCard opacity="low" radius="xl">
                            <Text style={s.interpGuide}>
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
            </ScrollView>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    root:        { flex: 1, backgroundColor: T.bg },
    scroll:      { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingTop: 4 },
    centered:    { paddingVertical: 60, alignItems: 'center' },
    errorText:   { fontFamily: fonts.body.regular, fontSize: 14, color: T.text2, textAlign: 'center' },

    // Topbar
    topbar:  { paddingVertical: spacing.md, paddingBottom: spacing.md },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

    // Chip
    chipRow: { flexDirection: 'row', marginBottom: 14 },
    chip: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 14, paddingVertical: 9,
        borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderWidth: 1, borderColor: T.border,
    },
    chipDot: { width: 8, height: 8, borderRadius: 999, backgroundColor: T.gold },
    chipText: {
        fontFamily: fonts.body.semiBold,
        fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase',
        color: T.text,
    },

    // Section
    section: {
        marginTop: spacing.xxxl,
        marginBottom: spacing.xxl,
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

    // Title
    title: {
        fontFamily: fonts.display.regular,
        fontSize: 34, lineHeight: 40,
        color: '#EFE6FF',
        marginBottom: 8,
    },
    subtitle: {
        fontFamily: fonts.body.regular,
        fontSize: 14, lineHeight: 21,
        color: T.text2,
        maxWidth: 300,
        marginBottom: 32,
    },
});
