import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, spacing, radius } from '@/theme';
import { PlanetGlyph } from './PlanetSignGlyphs';
import type { CompatibilityAspectCle } from './types';

interface Props extends CompatibilityAspectCle {}

export function AspectKeyV2({ planet_a, planet_b, name, desc }: Props) {
    return (
        <View style={styles.section}>
            <View style={styles.card}>
                <Text style={styles.kicker}>Aspect clé · Conjonction parfaite</Text>

                {/* Visual: two planets linked */}
                <View style={styles.visual}>
                    <PlanetGlyph id={planet_a} size={52} />
                    <View style={styles.link}>
                        <View style={styles.linkLine} />
                        <Text style={styles.conjSymbol}>☌</Text>
                        <View style={styles.linkLine} />
                    </View>
                    <PlanetGlyph id={planet_b} size={52} />
                </View>

                <Text style={styles.name}>{name}</Text>
                <Text style={styles.desc}>{desc}</Text>
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
        backgroundColor: 'rgba(68, 15, 219, 0.12)',
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: `${colors.secondary}30`,
        padding: spacing.xl,
        alignItems: 'center',
    },
    kicker: {
        fontFamily: fonts.body.semiBold,
        fontSize: 10,
        letterSpacing: 1.5,
        color: colors.secondary,
        textTransform: 'uppercase',
        marginBottom: spacing.xl,
        textAlign: 'center',
    },
    visual: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.lg,
        gap: spacing.sm,
    },
    link: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.sm,
    },
    linkLine: {
        width: 20,
        height: 1,
        backgroundColor: `${colors.secondary}50`,
    },
    conjSymbol: {
        fontFamily: fonts.display.regular,
        fontSize: 20,
        color: colors.secondary,
        lineHeight: 24,
    },
    name: {
        fontFamily: fonts.display.bold,
        fontSize: 18,
        color: colors.onSurface,
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    desc: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        lineHeight: 22,
        color: `${colors.onSurface}CC`,
        textAlign: 'center',
    },
});
