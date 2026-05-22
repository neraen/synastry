import React, { useEffect, useState } from 'react';
import {
    View,
    ScrollView,
    Text,
    StyleSheet,
    Pressable,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, spacing } from '@/theme';
import { Starfield } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';

import { CompatibilityHeroV2 } from '@/components/compatibility-v2/CompatibilityHeroV2';
import { DimensionBarsV2 } from '@/components/compatibility-v2/DimensionBarsV2';
import { AnalyseCelesteV2 } from '@/components/compatibility-v2/AnalyseCelesteV2';
import { AccordionListV2 } from '@/components/compatibility-v2/AccordionListV2';
import { AspectKeyV2 } from '@/components/compatibility-v2/AspectKeyV2';
import { AdviceCardV2 } from '@/components/compatibility-v2/AdviceCardV2';
import { CompatibilityActionsV2 } from '@/components/compatibility-v2/CompatibilityActionsV2';
import { MOCK_COMPAT_V2 } from '@/components/compatibility-v2/mockData';
import { setCompatibilityV2Data } from '@/components/compatibility-v2/store';
import type { CompatibilityV2Data } from '@/components/compatibility-v2/types';
import { getSynastryHistoryDetail, mapHistoryToV2Data, SynastryHistoryDetail } from '@/services/astrology';

export default function CompatibilityResultV2Screen() {
    const router = useRouter();
    const { user } = useAuth();
    const { id } = useLocalSearchParams<{ id?: string }>();

    const [data, setData] = useState<CompatibilityV2Data | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [rawHistory, setRawHistory] = useState<SynastryHistoryDetail | null>(null);

    useEffect(() => {
        // No id = demo mode (from profile dev buttons)
        if (!id) {
            setData(MOCK_COMPAT_V2);
            setLoading(false);
            return;
        }

        const historyId = parseInt(id, 10);
        const userName = user?.firstName || user?.email?.split('@')[0] || 'Moi';

        getSynastryHistoryDetail(historyId)
            .then((res) => {
                if (res.success && res.history) {
                    setRawHistory(res.history);
                    setData(mapHistoryToV2Data(res.history, userName));
                } else {
                    setError(res.error ?? 'Analyse introuvable.');
                }
            })
            .catch((e: any) => setError(e?.message ?? 'Erreur de chargement.'))
            .finally(() => setLoading(false));
    }, [id, user]);

    function handleShare() {
        if (!data) return;
        setCompatibilityV2Data(data);
        router.push('/share-card-v2');
    }

    function handleTheme() {
        if (!id) return;
        const bd = rawHistory?.partnerBirthData;
        const partnerBirthDate = bd
            ? `${bd.year}-${String(bd.month).padStart(2, '0')}-${String(bd.day).padStart(2, '0')}`
            : undefined;
        router.push({
            pathname: '/partner-chart',
            params: { historyId: id, ...(partnerBirthDate ? { partnerBirthDate } : {}) },
        });
    }

    function handleNew() {
        router.push('/(tabs)/compatibility');
    }

    if (loading) {
        return (
            <View style={styles.screen}>
                <Starfield />
                <SafeAreaView style={styles.safeArea} edges={['top']}>
                    <View style={styles.centered}>
                        <ActivityIndicator color={colors.primary} size="large" />
                        <Text style={styles.loadingText}>Analyse en cours…</Text>
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    if (error || !data) {
        return (
            <View style={styles.screen}>
                <Starfield />
                <SafeAreaView style={styles.safeArea} edges={['top']}>
                    <View style={styles.centered}>
                        <Text style={styles.errorText}>{error ?? 'Données introuvables.'}</Text>
                        <Pressable onPress={() => router.back()} style={styles.backBtn}>
                            <Text style={styles.backBtnText}>Retour</Text>
                        </Pressable>
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    return (
        <View style={styles.screen}>
            <Starfield />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <View style={styles.header}>
                    <Pressable onPress={() => router.back()} style={styles.backPressable} hitSlop={8}>
                        <Feather name="arrow-left" size={22} color={colors.onSurface} />
                    </Pressable>
                </View>

                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <CompatibilityHeroV2
                        scoreTarget={data.score}
                        tagline={data.tagline}
                        nameA={data.userInitial}
                        nameB={data.partnerInitial}
                        subjectA={data.userName}
                        subjectB={data.partnerName}
                    />

                    <DimensionBarsV2 data={data.dimensions} />

                    <AnalyseCelesteV2
                        headline={data.analyse.headline}
                        summary={data.analyse.summary}
                        longText={data.analyse.long_text}
                    />

                    <AccordionListV2
                        kicker="Forces de la relation"
                        items={data.forces}
                        variant="strength"
                    />

                    <AccordionListV2
                        kicker="Points de vigilance"
                        items={data.vigilance}
                        variant="watch"
                    />

                    <AspectKeyV2 {...data.aspect_cle} />

                    <AdviceCardV2
                        title={data.conseil.title}
                        text={data.conseil.text}
                    />

                    <CompatibilityActionsV2
                        partnerName={data.partnerName}
                        onShare={handleShare}
                        onTheme={handleTheme}
                        onNew={handleNew}
                    />

                    <View style={{ height: 40 }} />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.surfaceLowest },
    safeArea: { flex: 1 },
    header: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
    backPressable: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    scroll: { flex: 1 },
    scrollContent: { flexGrow: 1 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
    loadingText: { fontFamily: fonts.body.regular, fontSize: 14, color: colors.onSurfaceMuted },
    errorText: { fontFamily: fonts.body.regular, fontSize: 14, color: colors.error, textAlign: 'center', paddingHorizontal: spacing.xl },
    backBtn: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
    backBtnText: { fontFamily: fonts.body.semiBold, fontSize: 14, color: colors.primary },
});
