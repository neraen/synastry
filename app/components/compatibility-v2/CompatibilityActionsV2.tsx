import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Svg, { Circle as SvgCircle, Line, Path, Polygon } from 'react-native-svg';
import { colors, fonts, spacing, radius } from '@/theme';
import { GoldButton, GhostButton } from '@/components/ui';

function ShareIcon() {
    return (
        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.onSurface} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.onSurface} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                    <Text style={styles.ghostBtnInner}>
                        <ShareIcon />
                        {'  '}Partager
                    </Text>
                </Pressable>
                <Pressable style={styles.ghostBtn} onPress={onTheme}>
                    <Text style={styles.ghostBtnInner}>
                        <StarIcon />
                        {'  '}Thème de {partnerName}
                    </Text>
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
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderRadius: radius.full,
        backgroundColor: 'rgba(30, 19, 56, 0.50)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.10)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    ghostBtnInner: {
        fontFamily: fonts.body.semiBold,
        fontSize: 13,
        color: colors.onSurface,
        textAlign: 'center',
    },
});
