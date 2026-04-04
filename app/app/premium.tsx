/**
 * Premium Screen
 * Subscription paywall — Annual & Monthly plans.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Pressable,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { colors, typography, spacing, radius } from '@/theme';
import { GlassCard } from '@/components/ui/GlassCard';
import { GoldButton } from '@/components/ui/GoldButton';
import { useAuth } from '@/contexts/AuthContext';
import {
    getOffering,
    purchasePackage,
    restorePurchases,
    type Offering,
} from '@/services/purchases';
import type { PurchasesPackage } from 'react-native-purchases';

// ─── Types ───────────────────────────────────────────────────────────────────

type PlanId = 'annual' | 'monthly';

interface Plan {
    id: PlanId;
    label: string;
    price: string;
    period: string;
    badge?: string;
    features: string[];
}

interface Feature {
    icon: string;
    title: string;
    description: string;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function FeatureRow({ feature }: { feature: Feature }) {
    return (
        <View style={styles.featureRow}>
            <View style={styles.featureIconWrap}>
                <Text style={styles.featureIcon}>{feature.icon}</Text>
            </View>
            <View style={styles.featureTextWrap}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDesc}>{feature.description}</Text>
            </View>
        </View>
    );
}

function AnnualCard({ plan, selected, onSelect }: { plan: Plan; selected: boolean; onSelect: (id: PlanId) => void }) {
    return (
        <Pressable onPress={() => onSelect(plan.id)}>
            <GlassCard opacity={selected ? 'medium' : 'low'} radius="xl" padding="none">
                <View style={styles.planContent}>
                    <View style={styles.planHeaderRow}>
                        <Text style={styles.planLabel}>{plan.label}</Text>
                        {plan.badge && (
                            <View style={styles.bestValueBadge}>
                                <Text style={styles.bestValueText}>{plan.badge}</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.priceRow}>
                        <Text style={styles.priceAmount}>{plan.price}</Text>
                        <Text style={styles.pricePeriod}>{plan.period}</Text>
                    </View>
                    <View style={styles.checkList}>
                        {plan.features.map((f) => (
                            <View key={f} style={styles.checkRow}>
                                <Text style={styles.checkIconLight}>✓</Text>
                                <Text style={styles.checkTextLight}>{f}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            </GlassCard>
        </Pressable>
    );
}

function MonthlyCard({ plan, selected, onSelect }: { plan: Plan; selected: boolean; onSelect: (id: PlanId) => void }) {
    return (
        <Pressable onPress={() => onSelect(plan.id)}>
            <LinearGradient
                colors={['#e9c349', '#c09a2a']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.monthlyBorder}
            >
                <View style={styles.monthlyInner}>
                    <View style={styles.planContent}>
                        <View style={styles.planHeaderRow}>
                            <Text style={styles.planLabelDark}>{plan.label}</Text>
                        </View>
                        <View style={styles.priceRow}>
                            <Text style={styles.priceAmountDark}>{plan.price}</Text>
                            <Text style={styles.pricePeriodDark}>{plan.period}</Text>
                        </View>
                        <View style={styles.checkList}>
                            {plan.features.map((f) => (
                                <View key={f} style={styles.checkRow}>
                                    <Text style={styles.checkIconDark}>✓</Text>
                                    <Text style={styles.checkTextDark}>{f}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </View>
            </LinearGradient>
        </Pressable>
    );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function PremiumScreen() {
    const router = useRouter();
    const { t } = useTranslation();
    const { refreshUser } = useAuth();
    const [selectedPlan, setSelectedPlan] = useState<PlanId>('monthly');
    const [offering, setOffering] = useState<Offering | null>(null);
    const [purchasing, setPurchasing] = useState(false);
    const [restoring, setRestoring] = useState(false);

    const FEATURES: Feature[] = [
        {
            icon: '✦',
            title: t('premium.featureFullAnalysisTitle'),
            description: t('premium.featureFullAnalysisDesc'),
        },
        {
            icon: '∞',
            title: t('premium.featureUnlimitedTitle'),
            description: t('premium.featureUnlimitedDesc'),
        },
        {
            icon: '◈',
            title: t('premium.featureInsightsTitle'),
            description: t('premium.featureInsightsDesc'),
        },
    ];

    const PLANS: Plan[] = [
        {
            id: 'annual',
            label: t('premium.planAnnualLabel'),
            price: '49,99 €',
            period: t('premium.planPeriodYear'),
            badge: t('premium.planBestValue'),
            features: [t('premium.annualFeature1'), t('premium.annualFeature2')],
        },
        {
            id: 'monthly',
            label: t('premium.planMonthlyLabel'),
            price: '7,99 €',
            period: t('premium.planPeriodMonth'),
            features: [
                t('premium.monthlyFeature1'),
                t('premium.monthlyFeature2'),
                t('premium.monthlyFeature3'),
            ],
        },
    ];

    // Load RevenueCat offering on mount to get real store prices
    useEffect(() => {
        getOffering().then(setOffering);
    }, []);

    const handleSelectPlan = useCallback((id: PlanId) => setSelectedPlan(id), []);

    const getPackageForPlan = useCallback((planId: PlanId): PurchasesPackage | null => {
        if (!offering) return null;
        return planId === 'annual' ? offering.annual : offering.monthly;
    }, [offering]);

    // Display real price from store if available, fallback to hardcoded
    const getPriceLabel = useCallback((planId: PlanId): { price: string; period: string } => {
        const pkg = getPackageForPlan(planId);
        if (pkg) {
            const priceString = pkg.product.priceString;
            const period = planId === 'annual' ? t('premium.planPeriodYear') : t('premium.planPeriodMonth');
            return { price: priceString, period };
        }
        return planId === 'annual'
            ? { price: '49,99 €', period: t('premium.planPeriodYear') }
            : { price: '7,99 €', period: t('premium.planPeriodMonth') };
    }, [getPackageForPlan, t]);

    const handleStartPremium = useCallback(async () => {
        const pkg = getPackageForPlan(selectedPlan);
        if (!pkg) {
            // RC not configured yet — show informational alert
            Alert.alert(
                t('premium.comingSoon'),
                t('premium.comingSoonDesc'),
            );
            return;
        }

        setPurchasing(true);
        try {
            const result = await purchasePackage(pkg);
            if (result.cancelled) return;
            if (result.success && result.isPremium) {
                await refreshUser();
                router.back();
            } else if (result.error) {
                Alert.alert(t('common.error'), result.error);
            }
        } finally {
            setPurchasing(false);
        }
    }, [selectedPlan, getPackageForPlan, refreshUser, router, t]);

    const handleRestore = useCallback(async () => {
        setRestoring(true);
        try {
            const result = await restorePurchases();
            if (result.isPremium) {
                await refreshUser();
                Alert.alert(t('premium.restoreSuccess'), t('premium.restoreSuccessMsg'));
                router.back();
            } else {
                Alert.alert(t('premium.restoreNone'), result.error ?? t('premium.restoreNoneDefault'));
            }
        } finally {
            setRestoring(false);
        }
    }, [refreshUser, router, t]);

    return (
        <View style={styles.root}>
            <LinearGradient
                colors={[colors.surfaceLowest, colors.surfaceLow, colors.surfaceLowest]}
                locations={[0, 0.5, 1]}
                style={StyleSheet.absoluteFill}
            />

            <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
                {/* Close */}
                <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()} hitSlop={12}>
                    <Text style={styles.closeIcon}>✕</Text>
                </TouchableOpacity>

                <ScrollView
                    contentContainerStyle={styles.scroll}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Badge */}
                    <View style={styles.badgeWrap}>
                        <View style={styles.badge}>
                            <Text style={styles.badgeStar}>★</Text>
                            <Text style={styles.badgeLabel}>{t('premium.memberBadge')}</Text>
                        </View>
                    </View>

                    {/* Headline */}
                    <Text style={styles.headline}>
                        {t('premium.headline')}
                    </Text>
                    <Text style={styles.subtitle}>
                        {t('premium.tagline')}
                    </Text>

                    {/* Features */}
                    <View style={styles.featuresSection}>
                        {FEATURES.map((f) => (
                            <FeatureRow key={f.title} feature={f} />
                        ))}
                    </View>

                    {/* Plans */}
                    <View style={styles.plansSection}>
                        <AnnualCard
                            plan={{ ...PLANS[0], ...getPriceLabel('annual') }}
                            selected={selectedPlan === 'annual'}
                            onSelect={handleSelectPlan}
                        />
                        <MonthlyCard
                            plan={{ ...PLANS[1], ...getPriceLabel('monthly') }}
                            selected={selectedPlan === 'monthly'}
                            onSelect={handleSelectPlan}
                        />
                    </View>

                    {/* CTA */}
                    <View style={styles.ctaWrap}>
                        <GoldButton
                            label={purchasing ? t('premium.processingBtn') : t('premium.startPremiumBtn')}
                            onPress={handleStartPremium}
                            loading={purchasing}
                            size="lg"
                        />
                    </View>

                    {/* Legal + Restore */}
                    <Text style={styles.legal}>
                        {t('premium.legalNotice')}
                    </Text>
                    <Pressable onPress={handleRestore} disabled={restoring} style={styles.restoreBtn}>
                        {restoring
                            ? <ActivityIndicator size="small" color={colors.onSurfaceMuted} />
                            : <Text style={styles.restoreText}>{t('premium.restoreBtn')}</Text>
                        }
                    </Pressable>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: colors.surfaceLowest,
    },
    safe: {
        flex: 1,
    },

    // Close button
    closeBtn: {
        position: 'absolute',
        top: spacing.xl,
        right: spacing.xl,
        zIndex: 10,
        width: 32,
        height: 32,
        borderRadius: radius.full,
        backgroundColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeIcon: {
        ...typography.bodyMd,
        color: colors.onSurfaceMuted,
    },

    // Scroll
    scroll: {
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.xxl + spacing.xl,
        paddingBottom: spacing.xxl,
    },

    // Badge
    badgeWrap: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.lg,
        backgroundColor: 'rgba(233,195,73,0.12)',
        borderRadius: radius.full,
    },
    badgeStar: {
        fontSize: 12,
        color: colors.primary,
    },
    badgeLabel: {
        ...typography.labelSm,
        color: colors.primary,
        letterSpacing: 1.5,
    },

    // Headline
    headline: {
        ...typography.headlineLg,
        color: colors.onSurface,
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    subtitle: {
        ...typography.bodyMd,
        color: colors.onSurfaceMuted,
        textAlign: 'center',
        marginBottom: spacing.xxl,
    },

    // Features
    featuresSection: {
        gap: spacing.xl,
        marginBottom: spacing.xxl,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.lg,
    },
    featureIconWrap: {
        width: 40,
        height: 40,
        borderRadius: radius.md,
        backgroundColor: 'rgba(200,191,255,0.10)',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    featureIcon: {
        fontSize: 16,
        color: colors.secondary,
    },
    featureTextWrap: {
        flex: 1,
    },
    featureTitle: {
        ...typography.titleMd,
        color: colors.onSurface,
        marginBottom: spacing.xs,
    },
    featureDesc: {
        ...typography.bodyMd,
        color: colors.onSurfaceMuted,
    },

    // Plans
    plansSection: {
        gap: spacing.md,
        marginBottom: spacing.xxl,
    },

    // Shared plan content
    planContent: {
        padding: spacing.xl,
    },
    planHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    planLabel: {
        ...typography.labelMd,
        color: colors.onSurfaceMuted,
        letterSpacing: 1.5,
    },
    planLabelDark: {
        ...typography.labelMd,
        color: colors.primaryContainer,
        letterSpacing: 1.5,
    },
    bestValueBadge: {
        paddingVertical: 2,
        paddingHorizontal: spacing.sm,
        backgroundColor: 'rgba(233,195,73,0.15)',
        borderRadius: radius.full,
    },
    bestValueText: {
        ...typography.labelSm,
        color: colors.primary,
        letterSpacing: 1,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: spacing.xs,
        marginBottom: spacing.lg,
    },
    priceAmount: {
        ...typography.headlineLg,
        color: colors.onSurface,
    },
    priceAmountDark: {
        ...typography.headlineLg,
        color: colors.surfaceLowest,
    },
    pricePeriod: {
        ...typography.bodyMd,
        color: colors.onSurfaceMuted,
    },
    pricePeriodDark: {
        ...typography.bodyMd,
        color: 'rgba(19,8,39,0.65)',
    },
    checkList: {
        gap: spacing.sm,
    },
    checkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    checkIconLight: {
        fontSize: 13,
        color: colors.primary,
        fontFamily: 'Manrope_700Bold',
    },
    checkTextLight: {
        ...typography.bodyMd,
        color: colors.onSurface,
    },
    checkIconDark: {
        fontSize: 13,
        color: colors.surfaceLowest,
        fontFamily: 'Manrope_700Bold',
    },
    checkTextDark: {
        ...typography.bodyMd,
        color: colors.surfaceLowest,
    },

    // Monthly gold card
    monthlyBorder: {
        borderRadius: radius.xl,
        padding: 2,
    },
    monthlyInner: {
        borderRadius: radius.xl - 2,
        backgroundColor: colors.primary,
        overflow: 'hidden',
    },

    // CTA
    ctaWrap: {
        marginBottom: spacing.xl,
    },

    // Legal
    legal: {
        ...typography.labelSm,
        color: colors.onSurfaceMuted,
        textAlign: 'center',
        letterSpacing: 0.3,
        marginBottom: spacing.md,
    },
    restoreBtn: {
        alignItems: 'center',
        paddingVertical: spacing.sm,
    },
    restoreText: {
        ...typography.labelSm,
        color: colors.onSurfaceMuted,
        textDecorationLine: 'underline',
        letterSpacing: 0.3,
    },
});