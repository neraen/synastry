/**
 * Premium Subscription Screen
 *
 * High-conversion premium subscription screen with cosmic styling
 */

import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    Pressable,
    Dimensions,
    ScrollView,
    StatusBar,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppText, AppHeading, AppButton, Spacer } from '@/components/ui';
import { colors, spacing, borderRadius, shadows, typography, radius } from '@/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type PlanType = 'yearly' | 'monthly';

interface Feature {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    description: string;
}

const FEATURES: Feature[] = [
    {
        icon: 'infinite',
        title: 'Analyses illimitées',
        description: 'Compatibilité avec tous vos proches',
    },
    {
        icon: 'heart-circle',
        title: 'Analyse relationnelle complète',
        description: 'Synastrie détaillée et conseils personnalisés',
    },
    {
        icon: 'planet',
        title: 'Transits amoureux en temps réel',
        description: 'Les énergies cosmiques du moment',
    },
    {
        icon: 'sparkles',
        title: 'Insights astrologiques personnalisés',
        description: 'Basés sur votre thème natal unique',
    },
    {
        icon: 'time',
        title: 'Historique des relations',
        description: 'Retrouvez toutes vos analyses',
    },
];

interface PricingPlan {
    id: PlanType;
    name: string;
    price: string;
    pricePerMonth: string;
    badge?: string;
    savings?: string;
}

const PRICING_PLANS: PricingPlan[] = [
    {
        id: 'yearly',
        name: 'Annuel',
        price: '39,99€/an',
        pricePerMonth: '≈ 3,33€/mois',
        badge: 'MEILLEURE OFFRE',
        savings: 'Économisez 44%',
    },
    {
        id: 'monthly',
        name: 'Mensuel',
        price: '5,99€/mois',
        pricePerMonth: 'Sans engagement',
    },
];

export default function PremiumScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [selectedPlan, setSelectedPlan] = useState<PlanType>('yearly');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubscribe = async () => {
        setIsLoading(true);
        // TODO: Integrate with RevenueCat or App Store
        // For now, simulate a delay
        setTimeout(() => {
            setIsLoading(false);
            // Navigate back or show success
            router.back();
        }, 2000);
    };

    const handleClose = () => {
        router.back();
    };

    const handleRestore = () => {
        // TODO: Implement restore purchases
        console.log('Restore purchases');
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Gradient Background */}
            <LinearGradient
                colors={[
                    colors.palette.purple900,
                    colors.palette.navy800,
                    colors.palette.navy900,
                ]}
                style={styles.gradient}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
            />

            {/* Decorative Glow Effects */}
            <View style={styles.glowContainer}>
                <View style={[styles.glow, styles.glowTop]} />
                <View style={[styles.glow, styles.glowBottom]} />
            </View>

            {/* Zodiac Wheel Background (decorative circle) */}
            <View style={styles.zodiacWheelContainer}>
                <View style={styles.zodiacWheel} />
                <View style={styles.zodiacWheelInner} />
            </View>

            {/* Close Button */}
            <Pressable
                style={[styles.closeButton, { top: insets.top + spacing.md }]}
                onPress={handleClose}
                hitSlop={20}
            >
                <Ionicons name="close" size={28} color={colors.text.muted} />
            </Pressable>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[
                    styles.scrollContent,
                    {
                        paddingTop: insets.top + spacing['5xl'],
                        paddingBottom: insets.bottom + spacing['3xl'],
                    },
                ]}
                showsVerticalScrollIndicator={false}
                bounces={true}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.premiumBadge}>
                        <Ionicons name="star" size={16} color={colors.palette.gold500} />
                        <AppText style={styles.premiumBadgeText}>PREMIUM</AppText>
                    </View>
                    <Spacer size="lg" />
                    <AppHeading variant="h1" align="center" style={styles.title}>
                        Révélez votre potentiel cosmique
                    </AppHeading>
                    <Spacer size="md" />
                    <AppText
                        variant="body"
                        color="muted"
                        align="center"
                        style={styles.subtitle}
                    >
                        Accédez aux analyses relationnelles approfondies et aux conseils astrologiques personnalisés
                    </AppText>
                </View>

                <Spacer size="3xl" />

                {/* Features List */}
                <View style={styles.featuresContainer}>
                    {FEATURES.map((feature, index) => (
                        <View key={index} style={styles.featureItem}>
                            <View style={styles.featureIconContainer}>
                                <Ionicons
                                    name={feature.icon}
                                    size={24}
                                    color={colors.palette.gold500}
                                />
                            </View>
                            <View style={styles.featureContent}>
                                <AppText variant="bodyMedium" color="primary">
                                    {feature.title}
                                </AppText>
                                <AppText variant="bodySmall" color="muted">
                                    {feature.description}
                                </AppText>
                            </View>
                        </View>
                    ))}
                </View>

                <Spacer size="3xl" />

                {/* Pricing Cards */}
                <View style={styles.pricingContainer}>
                    {PRICING_PLANS.map((plan) => {
                        const isSelected = selectedPlan === plan.id;
                        return (
                            <Pressable
                                key={plan.id}
                                style={[
                                    styles.pricingCard,
                                    isSelected && styles.pricingCardSelected,
                                ]}
                                onPress={() => setSelectedPlan(plan.id)}
                            >
                                {/* Best Value Badge */}
                                {plan.badge && (
                                    <View style={styles.bestValueBadge}>
                                        <AppText style={styles.bestValueText}>
                                            {plan.badge}
                                        </AppText>
                                    </View>
                                )}

                                {/* Selection Indicator */}
                                <View style={styles.radioContainer}>
                                    <View
                                        style={[
                                            styles.radioOuter,
                                            isSelected && styles.radioOuterSelected,
                                        ]}
                                    >
                                        {isSelected && <View style={styles.radioInner} />}
                                    </View>
                                </View>

                                {/* Plan Details */}
                                <View style={styles.planDetails}>
                                    <View style={styles.planNameRow}>
                                        <AppHeading variant="titleSmall" color="primary">
                                            {plan.name}
                                        </AppHeading>
                                        {plan.savings && (
                                            <View style={styles.savingsBadge}>
                                                <AppText style={styles.savingsText}>
                                                    {plan.savings}
                                                </AppText>
                                            </View>
                                        )}
                                    </View>
                                    <Spacer size="xs" />
                                    <AppHeading variant="h2" color="primary" style={styles.price}>
                                        {plan.price}
                                    </AppHeading>
                                    <AppText variant="bodySmall" color="muted">
                                        {plan.pricePerMonth}
                                    </AppText>
                                </View>
                            </Pressable>
                        );
                    })}
                </View>

                <Spacer size="2xl" />

                {/* CTA Button */}
                <View style={styles.ctaContainer}>
                    <Pressable
                        style={({ pressed }) => [
                            styles.ctaButton,
                            pressed && styles.ctaButtonPressed,
                            isLoading && styles.ctaButtonLoading,
                        ]}
                        onPress={handleSubscribe}
                        disabled={isLoading}
                    >
                        <LinearGradient
                            colors={[colors.palette.gold300, colors.palette.gold400, colors.palette.gold500]}
                            style={styles.ctaGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            {isLoading ? (
                                <AppText style={styles.ctaText}>Chargement...</AppText>
                            ) : (
                                <>
                                    <Ionicons
                                        name="star"
                                        size={20}
                                        color={colors.palette.navy900}
                                        style={styles.ctaIcon}
                                    />
                                    <AppText style={styles.ctaText}>
                                        Commencer l'essai gratuit
                                    </AppText>
                                </>
                            )}
                        </LinearGradient>
                    </Pressable>

                    <Spacer size="md" />

                    <AppText variant="caption" color="muted" align="center">
                        7 jours d'essai gratuit, puis{' '}
                        {selectedPlan === 'yearly' ? '39,99€/an' : '5,99€/mois'}
                    </AppText>
                </View>

                <Spacer size="2xl" />

                {/* Restore & Terms */}
                <View style={styles.footer}>
                    <Pressable onPress={handleRestore} hitSlop={10}>
                        <AppText variant="bodySmall" color="muted" style={styles.footerLink}>
                            Restaurer mes achats
                        </AppText>
                    </Pressable>

                    <AppText variant="bodySmall" color="disabled" style={styles.footerDivider}>
                        •
                    </AppText>

                    <Pressable onPress={() => router.push('/terms-of-service')} hitSlop={10}>
                        <AppText variant="bodySmall" color="muted" style={styles.footerLink}>
                            Conditions
                        </AppText>
                    </Pressable>

                    <AppText variant="bodySmall" color="disabled" style={styles.footerDivider}>
                        •
                    </AppText>

                    <Pressable onPress={() => router.push('/privacy-policy')} hitSlop={10}>
                        <AppText variant="bodySmall" color="muted" style={styles.footerLink}>
                            Confidentialité
                        </AppText>
                    </Pressable>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.palette.navy900,
    },
    gradient: {
        ...StyleSheet.absoluteFillObject,
    },
    glowContainer: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
    },
    glow: {
        position: 'absolute',
        borderRadius: 999,
    },
    glowTop: {
        width: SCREEN_WIDTH * 1.5,
        height: SCREEN_WIDTH * 1.5,
        top: -SCREEN_WIDTH * 0.75,
        left: -SCREEN_WIDTH * 0.25,
        backgroundColor: colors.palette.purple700,
        opacity: 0.15,
    },
    glowBottom: {
        width: SCREEN_WIDTH,
        height: SCREEN_WIDTH,
        bottom: -SCREEN_WIDTH * 0.3,
        right: -SCREEN_WIDTH * 0.3,
        backgroundColor: colors.palette.gold500,
        opacity: 0.08,
    },
    zodiacWheelContainer: {
        position: 'absolute',
        top: SCREEN_HEIGHT * 0.15,
        left: -SCREEN_WIDTH * 0.3,
        width: SCREEN_WIDTH * 0.8,
        height: SCREEN_WIDTH * 0.8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    zodiacWheel: {
        width: '100%',
        height: '100%',
        borderRadius: 999,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        position: 'absolute',
    },
    zodiacWheelInner: {
        width: '60%',
        height: '60%',
        borderRadius: 999,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.03)',
    },
    closeButton: {
        position: 'absolute',
        right: spacing.lg,
        zIndex: 10,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: spacing.screenPadding,
    },
    header: {
        alignItems: 'center',
    },
    premiumBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(201, 154, 100, 0.15)',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.badge,
        gap: spacing.xs,
    },
    premiumBadgeText: {
        ...typography.tag,
        color: colors.palette.gold500,
    },
    title: {
        maxWidth: 300,
    },
    subtitle: {
        maxWidth: 320,
    },
    featuresContainer: {
        gap: spacing.lg,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    featureIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(201, 154, 100, 0.12)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    featureContent: {
        flex: 1,
        gap: 2,
    },
    pricingContainer: {
        gap: spacing.md,
    },
    pricingCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderRadius: borderRadius.cardLarge,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        padding: spacing.xl,
        flexDirection: 'row',
        alignItems: 'center',
        overflow: 'hidden',
    },
    pricingCardSelected: {
        borderColor: colors.palette.gold500,
        backgroundColor: 'rgba(201, 154, 100, 0.08)',
    },
    bestValueBadge: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: colors.palette.gold500,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderBottomLeftRadius: radius.md,
    },
    bestValueText: {
        ...typography.tag,
        fontSize: 10,
        color: colors.palette.navy900,
    },
    radioContainer: {
        marginRight: spacing.lg,
    },
    radioOuter: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioOuterSelected: {
        borderColor: colors.palette.gold500,
    },
    radioInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: colors.palette.gold500,
    },
    planDetails: {
        flex: 1,
    },
    planNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    savingsBadge: {
        backgroundColor: colors.status.successSoft,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs,
        borderRadius: borderRadius.badge,
    },
    savingsText: {
        ...typography.caption,
        fontWeight: '600',
        color: colors.status.success,
    },
    price: {
        color: colors.text.primary,
    },
    ctaContainer: {
        alignItems: 'center',
    },
    ctaButton: {
        width: '100%',
        borderRadius: borderRadius.button,
        overflow: 'hidden',
        ...shadows.glow.gold,
    },
    ctaButtonPressed: {
        opacity: 0.9,
        transform: [{ scale: 0.98 }],
    },
    ctaButtonLoading: {
        opacity: 0.7,
    },
    ctaGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing['2xl'],
        gap: spacing.sm,
    },
    ctaIcon: {
        marginRight: spacing.xs,
    },
    ctaText: {
        ...typography.button,
        color: colors.palette.navy900,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: spacing.sm,
        flexWrap: 'wrap',
    },
    footerLink: {
        textDecorationLine: 'underline',
    },
    footerDivider: {
        opacity: 0.5,
    },
});
