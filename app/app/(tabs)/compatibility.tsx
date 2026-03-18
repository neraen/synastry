import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Modal,
    Platform,
    ActivityIndicator,
    ScrollView,
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
    CopyableText,
} from '@/components/ui';
import { calculateSynastry, SynastryResponse } from '@/services/astrology';
import { searchCities, CitySearchResult, calculateTimezoneForBirthDate } from '@/services/birthProfile';
import { colors, spacing, borderRadius, shadows } from '@/theme';
import { aiDisclaimerText } from '@/constants/legalTexts';

const BG = require('@/assets/images/interface/background-starry.png');

function getScoreColor(score: number): string {
    if (score >= 80) return colors.status.success;
    if (score >= 60) return colors.brand.primary;
    if (score >= 40) return colors.status.warning;
    return colors.status.error;
}

export default function CompatibilityTab() {
    const router = useRouter();
    const { isAuthenticated, user, isLoading: isAuthLoading } = useAuth();

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string>();
    const [result, setResult] = useState<SynastryResponse | null>(null);

    // Form state
    const [partnerName, setPartnerName] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [birthTime, setBirthTime] = useState('');
    const [birthCity, setBirthCity] = useState('');
    const [latitude, setLatitude] = useState<number | null>(null);
    const [longitude, setLongitude] = useState<number | null>(null);
    const [timezone, setTimezone] = useState<number | null>(null);
    const [timezoneName, setTimezoneName] = useState<string | null>(null);

    // City search
    const [cityQuery, setCityQuery] = useState('');
    const [cityResults, setCityResults] = useState<CitySearchResult[]>([]);
    const [showCityModal, setShowCityModal] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

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

    const handleSelectCity = (city: CitySearchResult) => {
        setBirthCity(city.name);
        setLatitude(city.latitude);
        setLongitude(city.longitude);
        setTimezone(city.timezone);
        setTimezoneName(city.timezoneName);
        setShowCityModal(false);
        setCityQuery('');
        setCityResults([]);
    };

    const resetForm = () => {
        setPartnerName('');
        setBirthDate('');
        setBirthTime('');
        setBirthCity('');
        setLatitude(null);
        setLongitude(null);
        setTimezone(null);
        setTimezoneName(null);
        setResult(null);
        setError(undefined);
    };

    async function handleSubmit() {
        setError(undefined);

        if (!partnerName.trim()) {
            setError('Le prénom est requis');
            return;
        }
        if (!birthDate) {
            setError('La date de naissance est requise');
            return;
        }
        if (!birthCity || latitude === null || longitude === null) {
            setError('Veuillez sélectionner une ville');
            return;
        }

        setIsLoading(true);

        try {
            let finalTimezone = timezone;
            if (timezoneName && birthDate) {
                finalTimezone = calculateTimezoneForBirthDate(timezoneName, birthDate);
            }

            const response = await calculateSynastry({
                partnerName: partnerName.trim(),
                birthDate,
                birthTime: birthTime || undefined,
                birthCity,
                latitude,
                longitude,
                timezone: finalTimezone || undefined,
            });

            if (response.success) {
                setResult(response);
            } else {
                setError(response.error || 'Erreur lors du calcul');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur inconnue');
        } finally {
            setIsLoading(false);
        }
    }

    if (isAuthLoading) {
        return (
            <Screen backgroundImage={BG}>
                <LoadingState message="Chargement..." />
            </Screen>
        );
    }

    if (!isAuthenticated) {
        return (
            <Screen backgroundImage={BG}>
                <View style={styles.centerContent}>
                    <AppText style={styles.bigEmoji}>💫</AppText>
                    <Spacer size="lg" />
                    <AppText variant="body" color="muted" align="center">
                        Connectez-vous pour analyser votre compatibilité
                    </AppText>
                    <Spacer size="lg" />
                    <AppButton
                        title="Se connecter"
                        onPress={() => router.push('/login')}
                        variant="primary"
                    />
                </View>
            </Screen>
        );
    }

    if (!user?.hasBirthProfile) {
        return (
            <Screen backgroundImage={BG}>
                <View style={styles.centerContent}>
                    <AppText style={styles.bigEmoji}>✨</AppText>
                    <Spacer size="lg" />
                    <AppText variant="body" color="muted" align="center">
                        Complétez votre profil astrologique pour commencer
                    </AppText>
                    <Spacer size="lg" />
                    <AppButton
                        title="Compléter mon profil"
                        onPress={() => router.push('/birth-profile')}
                        variant="primary"
                    />
                </View>
            </Screen>
        );
    }

    // Show result
    if (result) {
        const score = result.compatibilityScore || 0;
        return (
            <Screen variant="scroll" backgroundImage={BG}>
                <Spacer size="xl" />

                {/* Score */}
                <View style={styles.scoreSection}>
                    <View style={[styles.scoreCircle, { borderColor: getScoreColor(score) }]}>
                        <AppHeading variant="display" style={{ color: getScoreColor(score) }}>
                            {Math.round(score)}
                        </AppHeading>
                        <AppText variant="caption" color="muted">/ 100</AppText>
                    </View>
                    <Spacer size="md" />
                    <AppText variant="bodyMedium" color="accent">
                        Compatibilité avec {result.partner?.name}
                    </AppText>
                </View>

                <Spacer size="xl" />

                {/* Analysis */}
                <AppCard variant="elevated" style={styles.analysisCard}>
                    <CopyableText text={result.analysis || ''}>
                        <AppText variant="body" color="secondary" style={styles.analysisText}>
                            {result.analysis}
                        </AppText>
                    </CopyableText>
                </AppCard>

                <Spacer size="2xl" />

                <AppButton
                    title="Nouvelle analyse"
                    onPress={resetForm}
                    variant="primary"
                />

                <Spacer size="2xl" />

                {/* AI Disclaimer */}
                <View style={styles.disclaimerContainer}>
                    <AppText variant="caption" color="muted" align="center" style={styles.disclaimerText}>
                        {aiDisclaimerText}
                    </AppText>
                </View>

                <Spacer size="3xl" />
            </Screen>
        );
    }

    // Show form
    return (
        <Screen variant="scroll" backgroundImage={BG}>
            <Spacer size="xl" />

            {/* Header */}
            <View style={styles.header}>
                <AppText style={styles.headerIcon}>💕</AppText>
                <AppHeading variant="h1" align="center">
                    Compatibilité
                </AppHeading>
                <Spacer size="sm" />
                <AppText variant="body" color="muted" align="center">
                    Analysez votre compatibilité amoureuse
                </AppText>
            </View>

            <Spacer size="2xl" />

            {/* Form */}
            <AppCard variant="elevated" style={styles.formCard}>
                <AppInput
                    label="Prénom du partenaire"
                    placeholder="Ex: Marie"
                    value={partnerName}
                    onChangeText={setPartnerName}
                    disabled={isLoading}
                />

                <Spacer size="lg" />

                <AppDatePicker
                    label="Date de naissance"
                    value={birthDate}
                    onChange={setBirthDate}
                    disabled={isLoading}
                    maximumDate={new Date()}
                />

                <Spacer size="lg" />

                <AppTimePicker
                    label="Heure de naissance"
                    value={birthTime}
                    onChange={setBirthTime}
                    disabled={isLoading}
                    hint="Optionnel"
                />

                <Spacer size="lg" />

                <View>
                    <AppText variant="label" color="secondary" style={styles.label}>
                        Lieu de naissance
                    </AppText>
                    <TouchableOpacity
                        style={[styles.citySelector, birthCity && styles.citySelectorFilled]}
                        onPress={() => setShowCityModal(true)}
                        disabled={isLoading}
                    >
                        <AppText variant="input" color={birthCity ? 'primary' : 'muted'}>
                            {birthCity || 'Rechercher une ville...'}
                        </AppText>
                        <AppText style={styles.searchIcon}>🔍</AppText>
                    </TouchableOpacity>
                </View>
            </AppCard>

            {error && (
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

            <AppButton
                title="Analyser la compatibilité"
                onPress={handleSubmit}
                variant="primary"
                loading={isLoading}
            />

            <Spacer size="3xl" />

            {/* City Modal */}
            <Modal
                visible={showCityModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowCityModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <AppHeading variant="h2">Rechercher une ville</AppHeading>
                        <TouchableOpacity onPress={() => setShowCityModal(false)}>
                            <AppText variant="bodyMedium" color="accent">Fermer</AppText>
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
                        keyExtractor={(item, index) => `${item.name}-${index}`}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.cityItem}
                                onPress={() => handleSelectCity(item)}
                            >
                                <View>
                                    <AppText variant="bodyMedium">{item.name}</AppText>
                                    <AppText variant="caption" color="muted">{item.country}</AppText>
                                </View>
                                <AppText style={styles.cityArrow}>→</AppText>
                            </TouchableOpacity>
                        )}
                        style={styles.cityList}
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
        fontSize: 44,
        lineHeight: 56,
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
    },
    bigEmoji: {
        fontSize: 64,
        lineHeight: 80,
        textAlign: 'center',
    },
    formCard: {
        padding: spacing.xl,
    },
    label: {
        marginBottom: spacing.sm,
    },
    citySelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.input.background,
        borderWidth: 1,
        borderColor: colors.input.border,
        borderRadius: borderRadius.input,
        minHeight: 52,
        paddingHorizontal: spacing.inputPadding,
    },
    citySelectorFilled: {
        borderColor: colors.border.focus,
    },
    searchIcon: {
        fontSize: 18,
        lineHeight: 24,
    },
    errorCard: {
        borderColor: colors.status.error,
        padding: spacing.lg,
    },
    scoreSection: {
        alignItems: 'center',
    },
    scoreCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 4,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface.elevated,
    },
    analysisCard: {
        padding: spacing.xl,
    },
    analysisText: {
        lineHeight: 26,
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
    cityArrow: {
        color: colors.brand.primary,
        fontSize: 20,
        lineHeight: 24,
    },
    disclaimerContainer: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: colors.surface.default,
        borderRadius: borderRadius.card,
    },
    disclaimerText: {
        fontStyle: 'italic',
        lineHeight: 18,
    },
});
