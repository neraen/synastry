import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Modal,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
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
} from '@/components/ui';
import {
    BirthProfile,
    getBirthProfile,
    saveBirthProfile,
    searchCities,
    CitySearchResult,
} from '@/services/birthProfile';
import { colors, spacing, borderRadius, shadows } from '@/theme';

const BG = require('@/assets/images/interface/background-starry.png');

export default function BirthProfileScreen() {
    const router = useRouter();
    const { isAuthenticated, refreshUser } = useAuth();

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

    // City search
    const [cityQuery, setCityQuery] = useState('');
    const [cityResults, setCityResults] = useState<CitySearchResult[]>([]);
    const [showCityModal, setShowCityModal] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

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

    // Search cities with debounce
    const handleCitySearch = useCallback(async (query: string) => {
        setCityQuery(query);
        if (query.length < 2) {
            setCityResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const results = await searchCities(query);
            setCityResults(results);
        } catch {
            setCityResults([]);
        } finally {
            setIsSearching(false);
        }
    }, []);

    // Select a city
    const handleSelectCity = (city: CitySearchResult) => {
        setBirthCity(city.name);
        setBirthCountry(city.country);
        setLatitude(city.latitude);
        setLongitude(city.longitude);
        setTimezone(city.timezone);
        setTimezoneName(city.timezoneName); // Store timezone name for accurate calculation
        setShowCityModal(false);
        setCityQuery('');
        setCityResults([]);
    };

    // Save profile
    async function handleSave() {
        setError(undefined);

        // Validation
        if (!birthDate) {
            setError('La date de naissance est requise');
            return;
        }

        if (!birthCity || latitude === null || longitude === null) {
            setError('Veuillez sélectionner une ville de naissance');
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
            const message = err instanceof Error ? err.message : 'Erreur lors de la sauvegarde';
            setError(message);
        } finally {
            setIsSaving(false);
        }
    }

    if (isLoading) {
        return (
            <Screen backgroundImage={BG}>
                <LoadingState message="Chargement du profil..." />
            </Screen>
        );
    }

    return (
        <Screen variant="form" backgroundImage={BG}>
            <Spacer size="xl" />

            {/* Header */}
            <View style={styles.header}>
                <AppText style={styles.headerIcon}>✨</AppText>
                <AppHeading variant="h1" align="center">
                    Mon profil astrologique
                </AppHeading>
                <Spacer size="sm" />
                <AppText variant="body" color="muted" align="center">
                    Ces informations permettent de calculer votre thème natal avec précision
                </AppText>
            </View>

            <Spacer size="2xl" />

            {/* Form Card */}
            <AppCard variant="elevated" style={styles.formCard}>
                <AppInput
                    label="Prénom"
                    placeholder="Votre prénom"
                    value={firstName}
                    onChangeText={setFirstName}
                    disabled={isSaving}
                    hint="Optionnel - utilisé dans les analyses"
                />

                <Spacer size="lg" />

                <AppDatePicker
                    label="Date de naissance"
                    value={birthDate}
                    onChange={setBirthDate}
                    disabled={isSaving}
                    maximumDate={new Date()}
                    placeholder="Sélectionner une date"
                />

                <Spacer size="lg" />

                <AppTimePicker
                    label="Heure de naissance"
                    value={birthTime}
                    onChange={setBirthTime}
                    disabled={isSaving}
                    hint="Optionnel - plus précis si connu"
                    placeholder="Sélectionner l'heure"
                />

                <Spacer size="lg" />

                <View>
                    <AppText variant="label" color="secondary" style={styles.label}>
                        Lieu de naissance
                    </AppText>
                    <TouchableOpacity
                        style={[
                            styles.citySelector,
                            birthCity && styles.citySelectorFilled,
                        ]}
                        onPress={() => setShowCityModal(true)}
                        disabled={isSaving}
                    >
                        <View style={styles.citySelectorContent}>
                            <AppText
                                variant="input"
                                color={birthCity ? 'primary' : 'muted'}
                            >
                                {birthCity
                                    ? `${birthCity}${birthCountry ? `, ${birthCountry}` : ''}`
                                    : 'Rechercher une ville...'}
                            </AppText>
                            <AppText style={styles.searchIcon}>🔍</AppText>
                        </View>
                    </TouchableOpacity>
                </View>

                {latitude !== null && longitude !== null && (
                    <View style={styles.coordinatesContainer}>
                        <View style={styles.coordinatesBadge}>
                            <AppText variant="caption" color="muted">
                                📍 {latitude.toFixed(4)}, {longitude.toFixed(4)}
                            </AppText>
                        </View>
                    </View>
                )}
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
                title="Enregistrer"
                onPress={handleSave}
                variant="primary"
                loading={isSaving}
            />
            <Spacer size="md" />
            <AppButton
                title="Annuler"
                onPress={() => router.back()}
                variant="ghost"
                disabled={isSaving}
            />

            <Spacer size="3xl" />

            {/* City Search Modal */}
            <Modal
                visible={showCityModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowCityModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <AppHeading variant="h2">Rechercher une ville</AppHeading>
                        <TouchableOpacity
                            onPress={() => setShowCityModal(false)}
                            style={styles.closeButton}
                        >
                            <AppText variant="bodyMedium" color="accent">
                                Fermer
                            </AppText>
                        </TouchableOpacity>
                    </View>

                    <AppInput
                        placeholder="Tapez le nom de la ville..."
                        value={cityQuery}
                        onChangeText={handleCitySearch}
                        autoFocus
                    />

                    {isSearching && (
                        <View style={styles.searchingIndicator}>
                            <ActivityIndicator color={colors.brand.primary} />
                        </View>
                    )}

                    <FlatList
                        data={cityResults}
                        keyExtractor={(item, index) => `${item.name}-${item.latitude}-${index}`}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.cityItem}
                                onPress={() => handleSelectCity(item)}
                            >
                                <View style={styles.cityItemContent}>
                                    <AppText variant="bodyMedium">{item.name}</AppText>
                                    <AppText variant="caption" color="muted">
                                        {item.country}
                                    </AppText>
                                </View>
                                <AppText style={styles.cityArrow}>→</AppText>
                            </TouchableOpacity>
                        )}
                        style={styles.cityList}
                        ListEmptyComponent={
                            cityQuery.length >= 2 && !isSearching ? (
                                <View style={styles.emptyResults}>
                                    <AppText variant="body" color="muted" align="center">
                                        Aucun résultat
                                    </AppText>
                                    <Spacer size="sm" />
                                    <AppText variant="caption" color="muted" align="center">
                                        Essayez un autre nom de ville
                                    </AppText>
                                </View>
                            ) : null
                        }
                    />
                </View>
            </Modal>
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
    citySelector: {
        backgroundColor: colors.input.background,
        borderWidth: 1,
        borderColor: colors.input.border,
        borderRadius: borderRadius.input,
        minHeight: 52,
        justifyContent: 'center',
    },
    citySelectorFilled: {
        borderColor: colors.border.focus,
    },
    citySelectorContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.inputPadding,
        paddingVertical: spacing.inputPadding,
    },
    searchIcon: {
        fontSize: 16,
    },
    coordinatesContainer: {
        marginTop: spacing.sm,
        alignItems: 'flex-start',
    },
    coordinatesBadge: {
        backgroundColor: colors.surface.elevated,
        borderRadius: borderRadius.tag,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs,
    },
    errorCard: {
        borderColor: colors.status.error,
        padding: spacing.lg,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: colors.background.primary,
        paddingHorizontal: spacing.screenPadding,
        paddingTop: Platform.OS === 'ios' ? 60 : spacing['2xl'],
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    closeButton: {
        padding: spacing.sm,
    },
    searchingIndicator: {
        paddingVertical: spacing.xl,
        alignItems: 'center',
    },
    cityList: {
        marginTop: spacing.lg,
    },
    cityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.subtle,
    },
    cityItemContent: {
        flex: 1,
    },
    cityArrow: {
        color: colors.brand.primary,
        fontSize: 18,
        marginLeft: spacing.md,
    },
    emptyResults: {
        marginTop: spacing['3xl'],
        alignItems: 'center',
    },
});
