/**
 * Spacer - Consistent vertical/horizontal spacing component
 */

import React from 'react';
import { View } from 'react-native';
import { spacing, Spacing } from '@/theme';

type SpacingKey = keyof Spacing;

interface SpacerProps {
    size?: SpacingKey | number;
    horizontal?: boolean;
}

export function Spacer({ size = 'md', horizontal = false }: SpacerProps) {
    const value = typeof size === 'number' ? size : spacing[size];

    return (
        <View
            style={
                horizontal
                    ? { width: value, height: '100%' }
                    : { height: value, width: '100%' }
            }
        />
    );
}

// Pre-defined spacers for common use
export function SpacerXS() {
    return <Spacer size="xs" />;
}

export function SpacerSM() {
    return <Spacer size="sm" />;
}

export function SpacerMD() {
    return <Spacer size="md" />;
}

export function SpacerLG() {
    return <Spacer size="lg" />;
}

export function SpacerXL() {
    return <Spacer size="xl" />;
}

export function Spacer2XL() {
    return <Spacer size="2xl" />;
}

export function SectionSpacer() {
    return <Spacer size="sectionGap" />;
}

export default Spacer;
