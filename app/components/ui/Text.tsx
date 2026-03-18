/**
 * Text Components - Typography system
 *
 * AppText - Body text with variants
 * AppHeading - Headings with semantic variants
 */

import React, { ReactNode } from 'react';
import { Text, TextStyle, StyleSheet } from 'react-native';
import { colors, typography, TypographyVariant } from '@/theme';

// Text color variants
type TextColor = 'primary' | 'secondary' | 'muted' | 'disabled' | 'inverse' | 'accent' | 'error' | 'success';

const colorMap: Record<TextColor, string> = {
    primary: colors.text.primary,
    secondary: colors.text.secondary,
    muted: colors.text.muted,
    disabled: colors.text.disabled,
    inverse: colors.text.inverse,
    accent: colors.brand.primary,
    error: colors.status.error,
    success: colors.status.success,
};

// AppText Component
type TextVariant = 'body' | 'bodyMedium' | 'bodySmall' | 'caption' | 'captionMedium' | 'label' | 'input';

interface AppTextProps {
    children: ReactNode;
    variant?: TextVariant;
    color?: TextColor;
    align?: 'left' | 'center' | 'right';
    style?: TextStyle;
    numberOfLines?: number;
}

export function AppText({
    children,
    variant = 'body',
    color = 'primary',
    align = 'left',
    style,
    numberOfLines,
}: AppTextProps) {
    const textStyle: TextStyle = {
        ...typography[variant],
        color: colorMap[color],
        textAlign: align,
    };

    return (
        <Text style={[textStyle, style]} numberOfLines={numberOfLines}>
            {children}
        </Text>
    );
}

// AppHeading Component
type HeadingVariant = 'display' | 'h1' | 'h2' | 'h3' | 'title' | 'titleSmall';

interface AppHeadingProps {
    children: ReactNode;
    variant?: HeadingVariant;
    color?: TextColor;
    align?: 'left' | 'center' | 'right';
    style?: TextStyle;
    numberOfLines?: number;
}

export function AppHeading({
    children,
    variant = 'h1',
    color = 'primary',
    align = 'left',
    style,
    numberOfLines,
}: AppHeadingProps) {
    const headingStyle: TextStyle = {
        ...typography[variant],
        color: colorMap[color],
        textAlign: align,
    };

    return (
        <Text style={[headingStyle, style]} numberOfLines={numberOfLines}>
            {children}
        </Text>
    );
}

// Specialized text components
interface ScoreTextProps {
    children: ReactNode;
    color?: TextColor;
    style?: TextStyle;
}

export function ScoreText({ children, color = 'accent', style }: ScoreTextProps) {
    return (
        <Text style={[typography.score, { color: colorMap[color] }, style]}>
            {children}
        </Text>
    );
}

interface TagTextProps {
    children: ReactNode;
    color?: TextColor;
    style?: TextStyle;
}

export function TagText({ children, color = 'muted', style }: TagTextProps) {
    return (
        <Text style={[typography.tag, { color: colorMap[color] }, style]}>
            {children}
        </Text>
    );
}

export default AppText;
