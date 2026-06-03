/**
 * Onboarding v2 — page de test accessible depuis le profil
 *
 * Step 0 : Privacy / RGPD consent
 * Step 1 : Features guide (accordion)
 * Step 2 : Birth profile form
 * Step 3 : All set / done
 *
 * Design basé sur app/example/onboarding/
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
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
import { GoldButton, GhostButton, AppDatePicker, AppTimePicker, CityAutocomplete } from '@/components/ui';
import { colors, spacing, radius, fonts } from '@/theme';
import { saveBirthProfile, CitySearchResult } from '@/services/birthProfile';

const { width: W } = Dimensions.get('window');
const STEPS = 4;

// ─── Star field ────────────────────────────────────────────────────────────────

function Starfield() {
    const stars = useMemo(
        () =>
            Array.from({ length: 36 }, () => ({
                top: Math.random() * 100,
                left: Math.random() * 100,
                size: Math.random() < 0.85 ? 1.2 : 2,
                peak: 0.25 + Math.random() * 0.55,
                delay: Math.random() * 4000,
                half: 1500 + Math.random() * 1000,
            })),
        [],
    );

    const anims = useRef(stars.map(() => new Animated.Value(0))).current;

    useEffect(() => {
        const loops = anims.map((anim, i) => {
            const { peak, delay, half } = stars[i];
            const loop = Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(anim, { toValue: peak, duration: half, useNativeDriver: true }),
                    Animated.timing(anim, { toValue: 0, duration: half, useNativeDriver: true }),
                ]),
            );
            loop.start();
            return loop;
        });
        return () => loops.forEach((l) => l.stop());
    }, []);

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {stars.map((s, i) => (
                <Animated.View
                    key={i}
                    style={{
                        position: 'absolute',
                        top: `${s.top}%`,
                        left: `${s.left}%`,
                        width: s.size,
                        height: s.size,
                        borderRadius: s.size / 2,
                        backgroundColor: '#fff',
                        opacity: anims[i],
                    }}
                />
            ))}
        </View>
    );
}

// ─── Progress dots ─────────────────────────────────────────────────────────────

function ProgressDots({ step }: { step: number }) {
    return (
        <View style={s.dots}>
            {Array.from({ length: STEPS }).map((_, i) => (
                <View
                    key={i}
                    style={[s.dot, i === step && s.dotActive, i < step && s.dotDone]}
                />
            ))}
        </View>
    );
}

// ─── Back button ───────────────────────────────────────────────────────────────

function BackButton({ visible, onPress }: { visible: boolean; onPress: () => void }) {
    return (
        <Pressable
            style={[s.backBtn, !visible && s.backBtnHidden]}
            onPress={onPress}
            hitSlop={8}
            pointerEvents={visible ? 'auto' : 'none'}
        >
            <Feather name="arrow-left" size={18} color={colors.onSurfaceMuted} />
        </Pressable>
    );
}

// ─── Hero Medallion ────────────────────────────────────────────────────────────

function HeroMedallion({ children }: { children: React.ReactNode }) {
    const ring1 = useRef(new Animated.Value(0)).current;
    const ring2 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const makeLoop = (anim: Animated.Value, delay: number) =>
            Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(anim, { toValue: 1, duration: 3200, useNativeDriver: true }),
                    Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
                ]),
            );
        const a = makeLoop(ring1, 0);
        const b = makeLoop(ring2, 1400);
        a.start();
        b.start();
        return () => {
            a.stop();
            b.stop();
        };
    }, []);

    const ringStyle = (anim: Animated.Value) => ({
        opacity: anim.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 0.5, 0] }),
        transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.15] }) }],
    });

    return (
        <View style={s.medallionWrap}>
            <Animated.View style={[s.medallionRing, ringStyle(ring1)]} />
            <Animated.View style={[s.medallionRing, s.medallionRingOuter, ringStyle(ring2)]} />
            <LinearGradient
                colors={[`${colors.primary}38`, `${colors.primary}0a`, 'transparent']}
                style={s.medallion}
                start={{ x: 0.3, y: 0.3 }}
                end={{ x: 1, y: 1 }}
            >
                {children}
            </LinearGradient>
        </View>
    );
}

// ─── Consent checkbox row ──────────────────────────────────────────────────────

function ConsentRow({
    checked,
    onToggle,
    children,
}: {
    checked: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}) {
    return (
        <Pressable style={s.consentRow} onPress={onToggle} hitSlop={8}>
            <View style={[s.checkbox, checked && s.checkboxChecked]}>
                {checked && <Feather name="check" size={13} color={colors.surfaceLowest} />}
            </View>
            <Text style={s.consentText}>{children}</Text>
        </Pressable>
    );
}

// ─── Feature accordion row ─────────────────────────────────────────────────────

function FeatureRow({
    icon,
    name,
    desc,
    isOpen,
    onPress,
}: {
    icon: keyof typeof Feather.glyphMap;
    name: string;
    desc: string;
    isOpen: boolean;
    onPress: () => void;
}) {
    const expand = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(expand, {
            toValue: isOpen ? 1 : 0,
            duration: 280,
            useNativeDriver: false,
        }).start();
    }, [isOpen]);

    return (
        <Pressable style={[s.featureRow, isOpen && s.featureRowOpen]} onPress={onPress}>
            <View style={s.featureRowTop}>
                <View style={[s.featureIcon, isOpen && s.featureIconOpen]}>
                    <Feather name={icon} size={18} color={colors.primary} />
                </View>
                <Text style={s.featureName}>{name}</Text>
                <View style={[s.featureHelp, isOpen && s.featureHelpOpen]}>
                    <Feather
                        name="help-circle"
                        size={14}
                        color={isOpen ? colors.primary : `${colors.onSurfaceMuted}80`}
                    />
                </View>
            </View>
            <Animated.View
                style={{
                    overflow: 'hidden',
                    maxHeight: expand.interpolate({ inputRange: [0, 1], outputRange: [0, 80] }),
                    opacity: expand,
                    marginTop: expand.interpolate({ inputRange: [0, 1], outputRange: [0, 10] }),
                }}
            >
                <Text style={s.featureDesc}>{desc}</Text>
            </Animated.View>
        </Pressable>
    );
}

// ─── Form field (text input) ───────────────────────────────────────────────────

function FormField({
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
        <View>
            <Text style={s.formLabel}>{label}</Text>
            <View style={[s.formInput, focused && s.formInputFocused, disabled && { opacity: 0.5 }]}>
                <TextInput
                    style={s.formText}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={`${colors.onSurfaceMuted}60`}
                    editable={!disabled}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                />
            </View>
            {hint && <Text style={s.formHint}>{hint}</Text>}
        </View>
    );
}

// ─── Screen 0 — Privacy ────────────────────────────────────────────────────────

function ScreenPrivacy({ onContinue }: { onContinue: () => void }) {
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [acceptAI, setAcceptAI] = useState(false);
    const ready = acceptTerms && acceptAI;

    const dataPoints = [
        {
            icon: 'mail' as const,
            title: 'Ton adresse e-mail',
            desc: 'Collectée via Google ou Apple pour identifier ton compte.',
        },
        {
            icon: 'user' as const,
            title: 'Ton prénom',
            desc: 'Optionnel — utilisé uniquement pour personnaliser les messages de Lyra.',
        },
        {
            icon: 'gift' as const,
            title: 'Tes données de naissance',
            desc: 'Date, heure et lieu — pour calculer ton thème natal.',
        },
    ];

    return (
        <View style={s.screenRoot}>
            <ScrollView contentContainerStyle={s.screenScroll} showsVerticalScrollIndicator={false}>
                <HeroMedallion>
                    <Feather name="shield" size={36} color={colors.primary} />
                </HeroMedallion>

                <View style={s.chipWrap}>
                    <View style={s.chip}>
                        <Text style={s.chipText}>Confidentialité</Text>
                    </View>
                </View>

                <Text style={s.h1}>Avant de commencer</Text>
                <Text style={s.lead}>
                    Lunestia a besoin de quelques données personnelles pour fonctionner. Voici exactement ce
                    que nous collectons.
                </Text>

                <View style={s.card}>
                    <Text style={s.listTitle}>Ce que nous collectons</Text>
                    {dataPoints.map((d, i) => (
                        <View key={i} style={[s.dataRow, i > 0 && { marginTop: 14 }]}>
                            <View style={s.dataIcon}>
                                <Feather name={d.icon} size={16} color={colors.primary} />
                            </View>
                            <View style={s.dataBody}>
                                <Text style={s.dataTitle}>{d.title}</Text>
                                <Text style={s.dataDesc}>{d.desc}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                <View style={s.consents}>
                    <ConsentRow checked={acceptTerms} onToggle={() => setAcceptTerms((v) => !v)}>
                        J'accepte les conditions d'utilisation et la politique de confidentialité.
                    </ConsentRow>
                    <ConsentRow checked={acceptAI} onToggle={() => setAcceptAI((v) => !v)}>
                        J'accepte que mes données de naissance soient transmises à OpenAI uniquement pour
                        générer mes analyses astrologiques personnalisées.
                    </ConsentRow>
                </View>

                <View style={s.ctaInScroll}>
                    <GoldButton label="Continuer" onPress={onContinue} size="lg" disabled={!ready} />
                </View>
            </ScrollView>
        </View>
    );
}

// ─── Screen 1 — Guide (features accordion) ────────────────────────────────────

function ScreenGuide({ onContinue }: { onContinue: () => void }) {
    const [open, setOpen] = useState<string | null>(null);

    const features = [
        {
            id: 'natal',
            name: 'Thème natal',
            icon: 'target' as const,
            desc: 'Ta carte du ciel à la minute près. Planètes, signes, maisons et aspects, le tout interactif.',
        },
        {
            id: 'compa',
            name: 'Compatibilité',
            icon: 'heart' as const,
            desc: 'La synastrie : comment deux thèmes dialoguent. Forces, tensions et clés de relation.',
        },
        {
            id: 'trans',
            name: 'Transits',
            icon: 'refresh-cw' as const,
            desc: "Ce que le ciel actuel active dans ton thème. Périodes-clés, fenêtres d'action.",
        },
        {
            id: 'mirror',
            name: 'Miroir temporel',
            icon: 'clock' as const,
            desc: 'Une lecture comparée : passé · présent · futur, pour suivre ton évolution.',
        },
    ];

    return (
        <View style={s.screenRoot}>
            <ScrollView contentContainerStyle={s.screenScroll} showsVerticalScrollIndicator={false}>
                <HeroMedallion>
                    <Feather name="help-circle" size={36} color={colors.primary} />
                </HeroMedallion>

                <View style={{ marginTop: 6 }}>
                    {features.map((f) => (
                        <FeatureRow
                            key={f.id}
                            icon={f.icon}
                            name={f.name}
                            desc={f.desc}
                            isOpen={open === f.id}
                            onPress={() => setOpen(open === f.id ? null : f.id)}
                        />
                    ))}
                </View>

                <View style={[s.chipWrap, { marginTop: 20 }]}>
                    <View style={s.chip}>
                        <Text style={s.chipText}>Guide intégré</Text>
                    </View>
                </View>
                <Text style={s.h1}>L'aide est partout</Text>
                <Text style={s.lead}>
                    Sur chaque page, un bouton{' '}
                    <Text style={{ color: colors.primary, fontFamily: fonts.body.semiBold }}>?</Text> te donne
                    des explications sur ce que tu vois — symboles, scores, aspects, tout est décrypté.
                </Text>

                <View style={s.ctaInScroll}>
                    <GoldButton label="Compris !" onPress={onContinue} size="lg" />
                </View>
            </ScrollView>
        </View>
    );
}

// ─── Screen 2 — Birth profile form ────────────────────────────────────────────

function ScreenForm({ onContinue, onSkip }: { onContinue: () => void; onSkip: () => void }) {
    const { refreshUser } = useAuth();
    const { t } = useTranslation();

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

    const scrollRef = useRef<ScrollView>(null);
    const scrollYRef = useRef(0);

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
            onContinue();
        } catch (err) {
            setError(err instanceof Error ? err.message : t('birthProfile.saveError'));
        } finally {
            setIsSaving(false);
        }
    }, [
        birthDate,
        birthCity,
        latitude,
        longitude,
        firstName,
        birthTime,
        birthCountry,
        timezone,
        timezoneName,
        refreshUser,
        onContinue,
        t,
    ]);

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
        >
            <ScrollView
                ref={scrollRef}
                contentContainerStyle={s.screenScroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                onScroll={(e) => {
                    scrollYRef.current = e.nativeEvent.contentOffset.y;
                }}
                scrollEventThrottle={16}
            >
                <View style={s.chipWrap}>
                    <View style={s.chip}>
                        <Text style={s.chipText}>Étape 3 / 4</Text>
                    </View>
                </View>
                <Text style={s.h1}>Ton thème natal</Text>
                <Text style={s.lead}>
                    Ces données permettent de calculer tes transits personnels et ton thème natal précis.
                </Text>

                <View style={s.card}>
                    <FormField
                        label={t('birthProfile.firstName')}
                        value={firstName}
                        onChangeText={setFirstName}
                        placeholder={t('birthProfile.firstNamePlaceholder')}
                        hint={t('birthProfile.firstNameHint')}
                        disabled={isSaving}
                    />
                    <View style={{ height: 16 }} />
                    <AppDatePicker
                        label={t('birthProfile.birthDate')}
                        value={birthDate}
                        onChange={setBirthDate}
                        disabled={isSaving}
                        maximumDate={new Date()}
                        placeholder={t('birthProfile.birthDatePlaceholder')}
                    />
                    <View style={{ height: 16 }} />
                    <AppTimePicker
                        label={t('birthProfile.birthTime')}
                        value={birthTime}
                        onChange={setBirthTime}
                        disabled={isSaving}
                        hint={t('birthProfile.birthTimeHint')}
                        placeholder={t('birthProfile.birthTimePlaceholder')}
                    />
                    <View style={{ height: 16 }} />
                    <CityAutocomplete
                        label={t('birthProfile.birthCity')}
                        placeholder={t('birthProfile.birthCityPlaceholder')}
                        value={
                            birthCity ? `${birthCity}${birthCountry ? `, ${birthCountry}` : ''}` : ''
                        }
                        onSelect={handleSelectCity}
                        onClear={handleClearCity}
                        disabled={isSaving}
                        scrollRef={scrollRef}
                        scrollYRef={scrollYRef}
                    />
                </View>

                {!!error && (
                    <View style={s.errorBox}>
                        <Text style={s.errorText}>{error}</Text>
                    </View>
                )}

                <View style={s.ctaInScroll}>
                    <GoldButton
                        label={isSaving ? t('common.loading') : t('onboarding.birth.cta')}
                        onPress={handleSave}
                        loading={isSaving}
                        size="lg"
                    />
                    <GhostButton label={t('onboarding.birth.skip')} onPress={onSkip} />
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

// ─── Screen 3 — Done ───────────────────────────────────────────────────────────

function ScreenDone({ onFinish, active }: { onFinish: () => void; active: boolean }) {
    const ring1 = useRef(new Animated.Value(0)).current;
    const ring2 = useRef(new Animated.Value(0)).current;
    const ring3 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!active) return;
        const makeLoop = (anim: Animated.Value, delay: number) =>
            Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(anim, { toValue: 1, duration: 2000, useNativeDriver: true }),
                    Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
                ]),
            );
        const a = makeLoop(ring1, 0);
        const b = makeLoop(ring2, 600);
        const c = makeLoop(ring3, 1200);
        a.start();
        b.start();
        c.start();
        return () => {
            a.stop();
            b.stop();
            c.stop();
        };
    }, [active]);

    const ringStyle = (anim: Animated.Value) => ({
        opacity: anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.45, 0] }),
        transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] }) }],
    });

    const feats = [
        { icon: '☽', label: 'Horoscope quotidien' },
        { icon: '◈', label: 'Analyse de synastrie' },
        { icon: '⟡', label: 'Miroir temporel' },
        { icon: '✦', label: 'Lyra, astrologue IA' },
    ];

    return (
        <View style={s.screenRoot}>
            <ScrollView
                contentContainerStyle={[s.screenScroll, { alignItems: 'center' }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Finale medallion with expanding rings */}
                <View style={s.finaleMedallionWrap}>
                    <Animated.View style={[s.finaleRing, s.finaleRingLg, ringStyle(ring3)]} />
                    <Animated.View style={[s.finaleRing, s.finaleRingMd, ringStyle(ring2)]} />
                    <Animated.View style={[s.finaleRing, ringStyle(ring1)]} />
                    <LinearGradient
                        colors={[`${colors.primary}50`, `${colors.secondary}30`, 'transparent']}
                        style={s.finaleCore}
                        start={{ x: 0.5, y: 0 }}
                        end={{ x: 0.5, y: 1 }}
                    >
                        <Text style={s.finaleGlyph}>✦</Text>
                    </LinearGradient>
                </View>

                <Text style={[s.h1, { textAlign: 'center' }]}>Tout est prêt</Text>
                <Text style={[s.lead, { textAlign: 'center' }]}>
                    Ton thème natal est enregistré. Toutes les fonctionnalités sont débloquées.
                </Text>

                <View style={s.featGrid}>
                    {feats.map((f, i) => (
                        <View key={i} style={s.featCard}>
                            <View style={s.featCardIcon}>
                                <Text style={s.featCardIconText}>{f.icon}</Text>
                            </View>
                            <Text style={s.featCardLabel}>{f.label}</Text>
                        </View>
                    ))}
                </View>

                <View style={[s.ctaInScroll, { width: '100%' }]}>
                    <GoldButton label="Entrer dans Lunestia" onPress={onFinish} size="lg" rightIcon />
                </View>
            </ScrollView>
        </View>
    );
}

// ─── Root screen ───────────────────────────────────────────────────────────────

export default function Onboarding2Screen() {
    const router = useRouter();

    const [step, setStep] = useState(0);
    const stepRef = useRef(0);

    // Fade + small directional shift (matches HTML prototype: translateX ±40px + opacity)
    const SLIDE = 40;
    const screenAnims = useRef(
        Array.from({ length: STEPS }, (_, i) => ({
            opacity: new Animated.Value(i === 0 ? 1 : 0),
            tx: new Animated.Value(i === 0 ? 0 : SLIDE),
        })),
    ).current;

    const goTo = useCallback(
        (next: number) => {
            const current = stepRef.current;
            if (current === next) return;
            const dir = next > current ? 1 : -1;

            // Position incoming screen off to the side
            screenAnims[next].tx.setValue(dir * SLIDE);
            screenAnims[next].opacity.setValue(0);

            stepRef.current = next;
            setStep(next);

            Animated.parallel([
                // Exit current: fade out + slight slide away
                Animated.timing(screenAnims[current].opacity, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(screenAnims[current].tx, {
                    toValue: -dir * SLIDE * 0.75,
                    duration: 250,
                    useNativeDriver: true,
                }),
                // Enter next: fade in + slide to center (slight delay)
                Animated.sequence([
                    Animated.delay(80),
                    Animated.parallel([
                        Animated.timing(screenAnims[next].opacity, {
                            toValue: 1,
                            duration: 320,
                            useNativeDriver: true,
                        }),
                        Animated.timing(screenAnims[next].tx, {
                            toValue: 0,
                            duration: 380,
                            useNativeDriver: true,
                        }),
                    ]),
                ]),
            ]).start(() => {
                // Reset exited screen to the opposite side
                screenAnims[current].tx.setValue(dir * SLIDE);
            });
        },
        [screenAnims],
    );

    const finish = useCallback(() => {
        router.replace('/(tabs)');
    }, [router]);

    const screens = [
        <ScreenPrivacy onContinue={() => goTo(1)} />,
        <ScreenGuide onContinue={() => goTo(2)} />,
        <ScreenForm onContinue={() => goTo(3)} onSkip={() => goTo(3)} />,
        <ScreenDone onFinish={finish} active={step === 3} />,
    ];

    return (
        <View style={s.root}>
            <LinearGradient
                colors={[colors.surfaceLowest, '#1e0f3a', colors.surfaceLowest]}
                locations={[0, 0.5, 1]}
                style={StyleSheet.absoluteFill}
            />
            {/* Ambient violet glow top */}
            <View
                style={[StyleSheet.absoluteFill, s.glowTop]}
                pointerEvents="none"
            />
            {/* Ambient gold glow bottom */}
            <View
                style={[StyleSheet.absoluteFill, s.glowBottom]}
                pointerEvents="none"
            />

            <Starfield />

            <SafeAreaView style={s.safe}>
                <ProgressDots step={step} />
                <BackButton visible={step > 0} onPress={() => goTo(step - 1)} />

                <View style={s.screensContainer}>
                    {screens.map((screen, i) => (
                        <Animated.View
                            key={i}
                            style={[
                                s.screenSlot,
                                {
                                    opacity: screenAnims[i].opacity,
                                    transform: [{ translateX: screenAnims[i].tx }],
                                },
                            ]}
                            pointerEvents={i === step ? 'auto' : 'none'}
                        >
                            {screen}
                        </Animated.View>
                    ))}
                </View>
            </SafeAreaView>
        </View>
    );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const FEAT_CARD_W = (W - spacing.xl * 2 - spacing.md) / 2 - 1;

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.surfaceLowest },
    safe: { flex: 1 },

    glowTop: {
        // Radial violet glow top-left
        backgroundColor: 'transparent',
        // Simulated via a semi-transparent overlay — real radial gradients need LinearGradient
    },
    glowBottom: {
        backgroundColor: 'transparent',
    },

    // ── Progress ──────────────────────────────────────────────────────────────
    dots: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        paddingTop: spacing.lg,
        paddingBottom: spacing.md,
    },
    dot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: `${colors.onSurface}2e`,
    },
    dotDone: {
        backgroundColor: `${colors.primary}8c`,
    },
    dotActive: {
        width: 26,
        backgroundColor: colors.primary,
    },

    // ── Back button ───────────────────────────────────────────────────────────
    backBtn: {
        position: 'absolute',
        top: 12,
        left: 16,
        zIndex: 20,
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: `${colors.onSurface}0a`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backBtnHidden: {
        opacity: 0,
    },

    // ── Screens container ─────────────────────────────────────────────────────
    screensContainer: {
        flex: 1,
    },
    screenSlot: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    screenRoot: {
        flex: 1,
    },
    screenScroll: {
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.md,
        paddingBottom: spacing.xxxl,
    },

    // ── Hero medallion ────────────────────────────────────────────────────────
    medallionWrap: {
        width: 124,
        height: 124,
        alignSelf: 'center',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: spacing.xl,
        marginBottom: spacing.xl,
    },
    medallionRing: {
        position: 'absolute',
        width: 140,
        height: 140,
        borderRadius: 70,
        borderWidth: 1,
        borderColor: `${colors.primary}38`,
    },
    medallionRingOuter: {
        width: 156,
        height: 156,
        borderRadius: 78,
    },
    medallion: {
        width: 124,
        height: 124,
        borderRadius: 62,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: `${colors.primary}2e`,
    },

    // ── Chip badge ────────────────────────────────────────────────────────────
    chipWrap: {
        alignItems: 'center',
        marginBottom: 4,
    },
    chip: {
        backgroundColor: `${colors.primary}1a`,
        borderRadius: radius.full,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.xs,
        borderWidth: 1,
        borderColor: `${colors.primary}40`,
    },
    chipText: {
        fontFamily: fonts.body.bold,
        fontSize: 11,
        letterSpacing: 1.8,
        color: colors.primary,
        textTransform: 'uppercase',
    },

    // ── Typography ────────────────────────────────────────────────────────────
    h1: {
        fontFamily: fonts.display.bold,
        fontSize: 34,
        lineHeight: 40,
        color: '#EFE6FF',
        letterSpacing: -0.3,
        marginTop: 14,
        marginBottom: 12,
    },
    lead: {
        fontFamily: fonts.body.regular,
        fontSize: 15,
        lineHeight: 23,
        color: colors.onSurfaceMuted,
        marginBottom: 18,
        maxWidth: 320,
    },

    // ── Card ──────────────────────────────────────────────────────────────────
    card: {
        borderRadius: radius.xl,
        backgroundColor: `${colors.onSurface}06`,
        borderWidth: 1,
        borderColor: `${colors.onSurface}12`,
        padding: spacing.xl,
        marginBottom: spacing.md,
    },
    listTitle: {
        fontFamily: fonts.body.bold,
        fontSize: 11,
        letterSpacing: 1.8,
        textTransform: 'uppercase',
        color: `${colors.onSurfaceMuted}aa`,
        marginBottom: 14,
    },

    // ── Data points (screen 0) ────────────────────────────────────────────────
    dataRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 14,
    },
    dataIcon: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: `${colors.primary}14`,
        borderWidth: 1,
        borderColor: `${colors.primary}2e`,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    dataBody: { flex: 1 },
    dataTitle: {
        fontFamily: fonts.body.semiBold,
        fontSize: 14,
        color: colors.onSurface,
        marginBottom: 2,
    },
    dataDesc: {
        fontFamily: fonts.body.regular,
        fontSize: 13,
        color: colors.onSurfaceMuted,
        lineHeight: 19,
    },

    // ── Consents (screen 0) ───────────────────────────────────────────────────
    consents: {
        gap: 14,
        marginTop: 18,
        marginBottom: 6,
    },
    consentRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        backgroundColor: `${colors.onSurface}0a`,
        borderWidth: 1.5,
        borderColor: `${colors.onSurfaceMuted}66`,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        marginTop: 2,
    },
    checkboxChecked: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    consentText: {
        flex: 1,
        fontFamily: fonts.body.regular,
        fontSize: 13,
        color: colors.onSurfaceMuted,
        lineHeight: 20,
    },

    // ── Feature rows (screen 1) ───────────────────────────────────────────────
    featureRow: {
        padding: 14,
        borderRadius: radius.lg,
        backgroundColor: `${colors.onSurface}06`,
        borderWidth: 1,
        borderColor: `${colors.onSurface}12`,
        marginBottom: 10,
    },
    featureRowOpen: {
        backgroundColor: `${colors.primary}0a`,
        borderColor: `${colors.primary}40`,
    },
    featureRowTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    featureIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: `${colors.primary}1a`,
        borderWidth: 1,
        borderColor: `${colors.primary}38`,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    featureIconOpen: {
        backgroundColor: `${colors.primary}26`,
    },
    featureName: {
        flex: 1,
        fontFamily: fonts.body.semiBold,
        fontSize: 15,
        color: colors.onSurface,
    },
    featureHelp: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: `${colors.onSurface}08`,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    featureHelpOpen: {
        backgroundColor: `${colors.primary}1a`,
    },
    featureDesc: {
        fontFamily: fonts.body.regular,
        fontSize: 13,
        color: colors.onSurfaceMuted,
        lineHeight: 20,
        paddingHorizontal: 4,
    },

    // ── Form (screen 2) ───────────────────────────────────────────────────────
    formLabel: {
        fontFamily: fonts.body.semiBold,
        fontSize: 13,
        color: colors.onSurface,
        letterSpacing: 0.2,
        marginBottom: spacing.sm,
    },
    formInput: {
        backgroundColor: `${colors.onSurface}0a`,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: `${colors.onSurface}1e`,
        minHeight: 52,
        paddingHorizontal: spacing.lg,
        justifyContent: 'center',
    },
    formInputFocused: {
        borderColor: `${colors.primary}99`,
        backgroundColor: `${colors.primary}0a`,
    },
    formText: {
        fontFamily: fonts.body.regular,
        fontSize: 15,
        color: colors.onSurface,
    },
    formHint: {
        fontFamily: fonts.body.regular,
        fontSize: 12,
        color: colors.onSurfaceMuted,
        marginTop: spacing.xs,
    },
    errorBox: {
        backgroundColor: `${colors.error}15`,
        borderRadius: radius.md,
        padding: spacing.md,
        marginTop: spacing.md,
    },
    errorText: {
        fontFamily: fonts.body.regular,
        fontSize: 13,
        color: colors.error,
        textAlign: 'center',
    },

    // ── Done screen (screen 3) ────────────────────────────────────────────────
    finaleMedallionWrap: {
        width: 120,
        height: 120,
        alignSelf: 'center',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: spacing.xl,
        marginBottom: spacing.xl,
    },
    finaleRing: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: `${colors.primary}20`,
    },
    finaleRingMd: {
        width: 120,
        height: 120,
        borderRadius: 60,
    },
    finaleRingLg: {
        width: 140,
        height: 140,
        borderRadius: 70,
    },
    finaleCore: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    finaleGlyph: {
        fontSize: 44,
        color: colors.primary,
    },
    featGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
        justifyContent: 'center',
        width: '100%',
        marginBottom: spacing.md,
    },
    featCard: {
        width: FEAT_CARD_W,
        backgroundColor: `${colors.onSurface}08`,
        borderRadius: radius.md,
        padding: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    featCardIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: `${colors.primary}1a`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    featCardIconText: {
        fontSize: 16,
        color: colors.primary,
    },
    featCardLabel: {
        flex: 1,
        fontFamily: fonts.body.regular,
        fontSize: 12,
        color: colors.onSurface,
        lineHeight: 16,
    },

    // ── CTA ───────────────────────────────────────────────────────────────────
    ctaInScroll: {
        gap: spacing.md,
        marginTop: spacing.xl,
    },
});
