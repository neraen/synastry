import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Svg, { Circle as SvgCircle, Line, Polygon } from 'react-native-svg';
import { fonts, spacing, radius } from '@/theme';
import { GoldButton } from '@/components/ui';

const TEXT = '#ECE5F7';
const TEXT_3 = '#8A82A6';

function ShareIcon() {
    return (
        <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={TEXT_3} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <SvgCircle cx="18" cy="5" r="3" />
            <SvgCircle cx="6" cy="12" r="3" />
            <SvgCircle cx="18" cy="19" r="3" />
            <Line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <Line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </Svg>
    );
}

function StarIcon() {
    return (
        <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={TEXT_3} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </Svg>
    );
}

interface Props {
    partnerName: string;
    historyId?: number;
    onShare?: () => void;
    onTheme?: () => void;
    onNew?: () => void;
}

export function CompatibilityActionsV2({ partnerName, onShare, onTheme, onNew }: Props) {
    return (
        <View style={styles.actions}>
            <View style={styles.row}>
                <Pressable style={styles.ghostBtn} onPress={onShare}>
                    <View style={styles.btnContent}>
                        <ShareIcon />
                        <Text style={styles.ghostBtnLabel}>Partager</Text>
                    </View>
                </Pressable>
                <Pressable style={styles.ghostBtn} onPress={onTheme}>
                    <View style={styles.btnContent}>
                        <StarIcon />
                        <Text style={styles.ghostBtnLabel}>Thème de {partnerName}</Text>
                    </View>
                </Pressable>
            </View>
            <GoldButton label="Nouvelle analyse" onPress={onNew ?? (() => {})} rightIcon />
        </View>
    );
}

const styles = StyleSheet.create({
    actions: {
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.xxxl,
        gap: spacing.md,
    },
    row: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    ghostBtn: {
        flex: 1,
        paddingVertical: 13,
        paddingHorizontal: 14,
        borderRadius: radius.md,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    ghostBtnLabel: {
        fontFamily: fonts.body.semiBold,
        fontSize: 13,
        color: TEXT,
        fontWeight: '600',
    },
});
