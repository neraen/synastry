import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
    View,
    Text,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import { usePremium } from '@/hooks/usePremium';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import {
    GlassCard,
    GoldButton,
    AppDatePicker,
    AppTimePicker,
    AppInput,
    CopyableText,
    TabHeader,
    FormattedText,
    ScoreRow,
    PremiumLockedButton,
    CityAutocomplete,
} from '@/components/ui';
import { calculateSynastry, getSynastryHistoryDetail, SynastryResponse } from '@/services/astrology';
import { CitySearchResult, calculateTimezoneForBirthDate } from '@/services/birthProfile';
import { aiDisclaimerText } from '@/constants/legalTexts';
import { colors, spacing, radius, fonts } from '@/theme';


// ─── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ emoji, message, actionLabel, onAction }: {
    emoji: string; message: string; actionLabel: string; onAction: () => void;
}) {
    return (
        <View style={styles.screen}>
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.emptyWrap}>
                    <Text style={styles.emptyEmoji}>{emoji}</Text>
                    <Text style={styles.emptyText}>{message}</Text>
                    <View style={{ marginTop: spacing.xl }}>
                        <GoldButton label={actionLabel} onPress={onAction} />
                    </View>
                </View>
            </SafeAreaView>
        </View>
    );
}

// ─── Dimension config ──────────────────────────────────────────────────────────
const DIM_LABELS: Record<string, { label: string; icon: keyof typeof Feather.glyphMap }> = {
    amour:         { label: 'Amour',         icon: 'heart' },
    love:          { label: 'Amour',         icon: 'heart' },
    communication: { label: 'Communication', icon: 'message-circle' },
    attirance:     { label: 'Attirance',     icon: 'zap' },
    attraction:    { label: 'Attraction',    icon: 'zap' },
    long_terme:    { label: 'Long terme',    icon: 'anchor' },
    long_term:     { label: 'Long-term',     icon: 'anchor' },
    conflits:      { label: 'Conflits',      icon: 'activity' },
    conflicts:     { label: 'Conflicts',     icon: 'activity' },
};

// ─── Result view ───────────────────────────────────────────────────────────────
function ResultView({
    result,
    userName,
    onReset,
}: {
    result: SynastryResponse;
    userName: string;
    onReset: () => void;
}) {
    const { t } = useTranslation();
    const score = Math.round(result.compatibilityScore || 0);
    const headline = result.compatibilityDetails?.headline;
    const dimensions = result.compatibilityDetails?.dimensions || {};
    const dimEntries = Object.entries(dimensions);

    return (
        <View style={styles.screen}>
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    <TabHeader onBack={onReset} />

                    {/* Hero */}
                    <View style={styles.hero}>
                        <Text style={styles.heroPct}>{score}%</Text>
                        <Text style={styles.heroSub}>
                            {headline || (score >= 80 ? t('synastry.deepConnection') : score >= 60 ? t('synastry.niceHarmony') : t('synastry.complementarity'))}
                        </Text>
                        <Text style={styles.heroCaption}>
                            {t('synastry.compatibilityWith', { name: (result.partner?.name || '').toUpperCase() })}
                        </Text>
                    </View>

                    {/* Dimension bars */}
                    {dimEntries.length > 0 && (
                        <View style={styles.sectionPad}>
                            <GlassCard opacity="low" radius="xl">
                                <Text style={styles.dimTitle}>{t('synastry.dimensionsByTitle')}</Text>
                                <View style={{ height: spacing.md }} />
                                {dimEntries.map(([key, data]: [string, any]) => {
                                    const dim = DIM_LABELS[key] || { label: key, icon: 'star' as const };
                                    return (
                                        <ScoreRow
                                            key={key}
                                            label={dim.label}
                                            value={Math.round(data?.score || 0)}
                                            icon={dim.icon}
                                            gradientColors={['#a78bfa', '#ddd6fe']}
                                        />
                                    );
                                })}
                            </GlassCard>
                        </View>
                    )}

                    {/* Celestial Insights */}
                    <View style={[styles.sectionPad, { marginTop: spacing.xxl }]}>
                        <GlassCard opacity="low" radius="xl">
                            <View style={styles.insightHeader}>
                                <View style={styles.insightIconWrap}>
                                    <Feather name="star" size={16} color={colors.primary} />
                                </View>
                                <Text style={styles.insightLabel}>{t('synastry.celestialAnalysis')}</Text>
                            </View>
                            <CopyableText text={result.analysis || ''}>
                                <FormattedText text={result.analysis || ''} style={styles.insightText} />
                            </CopyableText>
                        </GlassCard>
                    </View>
                    {/* Actions */}
                    <View style={[styles.sectionPad, styles.actionsSection]}>
                        <GoldButton label={t('synastry.newAnalysisBtn')} onPress={onReset} rightIcon />
                    </View>

                    <View style={{ height: 100 }} />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

// ─── Form view ─────────────────────────────────────────────────────────────────
function FormView({
    partnerName, setPartnerName,
    birthDate, setBirthDate,
    birthTime, setBirthTime,
    birthCity,
    isLoading,
    error,
    handleSelectCity,
    handleClearCity,
    handleSubmit,
    freeLimitReached,
    scrollRef,
}: any) {
    const { t } = useTranslation();
    return (
        <View style={styles.screen}>
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <KeyboardAvoidingView
                    style={styles.flex}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
                >
                <ScrollView
                    ref={scrollRef}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    <TabHeader />

                    {/* Hero */}
                    <View style={styles.hero}>
                        <View style={styles.badge}>
                            <View style={styles.badgeDot} />
                            <Text style={styles.badgeText}>{t('synastry.badge')}</Text>
                        </View>
                        <Text style={styles.formTitle}>{t('synastry.formTitle')}</Text>
                        <Text style={styles.formSubtitle}>
                            {t('synastry.formSubtitle')}
                        </Text>
                    </View>

                    {/* Form card */}
                    <View style={styles.sectionPad}>
                        <GlassCard opacity="medium" radius="xxl">
                            <AppInput
                                label={t('synastry.partnerName')}
                                placeholder={t('synastry.partnerNamePlaceholder')}
                                value={partnerName}
                                onChangeText={setPartnerName}
                                disabled={isLoading}
                            />
                            <View style={{ height: spacing.lg }} />
                            <AppDatePicker
                                label={t('synastry.birthDateLabel')}
                                value={birthDate}
                                onChange={setBirthDate}
                                disabled={isLoading}
                                maximumDate={new Date()}
                            />
                            <View style={{ height: spacing.lg }} />
                            <AppTimePicker
                                label={t('synastry.birthTimeLabel')}
                                value={birthTime}
                                onChange={setBirthTime}
                                disabled={isLoading}
                                hint={t('synastry.birthTimeHint')}
                            />
                            <View style={{ height: spacing.lg }} />
                            <CityAutocomplete
                                label={t('synastry.birthCityLabel')}
                                placeholder={t('synastry.birthCityPlaceholder')}
                                value={birthCity}
                                onSelect={handleSelectCity}
                                onClear={handleClearCity}
                                disabled={isLoading}
                                scrollRef={scrollRef}
                            />
                        </GlassCard>
                    </View>

                    {/* Error */}
                    {!!error && (
                        <View style={[styles.sectionPad, { marginTop: spacing.lg }]}>
                            <GlassCard opacity="low" radius="xl">
                                <Text style={styles.errorText}>{error}</Text>
                            </GlassCard>
                        </View>
                    )}

                    {/* Submit */}
                    <View style={[styles.sectionPad, styles.actionsSection]}>
                        {isLoading ? (
                            <View style={styles.loadingRow}>
                                <ActivityIndicator color={colors.primary} />
                                <Text style={styles.loadingText}>{t('synastry.calculatingLabel')}</Text>
                            </View>
                        ) : freeLimitReached ? (
                            <PremiumLockedButton
                                label={t('premium.synastryLimitBtn')}
                                reason={t('premium.synastryLimitReason')}
                                source="synastry_second_analysis"
                            />
                        ) : (
                            <GoldButton label={t('synastry.analyzeBtn')} onPress={handleSubmit} rightIcon />
                        )}
                    </View>

                    <View style={{ height: 100 }} />
                </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
}

// ─── Main screen ───────────────────────────────────────────────────────────────
export default function CompatibilityTab() {
    const router = useRouter();
    const { t } = useTranslation();
    const { isAuthenticated, user, isLoading: isAuthLoading } = useAuth();
    const { isPremium } = usePremium();
    const { id: historyId } = useLocalSearchParams<{ id?: string }>();
    const userName = user?.firstName || 'Stargazer';

    const scrollRef = useRef<ScrollView>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string>();
    const [result, setResult] = useState<SynastryResponse | null>(null);
    const [freeLimitReached, setFreeLimitReached] = useState(false);

    // Load from history if id param is present
    useEffect(() => {
        if (!historyId) return;
        setIsLoading(true);
        getSynastryHistoryDetail(Number(historyId))
            .then((res) => {
                if (res.success && res.history) {
                    const h = res.history;
                    setResult({
                        success: true,
                        partner: { name: h.partnerName, positions: h.partnerPositions ?? {} },
                        analysis: h.analysis,
                        compatibilityScore: h.compatibilityScore ?? undefined,
                        compatibilityDetails: h.compatibilityDetails ?? undefined,
                    });
                }
            })
            .catch(() => {})
            .finally(() => setIsLoading(false));
    }, [historyId]);

    const [partnerName, setPartnerName] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [birthTime, setBirthTime] = useState('');
    const [birthCity, setBirthCity] = useState('');
    const [latitude, setLatitude] = useState<number | null>(null);
    const [longitude, setLongitude] = useState<number | null>(null);
    const [timezone, setTimezone] = useState<number | null>(null);
    const [timezoneName, setTimezoneName] = useState<string | null>(null);
    const handleSelectCity = useCallback((city: CitySearchResult) => {
        setBirthCity(city.name);
        setLatitude(city.latitude);
        setLongitude(city.longitude);
        setTimezone(city.timezone);
        setTimezoneName(city.timezoneName);
    }, []);

    const handleClearCity = useCallback(() => {
        setBirthCity('');
        setLatitude(null);
        setLongitude(null);
        setTimezone(null);
        setTimezoneName(null);
    }, []);

    const resetForm = useCallback(() => {
        setPartnerName(''); setBirthDate(''); setBirthTime(''); setBirthCity('');
        setLatitude(null); setLongitude(null); setTimezone(null); setTimezoneName(null);
        setResult(null); setError(undefined);
    }, []);

    async function handleSubmit() {
        setError(undefined);
        if (!partnerName.trim()) { setError(t('synastry.partnerNameRequired')); return; }
        if (!birthDate) { setError(t('synastry.birthDateRequired')); return; }
        if (!birthCity || latitude === null || longitude === null) { setError(t('synastry.birthCityRequired')); return; }
        setIsLoading(true);
        try {
            let finalTimezone = timezone;
            if (timezoneName && birthDate) finalTimezone = calculateTimezoneForBirthDate(timezoneName, birthDate);
            const response = await calculateSynastry({
                partnerName: partnerName.trim(), birthDate,
                birthTime: birthTime || undefined, birthCity,
                latitude, longitude,
                timezone: finalTimezone || undefined,
                timezoneName: timezoneName || undefined,
            });
            if (response.success) setResult(response);
            else setError(response.error || t('synastry.calcError'));
        } catch (err: any) {
            if (err?.status === 403 && err?.payload?.error === 'free_limit_reached') {
                setFreeLimitReached(true);
            } else {
                setError(err instanceof Error ? err.message : t('synastry.calcError'));
            }
        } finally {
            setIsLoading(false);
        }
    }

    if (isAuthLoading) {
        return (
            <View style={styles.screen}>
                <SafeAreaView style={styles.safeArea}>
                    <View style={styles.emptyWrap}>
                        <ActivityIndicator color={colors.primary} size="large" />
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    if (!isAuthenticated) {
        return (
            <EmptyState
                emoji="💫"
                message={t('synastry.loginPrompt')}
                actionLabel={t('synastry.loginBtn')}
                onAction={() => router.push('/login')}
            />
        );
    }

    if (!user?.hasBirthProfile) {
        return (
            <EmptyState
                emoji="✨"
                message={t('synastry.profilePrompt')}
                actionLabel={t('synastry.profileBtn')}
                onAction={() => router.push('/birth-profile')}
            />
        );
    }

    if (result) {
        return <ResultView result={result} userName={userName} onReset={historyId ? () => router.back() : resetForm} />;
    }

    return (
        <FormView
            partnerName={partnerName} setPartnerName={setPartnerName}
            birthDate={birthDate} setBirthDate={setBirthDate}
            birthTime={birthTime} setBirthTime={setBirthTime}
            birthCity={birthCity}
            isLoading={isLoading}
            error={error}
            handleSelectCity={handleSelectCity}
            handleClearCity={handleClearCity}
            handleSubmit={handleSubmit}
            freeLimitReached={freeLimitReached}
            scrollRef={scrollRef}
        />
    );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.surfaceLowest },
    safeArea: { flex: 1 },
    flex: { flex: 1 },
    scrollContent: { flexGrow: 1 },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    logoIcon: {
        fontSize: 14,
        color: colors.primary,
        lineHeight: 18,
    },
    logoText: { fontFamily: fonts.display.regular, fontSize: 18, color: colors.onSurface, letterSpacing: 0.5 },
    userRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    hiText: { fontFamily: fonts.body.regular, fontSize: 14, color: colors.onSurfaceMuted },
    avatarBubble: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: colors.surfaceContainerHigh,
        alignItems: 'center', justifyContent: 'center',
    },
    avatarLetter: { fontFamily: fonts.body.semiBold, fontSize: 14, color: colors.onSurface },

    hero: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.xxxl },
    badge: {
        flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
        gap: spacing.sm, backgroundColor: colors.surfaceContainerHigh,
        borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 6,
        marginBottom: spacing.xl,
    },
    badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
    badgeText: {
        fontFamily: fonts.body.semiBold, fontSize: 10, letterSpacing: 1.5,
        color: colors.onSurfaceMuted, textTransform: 'uppercase',
    },

    // Form
    formTitle: {
        fontFamily: fonts.display.bold, fontSize: 40, lineHeight: 48,
        color: colors.onSurface, letterSpacing: -0.5, marginBottom: spacing.md,
    },
    formSubtitle: {
        fontFamily: fonts.body.regular, fontSize: 15, lineHeight: 24, color: colors.onSurfaceMuted,
    },

    // Result hero
    heroPct: {
        fontFamily: fonts.display.medium, fontSize: 72, lineHeight: 80,
        color: colors.primary, letterSpacing: -2, textAlign: 'center',
    },
    heroSub: {
        fontFamily: fonts.display.regular, fontSize: 24, color: colors.onSurface,
        fontStyle: 'italic', marginTop: spacing.sm, textAlign: 'center',
    },
    heroCaption: {
        fontFamily: fonts.body.semiBold, fontSize: 10, letterSpacing: 2,
        color: colors.onSurfaceMuted, textTransform: 'uppercase',
        marginTop: spacing.sm, textAlign: 'center',
    },

    sectionPad: { paddingHorizontal: spacing.xl },
    dimTitle: {
        fontFamily: fonts.body.semiBold, fontSize: 10, letterSpacing: 2,
        color: colors.onSurfaceMuted, textTransform: 'uppercase',
    },

    insightHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
    insightIconWrap: {
        width: 32, height: 32, borderRadius: radius.md,
        backgroundColor: `${colors.secondaryContainer}4D`,
        alignItems: 'center', justifyContent: 'center',
    },
    insightLabel: {
        fontFamily: fonts.body.semiBold, fontSize: 10, letterSpacing: 2,
        color: colors.onSurfaceMuted, textTransform: 'uppercase',
    },
    insightText: {
        fontFamily: fonts.body.regular, fontSize: 14, lineHeight: 22,
        color: `${colors.onSurface}E6`,
    },
    forcesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg },
    forceChip: {
        backgroundColor: `${colors.primary}1A`, borderRadius: radius.full,
        paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    },
    forceChipText: { fontFamily: fonts.body.medium, fontSize: 12, color: colors.primary },

    actionsSection: { marginTop: spacing.xxl },
    loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingVertical: spacing.lg },
    loadingText: { fontFamily: fonts.body.regular, fontSize: 14, color: colors.onSurfaceMuted },

    disclaimer: { paddingHorizontal: spacing.xl, marginTop: spacing.xxl },
    disclaimerText: {
        fontFamily: fonts.body.regular, fontSize: 11, lineHeight: 18,
        color: `${colors.onSurfaceMuted}80`, fontStyle: 'italic', textAlign: 'center',
    },

    emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, gap: spacing.lg },
    emptyEmoji: { fontSize: 56, lineHeight: 68 },
    emptyText: {
        fontFamily: fonts.body.regular, fontSize: 15, lineHeight: 24,
        color: colors.onSurfaceMuted, textAlign: 'center', maxWidth: 280,
    },

    errorText: { fontFamily: fonts.body.regular, fontSize: 14, color: colors.error, textAlign: 'center' },

});