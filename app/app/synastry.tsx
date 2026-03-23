/**
 * Synastry Screen - Premium Glassmorphism Design
 * Compatibility analysis input form
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Modal,
    Platform,
    Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import {
    Screen,
    GlassCard,
    GradientButton,
    AppInput,
    AppHeading,
    AppText,
    Spacer,
    LoadingState,
    InlineLoading,
    AppDatePicker,
    AppTimePicker,
    ZodiacCircle,
    ZodiacPair,
    ProgressBar,
    ScoreRow,
    getZodiacSign,
    CopyableText,
    CompatibilityShareButton,
} from '@/components/ui';
import { calculateSynastry, SynastryResponse } from '@/services/astrology';
import { searchCities, CitySearchResult, calculateTimezoneForBirthDate } from '@/services/birthProfile';
import { colors, spacing, radius, glow, gradients } from '@/theme';

// Score gradient based on value
function getScoreGradient(score: number): readonly string[] {
    if (score >= 80) return gradients.primary;
    if (score >= 60) return gradients.gold;
    if (score >= 40) return gradients.fire;
    return ['#EF4444', '#DC2626'];
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

    // Animation
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 8,
                useNativeDriver: true,
            }),
        ]).start();
    }, [result]);

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
        setTimezoneName(city.timezoneName);
        setShowCityModal(false);
        setCityQuery('');
        setCityResults([]);
    };

    async function handleAnalyze() {
        setError(undefined);

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
        fadeAnim.setValue(0);
        scaleAnim.setValue(0.9);
    }

    // Loading states
    if (isAuthLoading || !user?.hasBirthProfile) {
        return (
            <Screen backgroundColor={colors.surfaceLowest}>
                <LoadingState message="Chargement..." />
            </Screen>
        );
    }

    // Results view
    if (result) {
        const score = result.compatibilityScore ?? 0;
        const userName = result.user?.name || 'Vous';
        const partnerDisplayName = result.partner?.name || partnerName;
        const userSign = getZodiacSign(result.user?.chart?.planetaryPositions?.Sun?.Sign || 'aries');
        const partnerSign = getZodiacSign(result.partner?.positions?.Sun?.Sign || 'aries');
        const dimensions = result.details?.dimensions || {};

        return (
            <Screen variant="scroll" backgroundColor={colors.surfaceLowest}>
                <Animated.View
                    style={{
                        opacity: fadeAnim,
                        transform: [{ scale: scaleAnim }],
                    }}
                >
                    <Spacer size="lg" />

                    <AppHeading variant="h2" align="center" style={styles.title}>
                        Compatibilité
                    </AppHeading>

                    <Spacer size="xl" />

                    {/* Zodiac Pair */}
                    <View style={styles.zodiacSection}>
                        <ZodiacCircle sign={userSign} size="large" showName showGlow />
                        <View style={styles.heartContainer}>
                            <View style={styles.heartGlow} />
                            <AppText style={styles.heart}>❤️</AppText>
                        </View>
                        <ZodiacCircle sign={partnerSign} size="large" showName showGlow />
                    </View>

                    <Spacer size="sm" />

                    <View style={styles.namesRow}>
                        <AppText variant="bodyMedium" color="secondary">{userName}</AppText>
                        <AppText variant="bodyMedium" color="muted">&</AppText>
                        <AppText variant="bodyMedium" color="secondary">{partnerDisplayName}</AppText>
                    </View>

                    <Spacer size="2xl" />

                    {/* Main Score Card */}
                    <GlassCard variant="elevated" glowColor={glow.primary} padding="xl">
                        <View style={styles.scoreSection}>
                            <AppText variant="body" color="muted">Compatibilité</AppText>
                            <View style={styles.scoreRow}>
                                <AppHeading variant="display" style={styles.scoreValue}>
                                    {Math.round(score)}
                                </AppHeading>
                                <AppText variant="h3" color="muted">%</AppText>
                            </View>
                            <ProgressBar
                                value={score}
                                height={8}
                                gradientColors={getScoreGradient(score)}
                                style={styles.mainProgressBar}
                            />
                        </View>

                        {/* Dimensions */}
                        {Object.keys(dimensions).length > 0 && (
                            <>
                                <Spacer size="xl" />
                                <View style={styles.dimensionsSection}>
                                    {Object.entries(dimensions).map(([key, data]: [string, any]) => (
                                        <ScoreRow
                                            key={key}
                                            label={key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ')}
                                            value={data.score || 0}
                                        />
                                    ))}
                                </View>
                            </>
                        )}

                        <Spacer size="lg" />

                        <GradientButton
                            title="Nouvelle analyse"
                            onPress={handleNewAnalysis}
                            variant="primary"
                        />
                    </GlassCard>

                    <Spacer size="xl" />

                    {/* Share */}
                    {result.historyId && (
                        <View style={styles.shareSection}>
                            <CompatibilityShareButton
                                compatibilityId={result.historyId}
                                nameOne={userName}
                                nameTwo={partnerDisplayName}
                                score={score}
                                sunOne={result.user?.chart?.planetaryPositions?.Sun?.Sign}
                                sunTwo={result.partner?.positions?.Sun?.Sign}
                                summary={result.analysis?.slice(0, 200)}
                            />
                        </View>
                    )}

                    <Spacer size="xl" />

                    {/* Analysis */}
                    <GlassCard padding="lg">
                        <View style={styles.cardHeader}>
                            <AppText style={styles.cardIcon}>📖</AppText>
                            <AppText variant="label" color="accent">ANALYSE</AppText>
                        </View>
                        <Spacer size="md" />
                        <CopyableText text={result.analysis || ''}>
                            <AppText variant="body" color="secondary" style={styles.analysisText}>
                                {result.analysis}
                            </AppText>
                        </CopyableText>
                    </GlassCard>

                    <Spacer size="xl" />

                    <GradientButton
                        title="Voir les détails"
                        onPress={() => router.push(`/synastry-detail?id=${result.historyId}`)}
                        variant="outline"
                    />

                    <Spacer size="3xl" />
                </Animated.View>
            </Screen>
        );
    }

    // Form view
    return (
        <Screen variant="form" backgroundColor={colors.surfaceLowest}>
            <Spacer size="lg" />

            {/* Header */}
            <View style={styles.formHeader}>
                <AppText style={styles.headerIcon}>💫</AppText>
                <Spacer size="md" />
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
            <GlassCard variant="elevated" padding="xl">
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
            </GlassCard>

            <Spacer size="lg" />

            {/* Optional Question */}
            <GlassCard padding="lg">
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
            </GlassCard>

            {!!error && (
                <>
                    <Spacer size="lg" />
                    <GlassCard padding="md" style={styles.errorCard}>
                        <AppText variant="body" color="error" align="center">
                            {error}
                        </AppText>
                    </GlassCard>
                </>
            )}

            <Spacer size="2xl" />

            {/* Actions */}
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <InlineLoading />
                    <Spacer size="lg" />
                    <AppText variant="body" color="muted" align="center">
                        Analyse en cours...
                    </AppText>
                    <AppText variant="caption" color="muted" align="center">
                        Cela peut prendre quelques secondes
                    </AppText>
                </View>
            ) : (
                <>
                    <GradientButton
                        title="Analyser la compatibilité"
                        onPress={handleAnalyze}
                        variant="primary"
                        size="large"
                        icon={<AppText style={styles.buttonIcon}>✨</AppText>}
                    />
                    <Spacer size="md" />
                    <GradientButton
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
                            <InlineLoading />
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
    headerIcon: {
        fontSize: 48,
    },
    label: {
        marginBottom: spacing.sm,
    },
    citySelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.surface.glass,
        borderWidth: 1,
        borderColor: colors.surface.glassBorder,
        borderRadius: radius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        minHeight: 52,
    },
    citySelectorFilled: {
        borderColor: colors.brand.primary,
    },
    searchIcon: {
        fontSize: 16,
    },
    errorCard: {
        borderColor: colors.status.error,
        borderWidth: 1,
    },
    loadingContainer: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
    },
    buttonIcon: {
        fontSize: 18,
    },

    // Results styles
    title: {
        letterSpacing: 1,
    },
    zodiacSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    heartContainer: {
        marginHorizontal: spacing.lg,
        position: 'relative',
    },
    heartGlow: {
        position: 'absolute',
        top: -10,
        left: -10,
        right: -10,
        bottom: -10,
        borderRadius: 20,
        backgroundColor: glow.pink,
    },
    heart: {
        fontSize: 32,
    },
    namesRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: spacing.sm,
    },
    scoreSection: {
        alignItems: 'center',
    },
    scoreRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    scoreValue: {
        fontSize: 64,
        fontWeight: '700',
        color: colors.text.primary,
    },
    mainProgressBar: {
        width: '100%',
        marginTop: spacing.md,
    },
    dimensionsSection: {
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border.subtle,
    },
    shareSection: {
        paddingHorizontal: spacing.md,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    cardIcon: {
        fontSize: 18,
    },
    analysisText: {
        lineHeight: 24,
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
