import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    StyleSheet,
    Switch,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import {
    getNotificationPreferences,
    updateNotificationPreferences,
    NotificationPreferences,
} from '@/services/pushNotifications';
import { GlassCard } from '@/components/ui';
import { colors, spacing, radius, fonts } from '@/theme';

export default function NotificationPreferencesScreen() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [prefs, setPrefs] = useState<NotificationPreferences>({
        enabled: true,
        transitsEnabled: true,
        skyEventsEnabled: true,
        dailyReminderEnabled: false,
        preferredHour: 8,
        timezone: 'Europe/Paris',
    });

    useEffect(() => {
        getNotificationPreferences()
            .then(data => { if (data) setPrefs(data); })
            .finally(() => setIsLoading(false));
    }, []);

    const save = useCallback(async (patch: Partial<NotificationPreferences>) => {
        const next = { ...prefs, ...patch };
        setPrefs(next);
        setIsSaving(true);
        try {
            await updateNotificationPreferences(patch);
        } finally {
            setIsSaving(false);
        }
    }, [prefs]);

    if (isLoading) {
        return (
            <View style={styles.screen}>
                <SafeAreaView style={styles.safeArea} edges={['top']}>
                    <View style={styles.headerRow}>
                        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
                            <Feather name="arrow-left" size={22} color={colors.onSurface} />
                        </Pressable>
                    </View>
                    <View style={styles.centered}>
                        <ActivityIndicator color={colors.primary} size="large" />
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    return (
        <View style={styles.screen}>
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                    <View style={styles.headerRow}>
                        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
                            <Feather name="arrow-left" size={22} color={colors.onSurface} />
                        </Pressable>
                        {isSaving && (
                            <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 'auto', marginRight: 4 }} />
                        )}
                    </View>

                    <View style={styles.hero}>
                        <Text style={styles.heroTitle}>Notifications</Text>
                        <Text style={styles.heroSubtitle}>
                            Reçois des alertes astrologiques au bon moment, sans le bruit inutile.
                        </Text>
                    </View>

                    {/* Master toggle */}
                    <View style={styles.sectionPad}>
                        <GlassCard opacity="low" radius="xl">
                            <Row
                                icon="bell"
                                title="Notifications actives"
                                subtitle="Activer ou désactiver toutes les notifications"
                                value={prefs.enabled}
                                onToggle={v => save({ enabled: v })}
                            />
                        </GlassCard>
                    </View>

                    {/* Category toggles */}
                    <View style={[styles.sectionPad, { marginTop: spacing.lg }]}>
                        <Text style={styles.sectionLabel}>PAR CATÉGORIE</Text>
                        <GlassCard opacity="low" radius="xl">
                            <Row
                                icon="zap"
                                title="Transits importants"
                                subtitle="Saturne, Jupiter, Uranus… sur tes planètes natales"
                                value={prefs.enabled && prefs.transitsEnabled}
                                onToggle={v => save({ transitsEnabled: v })}
                                disabled={!prefs.enabled}
                            />
                            <View style={styles.divider} />
                            <Row
                                icon="moon"
                                title="Événements du ciel"
                                subtitle="Pleines lunes, rétrogrades, équinoxes"
                                value={prefs.enabled && prefs.skyEventsEnabled}
                                onToggle={v => save({ skyEventsEnabled: v })}
                                disabled={!prefs.enabled}
                            />
                            <View style={styles.divider} />
                            <Row
                                icon="sun"
                                title="Rappel quotidien"
                                subtitle={`"Ton horoscope du jour est prêt"`}
                                value={prefs.enabled && prefs.dailyReminderEnabled}
                                onToggle={v => save({ dailyReminderEnabled: v })}
                                disabled={!prefs.enabled}
                            />
                        </GlassCard>
                    </View>

                    {/* Preferred hour */}
                    <View style={[styles.sectionPad, { marginTop: spacing.lg }]}>
                        <Text style={styles.sectionLabel}>HEURE PRÉFÉRÉE</Text>
                        <GlassCard opacity="low" radius="xl">
                            <Text style={styles.hourLabel}>
                                Recevoir les notifications vers {prefs.preferredHour}h00
                            </Text>
                            <View style={styles.hourRow}>
                                {[7, 8, 9, 10, 18, 19, 20].map(h => (
                                    <Pressable
                                        key={h}
                                        style={[
                                            styles.hourChip,
                                            prefs.preferredHour === h && styles.hourChipActive,
                                        ]}
                                        onPress={() => save({ preferredHour: h })}
                                    >
                                        <Text style={[
                                            styles.hourChipText,
                                            prefs.preferredHour === h && styles.hourChipTextActive,
                                        ]}>
                                            {h}h
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        </GlassCard>
                    </View>

                    <View style={{ height: 80 }} />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

function Row({
    icon,
    title,
    subtitle,
    value,
    onToggle,
    disabled = false,
}: {
    icon: keyof typeof Feather.glyphMap;
    title: string;
    subtitle: string;
    value: boolean;
    onToggle: (v: boolean) => void;
    disabled?: boolean;
}) {
    return (
        <View style={rowStyles.row}>
            <View style={rowStyles.iconWrap}>
                <Feather name={icon} size={16} color={colors.primary} />
            </View>
            <View style={rowStyles.text}>
                <Text style={[rowStyles.title, disabled && rowStyles.disabled]}>{title}</Text>
                <Text style={rowStyles.subtitle}>{subtitle}</Text>
            </View>
            <Switch
                value={value}
                onValueChange={onToggle}
                disabled={disabled}
                trackColor={{ false: colors.surfaceContainerHigh, true: `${colors.primary}60` }}
                thumbColor={value ? colors.primary : colors.onSurfaceMuted}
            />
        </View>
    );
}

const rowStyles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.sm,
    },
    iconWrap: {
        width: 32,
        height: 32,
        borderRadius: radius.md,
        backgroundColor: `${colors.primary}15`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: { flex: 1 },
    title: {
        fontFamily: fonts.body.semiBold,
        fontSize: 14,
        color: colors.onSurface,
        marginBottom: 2,
    },
    subtitle: {
        fontFamily: fonts.body.regular,
        fontSize: 12,
        color: colors.onSurfaceMuted,
        lineHeight: 17,
    },
    disabled: { opacity: 0.4 },
});

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.surfaceLowest },
    safeArea: { flex: 1 },
    scrollContent: { flexGrow: 1 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    headerRow: {
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.md,
        paddingBottom: spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surfaceContainerHigh,
        borderRadius: radius.full,
    },

    hero: {
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.xl,
        paddingBottom: spacing.xxl,
    },
    heroTitle: {
        fontFamily: fonts.display.bold,
        fontSize: 36,
        lineHeight: 44,
        color: colors.onSurface,
        letterSpacing: -0.5,
        marginBottom: spacing.sm,
    },
    heroSubtitle: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        lineHeight: 22,
        color: colors.onSurfaceMuted,
        maxWidth: 300,
    },

    sectionPad: { paddingHorizontal: spacing.xl },
    sectionLabel: {
        fontFamily: fonts.body.semiBold,
        fontSize: 10,
        letterSpacing: 2,
        color: colors.onSurfaceMuted,
        textTransform: 'uppercase',
        marginBottom: spacing.md,
    },
    divider: {
        height: 1,
        backgroundColor: `${colors.onSurface}08`,
        marginVertical: spacing.xs,
    },

    hourLabel: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        color: colors.onSurfaceMuted,
        marginBottom: spacing.md,
    },
    hourRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    hourChip: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: radius.full,
        backgroundColor: colors.surfaceContainerHigh,
    },
    hourChipActive: {
        backgroundColor: `${colors.primary}20`,
        borderWidth: 1,
        borderColor: `${colors.primary}50`,
    },
    hourChipText: {
        fontFamily: fonts.body.semiBold,
        fontSize: 13,
        color: colors.onSurfaceMuted,
    },
    hourChipTextActive: {
        color: colors.primary,
    },
});
