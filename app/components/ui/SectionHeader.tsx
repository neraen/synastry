/**
 * SectionHeader
 * Header row with title and optional action link.
 */

import React, { memo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { spacing } from '@/theme';
import { CelestialText } from './CelestialText';

interface SectionHeaderProps {
    title: string;
    action?: {
        label: string;
        onPress: () => void;
    };
}

export const SectionHeader = memo(function SectionHeader({
    title,
    action,
}: SectionHeaderProps) {
    return (
        <View style={styles.container}>
            <CelestialText variant="headlineMd">{title}</CelestialText>
            {action && (
                <Pressable onPress={action.onPress}>
                    <CelestialText variant="labelMd" color="gold">
                        {action.label}
                    </CelestialText>
                </Pressable>
            )}
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
});

export default SectionHeader;
