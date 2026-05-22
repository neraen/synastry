import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, fonts, spacing, radius } from '@/theme';

function BulbIcon() {
    return (
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3 11.2c.7.5 1 1.3 1 2.1V17h4v-.7c0-.8.3-1.6 1-2.1A6 6 0 0 0 12 3z" />
        </Svg>
    );
}

interface Props {
    title: string;
    text: string;
}

export function AdviceCardV2({ title, text }: Props) {
    return (
        <View style={styles.section}>
            <View style={styles.card}>
                <View style={styles.iconWrap}>
                    <BulbIcon />
                </View>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.text}>{text}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    section: {
        paddingHorizontal: spacing.xl,
        marginBottom: spacing.xxl,
    },
    card: {
        backgroundColor: `${colors.primary}0F`,
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: `${colors.primary}25`,
        padding: spacing.xl,
        alignItems: 'flex-start',
    },
    iconWrap: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: `${colors.primary}18`,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    title: {
        fontFamily: fonts.display.bold,
        fontSize: 16,
        color: colors.primary,
        marginBottom: spacing.sm,
    },
    text: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        lineHeight: 22,
        color: `${colors.onSurface}CC`,
    },
});
