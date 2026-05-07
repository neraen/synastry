import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    StyleSheet,
    ActivityIndicator,
    Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import i18n from 'i18next';
import { Screen, GlassCard, FormattedText, GoldButton, CelestialChip, HelpModal } from '@/components/ui';
import type { HelpSection } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { usePremium } from '@/hooks/usePremium';
import {
    getNatalChartAnalysisSection,
    preGenerateNatalChartAnalysis,
    SynthesisData,
    SynthesisAxis,
} from '@/services/astrology';
import { colors, spacing, radius, fonts } from '@/theme';

// ─── Help content ─────────────────────────────────────────────────────────────

const NATAL_ANALYSIS_HELP = (fr: boolean): HelpSection[] => [{
    key: 'sections',
    title: fr ? 'Les sections' : 'Sections',
    items: [
        {
            name: fr ? 'Portrait astral' : 'Astral portrait',
            symbolColor: colors.primary,
            description: fr
                ? "Synthèse globale de votre thème natal : qui vous êtes en essence, vos axes dominants et vos configurations planétaires remarquables."
                : "Global synthesis of your natal chart: who you are at your core, your dominant axes, and your notable planetary configurations.",
        },
        { symbol: '☉', name: fr ? 'Identité' : 'Identity', description: fr ? "Votre Soleil, votre signe ascendant et l'axe Soleil–Ascendant. Ce qui définit votre ego, votre rayonnement et la façon dont vous vous présentez au monde." : "Your Sun, rising sign, and the Sun–Ascendant axis. What defines your ego, your radiance, and how you present yourself to the world." },
        { symbol: '☽', name: fr ? 'Émotions' : 'Emotions', description: fr ? "Votre Lune et ses aspects. Votre monde intérieur, vos besoins affectifs, votre mémoire émotionnelle et votre rapport à l'intimité." : "Your Moon and its aspects. Your inner world, emotional needs, affective memory, and relationship with intimacy." },
        { symbol: '☿', name: fr ? 'Mental' : 'Mind', description: fr ? "Mercure et la maison 3. Votre façon de penser, de communiquer, d'apprendre et de traiter l'information." : "Mercury and house 3. How you think, communicate, learn, and process information." },
        { symbol: '♀', name: fr ? 'Relations' : 'Relationships', description: fr ? "Vénus, Mars et la maison 7. Votre rapport à l'amour, à l'attraction, aux partenariats et à ce que vous cherchez chez l'autre." : "Venus, Mars, and house 7. Your relationship to love, attraction, partnerships, and what you seek in others." },
        { symbol: '♄', name: fr ? 'Ambition' : 'Ambition', description: fr ? "Saturne, le MC et la maison 10. Votre rapport à la carrière, à la discipline, à la réussite sociale et à votre mission professionnelle." : "Saturn, the MC, and house 10. Your relationship to career, discipline, social achievement, and professional purpose." },
        { symbol: '☊', name: fr ? 'Mission de vie' : 'Life mission', description: fr ? "Les Nœuds lunaires et Pluton. Votre direction karmique, ce que vous êtes venu apprendre et transformer dans cette vie." : "The lunar nodes and Pluto. Your karmic direction, what you came to learn and transform in this life." },
        { symbol: '✦', name: fr ? 'Aspects' : 'Aspects', description: fr ? "Les angles entre vos planètes. Tensions créatrices (carrés, oppositions) et harmonies naturelles (trigones, sextiles) qui animent votre thème." : "The angles between your planets. Creative tensions (squares, oppositions) and natural harmonies (trines, sextiles) that animate your chart." },
    ],
}];

// ─── Section configuration ──────────────────────────────────────────────────────

interface SectionConfig {
    key: string;
    label: string;
    emoji: string;
    premium: boolean;
}

const SECTIONS: SectionConfig[] = [
    { key: 'identity',      label: 'Identité',       emoji: '☉',  premium: false },
    { key: 'emotions',      label: 'Émotions',       emoji: '☽',  premium: false },
    { key: 'mental',        label: 'Mental',          emoji: '☿',  premium: false },
    { key: 'relationships', label: 'Relations',       emoji: '♀',  premium: false },
    { key: 'ambition',      label: 'Ambition',        emoji: '♄',  premium: false },
    { key: 'mission',       label: 'Mission de vie',  emoji: '☊',  premium: true },
    { key: 'aspects',       label: 'Aspects',         emoji: '✦',  premium: false },
];

// Axis accent colors for the colored left border
const AXIS_COLORS = [colors.primary, colors.secondary, colors.accent.pink];

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function SkeletonLine({ width, style }: { width: string | number; style?: object }) {
    const anim = React.useRef(new Animated.Value(0.3)).current;
    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(anim, { toValue: 0.7, duration: 800, useNativeDriver: true }),
                Animated.timing(anim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, [anim]);

    return (
        <Animated.View
            style={[
                {
                    height: 14,
                    borderRadius: 7,
                    backgroundColor: colors.surfaceContainerHighest,
                    opacity: anim,
                    width: width as any,
                    marginBottom: spacing.sm,
                },
                style,
            ]}
        />
    );
}

function SynthesisSkeleton() {
    return (
        <View style={{ gap: spacing.lg }}>
            <SkeletonLine width="40%" style={{ height: 10, marginBottom: spacing.xl }} />
            <SkeletonLine width="100%" style={{ height: 16 }} />
            <SkeletonLine width="95%" />
            <SkeletonLine width="80%" />
            <View style={{ height: spacing.lg }} />
            <SkeletonLine width="100%" />
            <SkeletonLine width="90%" />
            <SkeletonLine width="70%" />
            <View style={{ height: spacing.lg }} />
            <SkeletonLine width="100%" />
            <SkeletonLine width="85%" />
        </View>
    );
}

// ─── Section Row ────────────────────────────────────────────────────────────────

function SectionRow({
    config,
    isPremium,
    onPress,
}: {
    config: SectionConfig;
    isPremium: boolean;
    onPress: () => void;
}) {
    const locked = config.premium && !isPremium;

    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                styles.sectionRow,
                pressed && { opacity: 0.7 },
            ]}
        >
            <View style={styles.sectionRowLeft}>
                <View style={styles.sectionSymbolBubble}>
                    <Text style={styles.sectionSymbol}>{config.emoji}</Text>
                </View>
                <Text style={styles.sectionLabel}>{config.label}</Text>
            </View>
            <View style={styles.sectionRowRight}>
                {locked && (
                    <View style={styles.premiumBadge}>
                        <Text style={styles.premiumBadgeText}>PREMIUM</Text>
                    </View>
                )}
                <Feather name="chevron-right" size={18} color={colors.onSurfaceMuted} />
            </View>
        </Pressable>
    );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function NatalChartAnalysisScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const { isPremium } = usePremium();

    const [helpVisible, setHelpVisible] = useState(false);
    const [synthesis, setSynthesis] = useState<SynthesisData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load synthesis on mount
    useEffect(() => {
        loadSynthesis();
    }, []);

    const loadSynthesis = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await getNatalChartAnalysisSection('synthesis');
            if (result.success && result.content) {
                setSynthesis(result.content as SynthesisData);
                // Pre-generate remaining sections in background
                preGenerateNatalChartAnalysis().catch(() => {});
            } else {
                setError(result.error || 'Erreur lors du chargement');
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Erreur réseau');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const navigateToSection = useCallback((config: SectionConfig) => {
        router.push({
            pathname: '/natal-chart-section',
            params: {
                sectionKey: config.key,
                sectionLabel: config.label,
                sectionEmoji: config.emoji,
            },
        });
    }, [router]);

    return (
        <Screen variant="scroll" backgroundVariant="cosmic">
            {/* Back button */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
                    <Feather name="arrow-left" size={20} color={colors.onSurface} />
                </Pressable>
            </View>

            {/* ── Hero zone ──────────────────────────────────────────────── */}
            <View style={styles.hero}>
                <View style={styles.badgeRow}>
                    <View style={styles.badge}>
                        <View style={styles.badgeDot} />
                        <Text style={styles.badgeText}>PORTRAIT ASTRAL</Text>
                    </View>
                    <Pressable onPress={() => setHelpVisible(true)} hitSlop={12}>
                        <Feather name="help-circle" size={16} color={colors.onSurfaceMuted} />
                    </Pressable>
                </View>
            </View>

            {/* ── Sections grid ─────────────────────────────────────────── */}
            <View style={styles.sectionsSection}>
                <Text style={styles.sectionsSectionLabel}>EXPLORE TON THÈME</Text>
                <GlassCard opacity="low" radius="xl" padding="none">
                    {SECTIONS.map((config, idx) => (
                        <React.Fragment key={config.key}>
                            {idx > 0 && <View style={styles.separator} />}
                            <SectionRow
                                config={config}
                                isPremium={isPremium}
                                onPress={() => navigateToSection(config)}
                            />
                        </React.Fragment>
                    ))}
                </GlassCard>
            </View>

            {/* ── Synthesis content ───────────────────────────────────────── */}
            <Text style={styles.sectionsSectionLabel}>TON PORTRAIT</Text>
            {isLoading ? (
                <View style={styles.synthesisWrap}>
                    <GlassCard opacity="low" radius="xl">
                        <SynthesisSkeleton />
                    </GlassCard>
                </View>
            ) : error ? (
                <View style={styles.synthesisWrap}>
                    <GlassCard opacity="low" radius="xl">
                        <Text style={styles.errorText}>{error}</Text>
                        <View style={{ marginTop: spacing.lg }}>
                            <GoldButton label="Réessayer" onPress={loadSynthesis} />
                        </View>
                    </GlassCard>
                </View>
            ) : synthesis ? (
                <>
                    {/* Portrait */}
                    <View style={styles.synthesisWrap}>
                        <GlassCard opacity="low" radius="xl">
                            <FormattedText text={synthesis.portrait} style={styles.portraitText} />
                        </GlassCard>
                    </View>

                    {/* Axes */}
                    {synthesis.axes && synthesis.axes.length > 0 && (
                        <View style={styles.axesSection}>
                            <Text style={styles.axesLabel}>AXES DU THÈME</Text>
                            {synthesis.axes.map((axis: SynthesisAxis, idx: number) => (
                                <View
                                    key={idx}
                                    style={[
                                        styles.axisCard,
                                        { borderLeftColor: AXIS_COLORS[idx % AXIS_COLORS.length] },
                                    ]}
                                >
                                    <Text style={styles.axisTitle}>{axis.title}</Text>
                                    <Text style={styles.axisDescription}>{axis.description}</Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Notable configs */}
                    {synthesis.notable_configs && synthesis.notable_configs.length > 0 && (
                        <View style={styles.chipsWrap}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <View style={styles.chipsRow}>
                                    {synthesis.notable_configs.map((config: string, idx: number) => (
                                        <CelestialChip
                                            key={idx}
                                            label={config}
                                            selected={false}
                                            icon="✦"
                                        />
                                    ))}
                                </View>
                            </ScrollView>
                        </View>
                    )}
                </>
            ) : null}

            <View style={{ height: 60 }} />

            <HelpModal
                visible={helpVisible}
                onClose={() => setHelpVisible(false)}
                title={i18n.language === 'fr' ? 'Guide — Portrait astral' : 'Guide — Astral portrait'}
                sections={NATAL_ANALYSIS_HELP(i18n.language === 'fr')}
            />
        </Screen>
    );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: spacing.md,
        marginBottom: spacing.md,
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: `${colors.onSurfaceMuted}18`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    hero: {
        paddingTop: spacing.md,
        paddingBottom: spacing.xl,
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.surfaceContainerHigh,
        borderRadius: radius.full,
        paddingHorizontal: spacing.md,
        paddingVertical: 6,
    },
    badgeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.primary,
    },
    badgeText: {
        fontFamily: fonts.body.semiBold,
        fontSize: 10,
        letterSpacing: 1.5,
        color: colors.onSurfaceMuted,
    },
    synthesisWrap: {
        marginBottom: spacing.xl,
    },
    portraitText: {
        fontFamily: fonts.display.regular,
        fontSize: 16,
        lineHeight: 28,
        color: colors.onSurface,
        fontStyle: 'italic',
    },
    errorText: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        color: colors.error,
        textAlign: 'center',
        lineHeight: 20,
    },

    // Axes
    axesSection: {
        marginBottom: spacing.xl,
        gap: spacing.md,
    },
    axesLabel: {
        fontFamily: fonts.body.semiBold,
        fontSize: 10,
        letterSpacing: 1.5,
        color: colors.onSurfaceMuted,
        marginBottom: spacing.xs,
    },
    axisCard: {
        borderLeftWidth: 3,
        borderLeftColor: colors.primary,
        paddingLeft: spacing.lg,
        paddingVertical: spacing.sm,
    },
    axisTitle: {
        fontFamily: fonts.body.semiBold,
        fontSize: 14,
        color: colors.onSurface,
        marginBottom: spacing.xs,
    },
    axisDescription: {
        fontFamily: fonts.body.regular,
        fontSize: 13,
        lineHeight: 20,
        color: colors.onSurfaceMuted,
    },

    // Chips
    chipsWrap: {
        marginBottom: spacing.xxl,
        marginHorizontal: -spacing.screenPadding,
        paddingHorizontal: spacing.screenPadding,
    },
    chipsRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },

    // Sections
    sectionsSection: {
        marginBottom: spacing.xxl,
    },
    sectionsSectionLabel: {
        fontFamily: fonts.body.semiBold,
        fontSize: 10,
        letterSpacing: 1.5,
        color: colors.onSurfaceMuted,
        marginBottom: spacing.md,
    },
    sectionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.xl,
    },
    sectionRowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    sectionSymbolBubble: {
        width: 36,
        height: 36,
        borderRadius: radius.md,
        backgroundColor: `${colors.primary}18`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionSymbol: {
        fontSize: 15,
        lineHeight: 19,
        color: colors.primary,
    },
    sectionLabel: {
        fontFamily: fonts.body.medium,
        fontSize: 15,
        color: colors.onSurface,
    },
    sectionRowRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    premiumBadge: {
        backgroundColor: `${colors.primary}20`,
        borderRadius: radius.full,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
    },
    premiumBadgeText: {
        fontFamily: fonts.body.semiBold,
        fontSize: 9,
        letterSpacing: 1,
        color: colors.primary,
    },
    separator: {
        height: 1,
        backgroundColor: `${colors.onSurfaceMuted}12`,
        marginHorizontal: spacing.xl,
    },
});
