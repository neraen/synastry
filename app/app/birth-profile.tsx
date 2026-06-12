import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    ScrollView,
    Platform,
    KeyboardAvoidingView,
    ActivityIndicator,
    Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import {
    GlassCard,
    GoldButton,
    GhostButton,
    AppDatePicker,
    AppTimePicker,
    CityAutocomplete,
    AvatarGenderPicker,
    Starfield,
} from '@/components/ui';
import { Gender } from '@/utils/signAvatar';
import {
    getBirthProfile,
    saveBirthProfile,
    CitySearchResult,
} from '@/services/birthProfile';
import { colors, spacing, radius, fonts } from '@/theme';

// ─── Field ────────────────────────────────────────────────────────────────────

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
                <TextInput
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

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function BirthProfileScreen() {
    const router = useRouter();
    const { t } = useTranslation();
    const { isAuthenticated, refreshUser } = useAuth();

    const scrollRef = useRef<ScrollView>(null);
    const scrollYRef = useRef(0);

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | undefined>();

    const [firstName, setFirstName] = useState('');
    const [gender, setGender] = useState<Gender | null>(null);
    const [birthDate, setBirthDate] = useState('');
    const [birthTime, setBirthTime] = useState('');
    const [birthCity, setBirthCity] = useState('');
    const [birthCountry, setBirthCountry] = useState('');
    const [latitude, setLatitude] = useState<number | null>(null);
    const [longitude, setLongitude] = useState<number | null>(null);
    const [timezone, setTimezone] = useState<number | null>(null);
    const [timezoneName, setTimezoneName] = useState<string | null>(null);

    useEffect(() => {
        if (!isAuthenticated) {
            router.replace('/login');
        }
    }, [isAuthenticated, router]);

    useEffect(() => {
        if (!isAuthenticated) return;
        getBirthProfile()
            .then(response => {
                if (response.hasProfile && response.profile) {
                    const p = response.profile;
                    setFirstName(p.firstName || '');
                    setGender(p.gender ?? null);
                    setBirthDate(p.birthDate || '');
                    setBirthTime(p.birthTime || '');
                    setBirthCity(p.birthCity || '');
                    setBirthCountry(p.birthCountry || '');
                    setLatitude(p.latitude);
                    setLongitude(p.longitude);
                    setTimezone(p.timezone || null);
                    setTimezoneName(p.timezoneName || null);
                }
            })
            .catch(err => console.error('Error loading profile:', err))
            .finally(() => setIsLoading(false));
    }, [isAuthenticated]);

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

    const handleSave = useCallback(async () => {
        setError(undefined);

        if (!birthDate) {
            setError(t('birthProfile.birthDateRequired'));
            return;
        }
        if (!gender) {
            setError(t('birthProfile.avatarRequired'));
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
                gender,
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
            router.back();
        } catch (err) {
            setError(err instanceof Error ? err.message : t('birthProfile.saveError'));
        } finally {
            setIsSaving(false);
        }
    }, [birthDate, birthCity, latitude, longitude, firstName, gender, birthTime, birthCountry, timezone, timezoneName, refreshUser, router, t]);

    if (isLoading) {
        return (
            <View style={styles.root}>
                <LinearGradient
                    colors={[colors.surfaceLowest, '#1e0f3a', colors.surfaceLowest]}
                    locations={[0, 0.5, 1]}
                    style={StyleSheet.absoluteFill}
                />
                <SafeAreaView style={styles.safe}>
                    <View style={styles.loadingWrap}>
                        <ActivityIndicator color={colors.primary} size="large" />
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    return (
        <View style={styles.root}>
            <LinearGradient
                colors={[colors.surfaceLowest, '#1e0f3a', colors.surfaceLowest]}
                locations={[0, 0.5, 1]}
                style={StyleSheet.absoluteFill}
            />
            <Starfield />

            <SafeAreaView style={styles.safe}>
                {/* Back button */}
                <View style={styles.headerRow}>
                    <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
                        <Feather name="arrow-left" size={20} color={colors.onSurface} />
                    </Pressable>
                </View>

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <ScrollView
                        ref={scrollRef}
                        contentContainerStyle={styles.scroll}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        onScroll={(e) => { scrollYRef.current = e.nativeEvent.contentOffset.y; }}
                        scrollEventThrottle={16}
                    >
                        <Text style={styles.title}>{t('birthProfile.screenTitle')}</Text>
                        <Text style={styles.subtitle}>{t('birthProfile.screenSubtitle')}</Text>

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

                            {!!birthDate && (
                                <>
                                    <View style={styles.fieldGap} />
                                    <AvatarGenderPicker
                                        birthDate={birthDate}
                                        value={gender}
                                        onChange={setGender}
                                        label={t('birthProfile.avatarLabel')}
                                        disabled={isSaving}
                                    />
                                </>
                            )}

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
                                label={isSaving ? t('common.loading') : t('birthProfile.saveBtn')}
                                onPress={handleSave}
                                loading={isSaving}
                            />
                            <GhostButton
                                label={t('birthProfile.cancelBtn')}
                                onPress={() => router.back()}
                                disabled={isSaving}
                            />
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.surfaceLowest },
    safe: { flex: 1 },
    loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    headerRow: {
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.md,
        paddingBottom: spacing.sm,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: radius.full,
        backgroundColor: `${colors.onSurface}0a`,
        alignItems: 'center',
        justifyContent: 'center',
    },

    scroll: {
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.lg,
        paddingBottom: spacing.xxxl,
        gap: spacing.xl,
    },
    title: {
        fontFamily: fonts.display.bold,
        fontSize: 24,
        color: colors.onSurface,
    },
    subtitle: {
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
});
