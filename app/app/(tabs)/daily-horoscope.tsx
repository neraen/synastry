import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import {
    Screen,
    AppButton,
    AppHeading,
    AppText,
    AppCard,
    Spacer,
    LoadingState,
    InlineLoading,
    HoroscopeCard,
} from '@/components/ui';
import {
    getDailyHoroscope,
    DailyHoroscope,
} from '@/services/astrology';
import { colors, spacing, borderRadius } from '@/theme';
import { aiDisclaimerText } from '@/constants/legalTexts';

const BG = require('@/assets/images/interface/background-starry.png');

// Card configuration for each horoscope section
const HOROSCOPE_SECTIONS = [
    { key: 'overview', icon: '✨', title: 'Aperçu', accentColor: colors.brand.primary },
    { key: 'love', icon: '💕', title: 'Amour', accentColor: colors.brand.accent },
    { key: 'energy', icon: '⚡', title: 'Énergie', accentColor: colors.status.success },
    { key: 'advice', icon: '💡', title: 'Conseil', accentColor: colors.brand.secondary },
] as const;

export default function DailyHoroscopeTab() {
    const router = useRouter();
    const { isAuthenticated, user, isLoading: isAuthLoading } = useAuth();

    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string>();
    const [horoscope, setHoroscope] = useState<DailyHoroscope | null>(null);

    const loadHoroscope = useCallback(async (refresh = false) => {
        try {
            setError(undefined);
            const response = await getDailyHoroscope(refresh);
            if (response.success && response.horoscope) {
                setHoroscope(response.horoscope);
            } else {
                setError(response.error || 'Erreur lors du chargement');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur inconnue');
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated && user?.hasBirthProfile) {
            loadHoroscope().finally(() => setIsLoading(false));
        } else {
            setIsLoading(false);
        }
    }, [isAuthenticated, user, loadHoroscope]);

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        await loadHoroscope(true);
        setIsRefreshing(false);
    }, [loadHoroscope]);

    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
        });
    };

    if (isAuthLoading || isLoading) {
        return (
            <Screen backgroundImage={BG}>
                <LoadingState message="Chargement de votre horoscope..." />
            </Screen>
        );
    }

    if (!isAuthenticated) {
        return (
            <Screen backgroundImage={BG}>
                <View style={styles.centerContent}>
                    <AppText style={styles.bigEmoji}>🌟</AppText>
                    <Spacer size="lg" />
                    <AppText variant="body" color="muted" align="center">
                        Connectez-vous pour voir votre horoscope quotidien
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
                    <AppText style={styles.bigEmoji}>🌙</AppText>
                    <Spacer size="lg" />
                    <AppText variant="body" color="muted" align="center">
                        Complétez votre profil pour recevoir votre horoscope personnalisé
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

    return (
        <Screen variant="scroll" backgroundImage={BG}>
            <Spacer size="xl" />

            {/* Header */}
            <View style={styles.header}>
                <AppText style={styles.headerIcon}>🌟</AppText>
                <AppHeading variant="h1" align="center">
                    Horoscope du Jour
                </AppHeading>
                {horoscope && (
                    <>
                        <Spacer size="sm" />
                        <AppText variant="body" color="muted" align="center">
                            {formatDate(horoscope.date)}
                        </AppText>
                    </>
                )}
            </View>

            {error && (
                <>
                    <Spacer size="lg" />
                    <AppCard variant="outline" style={styles.errorCard}>
                        <AppText variant="body" color="error" align="center">
                            {error}
                        </AppText>
                        <Spacer size="md" />
                        <AppButton
                            title="Réessayer"
                            onPress={() => loadHoroscope()}
                            variant="outline"
                        />
                    </AppCard>
                </>
            )}

            {isRefreshing && (
                <>
                    <Spacer size="lg" />
                    <View style={styles.refreshingContainer}>
                        <InlineLoading />
                        <Spacer size="sm" />
                        <AppText variant="body" color="muted" align="center">
                            Actualisation...
                        </AppText>
                    </View>
                </>
            )}

            {horoscope && !isRefreshing && (
                <>
                    {/* Title Card */}
                    <Spacer size="xl" />
                    <AppCard variant="highlight" style={styles.titleCard}>
                        <AppText variant="h3" align="center" color="primary">
                            {horoscope.title}
                        </AppText>
                    </AppCard>

                    {/* Horoscope Sections */}
                    <Spacer size="xl" />
                    <View style={styles.cardsContainer}>
                        {HOROSCOPE_SECTIONS.map((section) => {
                            const content = horoscope[section.key];
                            if (!content) return null;

                            return (
                                <React.Fragment key={section.key}>
                                    <HoroscopeCard
                                        icon={section.icon}
                                        title={section.title}
                                        content={content}
                                        accentColor={section.accentColor}
                                    />
                                    <Spacer size="md" />
                                </React.Fragment>
                            );
                        })}
                    </View>

                    {/* Refresh button */}
                    <Spacer size="lg" />
                    <View style={styles.refreshButtonContainer}>
                        <AppButton
                            title={horoscope.cached ? "Actualiser l'horoscope" : "Rafraîchir"}
                            onPress={handleRefresh}
                            variant="outline"
                            disabled={isRefreshing}
                        />
                    </View>

                    {/* Cached indicator */}
                    {horoscope.cached && (
                        <>
                            <Spacer size="md" />
                            <View style={styles.cachedIndicator}>
                                <AppText variant="caption" color="muted" align="center">
                                    Généré plus tôt aujourd'hui
                                </AppText>
                            </View>
                        </>
                    )}

                    {/* AI Disclaimer */}
                    <Spacer size="xl" />
                    <View style={styles.disclaimerContainer}>
                        <AppText variant="caption" color="muted" align="center" style={styles.disclaimerText}>
                            {aiDisclaimerText}
                        </AppText>
                    </View>
                </>
            )}

            <Spacer size="3xl" />
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
    errorCard: {
        borderColor: colors.status.error,
        padding: spacing.lg,
        alignItems: 'center',
    },
    refreshingContainer: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
    },
    titleCard: {
        padding: spacing.xl,
    },
    cardsContainer: {
        gap: spacing.md,
    },
    refreshButtonContainer: {
        alignItems: 'center',
    },
    cachedIndicator: {
        paddingVertical: spacing.sm,
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
