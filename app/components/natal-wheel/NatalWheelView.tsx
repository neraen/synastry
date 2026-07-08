/**
 * Carte du ciel — vue complète (titre, infos de naissance, roue interactive,
 * légende, card explicative). Rendue comme sous-vue du tab Thème astral,
 * à l'intérieur du ScrollView parent.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
    View,
    Text,
    Pressable,
    StyleSheet,
    Dimensions,
    type GestureResponderEvent,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { HelpSection } from '@/components/ui';
import { NatalWheel } from './NatalWheel';
import { WheelExplorer } from './WheelExplorer';
import { WheelInfoPanel } from './WheelInfoPanel';
import { WHEEL_T } from './astro-content';
import { buildWheelModel, hitTest, type Selection } from './wheel-model';
import type { PlanetPosition } from '@/services/astrology';
import { useAuth } from '@/contexts/AuthContext';
import { fonts, spacing } from '@/theme';

// ─── Aide ─────────────────────────────────────────────────────────────────────

export const WHEEL_HELP: HelpSection[] = [{
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

// ─── View ─────────────────────────────────────────────────────────────────────

type Props = {
    positions: Record<string, PlanetPosition>;
    houseCusps?: number[] | null;
};

export function NatalWheelView({ positions, houseCusps }: Props) {
    const { user } = useAuth();
    const [selected, setSelected] = useState<Selection>({ kind: 'chart' });

    const model = useMemo(
        () => buildWheelModel(positions, houseCusps),
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
    const chartSize = Math.min(Dimensions.get('window').width - 2 * spacing.xl, 480);

    // Taps résolus géométriquement (le onPress des éléments SVG est
    // inopérant sous la nouvelle architecture RN)
    const handleWheelTap = useCallback((e: GestureResponderEvent) => {
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
        <View style={s.root}>
            {/* ── Titre ───────────────────────────────────────────────────── */}
            <Text style={s.title}>Votre carte du ciel</Text>
            <Text style={s.subtitle}>
                Touchez les planètes, signes, maisons ou lignes d'aspect pour explorer leur signification.
            </Text>

            {/* ── Infos de naissance ──────────────────────────────────────── */}
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

            {/* ── Roue ────────────────────────────────────────────────────── */}
            <View style={[s.chartWrap, { width: chartSize, height: chartSize }]}>
                <NatalWheel model={model} selected={selected} />
                <Pressable style={StyleSheet.absoluteFill} onPress={handleWheelTap} />
            </View>

            <WheelExplorer model={model} selected={selected} onSelect={handleSelect} />

            <WheelInfoPanel model={model} selected={selected} onSelect={setSelected} />
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    root: { paddingHorizontal: spacing.xl },

    title: {
        fontFamily: fonts.display.bold,
        fontSize: 38,
        lineHeight: 46,
        color: '#EFE6FF',
        letterSpacing: -0.5,
        marginBottom: spacing.md,
    },
    subtitle: {
        fontFamily: fonts.body.regular,
        fontSize: 14, lineHeight: 22,
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
