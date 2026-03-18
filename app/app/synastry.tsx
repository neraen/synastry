import React, { useState, useCallback, useEffect } from 'react';
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
    ScoreText,
    LoadingState,
    AppDatePicker,
    AppTimePicker,
    CopyableText,
    CompatibilityShareButton,
} from '@/components/ui';
import { calculateSynastry, SynastryResponse } from '@/services/astrology';
import { searchCities, CitySearchResult, calculateTimezoneForBirthDate } from '@/services/birthProfile';
import { colors, spacing, borderRadius, shadows } from '@/theme';

const BG = require('@/assets/images/interface/background-starry.png');

// Score color based on value
function getScoreColor(score: number): string {
    if (score >= 80) return colors.status.success;
    if (score >= 60) return colors.brand.primary;
    if (score >= 40) return colors.status.warning;
    return colors.status.error;
}

export default function SynastryScreen() {
    const router = useRouter();
    const { isAuthenticated, user, isLoading: isAuthLoading } = useAuth();

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string>();
    const [result, setResult] = useState<SynastryResponse | null>(null);

    // Partner form
    const [partnerName, setPartnerName] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [birthTime, setBirthTime] = useState('');
    const [birthCity, setBirthCity] = useState('');
    const [latitude, setLatitude] = useState<number | null>(null);
    const [longitude, setLongitude] = useState<number | null>(null);
    const [timezone, setTimezone] = useState<number | null>(null);
    const [timezoneName, setTimezoneName] = useState<string | null>(null);
    const [question, setQuestion] = useState('');

    // City search
    const [cityQuery, setCityQuery] = useState('');
    const [cityResults, setCityResults] = useState<CitySearchResult[]>([]);
    const [showCityModal, setShowCityModal] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    // Redirect if not authenticated or no birth profile
    useEffect(() => {
        if (isAuthLoading) return;

        if (!isAuthenticated) {
            router.replace('/login');
        } else if (user && !user.hasBirthProfile) {
            router.replace('/birth-profile');
        }
    }, [isAuthenticated, user, isAuthLoading, router]);

    // Search cities
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
        setBirthCity(`${city.name}, ${city.country}`);
        setLatitude(city.latitude);
        setLongitude(city.longitude);
        setTimezone(city.timezone);
        setTimezoneName(city.timezoneName); // Store for accurate calculation
        setShowCityModal(false);
        setCityQuery('');
        setCityResults([]);
    };

    async function handleAnalyze() {
        setError(undefined);

        // Validation
        if (!partnerName.trim()) {
            setError('Le prénom du partenaire est requis');
            return;
        }

        if (!birthDate) {
            setError('La date de naissance est requise');
            return;
        }

        if (!birthCity || latitude === null || longitude === null) {
            setError('Veuillez sélectionner une ville de naissance');
            return;
        }

        setIsLoading(true);

        try {
            // Recalculate timezone for the partner's birth date (summer/winter time)
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
                question: question.trim() || undefined,
            });

            if (response.success) {
                setResult(response);
            } else {
                setError(response.error || "Erreur lors de l'analyse");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur inconnue');
        } finally {
            setIsLoading(false);
        }
    }

    function handleNewAnalysis() {
        setResult(null);
        setPartnerName('');
        setBirthDate('');
        setBirthTime('');
        setBirthCity('');
        setLatitude(null);
        setLongitude(null);
        setTimezone(null);
        setTimezoneName(null);
        setQuestion('');
    }

    // Show loading while auth is loading
    if (isAuthLoading) {
        return (
            <Screen backgroundImage={BG}>
                <LoadingState message="Chargement..." />
            </Screen>
        );
    }

    // Don't render if user doesn't have birth profile (will redirect)
    if (!user?.hasBirthProfile) {
        return (
            <Screen backgroundImage={BG}>
                <LoadingState message="Redirection..." />
            </Screen>
        );
    }

    // Results view
    if (result) {
        const score = result.compatibilityScore;
        const userName = result.user?.name || 'Vous';
        const partnerDisplayName = result.partner?.name || partnerName;

        return (
            <Screen variant="scroll" backgroundImage={BG}>
                <Spacer size="xl" />

                {/* Header */}
                <View style={styles.resultsHeader}>
                    <AppHeading variant="h2" align="center">
                        Compatibilité Astrologique
                    </AppHeading>
                </View>

                <Spacer size="xl" />

                {/* Couple Names with Heart */}
                <View style={styles.coupleContainer}>
                    <View style={styles.personBadge}>
                        <AppText variant="bodyMedium" color="primary">
                            {userName}
                        </AppText>
                    </View>
                    <View style={styles.heartContainer}>
                        <AppText style={styles.heartEmoji}>💕</AppText>
                    </View>
                    <View style={styles.personBadge}>
                        <AppText variant="bodyMedium" color="primary">
                            {partnerDisplayName}
                        </AppText>
                    </View>
                </View>

                {/* Score Display */}
                {score !== undefined && score !== null && (
                    <>
                        <Spacer size="2xl" />
                        <View style={styles.scoreContainer}>
                            <View style={[styles.scoreCircle, { borderColor: getScoreColor(score) }]}>
                                <ScoreText style={{ color: getScoreColor(score) }}>
                                    {score}
                                </ScoreText>
                                <AppText variant="caption" color="muted">
                                    sur 100
                                </AppText>
                            </View>
                            <Spacer size="md" />
                            <AppHeading variant="titleSmall" color="accent" align="center">
                                {score >= 80 ? 'Excellente compatibilite !' :
                                 score >= 60 ? 'Bonne compatibilite' :
                                 score >= 40 ? 'Compatibilite moyenne' :
                                 'Defis a relever'}
                            </AppHeading>
                        </View>

                        {/* Share Button */}
                        {result.historyId && (
                            <>
                                <Spacer size="lg" />
                                <View style={styles.shareButtonContainer}>
                                    <CompatibilityShareButton
                                        compatibilityId={result.historyId}
                                        nameOne={userName}
                                        nameTwo={partnerDisplayName}
                                        score={score}
                                        sunOne={result.user?.chart?.planetaryPositions?.Sun?.Sign}
                                        sunTwo={result.partner?.positions?.Sun?.Sign}
                                        moonOne={result.user?.chart?.planetaryPositions?.Moon?.Sign}
                                        moonTwo={result.partner?.positions?.Moon?.Sign}
                                        summary={result.analysis?.slice(0, 200)}
                                    />
                                </View>
                            </>
                        )}
                    </>
                )}

                <Spacer size="2xl" />

                {/* Section Divider */}
                <View style={styles.sectionHeader}>
                    <View style={styles.sectionLine} />
                    <AppText variant="label" color="accent" style={styles.sectionTitle}>
                        ANALYSE DÉTAILLÉE
                    </AppText>
                    <View style={styles.sectionLine} />
                </View>

                <Spacer size="lg" />

                {/* Analysis Card */}
                <AppCard variant="elevated" style={styles.analysisCard}>
                    <CopyableText text={result.analysis || ''} style={styles.analysisText}>
                        <AppText variant="body" color="secondary" style={styles.analysisText}>
                            {result.analysis}
                        </AppText>
                    </CopyableText>
                </AppCard>

                <Spacer size="2xl" />

                {/* Actions */}
                <AppButton
                    title="Nouvelle analyse"
                    onPress={handleNewAnalysis}
                    variant="primary"
                />
                <Spacer size="md" />
                <AppButton
                    title="Retour à l'accueil"
                    onPress={() => router.replace('/(tabs)')}
                    variant="outline"
                />

                <Spacer size="3xl" />
            </Screen>
        );
    }

    // Form view
    return (
        <Screen variant="form" backgroundImage={BG}>
            <Spacer size="xl" />

            {/* Header */}
            <View style={styles.formHeader}>
                <AppHeading variant="h1" align="center">
                    Analyse de compatibilité
                </AppHeading>
                <Spacer size="sm" />
                <AppText variant="body" color="muted" align="center">
                    Entrez les informations de naissance de votre partenaire
                </AppText>
            </View>

            <Spacer size="2xl" />

            {/* Form Card */}
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
                    placeholder="Sélectionner une date"
                />

                <Spacer size="lg" />

                <AppTimePicker
                    label="Heure de naissance (optionnel)"
                    value={birthTime}
                    onChange={setBirthTime}
                    disabled={isLoading}
                    hint="Si inconnue, laissez vide"
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
                        disabled={isLoading}
                    >
                        <AppText
                            variant="input"
                            color={birthCity ? 'primary' : 'muted'}
                        >
                            {birthCity || 'Rechercher une ville...'}
                        </AppText>
                        <AppText style={styles.searchIcon}>🔍</AppText>
                    </TouchableOpacity>
                </View>
            </AppCard>

            <Spacer size="xl" />

            {/* Optional Question */}
            <AppCard variant="outline" style={styles.optionalCard}>
                <AppText variant="label" color="accent">
                    Question spécifique (optionnel)
                </AppText>
                <Spacer size="sm" />
                <AppInput
                    placeholder="Ex: Sommes-nous faits pour durer ?"
                    value={question}
                    onChangeText={setQuestion}
                    disabled={isLoading}
                    multiline
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
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.brand.primary} />
                    <Spacer size="lg" />
                    <AppText variant="body" color="muted" align="center">
                        Analyse en cours...
                    </AppText>
                    <Spacer size="xs" />
                    <AppText variant="caption" color="muted" align="center">
                        Cela peut prendre quelques secondes
                    </AppText>
                </View>
            ) : (
                <>
                    <AppButton
                        title="Analyser la compatibilité"
                        onPress={handleAnalyze}
                        variant="primary"
                    />
                    <Spacer size="md" />
                    <AppButton
                        title="Retour"
                        onPress={() => router.back()}
                        variant="ghost"
                    />
                </>
            )}

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
    // Form styles
    formHeader: {
        alignItems: 'center',
    },
    formCard: {
        padding: spacing.xl,
    },
    optionalCard: {
        padding: spacing.lg,
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
        paddingHorizontal: spacing.inputPadding,
        paddingVertical: spacing.inputPadding,
        minHeight: 52,
    },
    citySelectorFilled: {
        borderColor: colors.border.focus,
    },
    searchIcon: {
        fontSize: 16,
    },
    errorCard: {
        borderColor: colors.status.error,
        padding: spacing.lg,
    },
    loadingContainer: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
    },

    // Results styles
    resultsHeader: {
        alignItems: 'center',
    },
    coupleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.md,
    },
    personBadge: {
        backgroundColor: colors.surface.elevated,
        borderRadius: borderRadius.badge,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        ...shadows.sm,
    },
    heartContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    heartEmoji: {
        fontSize: 28,
    },
    scoreContainer: {
        alignItems: 'center',
    },
    scoreCircle: {
        width: 140,
        height: 140,
        borderRadius: 70,
        borderWidth: 4,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface.default,
        ...shadows.md,
    },
    shareButtonContainer: {
        paddingHorizontal: spacing.xl,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionLine: {
        flex: 1,
        height: 1,
        backgroundColor: colors.border.subtle,
    },
    sectionTitle: {
        paddingHorizontal: spacing.lg,
        letterSpacing: 1.5,
    },
    analysisCard: {
        padding: spacing.xl,
    },
    analysisText: {
        lineHeight: 26,
    },

    // Modal styles
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
