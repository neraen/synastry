/**
 * Carte du ciel — roue astrologique interactive du thème natal.
 * Signes, planètes (+ Lilith, Nœud Nord), maisons et lignes d'aspect cliquables,
 * card explicative sous la roue.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    StyleSheet,
    ActivityIndicator,
    Dimensions,
    type GestureResponderEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { TabHeader, HelpModal } from '@/components/ui';
import type { HelpSection } from '@/components/ui';
import { NatalWheel } from '@/components/natal-wheel/NatalWheel';
import { WheelLegend } from '@/components/natal-wheel/WheelLegend';
import { WheelInfoPanel } from '@/components/natal-wheel/WheelInfoPanel';
import { WHEEL_T } from '@/components/natal-wheel/astro-content';
import { buildWheelModel, hitTest, type Selection } from '@/components/natal-wheel/wheel-model';
import { getNatalChart, PlanetPosition } from '@/services/astrology';
import { useAuth } from '@/contexts/AuthContext';
import { fonts, spacing } from '@/theme';

// ─── Aide ─────────────────────────────────────────────────────────────────────

const WHEEL_HELP: HelpSection[] = [{
    key: 'wheel',
    title: 'Carte du ciel',
    items: [
        {
            symbol: '☉', symbolColor: WHEEL_T.gold,
            name: 'Planètes',
            description: "Chaque cercle doré est une planète à sa position exacte de naissance. Touchez-en une pour voir sa signification, son signe, sa maison et ses aspects.",
        },
        {
            symbol: '♈', symbolColor: '#c8bfff',
            name: 'Signes',
            description: "L'anneau extérieur montre les 12 signes du zodiaque. Touchez un secteur pour découvrir le caractère du signe et les planètes qui s'y trouvent.",
        },
        {
            symbol: 'XII', symbolColor: '#a78bfa',
            name: 'Maisons',
            description: "Les 12 secteurs intérieurs sont les maisons, les domaines de vie. Touchez un numéro romain pour explorer le domaine correspondant.",
        },
        {
            symbol: '△', symbolColor: WHEEL_T.aspTrine,
            name: 'Aspects',
            description: "Les lignes colorées au centre relient les planètes en dialogue : doré conjonction, bleu sextile, orange carré, vert trigone, rose opposition.",
        },
        {
            symbol: '⚸', symbolColor: WHEEL_T.gold,
            name: 'Lilith & Nœud Nord',
            description: "Deux points sensibles du thème : Lilith, la part d'ombre instinctive, et le Nœud Nord, la direction d'évolution de votre vie.",
        },
    ],
}];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS_FR = [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

/** '1995-02-12' → '12 février 1995' */
function formatBirthDate(iso?: string): string | null {
    if (!iso) return null;
    const [y, m, d] = iso.split('-').map(Number);
    if (!y || !m || !d) return null;
    return `${d} ${MONTHS_FR[m - 1]} ${y}`;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

// Un seul essai de recalcul par session : un backend qui ne renvoie pas encore
// Lilith/NorthNode redéclencherait sinon un refresh à chaque ouverture.
let selfHealAttempted = false;

export default function NatalChartWheelScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();

    const [positions, setPositions] = useState<Record<string, PlanetPosition> | null>(null);
    const [houseCusps, setHouseCusps] = useState<number[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [helpVisible, setHelpVisible] = useState(false);
    const [selected, setSelected] = useState<Selection>({ kind: 'chart' });

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                let res = await getNatalChart();
                // Anciens charts cachés en BDD : sans Lilith / Nœud Nord → recalcul unique
                if (res.success && res.chart && !res.chart.planetaryPositions?.NorthNode && !selfHealAttempted) {
                    selfHealAttempted = true;
                    res = await getNatalChart(true);
                }
                if (cancelled) return;
                if (res.success && res.chart?.planetaryPositions) {
                    setPositions(res.chart.planetaryPositions);
                    setHouseCusps(res.houseCusps ?? null);
                } else {
                    setError(res.error ?? 'Erreur de chargement');
                }
            } catch {
                if (!cancelled) setError('Impossible de charger le thème natal');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const model = useMemo(
        () => (positions ? buildWheelModel(positions, houseCusps) : null),
        [positions, houseCusps],
    );

    const handleSelect = useCallback((sel: Selection) => {
        setSelected((prev) => {
            const sameKind = prev?.kind === sel.kind;
            const sameId = ('id' in prev ? prev.id : undefined) === ('id' in sel ? sel.id : undefined);
            return sameKind && sameId ? { kind: 'chart' } : sel;
        });
    }, []);

    // Roue à la largeur du viewport avec padding horizontal
    const chartSize = Math.min(Dimensions.get('window').width - 40, 480);

    // Taps résolus géométriquement (le onPress des éléments SVG est
    // inopérant sous la nouvelle architecture RN)
    const handleWheelTap = useCallback((e: GestureResponderEvent) => {
        if (!model) return;
        const { locationX, locationY } = e.nativeEvent;
        const sel = hitTest(locationX, locationY, chartSize, model);
        if (sel) handleSelect(sel);
    }, [model, chartSize, handleSelect]);

    const birthProfile = user?.birthProfile;
    const birthDate = formatBirthDate(birthProfile?.birthDate);
    const birthTime = birthProfile?.birthTime ? birthProfile.birthTime.slice(0, 5) : null;
    const birthPlace = birthProfile?.birthCity
        ? `${birthProfile.birthCity}${birthProfile.birthCountry ? `, ${birthProfile.birthCountry}` : ''}`
        : null;

    return (
        <View style={[s.root, { paddingTop: insets.top }]}>
            <ScrollView
                style={s.scroll}
                contentContainerStyle={[s.scrollContent, { paddingBottom: 48 + insets.bottom }]}
                showsVerticalScrollIndicator={false}
            >
                <TabHeader onBack={() => router.back()} />

                {/* ── Chip + aide ─────────────────────────────────────────── */}
                <View style={s.chipRow}>
                    <View style={s.chip}>
                        <View style={s.chipDot} />
                        <Text style={s.chipText}>Thème astral</Text>
                    </View>
                    <Pressable
                        style={s.help}
                        onPress={() => setHelpVisible(true)}
                        accessibilityLabel="Aide"
                        hitSlop={8}
                    >
                        <Feather name="help-circle" size={15} color={WHEEL_T.text2} />
                    </Pressable>
                </View>

                {/* ── Titre ───────────────────────────────────────────────── */}
                <Text style={s.title}>Votre carte du ciel</Text>
                <Text style={s.subtitle}>
                    Touchez les planètes, signes, maisons ou lignes d'aspect pour explorer leur signification.
                </Text>

                {/* ── Infos de naissance ──────────────────────────────────── */}
                {(birthDate || birthTime || birthPlace) && (
                    <View style={s.meta}>
                        {birthDate && (
                            <View style={s.metaItem}>
                                <Feather name="calendar" size={14} color={WHEEL_T.gold} />
                                <Text style={s.metaText}>{birthDate}</Text>
                            </View>
                        )}
                        {birthTime && (
                            <View style={s.metaItem}>
                                <Feather name="clock" size={14} color={WHEEL_T.gold} />
                                <Text style={s.metaText}>{birthTime}</Text>
                            </View>
                        )}
                        {birthPlace && (
                            <View style={s.metaItem}>
                                <Feather name="map-pin" size={14} color={WHEEL_T.gold} />
                                <Text style={s.metaText}>{birthPlace}</Text>
                            </View>
                        )}
                    </View>
                )}

                {/* ── Contenu ─────────────────────────────────────────────── */}
                {loading && (
                    <View style={s.centered}>
                        <ActivityIndicator color={WHEEL_T.gold} size="large" />
                    </View>
                )}

                {error && (
                    <View style={s.centered}>
                        <Text style={s.errorText}>{error}</Text>
                    </View>
                )}

                {model && (
                    <>
                        <View style={[s.chartWrap, { width: chartSize, height: chartSize }]}>
                            <NatalWheel model={model} selected={selected} />
                            <Pressable style={StyleSheet.absoluteFill} onPress={handleWheelTap} />
                        </View>

                        <WheelLegend selected={selected} onSelect={handleSelect} />

                        <WheelInfoPanel model={model} selected={selected} onSelect={setSelected} />
                    </>
                )}
            </ScrollView>

            <HelpModal
                visible={helpVisible}
                onClose={() => setHelpVisible(false)}
                title="Guide — Carte du ciel"
                sections={WHEEL_HELP}
            />
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    root:          { flex: 1, backgroundColor: WHEEL_T.bg },
    scroll:        { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingTop: 4 },
    centered:      { paddingVertical: 60, alignItems: 'center' },
    errorText:     { fontFamily: fonts.body.regular, fontSize: 14, color: WHEEL_T.text2, textAlign: 'center' },

    // Chip
    chipRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14, marginTop: spacing.md },
    chip: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 14, paddingVertical: 9,
        borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderWidth: 1, borderColor: WHEEL_T.border,
    },
    chipDot: { width: 8, height: 8, borderRadius: 999, backgroundColor: WHEEL_T.gold },
    chipText: {
        fontFamily: fonts.body.semiBold,
        fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase',
        color: WHEEL_T.text,
    },
    help: {
        width: 28, height: 28, borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderWidth: 1, borderColor: WHEEL_T.border,
        alignItems: 'center', justifyContent: 'center',
    },

    // Titre
    title: {
        fontFamily: fonts.display.regular,
        fontSize: 40, lineHeight: 46,
        color: '#EFE6FF',
        marginTop: 4, marginBottom: 8,
    },
    subtitle: {
        fontFamily: fonts.body.regular,
        fontSize: 15, lineHeight: 22,
        color: WHEEL_T.text2,
        maxWidth: 320,
        marginBottom: 16,
    },

    // Infos de naissance
    meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
    metaItem: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 12, paddingVertical: 8,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.035)',
        borderWidth: 1, borderColor: WHEEL_T.border,
    },
    metaText: { color: WHEEL_T.text, fontSize: 12.5, fontFamily: fonts.body.semiBold },

    // Roue
    chartWrap: {
        alignSelf: 'center',
        marginVertical: 10,
    },
});
