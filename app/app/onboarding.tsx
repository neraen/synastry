/**
 * Onboarding — shown once after account creation.
 *
 * Step 0 : RGPD consent
 * Step 1 : Help buttons tip
 * Step 2 : Birth profile (name, date, time, city)
 * Step 3 : All set
 */

import React, { useState, useCallback, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    ScrollView,
    Animated,
    Platform,
    Dimensions,
    KeyboardAvoidingView,
    Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Feather } from '@expo/vector-icons';

import { useAuth } from '@/contexts/AuthContext';
import { GlassCard, GoldButton, GhostButton, AppDatePicker, AppTimePicker, CityAutocomplete } from '@/components/ui';
import { colors, spacing, radius, fonts } from '@/theme';
import {
    saveBirthProfile,
    CitySearchResult,
} from '@/services/birthProfile';

const { width: W } = Dimensions.get('window');
const STEPS = 4;

// ─── Progress dots ────────────────────────────────────────────────────────────

function ProgressDots({ step }: { step: number }) {
    return (
        <View style={styles.dots}>
            {Array.from({ length: STEPS }).map((_, i) => (
                <View
                    key={i}
                    style={[styles.dot, i === step && styles.dotActive]}
                />
            ))}
        </View>
    );
}

// ─── Checkbox ─────────────────────────────────────────────────────────────────

function Checkbox({
    checked,
    onToggle,
    children,
}: {
    checked: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}) {
    return (
        <Pressable style={styles.checkRow} onPress={onToggle} hitSlop={8}>
            <View style={[styles.checkBox, checked && styles.checkBoxChecked]}>
                {checked && <Feather name="check" size={13} color={colors.surfaceLowest} />}
            </View>
            <View style={styles.checkLabel}>{children}</View>
        </Pressable>
    );
}

// ─── Input field (shared) ─────────────────────────────────────────────────────

function Field({
    label,
    value,
    onChangeText,
    placeholder,
    hint,
    disabled,
}: {
    label: string;
    value: string;
    onChangeText: (v: string) => void;
    placeholder?: string;
    hint?: string;
    disabled?: boolean;
}) {
    const [focused, setFocused] = useState(false);
    return (
        <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <View style={[styles.fieldInput, focused && styles.fieldInputFocused, disabled && { opacity: 0.5 }]}>
                <TextInputRN
                    style={styles.fieldText}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={`${colors.onSurfaceMuted}60`}
                    editable={!disabled}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                />
            </View>
            {hint && <Text style={styles.fieldHint}>{hint}</Text>}
        </View>
    );
}

const TextInputRN = TextInput;

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
    const router = useRouter();
    const { t } = useTranslation();
    const { refreshUser } = useAuth();

    const [step, setStep] = useState(0);
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const scrollRef = useRef<ScrollView>(null);
    const scrollYRef = useRef(0);

    // RGPD consent state
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [acceptAI, setAcceptAI] = useState(false);

    // Birth profile form state
    const [firstName, setFirstName] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [birthTime, setBirthTime] = useState('');
    const [birthCity, setBirthCity] = useState('');
    const [birthCountry, setBirthCountry] = useState('');
    const [latitude, setLatitude] = useState<number | null>(null);
    const [longitude, setLongitude] = useState<number | null>(null);
    const [timezone, setTimezone] = useState<number | null>(null);
    const [timezoneName, setTimezoneName] = useState<string | null>(null);

    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | undefined>();

    // ── Navigation ──

    const goTo = useCallback((nextStep: number) => {
        Animated.sequence([
            Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start();
        setTimeout(() => setStep(nextStep), 150);
    }, [fadeAnim]);

    const skipToApp = useCallback(() => {
        router.replace('/(tabs)');
    }, [router]);

    // ── City search ──

    const handleSelectCity = useCallback((city: CitySearchResult) => {
        setBirthCity(city.name);
        setBirthCountry(city.country);
        setLatitude(city.latitude);
        setLongitude(city.longitude);
        setTimezone(city.timezone);
        setTimezoneName(city.timezoneName);
    }, []);

    const handleClearCity = useCallback(() => {
        setBirthCity('');
        setBirthCountry('');
        setLatitude(null);
        setLongitude(null);
        setTimezone(null);
        setTimezoneName(null);
    }, []);

    // ── Save birth profile ──

    const handleSave = useCallback(async () => {
        setError(undefined);

        if (!birthDate) {
            setError(t('birthProfile.birthDateRequired'));
            return;
        }
        if (!birthCity || latitude === null || longitude === null) {
            setError(t('birthProfile.birthCityRequired'));
            return;
        }

        setIsSaving(true);
        try {
            await saveBirthProfile({
                firstName: firstName || undefined,
                birthDate,
                birthTime: birthTime || undefined,
                birthCity,
                birthCountry: birthCountry || undefined,
                latitude,
                longitude,
                timezone: timezone ?? undefined,
                timezoneName: timezoneName ?? undefined,
            });
            await refreshUser();
            goTo(3);
        } catch (err) {
            setError(err instanceof Error ? err.message : t('birthProfile.saveError'));
        } finally {
            setIsSaving(false);
        }
    }, [birthDate, birthCity, latitude, longitude, firstName, birthTime, birthCountry, timezone, timezoneName, refreshUser, goTo, t]);

    // ─────────────────────────────────────────────────────────────────────────
    // Step 0 — RGPD consent
    // ─────────────────────────────────────────────────────────────────────────

    const dataItems = t('onboarding.rgpd.dataItems', { returnObjects: true }) as string[];
    const canContinue = acceptTerms && acceptAI;

    const stepRGPD = (
        <View style={styles.rgpdRoot}>
            {/* Scrollable content */}
            <ScrollView
                contentContainerStyle={styles.rgpdScroll}
                showsVerticalScrollIndicator={false}
            >
                {/* Visual */}
                <View style={styles.rgpdVisual}>
                    <View style={styles.rgpdOrb}>
                        <LinearGradient
                            colors={[`${colors.primary}40`, `${colors.secondary}20`, 'transparent']}
                            style={StyleSheet.absoluteFill}
                            start={{ x: 0.5, y: 0 }}
                            end={{ x: 0.5, y: 1 }}
                        />
                        <Feather name="shield" size={32} color={colors.primary} />
                    </View>
                </View>

                {/* Header */}
                <View style={styles.rgpdHeader}>
                    <View style={styles.rgpdBadge}>
                        <Text style={styles.rgpdBadgeText}>{t('onboarding.rgpd.badge')}</Text>
                    </View>
                    <Text style={styles.rgpdTitle}>{t('onboarding.rgpd.title')}</Text>
                    <Text style={styles.rgpdDescription}>{t('onboarding.rgpd.description')}</Text>
                </View>

                {/* Data collected */}
                <GlassCard style={styles.rgpdDataCard}>
                    <Text style={styles.rgpdDataTitle}>{t('onboarding.rgpd.dataTitle')}</Text>
                    <View style={styles.rgpdDataList}>
                        {dataItems.map((item, i) => (
                            <View key={i} style={styles.rgpdDataRow}>
                                <View style={styles.rgpdDataDot} />
                                <Text style={styles.rgpdDataText}>{item}</Text>
                            </View>
                        ))}
                    </View>
                    <View style={styles.rgpdThirdParty}>
                        <Feather name="info" size={12} color={`${colors.onSurfaceMuted}70`} style={{ marginTop: 1 }} />
                        <Text style={styles.rgpdThirdPartyText}>{t('onboarding.rgpd.thirdParties')}</Text>
                    </View>
                </GlassCard>
            </ScrollView>

            {/* Sticky footer — always visible */}
            <View style={styles.rgpdFooter}>
                <Checkbox checked={acceptTerms} onToggle={() => setAcceptTerms(v => !v)}>
                    <Text style={styles.checkText}>
                        {t('onboarding.rgpd.checkTerms')}{' '}
                        <Text
                            style={styles.checkLink}
                            onPress={() => router.push('/privacy-policy')}
                        >
                            {t('onboarding.rgpd.privacyLink')}
                        </Text>
                    </Text>
                </Checkbox>

                <Checkbox checked={acceptAI} onToggle={() => setAcceptAI(v => !v)}>
                    <Text style={styles.checkText}>{t('onboarding.rgpd.checkAI')}</Text>
                </Checkbox>

                <GoldButton
                    label={t('onboarding.rgpd.cta')}
                    onPress={() => goTo(1)}
                    size="lg"
                    disabled={!canContinue}
                />
            </View>
        </View>
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Step 1 — Help tip
    // ─────────────────────────────────────────────────────────────────────────

    const helpPulse = useRef(new Animated.Value(1)).current;
    React.useEffect(() => {
        if (step !== 1) return;
        const anim = Animated.loop(
            Animated.sequence([
                Animated.timing(helpPulse, { toValue: 1.5, duration: 700, useNativeDriver: true }),
                Animated.timing(helpPulse, { toValue: 1, duration: 700, useNativeDriver: true }),
            ])
        );
        anim.start();
        return () => anim.stop();
    }, [step]);

    const mockPages = t('onboarding.helpTip.mockPages', { returnObjects: true }) as string[];

    const stepHelpTip = (
        <View style={styles.stepHelp}>
            {/* Visual */}
            <View style={styles.helpVisual}>
                {/* Central ? orb with pulsing ring */}
                <View style={styles.helpOrbWrap}>
                    <Animated.View style={[styles.helpPulseRing, { transform: [{ scale: helpPulse }] }]} />
                    <View style={styles.helpOrb}>
                        <Feather name="help-circle" size={36} color={colors.primary} />
                    </View>
                </View>

                {/* Mock page headers */}
                <View style={styles.helpMockList}>
                    {mockPages.map((pageName) => (
                        <View key={pageName} style={styles.helpMockRow}>
                            <View style={styles.helpMockDot} />
                            <Text style={styles.helpMockPageName}>{pageName}</Text>
                            <View style={styles.helpMockBtnWrap}>
                                <Feather name="help-circle" size={14} color={`${colors.onSurfaceMuted}80`} />
                            </View>
                        </View>
                    ))}
                </View>
            </View>

            {/* Copy */}
            <View style={styles.helpTextBlock}>
                <View style={styles.helpBadge}>
                    <Text style={styles.helpBadgeText}>{t('onboarding.helpTip.badge')}</Text>
                </View>
                <Text style={styles.helpTitle}>{t('onboarding.helpTip.title')}</Text>
                <Text style={styles.helpDesc}>{t('onboarding.helpTip.description')}</Text>
            </View>

            <GoldButton
                label={t('onboarding.helpTip.cta')}
                onPress={() => goTo(2)}
                size="lg"
            />
        </View>
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Step 2 — Birth profile
    // ─────────────────────────────────────────────────────────────────────────

    const stepBirthProfile = (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
        >
            <ScrollView
                ref={scrollRef}
                contentContainerStyle={styles.stepScroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                onScroll={(e) => { scrollYRef.current = e.nativeEvent.contentOffset.y; }}
                scrollEventThrottle={16}
            >
                <Text style={styles.stepTitle}>{t('onboarding.birth.title')}</Text>
                <Text style={styles.stepSubtitle}>{t('onboarding.birth.subtitle')}</Text>

                <GlassCard style={styles.formCard}>
                    <Field
                        label={t('birthProfile.firstName')}
                        value={firstName}
                        onChangeText={setFirstName}
                        placeholder={t('birthProfile.firstNamePlaceholder')}
                        hint={t('birthProfile.firstNameHint')}
                        disabled={isSaving}
                    />

                    <View style={styles.fieldGap} />

                    <AppDatePicker
                        label={t('birthProfile.birthDate')}
                        value={birthDate}
                        onChange={setBirthDate}
                        disabled={isSaving}
                        maximumDate={new Date()}
                        placeholder={t('birthProfile.birthDatePlaceholder')}
                    />

                    <View style={styles.fieldGap} />

                    <AppTimePicker
                        label={t('birthProfile.birthTime')}
                        value={birthTime}
                        onChange={setBirthTime}
                        disabled={isSaving}
                        hint={t('birthProfile.birthTimeHint')}
                        placeholder={t('birthProfile.birthTimePlaceholder')}
                    />

                    <View style={styles.fieldGap} />

                    <CityAutocomplete
                        label={t('birthProfile.birthCity')}
                        placeholder={t('birthProfile.birthCityPlaceholder')}
                        value={birthCity ? `${birthCity}${birthCountry ? `, ${birthCountry}` : ''}` : ''}
                        onSelect={handleSelectCity}
                        onClear={handleClearCity}
                        disabled={isSaving}
                        scrollRef={scrollRef}
                        scrollYRef={scrollYRef}
                    />
                </GlassCard>

                {!!error && (
                    <View style={styles.errorBox}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                )}

                <View style={styles.actions}>
                    <GoldButton
                        label={isSaving ? t('common.loading') : t('onboarding.birth.cta')}
                        onPress={handleSave}
                        loading={isSaving}
                        size="lg"
                    />
                    <GhostButton
                        label={t('onboarding.birth.skip')}
                        onPress={skipToApp}
                    />
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Step 3 — All set
    // ─────────────────────────────────────────────────────────────────────────

    const stepDone = (
        <View style={styles.stepDone}>
            <View style={styles.doneOrb}>
                <LinearGradient
                    colors={[`${colors.primary}50`, `${colors.secondary}30`, 'transparent']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                />
                <Text style={styles.doneGlyph}>✦</Text>
            </View>

            <View style={styles.doneTextBlock}>
                <Text style={styles.doneTitle}>{t('onboarding.done.title')}</Text>
                <Text style={styles.doneSubtitle}>{t('onboarding.done.subtitle')}</Text>
            </View>

            <View style={styles.doneFeaturesGrid}>
                {([
                    ['☽', t('onboarding.done.feature1')],
                    ['◈', t('onboarding.done.feature2')],
                    ['⟡', t('onboarding.done.feature3')],
                    ['✦', t('onboarding.done.feature4')],
                ] as const).map(([icon, label]) => (
                    <View key={label} style={styles.doneFeatureItem}>
                        <View style={styles.doneFeatureIcon}>
                            <Text style={styles.doneFeatureIconText}>{icon}</Text>
                        </View>
                        <Text style={styles.doneFeatureLabel}>{label}</Text>
                    </View>
                ))}
            </View>

            <GoldButton
                label={t('onboarding.done.cta')}
                onPress={skipToApp}
                size="lg"
                rightIcon
            />
        </View>
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <View style={styles.root}>
            <LinearGradient
                colors={[colors.surfaceLowest, '#1e0f3a', colors.surfaceLowest]}
                locations={[0, 0.5, 1]}
                style={StyleSheet.absoluteFill}
            />

            <SafeAreaView style={styles.safe}>
                <ProgressDots step={step} />

                <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                    {step === 0 && stepRGPD}
                    {step === 1 && stepHelpTip}
                    {step === 2 && stepBirthProfile}
                    {step === 3 && stepDone}
                </Animated.View>
            </SafeAreaView>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.surfaceLowest },
    safe: { flex: 1 },

    // Progress
    dots: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        paddingTop: spacing.lg,
        paddingBottom: spacing.md,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: `${colors.onSurfaceMuted}40`,
    },
    dotActive: {
        width: 20,
        backgroundColor: colors.primary,
    },

    content: { flex: 1 },

    // ── Step 0: RGPD ──────────────────────────────────────────────────────────
    rgpdRoot: {
        flex: 1,
    },
    rgpdScroll: {
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.xl,
        paddingBottom: spacing.xl,
        gap: spacing.xxl,
    },
    rgpdVisual: {
        alignItems: 'center',
        paddingTop: spacing.md,
    },
    rgpdOrb: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: `${colors.primary}12`,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    rgpdHeader: {
        alignItems: 'center',
        gap: spacing.lg,
    },
    rgpdBadge: {
        backgroundColor: `${colors.primary}18`,
        borderRadius: radius.full,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.xs,
    },
    rgpdBadgeText: {
        fontFamily: fonts.body.medium,
        fontSize: 11,
        letterSpacing: 1.2,
        color: colors.primary,
        textTransform: 'uppercase',
    },
    rgpdTitle: {
        fontFamily: fonts.display.bold,
        fontSize: 30,
        color: colors.onSurface,
        textAlign: 'center',
    },
    rgpdDescription: {
        fontFamily: fonts.body.regular,
        fontSize: 15,
        color: colors.onSurfaceMuted,
        textAlign: 'center',
        lineHeight: 23,
        maxWidth: 300,
    },
    rgpdDataCard: {
        gap: spacing.lg,
        padding: spacing.xl,
    },
    rgpdDataTitle: {
        fontFamily: fonts.body.semiBold,
        fontSize: 12,
        color: colors.onSurface,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
    rgpdDataList: {
        gap: spacing.md,
        marginTop: spacing.sm,
    },
    rgpdDataRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.md,
    },
    rgpdDataDot: {
        width: 5,
        height: 5,
        borderRadius: 3,
        backgroundColor: `${colors.primary}80`,
        marginTop: 7,
        flexShrink: 0,
    },
    rgpdDataText: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        color: colors.onSurfaceMuted,
        lineHeight: 21,
        flex: 1,
    },
    rgpdThirdParty: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.md,
        backgroundColor: `${colors.secondary}10`,
        borderRadius: radius.md,
        padding: spacing.md,
        marginTop: spacing.sm,
    },
    rgpdThirdPartyText: {
        fontFamily: fonts.body.regular,
        fontSize: 13,
        color: `${colors.onSurfaceMuted}cc`,
        lineHeight: 19,
        flex: 1,
    },
    rgpdFooter: {
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.lg,
        paddingBottom: spacing.xl,
        gap: spacing.lg,
        backgroundColor: `${colors.surfaceLowest}f0`,
        borderTopWidth: 1,
        borderTopColor: `${colors.onSurface}08`,
    },
    checkRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.md,
    },
    checkBox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        backgroundColor: `${colors.onSurface}10`,
        borderWidth: 1.5,
        borderColor: `${colors.onSurfaceMuted}40`,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        marginTop: 1,
    },
    checkBoxChecked: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    checkLabel: {
        flex: 1,
    },
    checkText: {
        fontFamily: fonts.body.regular,
        fontSize: 13,
        color: colors.onSurfaceMuted,
        lineHeight: 19,
    },
    checkLink: {
        color: colors.primary,
        textDecorationLine: 'underline',
    },

    // ── Step 1: Help tip ──────────────────────────────────────────────────────
    stepHelp: {
        flex: 1,
        paddingHorizontal: spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xxl,
    },
    helpVisual: {
        width: '100%',
        alignItems: 'center',
        gap: spacing.xl,
    },
    helpOrbWrap: {
        width: 90,
        height: 90,
        alignItems: 'center',
        justifyContent: 'center',
    },
    helpPulseRing: {
        position: 'absolute',
        width: 74,
        height: 74,
        borderRadius: 37,
        backgroundColor: `${colors.primary}18`,
    },
    helpOrb: {
        width: 74,
        height: 74,
        borderRadius: 37,
        backgroundColor: `${colors.primary}14`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    helpMockList: {
        width: '100%',
        gap: spacing.sm,
    },
    helpMockRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        backgroundColor: `${colors.onSurface}06`,
        borderRadius: radius.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    helpMockDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: `${colors.primary}60`,
    },
    helpMockPageName: {
        flex: 1,
        fontFamily: fonts.body.regular,
        fontSize: 14,
        color: colors.onSurface,
    },
    helpMockBtnWrap: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: `${colors.onSurface}08`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    helpTextBlock: {
        alignItems: 'center',
        gap: spacing.md,
    },
    helpBadge: {
        backgroundColor: `${colors.primary}18`,
        borderRadius: radius.full,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.xs,
    },
    helpBadgeText: {
        fontFamily: fonts.body.medium,
        fontSize: 11,
        letterSpacing: 1.2,
        color: colors.primary,
        textTransform: 'uppercase',
    },
    helpTitle: {
        fontFamily: fonts.display.bold,
        fontSize: 28,
        color: colors.onSurface,
        textAlign: 'center',
    },
    helpDesc: {
        fontFamily: fonts.body.regular,
        fontSize: 15,
        color: colors.onSurfaceMuted,
        textAlign: 'center',
        lineHeight: 23,
        maxWidth: 300,
    },

    // ── Step 2: Birth profile ─────────────────────────────────────────────────
    stepScroll: {
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.lg,
        paddingBottom: spacing.xxxl,
        gap: spacing.xl,
    },
    stepTitle: {
        fontFamily: fonts.display.bold,
        fontSize: 24,
        color: colors.onSurface,
    },
    stepSubtitle: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        color: colors.onSurfaceMuted,
        lineHeight: 20,
        marginTop: -spacing.md,
    },
    formCard: {
        gap: 0,
        padding: spacing.xl,
    },
    fieldGap: { height: spacing.lg },
    fieldWrap: { width: '100%' },
    fieldLabel: {
        fontFamily: fonts.body.medium,
        fontSize: 13,
        color: colors.onSurfaceMuted,
        marginBottom: spacing.sm,
        letterSpacing: 0.3,
    },
    fieldInput: {
        backgroundColor: colors.surfaceContainerHigh,
        borderRadius: radius.md,
        minHeight: 52,
        paddingHorizontal: spacing.lg,
        justifyContent: 'center',
    },
    fieldInputFocused: {
        borderWidth: 1,
        borderColor: `${colors.primary}60`,
    },
    fieldText: {
        fontFamily: fonts.body.regular,
        fontSize: 15,
        color: colors.onSurface,
    },
    fieldHint: {
        fontFamily: fonts.body.regular,
        fontSize: 12,
        color: colors.onSurfaceMuted,
        marginTop: spacing.xs,
    },
    errorBox: {
        backgroundColor: `${colors.error}15`,
        borderRadius: radius.md,
        padding: spacing.md,
    },
    errorText: {
        fontFamily: fonts.body.regular,
        fontSize: 13,
        color: colors.error,
        textAlign: 'center',
    },
    actions: {
        gap: spacing.md,
    },

    // ── Step 3: Done ──────────────────────────────────────────────────────────
    stepDone: {
        flex: 1,
        paddingHorizontal: spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xxl,
    },
    doneOrb: {
        width: 110,
        height: 110,
        borderRadius: 55,
        backgroundColor: `${colors.primary}10`,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    doneGlyph: {
        fontSize: 44,
        color: colors.primary,
    },
    doneTextBlock: {
        alignItems: 'center',
        gap: spacing.sm,
    },
    doneTitle: {
        fontFamily: fonts.display.bold,
        fontSize: 28,
        color: colors.onSurface,
        textAlign: 'center',
    },
    doneSubtitle: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        color: colors.onSurfaceMuted,
        textAlign: 'center',
        lineHeight: 21,
        maxWidth: 280,
    },
    doneFeaturesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
        justifyContent: 'center',
        width: '100%',
    },
    doneFeatureItem: {
        width: (W - spacing.xl * 2 - spacing.md) / 2 - 1,
        backgroundColor: `${colors.onSurface}06`,
        borderRadius: radius.md,
        padding: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    doneFeatureIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: `${colors.primary}18`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    doneFeatureIconText: {
        fontSize: 16,
        color: colors.primary,
    },
    doneFeatureLabel: {
        fontFamily: fonts.body.regular,
        fontSize: 12,
        color: colors.onSurface,
        flex: 1,
        lineHeight: 16,
    },
});
