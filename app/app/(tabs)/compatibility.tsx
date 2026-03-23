import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Modal,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, LinearGradient as SvgGrad, Stop } from 'react-native-svg';
import { useAuth } from '@/contexts/AuthContext';
import {
    GlassCard,
    GoldButton,
    GhostButton,
    AppInput,
    AppDatePicker,
    AppTimePicker,
    CopyableText,
    TabHeader,
    FormattedText,
} from '@/components/ui';
import { calculateSynastry, SynastryResponse } from '@/services/astrology';
import { searchCities, CitySearchResult, calculateTimezoneForBirthDate } from '@/services/birthProfile';
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

// ─── Mini SVG ring ─────────────────────────────────────────────────────────────
function MiniRing({ percentage, id }: { percentage: number; id: string }) {
    const size = 64; const sw = 4;
    const r = (size - sw) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (percentage / 100) * circ;
    return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={size} height={size} style={{ position: 'absolute' }}>
                <Circle cx={size/2} cy={size/2} r={r} fill="none" stroke={colors.surfaceContainerHigh} strokeWidth={sw} />
            </Svg>
            <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
                <Defs>
                    <SvgGrad id={`g-${id}`} x1="0" y1="0" x2="1" y2="0">
                        <Stop offset="0" stopColor={colors.primary} />
                        <Stop offset="1" stopColor={colors.primaryContainer} />
                    </SvgGrad>
                </Defs>
                <Circle cx={size/2} cy={size/2} r={r} fill="none" stroke={`url(#g-${id})`}
                    strokeWidth={sw} strokeLinecap="round"
                    strokeDasharray={circ} strokeDashoffset={offset} />
            </Svg>
            <Text style={styles.ringPct}>{percentage}%</Text>
        </View>
    );
}

// ─── Dimension label mapping ───────────────────────────────────────────────────
const DIM_LABELS: Record<string, { label: string; title: string }> = {
    amour:         { label: 'Amour',          title: 'Connexion profonde' },
    love:          { label: 'Amour',          title: 'Deep Resonance' },
    communication: { label: 'Communication',  title: 'Échange fluide' },
    attirance:     { label: 'Attraction',     title: 'Attraction magnétique' },
    attraction:    { label: 'Attraction',     title: 'Magnetic Pull' },
    long_terme:    { label: 'Long terme',     title: 'Orbite stable' },
    long_term:     { label: 'Long-term',      title: 'Stable Orbit' },
    conflits:      { label: 'Conflits',       title: 'Tensions' },
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
    const score = Math.round(result.compatibilityScore || 0);
    const headline = result.compatibilityDetails?.headline;
    const dimensions = result.compatibilityDetails?.dimensions || {};
    const dimEntries = Object.entries(dimensions).slice(0, 4);

    return (
        <View style={styles.screen}>
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    <TabHeader onBack={onReset} />

                    {/* Hero */}
                    <View style={styles.hero}>
                        <Text style={styles.heroPct}>{score}%</Text>
                        <Text style={styles.heroSub}>
                            {headline || (score >= 80 ? 'Connexion profonde' : score >= 60 ? 'Belle harmonie' : 'Complémentarité')}
                        </Text>
                        <Text style={styles.heroCaption}>
                            COMPATIBILITÉ AVEC {(result.partner?.name || '').toUpperCase()}
                        </Text>
                    </View>

                    {/* Dimension MetricCards */}
                    {dimEntries.length > 0 && (
                        <View style={styles.sectionPad}>
                            {dimEntries.map(([key, data]: [string, any]) => {
                                const dim = DIM_LABELS[key] || { label: key, title: key };
                                const pct = Math.round(data?.score || 0);
                                return (
                                    <View key={key} style={styles.metricGap}>
                                        <GlassCard opacity="low" radius="md">
                                            <View style={styles.metricRow}>
                                                <View style={styles.metricLeft}>
                                                    <Text style={styles.metricLabel}>{dim.label.toUpperCase()}</Text>
                                                    <Text style={styles.metricTitle}>{dim.title}</Text>
                                                </View>
                                                <MiniRing percentage={pct} id={key} />
                                            </View>
                                        </GlassCard>
                                    </View>
                                );
                            })}
                        </View>
                    )}

                    {/* Celestial Insights */}
                    <View style={[styles.sectionPad, { marginTop: spacing.xxl }]}>
                        <GlassCard opacity="low" radius="xl">
                            <View style={styles.insightHeader}>
                                <View style={styles.insightIconWrap}>
                                    <Feather name="star" size={16} color={colors.primary} />
                                </View>
                                <Text style={styles.insightLabel}>ANALYSE CÉLESTE</Text>
                            </View>
                            <CopyableText text={result.analysis || ''}>
                                <FormattedText text={result.analysis || ''} style={styles.insightText} />
                            </CopyableText>
                            {/* Forces / Tensions */}
                            {(result.compatibilityDetails?.forces?.length || result.compatibilityDetails?.tensions?.length) ? (
                                <View style={styles.forcesRow}>
                                    {result.compatibilityDetails?.forces?.slice(0, 2).map((f: string, i: number) => (
                                        <View key={i} style={styles.forceChip}>
                                            <Text style={styles.forceChipText}>✦ {f}</Text>
                                        </View>
                                    ))}
                                </View>
                            ) : null}
                        </GlassCard>
                    </View>

                    {/* Conseil */}
                    {result.compatibilityDetails?.conseil && (
                        <View style={[styles.sectionPad, { marginTop: spacing.lg }]}>
                            <GlassCard opacity="low" radius="xl">
                                <View style={styles.insightHeader}>
                                    <Text style={[styles.insightLabel, { color: colors.secondary }]}>◈ CONSEIL</Text>
                                </View>
                                <FormattedText text={result.compatibilityDetails.conseil} style={styles.insightText} />
                            </GlassCard>
                        </View>
                    )}

                    {/* Actions */}
                    <View style={[styles.sectionPad, styles.actionsSection]}>
                        <GoldButton label="NOUVELLE ANALYSE" onPress={onReset} rightIcon />
                        <View style={{ height: spacing.md }} />
                        <GhostButton label="PARTAGER LE RÉSULTAT" onPress={() => {}} />
                    </View>

                    {/* Disclaimer */}
                    <View style={styles.disclaimer}>
                        <Text style={styles.disclaimerText}>{aiDisclaimerText}</Text>
                    </View>

                    <View style={{ height: 100 }} />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

// ─── Form view ─────────────────────────────────────────────────────────────────
function FormView({
    userName,
    partnerName, setPartnerName,
    birthDate, setBirthDate,
    birthTime, setBirthTime,
    birthCity, setBirthCity,
    cityQuery, setCityQuery,
    cityResults, setCityResults,
    showCityModal, setShowCityModal,
    isSearching,
    isLoading,
    error,
    handleCitySearch,
    handleSelectCity,
    handleSubmit,
}: any) {
    return (
        <View style={styles.screen}>
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    <TabHeader />

                    {/* Hero */}
                    <View style={styles.hero}>
                        <View style={styles.badge}>
                            <View style={styles.badgeDot} />
                            <Text style={styles.badgeText}>ANALYSE DE COMPATIBILITÉ</Text>
                        </View>
                        <Text style={styles.formTitle}>Calculez votre{'\n'}compatibilité</Text>
                        <Text style={styles.formSubtitle}>
                            Entrez les informations de votre partenaire pour découvrir votre alignement cosmique.
                        </Text>
                    </View>

                    {/* Form card */}
                    <View style={styles.sectionPad}>
                        <GlassCard opacity="medium" radius="xxl">
                            <AppInput
                                label="Prénom du partenaire"
                                placeholder="Ex : Marie"
                                value={partnerName}
                                onChangeText={setPartnerName}
                                disabled={isLoading}
                            />
                            <View style={{ height: spacing.lg }} />
                            <AppDatePicker
                                label="Date de naissance"
                                value={birthDate}
                                onChange={setBirthDate}
                                disabled={isLoading}
                                maximumDate={new Date()}
                            />
                            <View style={{ height: spacing.lg }} />
                            <AppTimePicker
                                label="Heure de naissance"
                                value={birthTime}
                                onChange={setBirthTime}
                                disabled={isLoading}
                                hint="Optionnel"
                            />
                            <View style={{ height: spacing.lg }} />
                            {/* City selector */}
                            <View>
                                <Text style={styles.inputLabel}>Lieu de naissance</Text>
                                <TouchableOpacity
                                    style={[styles.citySelector, birthCity && styles.citySelectorFilled]}
                                    onPress={() => setShowCityModal(true)}
                                    disabled={isLoading}
                                >
                                    <Text style={[styles.citySelectorText, !birthCity && styles.citySelectorPlaceholder]}>
                                        {birthCity || 'Rechercher une ville...'}
                                    </Text>
                                    <Feather name="search" size={16} color={colors.onSurfaceMuted} />
                                </TouchableOpacity>
                            </View>
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
                                <Text style={styles.loadingText}>Calcul en cours…</Text>
                            </View>
                        ) : (
                            <GoldButton label="ANALYSER LA COMPATIBILITÉ" onPress={handleSubmit} rightIcon />
                        )}
                    </View>

                    <View style={{ height: 100 }} />
                </ScrollView>
            </SafeAreaView>

            {/* City modal */}
            <Modal
                visible={showCityModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowCityModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Rechercher une ville</Text>
                        <Pressable onPress={() => setShowCityModal(false)}>
                            <Text style={styles.modalClose}>Fermer</Text>
                        </Pressable>
                    </View>
                    <AppInput
                        placeholder="Tapez le nom de la ville..."
                        value={cityQuery}
                        onChangeText={handleCitySearch}
                        autoFocus
                    />
                    {isSearching && (
                        <View style={styles.searchingRow}>
                            <ActivityIndicator color={colors.primary} />
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
                                    <Text style={styles.cityName}>{item.name}</Text>
                                    <Text style={styles.cityCountry}>{item.country}</Text>
                                </View>
                                <Text style={styles.cityArrow}>→</Text>
                            </TouchableOpacity>
                        )}
                        style={{ marginTop: spacing.lg }}
                    />
                </View>
            </Modal>
        </View>
    );
}

// ─── Main screen ───────────────────────────────────────────────────────────────
export default function CompatibilityTab() {
    const router = useRouter();
    const { isAuthenticated, user, isLoading: isAuthLoading } = useAuth();
    const userName = user?.firstName || 'Stargazer';

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string>();
    const [result, setResult] = useState<SynastryResponse | null>(null);

    const [partnerName, setPartnerName] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [birthTime, setBirthTime] = useState('');
    const [birthCity, setBirthCity] = useState('');
    const [latitude, setLatitude] = useState<number | null>(null);
    const [longitude, setLongitude] = useState<number | null>(null);
    const [timezone, setTimezone] = useState<number | null>(null);
    const [timezoneName, setTimezoneName] = useState<string | null>(null);
    const [cityQuery, setCityQuery] = useState('');
    const [cityResults, setCityResults] = useState<CitySearchResult[]>([]);
    const [showCityModal, setShowCityModal] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    const handleCitySearch = useCallback(async (query: string) => {
        setCityQuery(query);
        if (query.length < 2) { setCityResults([]); return; }
        setIsSearching(true);
        try {
            setCityResults(await searchCities(query));
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
        setPartnerName(''); setBirthDate(''); setBirthTime(''); setBirthCity('');
        setLatitude(null); setLongitude(null); setTimezone(null); setTimezoneName(null);
        setResult(null); setError(undefined);
    };

    async function handleSubmit() {
        setError(undefined);
        if (!partnerName.trim()) { setError('Le prénom est requis'); return; }
        if (!birthDate) { setError('La date de naissance est requise'); return; }
        if (!birthCity || latitude === null || longitude === null) { setError('Veuillez sélectionner une ville'); return; }
        setIsLoading(true);
        try {
            let finalTimezone = timezone;
            if (timezoneName && birthDate) finalTimezone = calculateTimezoneForBirthDate(timezoneName, birthDate);
            const response = await calculateSynastry({
                partnerName: partnerName.trim(), birthDate,
                birthTime: birthTime || undefined, birthCity,
                latitude, longitude, timezone: finalTimezone || undefined,
            });
            if (response.success) setResult(response);
            else setError(response.error || 'Erreur lors du calcul');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur inconnue');
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
                message="Connectez-vous pour analyser votre compatibilité"
                actionLabel="SE CONNECTER"
                onAction={() => router.push('/login')}
            />
        );
    }

    if (!user?.hasBirthProfile) {
        return (
            <EmptyState
                emoji="✨"
                message="Complétez votre profil astrologique pour commencer"
                actionLabel="COMPLÉTER MON PROFIL"
                onAction={() => router.push('/birth-profile')}
            />
        );
    }

    if (result) {
        return <ResultView result={result} userName={userName} onReset={resetForm} />;
    }

    return (
        <FormView
            userName={userName}
            partnerName={partnerName} setPartnerName={setPartnerName}
            birthDate={birthDate} setBirthDate={setBirthDate}
            birthTime={birthTime} setBirthTime={setBirthTime}
            birthCity={birthCity} setBirthCity={setBirthCity}
            cityQuery={cityQuery} setCityQuery={setCityQuery}
            cityResults={cityResults} setCityResults={setCityResults}
            showCityModal={showCityModal} setShowCityModal={setShowCityModal}
            isSearching={isSearching}
            isLoading={isLoading}
            error={error}
            handleCitySearch={handleCitySearch}
            handleSelectCity={handleSelectCity}
            handleSubmit={handleSubmit}
        />
    );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.surfaceLowest },
    safeArea: { flex: 1 },
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
    inputLabel: {
        fontFamily: fonts.body.medium, fontSize: 13, color: colors.onSurfaceMuted,
        marginBottom: spacing.sm, letterSpacing: 0.3,
    },
    citySelector: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: colors.surfaceContainer,
        borderRadius: radius.md, minHeight: 52, paddingHorizontal: spacing.lg,
        borderWidth: 1, borderColor: `${colors.outline}66`,
    },
    citySelectorFilled: { borderColor: colors.primary },
    citySelectorText: { fontFamily: fonts.body.regular, fontSize: 16, color: colors.onSurface },
    citySelectorPlaceholder: { color: colors.onSurfaceMuted },

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
    metricGap: { marginBottom: spacing.md },
    metricRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    metricLeft: { flex: 1, gap: spacing.xs },
    metricLabel: {
        fontFamily: fonts.body.semiBold, fontSize: 10, letterSpacing: 1.5,
        color: colors.onSurfaceMuted, textTransform: 'uppercase',
    },
    metricTitle: { fontFamily: fonts.display.regular, fontSize: 20, color: colors.onSurface },
    ringPct: {
        fontFamily: fonts.body.medium, fontSize: 13, color: colors.onSurface, position: 'absolute',
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

    // Modal
    modalContainer: {
        flex: 1, backgroundColor: colors.surfaceLowest,
        paddingHorizontal: spacing.xl,
        paddingTop: Platform.OS === 'ios' ? 60 : spacing.xxl,
    },
    modalHeader: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: spacing.xl,
    },
    modalTitle: { fontFamily: fonts.display.regular, fontSize: 20, color: colors.onSurface },
    modalClose: { fontFamily: fonts.body.medium, fontSize: 14, color: colors.primary },
    searchingRow: { paddingVertical: spacing.xl, alignItems: 'center' },
    cityItem: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: spacing.lg, paddingHorizontal: spacing.md,
        borderBottomWidth: 1, borderBottomColor: `${colors.outline}33`,
    },
    cityName: { fontFamily: fonts.body.medium, fontSize: 15, color: colors.onSurface },
    cityCountry: { fontFamily: fonts.body.regular, fontSize: 12, color: colors.onSurfaceMuted, marginTop: 2 },
    cityArrow: { fontFamily: fonts.body.regular, fontSize: 20, color: colors.primary },
});