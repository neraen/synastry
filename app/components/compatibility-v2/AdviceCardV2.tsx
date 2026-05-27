import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { fonts, spacing } from '@/theme';

const GOLD = '#E5C266';
const GOLD_2 = '#F0D585';
const GOLD_SOFT = 'rgba(229,194,102,0.16)';
const TEXT_2 = '#BDB2D4';
const TEXT_3 = '#8A82A6';
const BORDER = 'rgba(255,255,255,0.07)';

function BulbIcon() {
    return (
        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
            {/* Section head */}
            <View style={styles.sectionHead}>
                <View style={styles.dot} />
                <Text style={styles.kicker}>Conseil de Lyra</Text>
                <View style={styles.rule} />
            </View>

            <View style={styles.card}>
                <View style={styles.adviceHead}>
                    <View style={styles.iconWrap}>
                        <BulbIcon />
                    </View>
                    <Text style={styles.title}>{title}</Text>
                </View>
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
    sectionHead: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
        marginHorizontal: 2,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: GOLD,
        shadowColor: GOLD,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 4,
        elevation: 2,
    },
    kicker: {
        fontFamily: fonts.body.semiBold,
        fontSize: 11,
        letterSpacing: 2.3,
        color: TEXT_3,
        textTransform: 'uppercase',
    },
    rule: {
        flex: 1,
        height: 1,
        backgroundColor: BORDER,
    },
    card: {
        borderRadius: 20,
        backgroundColor: 'rgba(229,194,102,0.04)',
        borderWidth: 1,
        borderColor: 'rgba(229,194,102,0.20)',
        paddingTop: 22,
        paddingBottom: 20,
        paddingHorizontal: 20,
    },
    adviceHead: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 10,
    },
    iconWrap: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: GOLD_SOFT,
        borderWidth: 1,
        borderColor: 'rgba(229,194,102,0.22)',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    title: {
        fontFamily: fonts.display.bold,
        fontSize: 18,
        color: GOLD_2,
        flex: 1,
        flexWrap: 'wrap',
    },
    text: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        lineHeight: 22,
        color: TEXT_2,
    },
});
