import React, { useState, useCallback, useRef } from 'react';
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
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import {
    GlassCard,
    GoldButton,
    AppDatePicker,
    AppTimePicker,
    AppInput,
    TabHeader,
    PremiumLockedButton,
    CityAutocomplete,
} from '@/components/ui';
import { calculateSynastry } from '@/services/astrology';
import { CitySearchResult, calculateTimezoneForBirthDate } from '@/services/birthProfile';
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

// ─── Main screen ───────────────────────────────────────────────────────────────
export default function CompatibilityTab() {
    const router = useRouter();
    const { t } = useTranslation();
    const { isAuthenticated, user, isLoading: isAuthLoading } = useAuth();
    const { isPremium } = usePremium();

    const scrollRef = useRef<ScrollView>(null);
    const scrollYRef = useRef(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string>();
    const [freeLimitReached, setFreeLimitReached] = useState(false);

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
        setPartnerName('');
        setBirthDate('');
        setBirthTime('');
        setBirthCity('');
        setLatitude(null);
        setLongitude(null);
        setTimezone(null);
        setTimezoneName(null);
        setError(undefined);
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
                partnerName: partnerName.trim(),
                birthDate,
                birthTime: birthTime || undefined,
                birthCity,
                latitude,
                longitude,
                timezone: finalTimezone || undefined,
                timezoneName: timezoneName || undefined,
            });

            if (response.success && response.historyId) {
                resetForm();
                router.push(`/compatibility-result?id=${response.historyId}`);
            } else {
                setError(response.error || t('synastry.calcError'));
            }
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
                        onScroll={(e) => { scrollYRef.current = e.nativeEvent.contentOffset.y; }}
                        scrollEventThrottle={16}
                    >
                        <TabHeader />

                        {/* Hero */}
                        <View style={styles.hero}>
                            <View style={styles.badge}>
                                <View style={styles.badgeDot} />
                                <Text style={styles.badgeText}>{t('synastry.badge')}</Text>
                            </View>
                            <Text style={styles.formTitle}>{t('synastry.formTitle')}</Text>
                            <Text style={styles.formSubtitle}>{t('synastry.formSubtitle')}</Text>
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
                                    scrollYRef={scrollYRef}
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

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.surfaceLowest },
    safeArea: { flex: 1 },
    flex: { flex: 1 },
    scrollContent: { flexGrow: 1 },

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
    formTitle: {
        fontFamily: fonts.display.bold, fontSize: 40, lineHeight: 48,
        color: colors.onSurface, letterSpacing: -0.5, marginBottom: spacing.md,
    },
    formSubtitle: {
        fontFamily: fonts.body.regular, fontSize: 15, lineHeight: 24, color: colors.onSurfaceMuted,
    },

    sectionPad: { paddingHorizontal: spacing.xl },
    actionsSection: { marginTop: spacing.xxl },
    loadingRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: spacing.md, paddingVertical: spacing.lg,
    },
    loadingText: { fontFamily: fonts.body.regular, fontSize: 14, color: colors.onSurfaceMuted },

    emptyWrap: {
        flex: 1, alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: spacing.xl, gap: spacing.lg,
    },
    emptyEmoji: { fontSize: 56, lineHeight: 68 },
    emptyText: {
        fontFamily: fonts.body.regular, fontSize: 15, lineHeight: 24,
        color: colors.onSurfaceMuted, textAlign: 'center', maxWidth: 280,
    },

    errorText: {
        fontFamily: fonts.body.regular, fontSize: 14, color: colors.error, textAlign: 'center',
    },
});
