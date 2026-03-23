/**
 * FormattedText
 *
 * Renders GPT markdown-lite output:
 * - **text** → bold gold, no asterisks
 * - Lines starting with "1." "2." etc. → number bold gold + vertical spacing
 */

import React from 'react';
import { View, Text, ViewStyle, TextStyle } from 'react-native';
import { colors, spacing, fonts } from '@/theme';

const GOLD: TextStyle = { color: colors.primary, fontFamily: fonts.body.bold };

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
                const numberedMatch = line.match(/^(\d+\.)\s*(.*)/s);
                if (numberedMatch) {
                    return (
                        <Text key={i} style={[style, { marginTop: i === 0 ? 0 : spacing.lg, marginBottom: spacing.xs }]}>
                            <Text style={GOLD}>{numberedMatch[1]} </Text>
                            {inlineSegments(numberedMatch[2])}
                        </Text>
                    );
                }
                return (
                    <Text key={i} style={style}>
                        {inlineSegments(line)}
                    </Text>
                );
            })}
        </View>
    );
}