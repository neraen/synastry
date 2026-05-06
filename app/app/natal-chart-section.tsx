import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    StyleSheet,
    Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Screen, GlassCard, FormattedText, GoldButton, CelestialChip } from '@/components/ui';
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

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function SkeletonLine({ width }: { width: string | number }) {
    const anim = useRef(new Animated.Value(0.3)).current;
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
            style={{
                height: 14,
                borderRadius: 7,
                backgroundColor: colors.surfaceContainerHighest,
                opacity: anim,
                width: width as any,
                marginBottom: spacing.sm,
            }}
        />
    );
}

function ContentSkeleton() {
    return (
        <View style={{ gap: spacing.md, paddingTop: spacing.lg }}>
            <SkeletonLine width="100%" />
            <SkeletonLine width="95%" />
            <SkeletonLine width="80%" />
            <View style={{ height: spacing.md }} />
            <SkeletonLine width="100%" />
            <SkeletonLine width="90%" />
            <SkeletonLine width="70%" />
            <View style={{ height: spacing.md }} />
            <SkeletonLine width="100%" />
            <SkeletonLine width="85%" />
            <SkeletonLine width="60%" />
        </View>
    );
}

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
            <Text style={styles.aspectInterpretation}>{aspect.interpretation}</Text>
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

    const chips = SECTION_CHIPS[sectionKey] || [];
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
            return <ContentSkeleton />;
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
        <Screen variant="scroll" backgroundVariant="cosmic">
            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
                    <Feather name="arrow-left" size={20} color={colors.onSurface} />
                </Pressable>
                <View style={styles.headerTitleWrap}>
                    <Text style={styles.headerEmoji}>{sectionEmoji}</Text>
                    <Text style={styles.headerTitle}>{sectionLabel}</Text>
                </View>
                <View style={{ width: 36 }} />
            </View>

            {/* Chips */}
            {chips.length > 0 && !isPremiumGated && (
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
                </ScrollView>
            )}

            {/* Content */}
            <View style={styles.contentWrap}>
                {renderContent()}
            </View>

            <View style={{ height: 60 }} />
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
        fontFamily: fonts.display.semiBold,
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
    },

    // Content
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
        fontFamily: fonts.display.semiBold,
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
});
