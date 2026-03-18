/**
 * LegalScreen - Reusable component for legal pages
 * Displays formatted legal text with sections
 */

import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// Import directly to avoid circular dependency with index.ts
import { AppText, AppHeading } from './Text';
import { Spacer } from './Spacer';
import { colors, spacing, borderRadius } from '@/theme';

interface LegalSection {
    title: string;
    content: string;
}

interface LegalScreenProps {
    title: string;
    lastUpdate: string;
    sections: LegalSection[];
}

export function LegalScreen({ title, lastUpdate, sections }: LegalScreenProps) {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                    accessibilityLabel="Retour"
                    accessibilityRole="button"
                >
                    <AppText style={styles.backIcon}>←</AppText>
                </TouchableOpacity>
                <AppHeading variant="h2" style={styles.headerTitle}>
                    {title}
                </AppHeading>
                <View style={styles.placeholder} />
            </View>

            {/* Content */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={true}
            >
                {/* Last Update */}
                <View style={styles.updateBadge}>
                    <AppText variant="caption" color="muted">
                        {lastUpdate}
                    </AppText>
                </View>

                <Spacer size="xl" />

                {/* Sections */}
                {sections.map((section, index) => (
                    <View key={index} style={styles.section}>
                        <AppText variant="bodyMedium" color="primary" style={styles.sectionTitle}>
                            {section.title}
                        </AppText>
                        <Spacer size="sm" />
                        <AppText variant="body" color="secondary" style={styles.sectionContent}>
                            {section.content}
                        </AppText>
                        {index < sections.length - 1 && <Spacer size="xl" />}
                    </View>
                ))}

                <Spacer size="3xl" />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background.primary,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.screenPadding,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.subtle,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backIcon: {
        fontSize: 24,
        color: colors.brand.primary,
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
    },
    placeholder: {
        width: 40,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        paddingHorizontal: spacing.screenPadding,
        paddingTop: spacing.xl,
        paddingBottom: spacing['3xl'],
    },
    updateBadge: {
        backgroundColor: colors.surface.elevated,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.badge,
        alignSelf: 'flex-start',
    },
    section: {
        // Section styling
    },
    sectionTitle: {
        fontWeight: '600',
    },
    sectionContent: {
        lineHeight: 24,
    },
});

export default LegalScreen;
