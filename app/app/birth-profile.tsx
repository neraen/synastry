import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import {
    Screen,
    AppInput,
    AppButton,
    AppHeading,
    AppText,
    AppCard,
    Spacer,
    LoadingState,
    AppDatePicker,
    AppTimePicker,
    CityAutocomplete,
} from '@/components/ui';
import {
    BirthProfile,
    getBirthProfile,
    saveBirthProfile,
    CitySearchResult,
} from '@/services/birthProfile';
import { colors, spacing } from '@/theme';


export default function BirthProfileScreen() {
    const router = useRouter();
    const { t } = useTranslation();
    const { isAuthenticated, refreshUser } = useAuth();

    const scrollRef = useRef<ScrollView>(null);
    const scrollYRef = useRef(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string>();

    // Form state
    const [firstName, setFirstName] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [birthTime, setBirthTime] = useState('');
    const [birthCity, setBirthCity] = useState('');
    const [birthCountry, setBirthCountry] = useState('');
    const [latitude, setLatitude] = useState<number | null>(null);
    const [longitude, setLongitude] = useState<number | null>(null);
    const [timezone, setTimezone] = useState<number | null>(null);
    const [timezoneName, setTimezoneName] = useState<string | null>(null); // IANA timezone name


    // Redirect if not authenticated
    useEffect(() => {
        if (!isAuthenticated) {
            router.replace('/login');
        }
    }, [isAuthenticated, router]);

    // Load existing profile
    useEffect(() => {
        async function loadProfile() {
            try {
                const response = await getBirthProfile();
                if (response.hasProfile && response.profile) {
                    const p = response.profile;
                    setFirstName(p.firstName || '');
                    setBirthDate(p.birthDate || '');
                    setBirthTime(p.birthTime || '');
                    setBirthCity(p.birthCity || '');
                    setBirthCountry(p.birthCountry || '');
                    setLatitude(p.latitude);
                    setLongitude(p.longitude);
                    setTimezone(p.timezone || null);
                    setTimezoneName(p.timezoneName || null);
                }
            } catch (err) {
                console.error('Error loading profile:', err);
            } finally {
                setIsLoading(false);
            }
        }

        if (isAuthenticated) {
            loadProfile();
        }
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

    // Save profile
    async function handleSave() {
        setError(undefined);

        // Validation
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
            // Send timezoneName to backend - it will calculate the correct offset
            // for the birth date (handles DST correctly)
            await saveBirthProfile({
                firstName: firstName || undefined,
                birthDate,
                birthTime: birthTime || undefined,
                birthCity,
                birthCountry: birthCountry || undefined,
                latitude,
                longitude,
                timezone: timezone || undefined,
                timezoneName: timezoneName || undefined,
            });

            // Refresh user data to update hasBirthProfile flag
            await refreshUser();

            router.back();
        } catch (err) {
            const message = err instanceof Error ? err.message : t('birthProfile.saveError');
            setError(message);
        } finally {
            setIsSaving(false);
        }
    }

    if (isLoading) {
        return (
            <Screen backgroundColor={colors.surfaceLowest}>
                <LoadingState message={t('birthProfile.loadingProfile')} />
            </Screen>
        );
    }

    return (
        <Screen variant="form" backgroundColor={colors.surfaceLowest} scrollRef={scrollRef} scrollYRef={scrollYRef}>
            <Spacer size="xl" />

            {/* Header */}
            <View style={styles.header}>
                <AppText style={styles.headerIcon}>✨</AppText>
                <AppHeading variant="h1" align="center">
                    {t('birthProfile.screenTitle')}
                </AppHeading>
                <Spacer size="sm" />
                <AppText variant="body" color="muted" align="center">
                    {t('birthProfile.screenSubtitle')}
                </AppText>
            </View>

            <Spacer size="2xl" />

            {/* Form Card */}
            <AppCard variant="elevated" style={styles.formCard}>
                <AppInput
                    label={t('birthProfile.firstName')}
                    placeholder={t('birthProfile.firstNamePlaceholder')}
                    value={firstName}
                    onChangeText={setFirstName}
                    disabled={isSaving}
                    hint={t('birthProfile.firstNameHint')}
                />

                <Spacer size="lg" />

                <AppDatePicker
                    label={t('birthProfile.birthDate')}
                    value={birthDate}
                    onChange={setBirthDate}
                    disabled={isSaving}
                    maximumDate={new Date()}
                    placeholder={t('birthProfile.birthDatePlaceholder')}
                />

                <Spacer size="lg" />

                <AppTimePicker
                    label={t('birthProfile.birthTime')}
                    value={birthTime}
                    onChange={setBirthTime}
                    disabled={isSaving}
                    hint={t('birthProfile.birthTimeHint')}
                    placeholder={t('birthProfile.birthTimePlaceholder')}
                />

                <Spacer size="lg" />

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
            </AppCard>

            {!!error && (
                <>
                    <Spacer size="lg" />
                    <AppCard variant="outline" style={styles.errorCard}>
                        <AppText variant="body" color="error" align="center">
                            {error}
                        </AppText>
                    </AppCard>
                </>
            )}

            <Spacer size="2xl" />

            {/* Actions */}
            <AppButton
                title={t('birthProfile.saveBtn')}
                onPress={handleSave}
                variant="primary"
                loading={isSaving}
            />
            <Spacer size="md" />
            <AppButton
                title={t('birthProfile.cancelBtn')}
                onPress={() => router.back()}
                variant="ghost"
                disabled={isSaving}
            />

            <Spacer size="3xl" />

        </Screen>
    );
}

const styles = StyleSheet.create({
    header: {
        alignItems: 'center',
    },
    headerIcon: {
        fontSize: 40,
        marginBottom: spacing.md,
    },
    formCard: {
        padding: spacing.xl,
    },
    label: {
        marginBottom: spacing.sm,
    },
    errorCard: {
        borderColor: colors.status.error,
        padding: spacing.lg,
    },
});