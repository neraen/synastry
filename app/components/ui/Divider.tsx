/**
 * Divider - Visual separator
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, typography } from '@/theme';

interface DividerProps {
    variant?: 'default' | 'subtle' | 'strong';
    spacing?: 'none' | 'sm' | 'md' | 'lg';
    text?: string;
    style?: ViewStyle;
}

export function Divider({
    variant = 'default',
    spacing: spacingSize = 'md',
    text,
    style,
}: DividerProps) {
    const lineColor = {
        default: colors.border.default,
        subtle: colors.border.subtle,
        strong: colors.border.strong,
    }[variant];

    const verticalSpacing = {
        none: 0,
        sm: spacing.sm,
        md: spacing.md,
        lg: spacing.lg,
    }[spacingSize];

    if (text) {
        return (
            <View
                style={[
                    styles.container,
                    styles.textContainer,
                    { marginVertical: verticalSpacing },
                    style,
                ]}
            >
                <View style={[styles.line, styles.textLine, { backgroundColor: lineColor }]} />
                <Text style={styles.text}>{text}</Text>
                <View style={[styles.line, styles.textLine, { backgroundColor: lineColor }]} />
            </View>
        );
    }

    return (
        <View
            style={[
                styles.container,
                { marginVertical: verticalSpacing },
                style,
            ]}
        >
            <View style={[styles.line, { backgroundColor: lineColor }]} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        alignItems: 'center',
    },
    textContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    line: {
        width: '100%',
        height: 1,
    },
    textLine: {
        flex: 1,
    },
    text: {
        ...typography.bodySmall,
        color: colors.text.muted,
        paddingHorizontal: spacing.md,
        textTransform: 'lowercase',
    },
});

export default Divider;
