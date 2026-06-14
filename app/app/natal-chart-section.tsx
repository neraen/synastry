import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Screen, GlassCard, FormattedText, GoldButton, CelestialChip, TabHeader, HelpModal } from '@/components/ui';
import type { HelpSection } from '@/components/ui';
import { LoaderZodiac } from '@/components/loaders';
import { usePremium } from '@/hooks/usePremium';
import {
    getNatalChartAnalysisSection,
    NatalChartSectionContent,
    AspectsData,
    AspectInterpretation,
} from '@/services/astrology';
import { colors, spacing, radius, fonts } from '@/theme';

// ─── Chips mapping per section ──────────────────────────────────────────────────

const SECTION_CHIPS: Record<string, string[]> = {
    identity:      ['Soleil', 'Ascendant', "Maître de l'Asc"],
    emotions:      ['Lune', 'Maison 4'],
    mental:        ['Mercure', 'Maison 3'],
    relationships: ['Vénus', 'Mars', 'Maison 7', 'Descendant'],
    ambition:      ['MC', 'Jupiter', 'Saturne', 'Maison 10'],
    mission:       ['Nœud Nord', 'Nœud Sud', 'Saturne'],
};

// ─── Help content per section ───────────────────────────────────────────────────
// Explains the astrological points (chips) shown for each section and why they
// matter for the theme the user is reading.

const SUN = '#e9c349';
const MOON = '#c8bfff';
const HOUSE = '#a78bfa';

const SECTION_HELP: Record<string, HelpSection[]> = {
    identity: [{
        key: 'identity',
        title: 'Identité',
        items: [
            { name: 'Pourquoi ces points ?', symbolColor: colors.primary,
              description: "Votre identité se lit au croisement de trois repères : ce que vous êtes au fond (Soleil), l'image que vous projetez (Ascendant) et la planète qui gouverne cette image (Maître de l'Ascendant). Ensemble, ils dessinent qui vous êtes et comment on vous perçoit." },
            { symbol: '☉', symbolColor: SUN, name: 'Soleil',
              description: "Votre essence, votre volonté et ce qui vous fait vous sentir vivant. C'est le cœur de votre personnalité, ce que vous cherchez à devenir." },
            { symbol: 'Asc', symbolColor: colors.primary, name: 'Ascendant',
              description: "Le signe qui se levait à l'horizon à votre naissance. C'est votre première impression, votre style spontané, le masque par lequel vous abordez le monde." },
            { name: "Maître de l'Asc", symbolColor: colors.primary,
              description: "La planète qui gouverne votre signe ascendant. Sa position affine la manière dont vous incarnez votre identité au quotidien — un fil conducteur de votre thème." },
        ],
    }],
    emotions: [{
        key: 'emotions',
        title: 'Émotions',
        items: [
            { name: 'Pourquoi ces points ?', symbolColor: colors.primary,
              description: "Votre vie affective se lit à travers votre Lune — votre paysage intérieur — et la maison 4, qui ancre vos racines et votre besoin de sécurité." },
            { symbol: '☽', symbolColor: MOON, name: 'Lune',
              description: "Vos émotions, vos besoins affectifs, votre mémoire et votre façon de chercher du réconfort. C'est votre monde intime, souvent invisible aux autres." },
            { symbol: '⌂', symbolColor: HOUSE, name: 'Maison 4',
              description: "Le domaine du foyer, de la famille et de vos racines. Elle révèle d'où vous venez et ce qui vous fait vous sentir en sécurité." },
        ],
    }],
    mental: [{
        key: 'mental',
        title: 'Mental',
        items: [
            { name: 'Pourquoi ces points ?', symbolColor: colors.primary,
              description: "Votre façon de penser et de communiquer s'éclaire avec Mercure — l'esprit — et la maison 3, le terrain des échanges et de l'apprentissage." },
            { symbol: '☿', symbolColor: colors.primary, name: 'Mercure',
              description: "Votre intelligence, votre curiosité et votre manière de parler, d'écrire et de raisonner. C'est le filtre par lequel vous comprenez le monde." },
            { symbol: '⌂', symbolColor: HOUSE, name: 'Maison 3',
              description: "Le domaine de la communication, des apprentissages et de l'entourage proche. Elle montre comment vous échangez et apprenez au quotidien." },
        ],
    }],
    relationships: [{
        key: 'relationships',
        title: 'Relations',
        items: [
            { name: 'Pourquoi ces points ?', symbolColor: colors.primary,
              description: "Vos relations se lisent dans la rencontre de l'amour (Vénus), du désir (Mars) et de l'axe du partenariat (maison 7 et Descendant), qui décrit ce que vous cherchez chez l'autre." },
            { symbol: '♀', symbolColor: colors.primary, name: 'Vénus',
              description: "Votre façon d'aimer, de plaire et de créer du lien. Ce qui vous attire, ce que vous valorisez et comment vous exprimez la tendresse." },
            { symbol: '♂', symbolColor: '#ef6b5e', name: 'Mars',
              description: "Votre désir, votre énergie de conquête et votre manière d'agir et de vous affirmer. Dans les relations, c'est la passion et l'élan." },
            { symbol: '⌂', symbolColor: HOUSE, name: 'Maison 7',
              description: "Le domaine des partenariats, du couple et des engagements. Elle décrit ce que vous recherchez dans une relation à deux." },
            { name: 'Descendant', symbolColor: colors.primary,
              description: "Le point opposé à votre Ascendant : le type de partenaire qui vous complète et vous attire, souvent ce que vous ne reconnaissez pas encore en vous." },
        ],
    }],
    ambition: [{
        key: 'ambition',
        title: 'Ambition',
        items: [
            { name: 'Pourquoi ces points ?', symbolColor: colors.primary,
              description: "Votre rapport à la réussite se dessine avec le MC et la maison 10 (votre vocation), Jupiter (votre expansion) et Saturne (votre discipline et votre maturité)." },
            { name: 'MC', symbolColor: colors.primary,
              description: "Le Milieu du Ciel : le sommet de votre thème, votre vocation, votre image publique et la direction vers laquelle vous tendez." },
            { symbol: '♃', symbolColor: SUN, name: 'Jupiter',
              description: "Votre soif de croissance, vos opportunités et votre confiance. Là où vous cherchez à vous épanouir et à voir grand." },
            { symbol: '♄', symbolColor: '#8a96b8', name: 'Saturne',
              description: "Votre discipline, vos responsabilités et vos limites. Saturne exige des efforts mais construit une réussite durable." },
            { symbol: '⌂', symbolColor: HOUSE, name: 'Maison 10',
              description: "Le domaine de la carrière, du statut et de l'accomplissement social. Elle montre où vous voulez laisser votre marque." },
        ],
    }],
    mission: [{
        key: 'mission',
        title: 'Mission de vie',
        items: [
            { name: 'Pourquoi ces points ?', symbolColor: colors.primary,
              description: "Votre direction de vie se lit sur l'axe des Nœuds lunaires — d'où vous venez (Sud) vers où vous allez (Nord) — soutenu par Saturne, qui structure ce chemin de maturation." },
            { symbol: '☊', symbolColor: colors.primary, name: 'Nœud Nord',
              description: "Votre cap karmique : les qualités à développer et la direction qui vous fait grandir, même si elle demande de sortir de votre zone de confort." },
            { symbol: '☋', symbolColor: colors.onSurfaceMuted, name: 'Nœud Sud',
              description: "Vos acquis et automatismes du passé. Confortables mais limitants, ils sont le point de départ que vous êtes invité à dépasser." },
            { symbol: '♄', symbolColor: '#8a96b8', name: 'Saturne',
              description: "Le maître du temps et des leçons. Il jalonne votre chemin d'épreuves formatrices qui mènent à la maturité et à l'accomplissement." },
        ],
    }],
};

// Aspect type labels
const ASPECT_TYPE_LABELS: Record<string, string> = {
    conjunction: 'Conjonction',
    opposition: 'Opposition',
    trine: 'Trigone',
    square: 'Carré',
    sextile: 'Sextile',
    quincunx: 'Quinconce',
    conjonction: 'Conjonction',
    trigone: 'Trigone',
    carré: 'Carré',
};

// ─── Premium Gate Fallback ──────────────────────────────────────────────────────

function PremiumFallback() {
    const router = useRouter();

    return (
        <View style={styles.premiumGate}>
            <View style={styles.premiumIconCircle}>
                <Text style={styles.premiumIcon}>🔮</Text>
            </View>
            <Text style={styles.premiumTitle}>Section Premium</Text>
            <Text style={styles.premiumDescription}>
                Cette section est réservée aux membres premium.
                Débloque toutes les analyses approfondies de ton thème natal.
            </Text>
            <View style={{ width: '100%', marginTop: spacing.xl }}>
                <GoldButton
                    label="Découvrir Premium"
                    onPress={() => router.push('/premium')}
                    rightIcon
                />
            </View>
        </View>
    );
}

// ─── Aspect Card ────────────────────────────────────────────────────────────────

function AspectCard({ aspect }: { aspect: AspectInterpretation }) {
    const typeLabel = ASPECT_TYPE_LABELS[aspect.type] || aspect.type;

    return (
        <GlassCard opacity="low" radius="xl" style={styles.aspectCard}>
            <View style={styles.aspectHeader}>
                <Text style={styles.aspectPlanets}>{aspect.planets}</Text>
                <View style={styles.aspectTypeBadge}>
                    <Text style={styles.aspectTypeText}>{typeLabel}</Text>
                </View>
            </View>
            <Text style={styles.aspectOrb}>Orbe : {aspect.orb}°</Text>
            <Text selectable style={styles.aspectInterpretation}>{aspect.interpretation}</Text>
        </GlassCard>
    );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function NatalChartSectionScreen() {
    const router = useRouter();
    const { isPremium } = usePremium();
    const params = useLocalSearchParams<{
        sectionKey: string;
        sectionLabel: string;
        sectionEmoji: string;
    }>();

    const sectionKey = params.sectionKey || 'identity';
    const sectionLabel = params.sectionLabel || 'Section';
    const sectionEmoji = params.sectionEmoji || '✦';

    const [content, setContent] = useState<NatalChartSectionContent | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isPremiumGated, setIsPremiumGated] = useState(false);
    const [helpVisible, setHelpVisible] = useState(false);

    const chips = SECTION_CHIPS[sectionKey] || [];
    const helpSections = SECTION_HELP[sectionKey];
    const isAspectsSection = sectionKey === 'aspects';

    const loadContent = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setIsPremiumGated(false);

        try {
            const result = await getNatalChartAnalysisSection(sectionKey);

            if (result.success && result.content) {
                setContent(result.content);
            } else if (result.error === 'premium_required') {
                setIsPremiumGated(true);
            } else {
                setError(result.error || 'Erreur lors du chargement');
            }
        } catch (e: any) {
            // Check if it's a 402 error (premium required)
            if (e?.status === 402 || e?.message?.includes('402')) {
                setIsPremiumGated(true);
            } else {
                setError(e instanceof Error ? e.message : 'Erreur réseau');
            }
        } finally {
            setIsLoading(false);
        }
    }, [sectionKey]);

    useEffect(() => {
        loadContent();
    }, [loadContent]);

    const renderContent = () => {
        if (isLoading) {
            return (
                <View style={styles.loaderWrap}>
                    <LoaderZodiac size={180} label="Lecture du thème…" />
                    <Text style={styles.loaderHint}>
                        Votre thème astral est une photographie du ciel au moment exact de votre naissance. Une carte unique qui révèle vos forces, vos défis et votre potentiel.
                    </Text>
                </View>
            );
        }

        if (isPremiumGated) {
            return <PremiumFallback />;
        }

        if (error) {
            return (
                <GlassCard opacity="low" radius="xl">
                    <Text style={styles.errorText}>{error}</Text>
                    <View style={{ marginTop: spacing.lg }}>
                        <GoldButton label="Réessayer" onPress={loadContent} />
                    </View>
                </GlassCard>
            );
        }

        if (!content) return null;

        // Aspects variant
        if (isAspectsSection) {
            const aspectsData = content as AspectsData;
            const aspects = aspectsData?.aspects || [];

            if (aspects.length === 0) {
                return (
                    <GlassCard opacity="low" radius="xl">
                        <Text style={styles.emptyText}>
                            Aucun aspect majeur détecté dans ton thème.
                        </Text>
                    </GlassCard>
                );
            }

            return (
                <View style={styles.aspectsList}>
                    {aspects.map((aspect, idx) => (
                        <AspectCard key={idx} aspect={aspect} />
                    ))}
                </View>
            );
        }

        // Text variant
        const textContent = typeof content === 'string' ? content : '';
        return (
            <GlassCard opacity="low" radius="xl">
                <FormattedText text={textContent} style={styles.sectionText} />
            </GlassCard>
        );
    };

    return (
        <Screen variant="scroll" backgroundColor={colors.surfaceLowest} edges={['top']}>
            <TabHeader onBack={() => router.back()} />

            <View style={styles.titleRow}>
                <Text style={styles.titleEmoji}>{sectionEmoji}</Text>
                <Text style={styles.titleText}>{sectionLabel}</Text>
            </View>

            {/* Chips */}
            {!isLoading && chips.length > 0 && !isPremiumGated && (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.chipsScroll}
                    contentContainerStyle={styles.chipsContent}
                >
                    {chips.map((chip) => (
                        <CelestialChip
                            key={chip}
                            label={chip}
                            selected={false}
                        />
                    ))}
                    {helpSections && (
                        <Pressable
                            onPress={() => setHelpVisible(true)}
                            hitSlop={8}
                            style={styles.helpChip}
                            accessibilityRole="button"
                            accessibilityLabel="Comprendre ces points"
                        >
                            <Feather name="help-circle" size={16} color={colors.onSurfaceMuted} />
                        </Pressable>
                    )}
                </ScrollView>
            )}

            {/* Content */}
            <View style={styles.contentWrap}>
                {renderContent()}
            </View>

            <View style={{ height: 60 }} />

            {helpSections && (
                <HelpModal
                    visible={helpVisible}
                    onClose={() => setHelpVisible(false)}
                    title={sectionLabel}
                    sections={helpSections}
                />
            )}
        </Screen>
    );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: spacing.md,
        marginBottom: spacing.lg,
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: `${colors.onSurfaceMuted}18`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitleWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    headerEmoji: {
        fontSize: 20,
    },
    headerTitle: {
        fontFamily: fonts.display.medium,
        fontSize: 18,
        color: colors.onSurface,
    },

    // Chips
    chipsScroll: {
        marginBottom: spacing.lg,
        marginHorizontal: -spacing.screenPadding,
    },
    chipsContent: {
        paddingHorizontal: spacing.screenPadding,
        gap: spacing.sm,
        alignItems: 'center',
    },
    helpChip: {
        width: 32,
        height: 32,
        borderRadius: radius.full,
        backgroundColor: `${colors.onSurfaceMuted}18`,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Content
    loaderWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xxxl,
        gap: spacing.xxl,
    },
    loaderHint: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        lineHeight: 22,
        color: colors.onSurfaceMuted,
        textAlign: 'center',
        paddingHorizontal: spacing.xl,
    },
    contentWrap: {
        flex: 1,
    },
    sectionText: {
        fontFamily: fonts.body.regular,
        fontSize: 15,
        lineHeight: 26,
        color: colors.onSurface,
    },
    emptyText: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        color: colors.onSurfaceMuted,
        textAlign: 'center',
    },
    errorText: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        color: colors.error,
        textAlign: 'center',
        lineHeight: 20,
    },

    // Aspects
    aspectsList: {
        gap: spacing.md,
    },
    aspectCard: {
        marginBottom: 0,
    },
    aspectHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.sm,
    },
    aspectPlanets: {
        fontFamily: fonts.body.semiBold,
        fontSize: 15,
        color: colors.onSurface,
        flex: 1,
    },
    aspectTypeBadge: {
        backgroundColor: `${colors.secondary}20`,
        borderRadius: radius.full,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
    },
    aspectTypeText: {
        fontFamily: fonts.body.semiBold,
        fontSize: 10,
        letterSpacing: 0.5,
        color: colors.secondary,
    },
    aspectOrb: {
        fontFamily: fonts.body.regular,
        fontSize: 11,
        color: colors.onSurfaceMuted,
        marginBottom: spacing.md,
    },
    aspectInterpretation: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        lineHeight: 22,
        color: colors.onSurface,
    },

    // Premium gate
    premiumGate: {
        alignItems: 'center',
        paddingVertical: spacing.xxxl,
        paddingHorizontal: spacing.xl,
    },
    premiumIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: `${colors.primary}15`,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.xl,
    },
    premiumIcon: {
        fontSize: 36,
    },
    premiumTitle: {
        fontFamily: fonts.display.medium,
        fontSize: 22,
        color: colors.onSurface,
        marginBottom: spacing.md,
    },
    premiumDescription: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        lineHeight: 22,
        color: colors.onSurfaceMuted,
        textAlign: 'center',
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginTop: spacing.md,
        marginBottom: spacing.lg,
    },
    titleEmoji: {
        fontSize: 24,
        color: colors.primary,
    },
    titleText: {
        fontFamily: fonts.display.bold,
        fontSize: 24,
        color: colors.onSurface,
    },
});
