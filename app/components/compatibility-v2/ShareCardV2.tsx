import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    Pressable,
    ScrollView,
    StyleSheet,
    Share,
    Platform,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop, Line as SvgLine } from 'react-native-svg';

const STAR_BLUE = '#7DD3FC';

function ConstellationCorner() {
    return (
        <View style={styles.constellation}>
            <Svg width={80} height={80} viewBox="0 0 100 100" fill="none">
                <SvgLine x1="15" y1="10" x2="55" y2="28" stroke={STAR_BLUE} strokeWidth="0.8" opacity="0.45" />
                <SvgLine x1="55" y1="28" x2="88" y2="12" stroke={STAR_BLUE} strokeWidth="0.8" opacity="0.4"  />
                <SvgLine x1="55" y1="28" x2="72" y2="65" stroke={STAR_BLUE} strokeWidth="0.8" opacity="0.4"  />
                <SvgLine x1="88" y1="12" x2="95" y2="50" stroke={STAR_BLUE} strokeWidth="0.8" opacity="0.35" />
                <SvgLine x1="72" y1="65" x2="95" y2="50" stroke={STAR_BLUE} strokeWidth="0.8" opacity="0.35" />
                <SvgLine x1="30" y1="55" x2="55" y2="28" stroke={STAR_BLUE} strokeWidth="0.8" opacity="0.3"  />
                <SvgLine x1="30" y1="55" x2="72" y2="65" stroke={STAR_BLUE} strokeWidth="0.8" opacity="0.28" />
                <Circle cx="15" cy="10" r="1.8" fill={STAR_BLUE} opacity="0.5"  />
                <Circle cx="55" cy="28" r="2.4" fill={STAR_BLUE} opacity="0.65" />
                <Circle cx="88" cy="12" r="1.6" fill={STAR_BLUE} opacity="0.5"  />
                <Circle cx="72" cy="65" r="2.0" fill={STAR_BLUE} opacity="0.55" />
                <Circle cx="95" cy="50" r="1.4" fill={STAR_BLUE} opacity="0.45" />
                <Circle cx="30" cy="55" r="1.6" fill={STAR_BLUE} opacity="0.45" />
            </Svg>
        </View>
    );
}
import { captureRef } from 'react-native-view-shot';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, spacing, radius } from '@/theme';
import { Starfield } from '@/components/ui';
import type { CompatibilityV2Data, CompatibilityDimension } from './types';

// ─── Format config ────────────────────────────────────────────────────────────

type Format = 'story' | 'portrait' | 'square';

const FORMAT_RATIOS: Record<Format, { width: number; height: number; maxDims: number }> = {
    story:    { width: 270, height: 480, maxDims: 5 },
    portrait: { width: 270, height: 338, maxDims: 5 },
    square:   { width: 270, height: 270, maxDims: 3 },
};

// ─── Dimension colors ─────────────────────────────────────────────────────────

const DIM_COLORS: Record<string, string> = {
    amour:         '#EC4899',
    communication: '#60A5FA',
    conflits:      '#F59E0B',
    long_terme:    colors.primary,
    attirance:     '#A855F7',
};

// ─── Inner ShareCard (capturable) ────────────────────────────────────────────

interface CardProps {
    format: Format;
    data: CompatibilityV2Data;
}

export function ShareCardV2({ format, data }: CardProps) {
    const { width, height, maxDims } = FORMAT_RATIOS[format];
    const ringSize = format === 'story' ? 120 : 90;
    const stroke = 7;
    const r = (ringSize - stroke) / 2;
    const C = 2 * Math.PI * r;
    const dashOffset = C - (data.score / 100) * C;

    const dims = data.dimensions.slice(0, maxDims);

    return (
        <View style={[styles.card, { width, height }]}>
            {/* Background */}
            <View style={[StyleSheet.absoluteFill, styles.cardBg]} />

            <ConstellationCorner />

            {/* Branding */}
            <View style={styles.brand}>
                <Text style={styles.brandName}>Lunestia</Text>
                <Text style={styles.brandSub}>★ Synastrie</Text>
            </View>

            {/* Names */}
            <View style={styles.namesWrap}>
                <Text style={styles.namesLabel}>Compatibilité</Text>
                <Text style={styles.namesPair}>
                    {data.userName} <Text style={styles.namesAmp}>&</Text> {data.partnerName}
                </Text>
            </View>

            {/* Score ring */}
            <View style={styles.scoreWrap}>
                <Svg width={ringSize} height={ringSize} viewBox={`0 0 ${ringSize} ${ringSize}`}>
                    <Defs>
                        <SvgGradient id={`sg_${format}`} x1="0%" y1="0%" x2="100%" y2="100%">
                            <Stop offset="0%" stopColor={colors.primary} />
                            <Stop offset="60%" stopColor="#E5C266" />
                            <Stop offset="100%" stopColor={colors.secondaryContainer} />
                        </SvgGradient>
                    </Defs>
                    <Circle cx={ringSize / 2} cy={ringSize / 2} r={r} fill="none" stroke={colors.surfaceContainerHighest} strokeWidth={stroke} />
                    <Circle
                        cx={ringSize / 2} cy={ringSize / 2} r={r}
                        fill="none" stroke={`url(#sg_${format})`} strokeWidth={stroke}
                        strokeDasharray={C} strokeDashoffset={dashOffset}
                        strokeLinecap="round" rotation={-90} origin={`${ringSize / 2},${ringSize / 2}`}
                    />
                </Svg>
                <View style={styles.scoreNumWrap}>
                    <Text style={[styles.scoreNum, { fontSize: format === 'story' ? 28 : 22 }]}>
                        {data.score}<Text style={{ fontSize: format === 'story' ? 14 : 12 }}>%</Text>
                    </Text>
                    <Text style={styles.scoreNumLabel}>Compat.</Text>
                </View>
            </View>

            {/* Tagline */}
            <Text style={[styles.tagline, { fontSize: format === 'story' ? 11 : 10 }]}>
                « {data.tagline} »
            </Text>

            {/* Dimension bars */}
            <View style={styles.dims}>
                {dims.map((d) => (
                    <View key={d.id} style={styles.dim}>
                        <Text style={styles.dimLabel}>{d.name}</Text>
                        <View style={styles.dimTrack}>
                            <View style={[styles.dimFill, { width: `${d.value}%`, backgroundColor: DIM_COLORS[d.id] ?? colors.primary }]} />
                        </View>
                        <Text style={styles.dimVal}>{d.value}</Text>
                    </View>
                ))}
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                <Text style={styles.footerLeft}>lunestia.app</Text>
                <Text style={styles.footerRight}>Découvre ta synastrie</Text>
            </View>
        </View>
    );
}

// ─── Share Card Page ──────────────────────────────────────────────────────────

interface PageProps {
    data: CompatibilityV2Data;
}

export function ShareCardPageV2({ data }: PageProps) {
    const router = useRouter();
    const [format, setFormat] = useState<Format>('story');
    const [toast, setToast] = useState<string | null>(null);
    const cardRef = useRef<View>(null);

    const flash = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 2000);
    };

    const handleCapture = async () => {
        try {
            const uri = await captureRef(cardRef, { format: 'png', quality: 0.9 });
            if (Platform.OS === 'ios') {
                await Share.share({ url: uri });
            } else {
                await Share.share({ message: `Compatibilité ${data.userName} & ${data.partnerName} : ${data.score}%\n\n« ${data.tagline} »\n\nLunestia` });
            }
        } catch {
            flash('Impossible de capturer la carte');
        }
    };

    const handleNativeShare = async () => {
        try {
            await Share.share({
                message: `Compatibilité ${data.userName} & ${data.partnerName} : ${data.score}%\n\n« ${data.tagline} »\n\nDécouvre ta synastrie sur Lunestia`,
            });
        } catch {}
    };

    const formatBtns: { key: Format; label: string }[] = [
        { key: 'story',    label: 'Story'  },
        { key: 'portrait', label: 'Post'   },
        { key: 'square',   label: 'Carré'  },
    ];

    return (
        <View style={styles.screen}>
            <Starfield />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                    {/* Header */}
                    <View style={styles.header}>
                        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
                            <Feather name="arrow-left" size={20} color={colors.onSurface} />
                        </Pressable>
                        <Text style={styles.headerTitle}>Partager</Text>
                        <Pressable onPress={handleNativeShare} style={styles.backBtn} hitSlop={12}>
                            <Feather name="share-2" size={18} color={colors.onSurface} />
                        </Pressable>
                    </View>

                    <Text style={styles.subtitle}>Choisis un format, prévisualise et publie ta carte.</Text>

                    {/* Format tabs */}
                    <View style={styles.formatTabs}>
                        {formatBtns.map(({ key, label }) => (
                            <Pressable
                                key={key}
                                style={[styles.formatTab, format === key && styles.formatTabActive]}
                                onPress={() => setFormat(key)}
                            >
                                <Text style={[styles.formatTabText, format === key && styles.formatTabTextActive]}>{label}</Text>
                            </Pressable>
                        ))}
                    </View>

                    {/* Card preview */}
                    <View style={styles.preview}>
                        <View ref={cardRef} collapsable={false}>
                            <ShareCardV2 format={format} data={data} />
                        </View>
                    </View>

                    {/* Social chips */}
                    <View style={styles.socialSection}>
                        <Text style={styles.socialLabel}>Publier sur</Text>
                        <View style={styles.chipGrid}>
                            {[
                                { label: 'Instagram', icon: 'instagram' as const },
                                { label: 'TikTok',    icon: 'music' as const },
                                { label: 'X / Twitter', icon: 'twitter' as const },
                                { label: 'WhatsApp',  icon: 'message-circle' as const },
                                { label: 'Facebook',  icon: 'facebook' as const },
                                { label: 'Copier',    icon: 'copy' as const },
                            ].map(({ label, icon }) => (
                                <Pressable
                                    key={label}
                                    style={styles.chip}
                                    onPress={() => flash(`Préparation pour ${label}…`)}
                                >
                                    <Feather name={icon} size={18} color={colors.primary} />
                                    <Text style={styles.chipLabel}>{label}</Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>

                    {/* Main CTA */}
                    <Pressable style={styles.cta} onPress={handleCapture}>
                        <Feather name="share" size={16} color={colors.surfaceLowest} />
                        <Text style={styles.ctaText}>Partager maintenant</Text>
                    </Pressable>

                    <View style={{ height: 80 }} />
                </ScrollView>
            </SafeAreaView>

            {/* Toast */}
            {!!toast && (
                <View style={styles.toast}>
                    <Feather name="check" size={14} color="#4ade80" />
                    <Text style={styles.toastText}>{toast}</Text>
                </View>
            )}
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const { width: SW } = Dimensions.get('window');

const styles = StyleSheet.create({
    // Card styles
    card: {
        overflow: 'hidden',
        position: 'relative',
        padding: spacing.lg,
        justifyContent: 'space-between',
    },
    cardBg: {
        backgroundColor: colors.surfaceLowest,
    },
    constellation: {
        position: 'absolute',
        top: 0,
        right: 0,
    },
    brand: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    brandName: {
        fontFamily: fonts.display.bold,
        fontSize: 14,
        color: colors.primary,
        letterSpacing: 0.5,
    },
    brandSub: {
        fontFamily: fonts.body.regular,
        fontSize: 10,
        color: colors.onSurfaceMuted,
    },
    namesWrap: {
        marginBottom: spacing.sm,
    },
    namesLabel: {
        fontFamily: fonts.body.semiBold,
        fontSize: 9,
        letterSpacing: 1.5,
        color: colors.onSurfaceMuted,
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    namesPair: {
        fontFamily: fonts.display.bold,
        fontSize: 16,
        color: colors.onSurface,
        lineHeight: 22,
    },
    namesAmp: {
        color: colors.primary,
    },
    scoreWrap: {
        alignSelf: 'center',
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: spacing.sm,
    },
    scoreNumWrap: {
        position: 'absolute',
        alignItems: 'center',
    },
    scoreNum: {
        fontFamily: fonts.display.bold,
        color: colors.onSurface,
        lineHeight: undefined,
    },
    scoreNumLabel: {
        fontFamily: fonts.body.semiBold,
        fontSize: 8,
        letterSpacing: 1,
        color: colors.onSurfaceMuted,
        textTransform: 'uppercase',
        textAlign: 'center',
    },
    tagline: {
        fontFamily: fonts.display.regular,
        color: colors.onSurfaceMuted,
        fontStyle: 'italic',
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    dims: { gap: 4 },
    dim: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    dimLabel: {
        fontFamily: fonts.body.regular,
        fontSize: 8,
        color: colors.onSurfaceMuted,
        width: 60,
    },
    dimTrack: {
        flex: 1,
        height: 3,
        backgroundColor: colors.surfaceContainerHighest,
        borderRadius: 2,
        overflow: 'hidden',
    },
    dimFill: {
        height: 3,
        borderRadius: 2,
        opacity: 0.8,
    },
    dimVal: {
        fontFamily: fonts.body.semiBold,
        fontSize: 8,
        color: colors.onSurfaceMuted,
        width: 20,
        textAlign: 'right',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: spacing.sm,
    },
    footerLeft: {
        fontFamily: fonts.body.regular,
        fontSize: 8,
        color: `${colors.primary}80`,
    },
    footerRight: {
        fontFamily: fonts.body.regular,
        fontSize: 8,
        color: colors.onSurfaceMuted,
    },

    // Page styles
    screen: { flex: 1, backgroundColor: colors.surfaceLowest },
    safeArea: { flex: 1 },
    scrollContent: { flexGrow: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
    },
    backBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: colors.surfaceContainerHigh,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontFamily: fonts.display.regular,
        fontSize: 18,
        color: colors.onSurface,
    },
    subtitle: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        color: colors.onSurfaceMuted,
        textAlign: 'center',
        paddingHorizontal: spacing.xl,
        marginBottom: spacing.xl,
    },
    formatTabs: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: spacing.sm,
        marginBottom: spacing.xl,
        paddingHorizontal: spacing.xl,
    },
    formatTab: {
        flex: 1,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: radius.full,
        backgroundColor: colors.surfaceContainerHigh,
        alignItems: 'center',
    },
    formatTabActive: {
        backgroundColor: `${colors.primary}25`,
        borderWidth: 1,
        borderColor: `${colors.primary}50`,
    },
    formatTabText: {
        fontFamily: fonts.body.semiBold,
        fontSize: 13,
        color: colors.onSurfaceMuted,
    },
    formatTabTextActive: {
        color: colors.primary,
    },
    preview: {
        alignItems: 'center',
        marginBottom: spacing.xxl,
        paddingHorizontal: spacing.xl,
    },
    socialSection: {
        paddingHorizontal: spacing.xl,
        marginBottom: spacing.xl,
    },
    socialLabel: {
        fontFamily: fonts.body.semiBold,
        fontSize: 10,
        letterSpacing: 1.5,
        color: colors.onSurfaceMuted,
        textTransform: 'uppercase',
        marginBottom: spacing.md,
    },
    chipGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: colors.surfaceContainerHigh,
        borderRadius: radius.full,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    chipLabel: {
        fontFamily: fonts.body.medium,
        fontSize: 13,
        color: colors.onSurface,
    },
    cta: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        marginHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
        borderRadius: radius.full,
        backgroundColor: colors.primary,
    },
    ctaText: {
        fontFamily: fonts.body.bold,
        fontSize: 14,
        color: colors.surfaceLowest,
        letterSpacing: 0.5,
    },
    toast: {
        position: 'absolute',
        bottom: 60,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: colors.surfaceContainerHigh,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: radius.full,
    },
    toastText: {
        fontFamily: fonts.body.medium,
        fontSize: 13,
        color: colors.onSurface,
    },
});
