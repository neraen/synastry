/**
 * Onboarding — shown once after account creation.
 *
 * Step 0 : Hero / brand moment
 * Step 1 : App features showcase (horizontal pager)
 * Step 2 : Help buttons tip
 * Step 3 : Birth profile (name, date, time, city)
 * Step 4 : All set
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
import { Feather } from '@expo/vector-icons';

import { useAuth } from '@/contexts/AuthContext';
import { GlassCard, GoldButton, GhostButton, AppDatePicker, AppTimePicker, CityAutocomplete } from '@/components/ui';
import { colors, spacing, radius, fonts } from '@/theme';
import {
    saveBirthProfile,
    CitySearchResult,
} from '@/services/birthProfile';

const { width: W } = Dimensions.get('window');
const STEPS = 5;

// ─── Decorative star positions ────────────────────────────────────────────────

const STARS = [
    { top: '7%',  left: '10%', size: 2 },
    { top: '13%', left: '82%', size: 3 },
    { top: '20%', left: '42%', size: 1.5 },
    { top: '32%', left: '91%', size: 2 },
    { top: '4%',  left: '58%', size: 1.5 },
    { top: '41%', left: '6%',  size: 2.5 },
    { top: '17%', left: '27%', size: 1 },
    { top: '26%', left: '68%', size: 2 },
    { top: '9%',  left: '35%', size: 1.5 },
    { top: '36%', left: '74%', size: 1 },
];

// Cardinal planet symbols orbiting the hero orb
const ORBIT_PLANETS = [
    { symbol: '☽', angle: 0 },
    { symbol: '♀', angle: 90 },
    { symbol: '♄', angle: 180 },
    { symbol: '☿', angle: 270 },
];
const ORBIT_RADIUS = 92;

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

// ─── Mock bar (used in feature mockups) ──────────────────────────────────────

function MockBar({ fill, color = colors.primary }: { fill: number; color?: string }) {
    return (
        <View style={styles.mockBarTrack}>
            <View style={[styles.mockBarFill, { width: `${fill * 100}%`, backgroundColor: color }]} />
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

const TextInputRN = TextInput;

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
    const router = useRouter();
    const { t } = useTranslation();
    const { refreshUser } = useAuth();

    const [step, setStep] = useState(0);
    const [featurePage, setFeaturePage] = useState(0);
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const scrollRef = useRef<ScrollView>(null);
    const featureScrollRef = useRef<ScrollView>(null);
    const scrollYRef = useRef(0);

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
            goTo(4);
        } catch (err) {
            setError(err instanceof Error ? err.message : t('birthProfile.saveError'));
        } finally {
            setIsSaving(false);
        }
    }, [birthDate, birthCity, latitude, longitude, firstName, birthTime, birthCountry, timezone, timezoneName, refreshUser, goTo, t]);

    // ─────────────────────────────────────────────────────────────────────────
    // Step 0 — Hero
    // ─────────────────────────────────────────────────────────────────────────

    const stepHero = (
        <View style={styles.stepHero}>
            {/* Star field */}
            {STARS.map((s, i) => (
                <View
                    key={i}
                    style={[
                        styles.star,
                        { top: s.top as any, left: s.left as any, width: s.size, height: s.size },
                    ]}
                />
            ))}

            {/* Orbital visual */}
            <View style={styles.orbitContainer}>
                {/* Rings */}
                <View style={[styles.ring, styles.ringOuter]} />
                <View style={[styles.ring, styles.ringMid]} />
                <View style={[styles.ring, styles.ringInner]} />

                {/* Central orb */}
                <View style={styles.heroOrb}>
                    <LinearGradient
                        colors={[`${colors.primary}50`, `${colors.secondary}28`, 'transparent']}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0.5, y: 0 }}
                        end={{ x: 0.5, y: 1 }}
                    />
                    <Text style={styles.heroOrbGlyph}>✦</Text>
                </View>

                {/* Cardinal planets */}
                {ORBIT_PLANETS.map(({ symbol, angle }) => {
                    const rad = (angle - 90) * (Math.PI / 180);
                    const x = ORBIT_RADIUS * Math.cos(rad);
                    const y = ORBIT_RADIUS * Math.sin(rad);
                    return (
                        <View
                            key={symbol}
                            style={[
                                styles.orbitPlanet,
                                {
                                    transform: [
                                        { translateX: x },
                                        { translateY: y },
                                    ],
                                },
                            ]}
                        >
                            <Text style={styles.orbitPlanetText}>{symbol}</Text>
                        </View>
                    );
                })}
            </View>

            {/* App name + tagline */}
            <View style={styles.heroTextBlock}>
                <Text style={styles.heroAppName}>Lunestia</Text>
                <Text style={styles.heroTagline}>{t('onboarding.hero.tagline')}</Text>
            </View>

            {/* Value props */}
            <View style={styles.heroValues}>
                {([
                    ['☽', t('onboarding.hero.value1')],
                    ['◈', t('onboarding.hero.value2')],
                    ['⟡', t('onboarding.hero.value3')],
                ] as [string, string][]).map(([icon, text]) => (
                    <View key={icon} style={styles.heroValueRow}>
                        <View style={styles.heroValueIcon}>
                            <Text style={styles.heroValueIconText}>{icon}</Text>
                        </View>
                        <Text style={styles.heroValueText}>{text}</Text>
                    </View>
                ))}
            </View>

            <GoldButton
                label={t('onboarding.hero.cta')}
                onPress={() => goTo(1)}
                size="lg"
                rightIcon
            />
        </View>
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Step 1 — Features showcase (horizontal pager)
    // ─────────────────────────────────────────────────────────────────────────

    const FEATURE_SLIDES = [
        {
            key: 'horoscope',
            icon: '☽',
            accentColor: colors.primary,
            glyphs: ['☉', '♃', '☽', '♂'],
            badge: t('onboarding.features.horoscope.badge'),
            title: t('onboarding.features.horoscope.title'),
            description: t('onboarding.features.horoscope.description'),
            mock: (
                <View style={styles.featureMock}>
                    <View style={styles.mockPlanetRow}>
                        {['☉ Sol', '♀ Vénus', '☿ Mercure'].map((p) => (
                            <View key={p} style={[styles.mockPlanetTag, { backgroundColor: `${colors.primary}18` }]}>
                                <Text style={[styles.mockPlanetText, { color: `${colors.primary}cc` }]}>{p}</Text>
                            </View>
                        ))}
                    </View>
                    <View style={styles.mockBarRow}>
                        <Text style={styles.mockBarLabel}>{t('onboarding.features.horoscope.mockIntensity')}</Text>
                        <MockBar fill={0.78} color={colors.primary} />
                    </View>
                    <View style={[styles.mockBarRow, { marginTop: 4 }]}>
                        <Text style={styles.mockBarLabel}>{t('onboarding.features.horoscope.mockClarity')}</Text>
                        <MockBar fill={0.65} color={colors.secondary} />
                    </View>
                    <View style={styles.mockQuoteBox}>
                        <Text style={styles.mockQuoteText}>{t('onboarding.features.horoscope.mockQuote')}</Text>
                    </View>
                </View>
            ),
        },
        {
            key: 'synastry',
            icon: '◈',
            accentColor: colors.secondary,
            glyphs: ['♊', '♏', '♋', '♑'],
            badge: t('onboarding.features.synastry.badge'),
            title: t('onboarding.features.synastry.title'),
            description: t('onboarding.features.synastry.description'),
            mock: (
                <View style={styles.featureMock}>
                    <View style={styles.synastryAvatarRow}>
                        <View style={styles.synastryAvatarWrap}>
                            <View style={[styles.synastryAvatar, { backgroundColor: `${colors.primary}20` }]}>
                                <Text style={styles.synastryAvatarGlyph}>♊</Text>
                            </View>
                            <Text style={styles.synastryAvatarLabel}>{t('onboarding.features.synastry.mockPerson1')}</Text>
                        </View>
                        <View style={[styles.synastryScoreBadge, { backgroundColor: `${colors.secondary}18` }]}>
                            <Text style={[styles.synastryScoreText, { color: colors.secondary }]}>87%</Text>
                        </View>
                        <View style={styles.synastryAvatarWrap}>
                            <View style={[styles.synastryAvatar, { backgroundColor: `${colors.secondary}20` }]}>
                                <Text style={styles.synastryAvatarGlyph}>♏</Text>
                            </View>
                            <Text style={styles.synastryAvatarLabel}>{t('onboarding.features.synastry.mockPerson2')}</Text>
                        </View>
                    </View>
                    <View style={{ gap: 6 }}>
                        {([
                            [t('onboarding.features.synastry.mockAspect1'), 0.85],
                            [t('onboarding.features.synastry.mockAspect2'), 0.92],
                            [t('onboarding.features.synastry.mockAspect3'), 0.71],
                        ] as [string, number][]).map(([label, fill]) => (
                            <View key={label} style={styles.mockBarRow}>
                                <Text style={styles.mockBarLabel}>{label}</Text>
                                <MockBar fill={fill} color={colors.secondary} />
                            </View>
                        ))}
                    </View>
                </View>
            ),
        },
        {
            key: 'mirror',
            icon: '⟡',
            accentColor: '#64c8b4',
            glyphs: ['♄', '♃', '☿', '♅'],
            badge: t('onboarding.features.mirror.badge'),
            title: t('onboarding.features.mirror.title'),
            description: t('onboarding.features.mirror.description'),
            mock: (
                <View style={styles.featureMock}>
                    <View style={styles.mockSliderWrap}>
                        <Text style={styles.mockSliderLabel}>0</Text>
                        <View style={styles.mockSliderTrack}>
                            <View style={[styles.mockSliderFill, { backgroundColor: `#64c8b460` }]} />
                            <View style={[styles.mockSliderThumb, { backgroundColor: '#64c8b4' }]} />
                        </View>
                        <Text style={styles.mockSliderLabel}>80</Text>
                        <View style={[styles.mockAgeBadge, { backgroundColor: `rgba(100,200,180,0.15)` }]}>
                            <Text style={[styles.mockAgeText, { color: '#64c8b4' }]}>28 {t('onboarding.features.mirror.mockAgeUnit')}</Text>
                        </View>
                    </View>
                    <View style={[styles.mockChatBubble, { backgroundColor: `rgba(100,200,180,0.1)` }]}>
                        <Text style={[styles.mockChatName, { color: '#64c8b4' }]}>✦ Lyra</Text>
                        <Text style={styles.mockChatText}>{t('onboarding.features.mirror.mockChatText')}</Text>
                    </View>
                </View>
            ),
        },
    ];

    const handleFeatureNext = useCallback(() => {
        if (featurePage < FEATURE_SLIDES.length - 1) {
            const next = featurePage + 1;
            featureScrollRef.current?.scrollTo({ x: next * W, animated: true });
            setFeaturePage(next);
        } else {
            goTo(2); // → help tip
        }
    }, [featurePage, goTo]);

    const stepFeatures = (
        <View style={styles.featurePagerRoot}>
            <ScrollView
                ref={featureScrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                scrollEventThrottle={16}
                onMomentumScrollEnd={(e) => {
                    const page = Math.round(e.nativeEvent.contentOffset.x / W);
                    setFeaturePage(page);
                }}
                style={styles.featureHScroll}
            >
                {FEATURE_SLIDES.map((feature) => (
                    <View key={feature.key} style={styles.featureSlide}>
                        {/* Visual hero area */}
                        <View style={styles.featureVisual}>
                            <LinearGradient
                                colors={[`${feature.accentColor}22`, `${feature.accentColor}06`, 'transparent']}
                                style={StyleSheet.absoluteFill}
                                start={{ x: 0.5, y: 0 }}
                                end={{ x: 0.5, y: 1 }}
                            />
                            {/* Floating glyph cloud */}
                            {feature.glyphs.map((g, i) => (
                                <Text
                                    key={i}
                                    style={[
                                        styles.featureFloatGlyph,
                                        {
                                            color: `${feature.accentColor}${['28', '20', '30', '18'][i]}`,
                                            fontSize: [28, 22, 20, 24][i],
                                            top: ['18%', '55%', '22%', '60%'][i] as any,
                                            left: ['10%', '75%', '72%', '15%'][i] as any,
                                        },
                                    ]}
                                >
                                    {g}
                                </Text>
                            ))}
                            {/* Central icon */}
                            <View style={[styles.featureIconOrb, { backgroundColor: `${feature.accentColor}14` }]}>
                                <Text style={[styles.featureIconText, { color: feature.accentColor }]}>{feature.icon}</Text>
                            </View>
                        </View>

                        {/* Content */}
                        <View style={styles.featureContent}>
                            <View style={[styles.featureBadge, { backgroundColor: `${feature.accentColor}18` }]}>
                                <Text style={[styles.featureBadgeText, { color: feature.accentColor }]}>
                                    {feature.badge}
                                </Text>
                            </View>
                            <Text style={styles.featureTitle}>{feature.title}</Text>
                            <Text style={styles.featureDesc}>{feature.description}</Text>
                            {feature.mock}
                        </View>
                    </View>
                ))}
            </ScrollView>

            {/* Footer: sub-dots + next/CTA */}
            <View style={styles.featurePagerFooter}>
                <View style={styles.featureSubDots}>
                    {FEATURE_SLIDES.map((_, i) => (
                        <View
                            key={i}
                            style={[
                                styles.featureSubDot,
                                i === featurePage && styles.featureSubDotActive,
                            ]}
                        />
                    ))}
                </View>
                <GoldButton
                    label={featurePage < FEATURE_SLIDES.length - 1 ? t('common.next') : t('onboarding.features.cta')}
                    onPress={handleFeatureNext}
                    size="lg"
                    rightIcon={featurePage < FEATURE_SLIDES.length - 1}
                />
            </View>
        </View>
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Step 2 — Help tip
    // ─────────────────────────────────────────────────────────────────────────

    const helpPulse = useRef(new Animated.Value(1)).current;
    React.useEffect(() => {
        if (step !== 2) return;
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
                onPress={() => goTo(3)}
                size="lg"
            />
        </View>
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Step 3 — Birth profile
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
                    {step === 0 && stepHero}
                    {step === 1 && stepFeatures}
                    {step === 2 && stepHelpTip}
                    {step === 3 && stepBirthProfile}
                    {step === 4 && stepDone}
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

    // ── Step 0: Hero ──────────────────────────────────────────────────────────
    stepHero: {
        flex: 1,
        paddingHorizontal: spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xl,
    },
    star: {
        position: 'absolute',
        borderRadius: 99,
        backgroundColor: `${colors.primary}50`,
    },
    orbitContainer: {
        width: 220,
        height: 220,
        alignItems: 'center',
        justifyContent: 'center',
    },
    ring: {
        position: 'absolute',
        borderRadius: 999,
        borderWidth: 1,
    },
    ringOuter: {
        width: 218,
        height: 218,
        borderColor: `${colors.primary}14`,
    },
    ringMid: {
        width: 170,
        height: 170,
        borderColor: `${colors.secondary}18`,
    },
    ringInner: {
        width: 128,
        height: 128,
        borderColor: `${colors.primary}10`,
    },
    heroOrb: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: `${colors.primary}14`,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    heroOrbGlyph: {
        fontSize: 40,
        color: colors.primary,
    },
    orbitPlanet: {
        position: 'absolute',
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: `${colors.surfaceLowest}cc`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    orbitPlanetText: {
        fontSize: 15,
        color: `${colors.primary}cc`,
    },
    heroTextBlock: {
        alignItems: 'center',
        gap: spacing.xs,
    },
    heroAppName: {
        fontFamily: fonts.display.bold,
        fontSize: 44,
        color: colors.onSurface,
        letterSpacing: -0.5,
    },
    heroTagline: {
        fontFamily: fonts.body.regular,
        fontSize: 15,
        color: colors.onSurfaceMuted,
        textAlign: 'center',
        fontStyle: 'italic',
        lineHeight: 22,
        maxWidth: 260,
    },
    heroValues: {
        width: '100%',
        gap: spacing.sm,
    },
    heroValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        backgroundColor: `${colors.onSurface}06`,
        borderRadius: radius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    heroValueIcon: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: `${colors.primary}15`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroValueIconText: {
        fontSize: 17,
        color: colors.primary,
    },
    heroValueText: {
        fontFamily: fonts.body.regular,
        fontSize: 13,
        color: colors.onSurface,
        flex: 1,
        lineHeight: 18,
    },

    // ── Step 1: Feature pager ─────────────────────────────────────────────────
    featurePagerRoot: {
        flex: 1,
    },
    featureHScroll: {
        flex: 1,
    },
    featureSlide: {
        width: W,
        flex: 1,
    },
    featureVisual: {
        height: 200,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
    },
    featureFloatGlyph: {
        position: 'absolute',
        fontFamily: fonts.display.bold,
    },
    featureIconOrb: {
        width: 96,
        height: 96,
        borderRadius: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    featureIconText: {
        fontSize: 52,
    },
    featureContent: {
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.lg,
        gap: spacing.sm,
    },
    featureBadge: {
        alignSelf: 'flex-start',
        borderRadius: radius.full,
        paddingHorizontal: spacing.md,
        paddingVertical: 4,
        marginBottom: spacing.xs,
    },
    featureBadgeText: {
        fontFamily: fonts.body.medium,
        fontSize: 11,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
    featureTitle: {
        fontFamily: fonts.display.bold,
        fontSize: 24,
        color: colors.onSurface,
        lineHeight: 30,
    },
    featureDesc: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        color: colors.onSurfaceMuted,
        lineHeight: 21,
    },

    // Feature mock shared
    featureMock: {
        backgroundColor: `${colors.onSurface}05`,
        borderRadius: radius.md,
        padding: spacing.md,
        gap: spacing.sm,
        marginTop: spacing.xs,
    },
    mockPlanetRow: {
        flexDirection: 'row',
        gap: spacing.xs,
        flexWrap: 'wrap',
        marginBottom: spacing.xs,
    },
    mockPlanetTag: {
        borderRadius: radius.full,
        paddingHorizontal: spacing.sm,
        paddingVertical: 3,
    },
    mockPlanetText: {
        fontFamily: fonts.body.regular,
        fontSize: 11,
    },
    mockBarRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    mockBarLabel: {
        fontFamily: fonts.body.regular,
        fontSize: 11,
        color: colors.onSurfaceMuted,
        width: 72,
    },
    mockBarTrack: {
        flex: 1,
        height: 5,
        borderRadius: 3,
        backgroundColor: `${colors.onSurface}12`,
        overflow: 'hidden',
    },
    mockBarFill: {
        height: '100%',
        borderRadius: 3,
        opacity: 0.75,
    },
    mockQuoteBox: {
        backgroundColor: `${colors.onSurface}06`,
        borderRadius: radius.sm,
        padding: spacing.sm,
        marginTop: spacing.xs,
    },
    mockQuoteText: {
        fontFamily: fonts.body.regular,
        fontStyle: 'italic',
        fontSize: 12,
        color: `${colors.onSurfaceMuted}cc`,
        lineHeight: 17,
    },
    synastryAvatarRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.lg,
        marginBottom: spacing.sm,
    },
    synastryAvatarWrap: {
        alignItems: 'center',
        gap: spacing.xs,
    },
    synastryAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    synastryAvatarGlyph: {
        fontSize: 20,
        color: colors.onSurface,
    },
    synastryAvatarLabel: {
        fontFamily: fonts.body.regular,
        fontSize: 11,
        color: colors.onSurfaceMuted,
    },
    synastryScoreBadge: {
        borderRadius: radius.full,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
    },
    synastryScoreText: {
        fontFamily: fonts.display.bold,
        fontSize: 18,
    },
    mockSliderWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    mockSliderLabel: {
        fontFamily: fonts.body.regular,
        fontSize: 11,
        color: `${colors.onSurfaceMuted}80`,
        width: 14,
    },
    mockSliderTrack: {
        flex: 1,
        height: 5,
        borderRadius: 3,
        backgroundColor: `${colors.onSurface}15`,
        position: 'relative',
    },
    mockSliderFill: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: '38%',
        borderRadius: 3,
    },
    mockSliderThumb: {
        position: 'absolute',
        left: '36%',
        top: -5,
        width: 15,
        height: 15,
        borderRadius: 8,
        opacity: 0.85,
    },
    mockAgeBadge: {
        borderRadius: radius.full,
        paddingHorizontal: spacing.sm,
        paddingVertical: 3,
    },
    mockAgeText: {
        fontFamily: fonts.body.medium,
        fontSize: 11,
    },
    mockChatBubble: {
        borderRadius: radius.md,
        padding: spacing.sm,
        gap: 4,
    },
    mockChatName: {
        fontFamily: fonts.body.medium,
        fontSize: 11,
        letterSpacing: 0.3,
    },
    mockChatText: {
        fontFamily: fonts.body.regular,
        fontStyle: 'italic',
        fontSize: 12,
        color: `${colors.onSurfaceMuted}cc`,
        lineHeight: 17,
    },

    // Feature pager footer
    featurePagerFooter: {
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.xl,
        paddingTop: spacing.md,
        gap: spacing.md,
    },
    featureSubDots: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6,
    },
    featureSubDot: {
        width: 5,
        height: 5,
        borderRadius: 3,
        backgroundColor: `${colors.onSurfaceMuted}30`,
    },
    featureSubDotActive: {
        width: 16,
        backgroundColor: colors.primary,
    },

    // ── Step 2: Help tip ──────────────────────────────────────────────────────
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

    // ── Step 3: Birth profile ─────────────────────────────────────────────────
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