/**
 * FormattedText
 *
 * Renders GPT markdown-lite output:
 * - ### Heading  → display font, onSurface, larger size, top margin
 * - ## Heading   → same as ###
 * - **text**     → bold gold, no asterisks
 * - 1. item      → number bold gold + vertical spacing
 * - blank lines  → vertical gap
 */

import React from 'react';
import { View, Text, ViewStyle, TextStyle } from 'react-native';
import { colors, spacing, fonts } from '@/theme';

const GOLD: TextStyle = { color: colors.primary, fontFamily: fonts.body.bold };

const HEADING: TextStyle = {
    fontFamily: fonts.display.semiBold,
    fontSize: 16,
    color: colors.primary,
    lineHeight: 24,
};

function inlineSegments(line: string) {
    const parts = line.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, i) =>
        i % 2 === 1 ? <Text key={i} style={GOLD}>{part}</Text> : part
    );
}

interface FormattedTextProps {
    text: string;
    style?: TextStyle;
    containerStyle?: ViewStyle;
}

export function FormattedText({ text, style, containerStyle }: FormattedTextProps) {
    const lines = text.split('\n');
    return (
        <View style={containerStyle}>
            {lines.map((line, i) => {
                // ### or ## heading
                const headingMatch = line.match(/^#{2,3}\s+(.*)/);
                if (headingMatch) {
                    return (
                        <Text key={i} selectable style={[HEADING, { marginTop: i === 0 ? 0 : spacing.xl, marginBottom: spacing.xs }]}>
                            {headingMatch[1]}
                        </Text>
                    );
                }

                // Numbered list item
                const numberedMatch = line.match(/^(\d+\.)\s*(.*)/s);
                if (numberedMatch) {
                    return (
                        <Text key={i} selectable style={[style, { marginTop: i === 0 ? 0 : spacing.lg, marginBottom: spacing.xs }]}>
                            <Text style={GOLD}>{numberedMatch[1]} </Text>
                            {inlineSegments(numberedMatch[2])}
                        </Text>
                    );
                }

                // Blank line → small gap
                if (line.trim() === '') {
                    return <View key={i} style={{ height: spacing.sm }} />;
                }

                return (
                    <Text key={i} selectable style={style}>
                        {inlineSegments(line)}
                    </Text>
                );
            })}
        </View>
    );
}