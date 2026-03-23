/**
 * CelestialText
 * The ONLY text component to use across the entire app.
 */

import React, { memo } from 'react';
import { Text, StyleProp, TextStyle } from 'react-native';
import { typography, colors } from '@/theme';

type Variant =
    | 'displayLg'
    | 'displayMd'
    | 'headlineLg'
    | 'headlineMd'
    | 'titleLg'
    | 'titleMd'
    | 'bodyLg'
    | 'bodyMd'
    | 'labelMd'
    | 'labelSm';

type Color = 'primary' | 'muted' | 'gold' | 'secondary' | 'error';

interface CelestialTextProps {
    children: React.ReactNode;
    variant: Variant;
    color?: Color;
    align?: 'left' | 'center' | 'right';
    italic?: boolean;
    numberOfLines?: number;
    style?: StyleProp<TextStyle>;
}

const colorMap: Record<Color, string> = {
    primary: colors.onSurface,
    muted: colors.onSurfaceMuted,
    gold: colors.primary,
    secondary: colors.secondary,
    error: colors.error,
};

export const CelestialText = memo(function CelestialText({
    children,
    variant,
    color = 'primary',
    align,
    italic,
    numberOfLines,
    style,
}: CelestialTextProps) {
    const textStyle: TextStyle = {
        ...typography[variant],
        color: colorMap[color],
        ...(align && { textAlign: align }),
        ...(italic && { fontStyle: 'italic' }),
    };

    return (
        <Text style={[textStyle, style]} numberOfLines={numberOfLines}>
            {children}
        </Text>
    );
});

export default CelestialText;
