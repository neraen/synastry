/**
 * Ton Ciel — aperçu et partage du poster (story 9:16).
 */

import React, { useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Canvas, Picture, useTypeface } from '@shopify/react-native-skia';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { useTranslation } from 'react-i18next';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import { GhostButton, GoldButton } from '@/components/ui';
import { POSTER_H, POSTER_W, posterPicture, posterPngBase64, type PosterContent } from './sky-poster';

type Props = PosterContent & {
    /** Place disponible pour la feuille */
    width: number;
    height: number;
    bottomInset: number;
    onClose: () => void;
};

const FILE_NAME = 'mon-ciel-de-naissance.png';

export function SkyPosterSheet({ model, title, subtitle, width, height, bottomInset, onClose }: Props) {
    const { t } = useTranslation();
    const display = useTypeface(require('@expo-google-fonts/noto-serif/500Medium/NotoSerif_500Medium.ttf'));
    const body = useTypeface(require('@expo-google-fonts/manrope/500Medium/Manrope_500Medium.ttf'));
    const [sharing, setSharing] = useState(false);
    const [failed, setFailed] = useState(false);

    // L'aperçu tient dans la hauteur restante une fois les boutons placés.
    const previewH = Math.min(height - bottomInset - 200, ((width - spacing.xxl * 2) * POSTER_H) / POSTER_W);
    const previewW = (previewH * POSTER_W) / POSTER_H;

    const fonts = useMemo(() => (display && body ? { display, body } : null), [display, body]);
    const picture = useMemo(
        () => (fonts ? posterPicture(previewW, { model, title, subtitle }, fonts) : null),
        [fonts, previewW, model, title, subtitle],
    );

    const share = async () => {
        if (!fonts || sharing) return;
        setSharing(true);
        setFailed(false);
        try {
            const base64 = posterPngBase64({ model, title, subtitle }, fonts);
            if (!base64) throw new Error('poster render failed');

            if (Platform.OS === 'web') {
                const link = document.createElement('a');
                link.href = `data:image/png;base64,${base64}`;
                link.download = FILE_NAME;
                link.click();
            } else {
                const uri = `${FileSystem.cacheDirectory}${FILE_NAME}`;
                await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
                if (!(await Sharing.isAvailableAsync())) throw new Error('sharing unavailable');
                await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: title, UTI: 'public.png' });
            }
        } catch {
            setFailed(true);
        } finally {
            setSharing(false);
        }
    };

    return (
        <View style={[styles.sheet, { paddingBottom: bottomInset + spacing.lg }]}>
            <View style={[styles.poster, { width: previewW, height: previewH }]}>
                {picture && (
                    <Canvas style={{ width: previewW, height: previewH }}>
                        <Picture picture={picture} />
                    </Canvas>
                )}
            </View>
            {failed && (
                <Text style={styles.error}>{t('sky.shareError')}</Text>
            )}
            <View style={styles.actions}>
                <GoldButton label={t('sky.shareButton')} onPress={share} loading={sharing} disabled={!fonts} size="md" />
                <GhostButton label={t('sky.closeButton')} onPress={onClose} size="sm" />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    sheet: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: spacing.lg,
        backgroundColor: colors.overlay.heavy,
    },
    poster: {
        borderRadius: radius.lg,
        overflow: 'hidden',
        backgroundColor: colors.sky.zenith,
        ...shadows.ambientGlow,
    },
    actions: {
        alignItems: 'center',
        gap: spacing.md,
    },
    error: {
        ...typography.bodyMd,
        color: colors.error,
        textAlign: 'center',
        paddingHorizontal: spacing.xl,
    },
});
