/**
 * TransitCard
 * Vertical timeline of astrological transits.
 */

import React, { memo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing } from '@/theme';
import { CelestialText } from './CelestialText';

interface TransitItem {
    dateRange: string;
    title: string;
    description: string;
    onPress?: () => void;
}

interface TransitCardProps {
    items: TransitItem[];
}

// outline #474556 at 30% and 50% opacity
const GUIDE_LINE_COLOR = 'rgba(71, 69, 86, 0.3)';
const DOT_COLOR = 'rgba(71, 69, 86, 0.5)';

const TransitItemRow = memo(function TransitItemRow({
    item,
    isLast,
}: {
    item: TransitItem;
    isLast: boolean;
}) {
    const content = (
        <View style={[styles.itemRow, !isLast && styles.itemSpacing]}>
            {/* Dot */}
            <View style={styles.dotContainer}>
                <View style={styles.dot} />
            </View>
            {/* Content */}
            <View style={styles.itemContent}>
                <CelestialText variant="labelSm" color="muted">
                    {item.dateRange}
                </CelestialText>
                <View style={styles.titleSpacing}>
                    <CelestialText variant="headlineMd">
                        {item.title}
                    </CelestialText>
                </View>
                <CelestialText variant="bodyMd" color="muted">
                    {item.description}
                </CelestialText>
            </View>
        </View>
    );

    if (item.onPress) {
        return (
            <Pressable
                onPress={item.onPress}
                style={({ pressed }) => pressed && styles.pressed}
            >
                {content}
            </Pressable>
        );
    }

    return content;
});

export const TransitCard = memo(function TransitCard({
    items,
}: TransitCardProps) {
    return (
        <View style={styles.container}>
            {/* Timeline guide line */}
            <LinearGradient
                colors={['transparent', GUIDE_LINE_COLOR, 'transparent']}
                style={styles.guideLine}
            />
            {/* Items */}
            <View style={styles.itemsContainer}>
                {items.map((item, index) => (
                    <TransitItemRow
                        key={index}
                        item={item}
                        isLast={index === items.length - 1}
                    />
                ))}
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        position: 'relative',
    },
    guideLine: {
        position: 'absolute',
        left: 3,
        top: 0,
        bottom: 0,
        width: 1,
    },
    itemsContainer: {
        paddingLeft: spacing.xl,
    },
    itemRow: {
        flexDirection: 'row',
    },
    itemSpacing: {
        marginBottom: spacing.xxl,
    },
    dotContainer: {
        position: 'absolute',
        left: -spacing.xl + 3,
        top: 4,
        width: 8,
        height: 8,
        marginLeft: -4,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: DOT_COLOR,
    },
    itemContent: {
        flex: 1,
    },
    titleSpacing: {
        marginTop: spacing.xs,
        marginBottom: spacing.sm,
    },
    pressed: {
        opacity: 0.7,
    },
});

export default TransitCard;
