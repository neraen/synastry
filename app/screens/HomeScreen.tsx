/**
 * HomeScreen
 * Main dashboard with daily alignment, feature cards, and transits.
 */

import React, { memo } from 'react';
import {
    View,
    ScrollView,
    StyleSheet,
    Text,
    Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import {
    AppHeader,
    CelestialText,
    GlassCard,
    GoldButton,
    CosmicProgressRing,
    CelestialChip,
    SectionHeader,
    TransitCard,
    NavBar,
} from '@/components/ui';
import { colors, spacing, radius, fonts, typography } from '@/theme';

// =============================================================================
// SUBCOMPONENTS
// =============================================================================

const DailyAlignmentBadge = memo(function DailyAlignmentBadge() {
    return (
        <View style={styles.badge}>
            <CelestialText variant="labelSm" color="primary">
                ⊙ DAILY ALIGNMENT
            </CelestialText>
        </View>
    );
});

const ZodiacWatermark = memo(function ZodiacWatermark() {
    return (
        <Text style={styles.zodiacWatermark}>♀</Text>
    );
});

interface FeatureCardProps {
    icon: keyof typeof Feather.glyphMap;
    title: string;
    body: string;
    onPress?: () => void;
    children?: React.ReactNode;
}

const FeatureCard = memo(function FeatureCard({
    icon,
    title,
    body,
    onPress,
    children,
}: FeatureCardProps) {
    return (
        <GlassCard opacity="low" radius="xl">
            {/* Top row: icon + arrow */}
            <View style={styles.featureTopRow}>
                <View style={styles.iconBubble}>
                    <Feather name={icon} size={24} color={colors.primary} />
                </View>
                <Pressable onPress={onPress}>
                    <Feather
                        name="arrow-up-right"
                        size={24}
                        color={colors.onSurfaceMuted}
                    />
                </Pressable>
            </View>
            {/* Title */}
            <View style={styles.featureTitleSpacing}>
                <CelestialText variant="headlineLg">{title}</CelestialText>
            </View>
            {/* Body */}
            <CelestialText variant="bodyMd" color="muted">
                {body}
            </CelestialText>
            {/* Extra content */}
            {children}
        </GlassCard>
    );
});

const QuoteBlock = memo(function QuoteBlock({ text }: { text: string }) {
    return (
        <View style={styles.quoteBlock}>
            <CelestialText variant="bodyMd" color="muted" italic>
                {text}
            </CelestialText>
        </View>
    );
});

// =============================================================================
// MAIN SCREEN
// =============================================================================

export const HomeScreen = memo(function HomeScreen() {
    const handleTabPress = (tab: 'home' | 'matches' | 'insights' | 'profile') => {
        console.log('Tab pressed:', tab);
    };

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* 1. HEADER */}
                    <AppHeader
                        userName="Selena"
                        onAvatarPress={() => console.log('Avatar pressed')}
                    />

                    {/* 2. HERO SECTION */}
                    <View style={styles.heroSection}>
                        <CelestialText variant="displayMd">
                            Venus in{'\n'}Retrograde
                        </CelestialText>
                        <View style={styles.heroSubtitleSpacing}>
                            <CelestialText variant="bodyLg" color="muted">
                                The stars favor deep connections today.
                            </CelestialText>
                        </View>
                    </View>

                    {/* 3. DAILY ALIGNMENT CARD */}
                    <View style={styles.sectionHorizontal}>
                        <GlassCard opacity="medium" radius="xl" ambient>
                            <View style={styles.cardContent}>
                                {/* Badge */}
                                <DailyAlignmentBadge />

                                {/* Zodiac watermark */}
                                <ZodiacWatermark />

                                {/* Title */}
                                <View style={styles.cardTitleSpacing}>
                                    <CelestialText variant="headlineLg">
                                        Your compatibility today
                                    </CelestialText>
                                </View>

                                {/* Body */}
                                <CelestialText variant="bodyMd" color="muted">
                                    Celestial energy is 88% synchronized with romantic pursuits. Venus smiles upon your connections.
                                </CelestialText>

                                {/* Button */}
                                <View style={styles.cardButtonSpacing}>
                                    <GoldButton
                                        label="ANALYZE A NEW MATCH"
                                        onPress={() => console.log('Analyze match')}
                                        rightIcon
                                    />
                                </View>

                                {/* Progress Ring */}
                                <View style={styles.progressRingContainer}>
                                    <CosmicProgressRing percentage={88} />
                                </View>
                            </View>
                        </GlassCard>
                    </View>

                    {/* 4. FEATURE CARDS SECTION */}
                    <View style={styles.featureCardsSection}>
                        {/* Card A: Birth Chart */}
                        <FeatureCard
                            icon="star"
                            title="Your birth chart"
                            body="Deep dive into your sun, moon, and rising signs to understand your cosmic blueprint."
                            onPress={() => console.log('Birth chart')}
                        >
                            <View style={styles.chipsRow}>
                                <CelestialChip label="SUN" icon="☀️" selected />
                                <CelestialChip label="MOON" icon="🌙" selected />
                                <CelestialChip label="RISING" icon="↑" selected />
                            </View>
                        </FeatureCard>

                        <View style={styles.featureCardGap} />

                        {/* Card B: Daily Insights */}
                        <FeatureCard
                            icon="zap"
                            title="Daily insights"
                            body="Personalized horoscopes based on your current transits and planetary positions."
                            onPress={() => console.log('Daily insights')}
                        >
                            <View style={styles.quoteSpacing}>
                                <QuoteBlock
                                    text='"Communication will be key as Mercury enters your 5th house."'
                                />
                            </View>
                        </FeatureCard>
                    </View>

                    {/* 5. UPCOMING TRANSITS SECTION */}
                    <View style={styles.transitsSection}>
                        <SectionHeader
                            title="Upcoming Transits"
                            action={{
                                label: 'VIEW CALENDAR',
                                onPress: () => console.log('View calendar'),
                            }}
                        />
                        <TransitCard
                            items={[
                                {
                                    dateRange: 'OCT 12 – OCT 15',
                                    title: 'Mars Opposite Saturn',
                                    description:
                                        'Expect some friction in professional partnerships. Patience is your greatest cosmic ally during this transit.',
                                },
                                {
                                    dateRange: 'OCT 18',
                                    title: 'New Moon in Libra',
                                    description:
                                        'A perfect window for setting intentions around balance and aesthetic harmony in your home.',
                                },
                            ]}
                        />
                    </View>

                    {/* 6. BOTTOM SPACING */}
                    <View style={styles.bottomSpacer} />
                </ScrollView>
            </SafeAreaView>

            {/* NAVBAR - Fixed at bottom */}
            <NavBar activeTab="home" onTabPress={handleTabPress} />
        </View>
    );
});

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.surface.default,
    },
    safeArea: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
    },

    // Hero
    heroSection: {
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.xl,
        marginBottom: spacing.xxxl,
    },
    heroSubtitleSpacing: {
        marginTop: spacing.md,
    },

    // Section horizontal padding
    sectionHorizontal: {
        paddingHorizontal: spacing.xl,
    },

    // Daily Alignment Card
    cardContent: {
        position: 'relative',
    },
    badge: {
        alignSelf: 'flex-start',
        backgroundColor: colors.surfaceContainerHighest,
        borderRadius: radius.full,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.lg,
    },
    zodiacWatermark: {
        position: 'absolute',
        top: -spacing.md,
        right: -spacing.sm,
        // Decorative watermark: ~1.7x display size
        fontSize: Math.round((typography.displayLg.fontSize ?? 56) * 1.7),
        fontFamily: fonts.display.regular,
        color: colors.onSurface,
        opacity: 0.08,
    },
    cardTitleSpacing: {
        marginTop: spacing.xl,
        marginBottom: spacing.sm,
    },
    cardButtonSpacing: {
        marginTop: spacing.xl,
    },
    progressRingContainer: {
        alignItems: 'center',
        marginTop: spacing.xl,
    },

    // Feature Cards
    featureCardsSection: {
        paddingHorizontal: spacing.xl,
        marginTop: spacing.xxxl,
    },
    featureTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    iconBubble: {
        width: 48,
        height: 48,
        borderRadius: radius.full,
        backgroundColor: colors.secondaryContainer,
        alignItems: 'center',
        justifyContent: 'center',
    },
    featureTitleSpacing: {
        marginTop: spacing.xl,
        marginBottom: spacing.sm,
    },
    featureCardGap: {
        height: spacing.xxl,
    },
    chipsRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginTop: spacing.lg,
    },
    quoteSpacing: {
        marginTop: spacing.lg,
    },
    quoteBlock: {
        backgroundColor: colors.surfaceLowest,
        borderRadius: radius.md,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
    },

    // Transits
    transitsSection: {
        paddingHorizontal: spacing.xl,
        marginTop: spacing.xxxl,
    },

    // Bottom
    bottomSpacer: {
        height: spacing.xxxl + 72, // Clear NavBar
    },
});

export default HomeScreen;
