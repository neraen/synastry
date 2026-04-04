/**
 * Onboarding — shown once after account creation.
 *
 * Step 1 : Welcome
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/contexts/AuthContext';
import { GlassCard, GoldButton, GhostButton, AppDatePicker, AppTimePicker, CityAutocomplete } from '@/components/ui';
import { colors, spacing, radius, fonts } from '@/theme';
import {
    saveBirthProfile,
    CitySearchResult,
} from '@/services/birthProfile';

const { width: W } = Dimensions.get('window');
const STEPS = 3;

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

// ─── Feature row (step 3) ─────────────────────────────────────────────────────

function FeatureRow({ icon, label }: { icon: string; label: string }) {
    return (
        <View style={styles.featureRow}>
            <View style={styles.featureIcon}>
                <Text style={styles.featureIconText}>{icon}</Text>
            </View>
            <Text style={styles.featureLabel}>{label}</Text>
        </View>
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

// Alias used in the Field component
const TextInputRN = TextInput;

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
    const router = useRouter();
    const { t } = useTranslation();
    const { refreshUser } = useAuth();

    const [step, setStep] = useState(0);
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const scrollRef = useRef<ScrollView>(null);

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


    // Submit state
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
            goTo(2);
        } catch (err) {
            setError(err instanceof Error ? err.message : t('birthProfile.saveError'));
        } finally {
            setIsSaving(false);
        }
    }, [birthDate, birthCity, latitude, longitude, firstName, birthTime, birthCountry, timezone, timezoneName, refreshUser, goTo, t]);

    // ─────────────────────────────────────────────────────────────────────────
    // Step 1 — Welcome
    // ─────────────────────────────────────────────────────────────────────────

    const stepWelcome = (
        <View style={styles.stepWelcome}>
            {/* Celestial orb */}
            <View style={styles.orb}>
                <LinearGradient
                    colors={[colors.primary + '30', colors.secondary + '20', 'transparent']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                />
                <Text style={styles.orbGlyph}>✦</Text>
            </View>

            <Text style={styles.welcomeTitle}>{t('onboarding.welcome.title')}</Text>
            <Text style={styles.welcomeSubtitle}>{t('onboarding.welcome.subtitle')}</Text>

            <View style={styles.welcomeFeatures}>
                {([
                    ['◉', t('onboarding.welcome.feature1')],
                    ['◈', t('onboarding.welcome.feature2')],
                    ['⟡', t('onboarding.welcome.feature3')],
                ] as const).map(([icon, label]) => (
                    <View key={label} style={styles.welcomeFeatureRow}>
                        <Text style={styles.welcomeFeatureIcon}>{icon}</Text>
                        <Text style={styles.welcomeFeatureText}>{label}</Text>
                    </View>
                ))}
            </View>

            <GoldButton
                label={t('onboarding.welcome.cta')}
                onPress={() => goTo(1)}
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
            >
                <Text style={styles.stepTitle}>{t('onboarding.birth.title')}</Text>
                <Text style={styles.stepSubtitle}>{t('onboarding.birth.subtitle')}</Text>

                <GlassCard style={styles.formCard}>
                    {/* First name */}
                    <Field
                        label={t('birthProfile.firstName')}
                        value={firstName}
                        onChangeText={setFirstName}
                        placeholder={t('birthProfile.firstNamePlaceholder')}
                        hint={t('birthProfile.firstNameHint')}
                        disabled={isSaving}
                    />

                    <View style={styles.fieldGap} />

                    {/* Birth date */}
                    <AppDatePicker
                        label={t('birthProfile.birthDate')}
                        value={birthDate}
                        onChange={setBirthDate}
                        disabled={isSaving}
                        maximumDate={new Date()}
                        placeholder={t('birthProfile.birthDatePlaceholder')}
                    />

                    <View style={styles.fieldGap} />

                    {/* Birth time */}
                    <AppTimePicker
                        label={t('birthProfile.birthTime')}
                        value={birthTime}
                        onChange={setBirthTime}
                        disabled={isSaving}
                        hint={t('birthProfile.birthTimeHint')}
                        placeholder={t('birthProfile.birthTimePlaceholder')}
                    />

                    <View style={styles.fieldGap} />

                    {/* Birth city */}
                    <CityAutocomplete
                        label={t('birthProfile.birthCity')}
                        placeholder={t('birthProfile.birthCityPlaceholder')}
                        value={birthCity ? `${birthCity}${birthCountry ? `, ${birthCountry}` : ''}` : ''}
                        onSelect={handleSelectCity}
                        onClear={handleClearCity}
                        disabled={isSaving}
                        scrollRef={scrollRef}
                    />
                </GlassCard>

                {/* Error */}
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
                    colors={[colors.primary + '40', colors.secondary + '20', 'transparent']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                />
                <Text style={styles.doneGlyph}>✦</Text>
            </View>

            <Text style={styles.doneTitle}>{t('onboarding.done.title')}</Text>
            <Text style={styles.doneSubtitle}>{t('onboarding.done.subtitle')}</Text>

            <GlassCard style={styles.featuresCard}>
                <FeatureRow icon="🌙" label={t('onboarding.done.feature1')} />
                <View style={styles.featureDivider} />
                <FeatureRow icon="💫" label={t('onboarding.done.feature2')} />
                <View style={styles.featureDivider} />
                <FeatureRow icon="🪞" label={t('onboarding.done.feature3')} />
                <View style={styles.featureDivider} />
                <FeatureRow icon="✦" label={t('onboarding.done.feature4')} />
            </GlassCard>

            <GoldButton
                label={t('onboarding.done.cta')}
                onPress={skipToApp}
                size="lg"
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
                    {step === 0 && stepWelcome}
                    {step === 1 && stepBirthProfile}
                    {step === 2 && stepDone}
                </Animated.View>
            </SafeAreaView>

            {/* City search modal */}
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

    // Content wrapper
    content: { flex: 1 },

    // ── Step 1: Welcome ──
    stepWelcome: {
        flex: 1,
        paddingHorizontal: spacing.xl,
        justifyContent: 'center',
        gap: spacing.xl,
    },
    orb: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: `${colors.primary}10`,
        alignSelf: 'center',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: `${colors.primary}30`,
    },
    orbGlyph: {
        fontSize: 48,
        color: colors.primary,
    },
    welcomeTitle: {
        fontFamily: fonts.display.bold,
        fontSize: 28,
        color: colors.onSurface,
        textAlign: 'center',
    },
    welcomeSubtitle: {
        fontFamily: fonts.body.regular,
        fontSize: 15,
        color: colors.onSurfaceMuted,
        textAlign: 'center',
        lineHeight: 22,
    },
    welcomeFeatures: {
        gap: spacing.md,
    },
    welcomeFeatureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        backgroundColor: `${colors.onSurface}06`,
        borderRadius: radius.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    welcomeFeatureIcon: {
        fontSize: 18,
        color: colors.primary,
        width: 24,
        textAlign: 'center',
    },
    welcomeFeatureText: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        color: colors.onSurface,
        flex: 1,
    },

    // ── Step 2: Birth profile ──
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

    // ── Step 3: Done ──
    stepDone: {
        flex: 1,
        paddingHorizontal: spacing.xl,
        justifyContent: 'center',
        gap: spacing.xl,
    },
    doneOrb: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: `${colors.primary}10`,
        alignSelf: 'center',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: `${colors.primary}30`,
    },
    doneGlyph: {
        fontSize: 38,
        color: colors.primary,
    },
    doneTitle: {
        fontFamily: fonts.display.bold,
        fontSize: 26,
        color: colors.onSurface,
        textAlign: 'center',
    },
    doneSubtitle: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        color: colors.onSurfaceMuted,
        textAlign: 'center',
        lineHeight: 20,
        marginTop: -spacing.md,
    },
    featuresCard: {
        padding: spacing.lg,
        gap: 0,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.sm,
    },
    featureDivider: {
        height: 1,
        backgroundColor: `${colors.onSurfaceMuted}12`,
        marginVertical: spacing.xs,
    },
    featureIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: `${colors.primary}15`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    featureIconText: { fontSize: 16 },
    featureLabel: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        color: colors.onSurface,
        flex: 1,
    },

});