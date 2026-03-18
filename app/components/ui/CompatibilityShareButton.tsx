/**
 * CompatibilityShareButton
 *
 * Button component for sharing compatibility results
 * Gracefully handles missing native modules in Expo Go.
 */

import React, { useState, useRef, useCallback } from 'react';
import {
    View,
    StyleSheet,
    Modal,
    Alert,
    Platform,
    Share as RNShare,
} from 'react-native';
import { colors, spacing, borderRadius, radius } from '@/theme';
import { AppButton } from './Button';
import { AppText, AppHeading } from './Text';
import { CompatibilityShareCard } from './CompatibilityShareCard';
import { SpacerMD, SpacerLG } from './Spacer';
import { createCompatibilityShare, CompatibilityShare } from '@/services/astrology';

// Dynamically import modules that require native code
let captureRef: ((ref: any, options: any) => Promise<string>) | null = null;
let Sharing: typeof import('expo-sharing') | null = null;
let modulesAvailable = false;

try {
    const viewShot = require('react-native-view-shot');
    captureRef = viewShot.captureRef;
    Sharing = require('expo-sharing');
    modulesAvailable = true;
} catch (e) {
    console.warn('Share modules not available:', e);
}

interface CompatibilityShareButtonProps {
    compatibilityId: number;
    nameOne: string;
    nameTwo: string;
    score: number;
    sunOne?: string | null;
    sunTwo?: string | null;
    moonOne?: string | null;
    moonTwo?: string | null;
    summary?: string;
}

export function CompatibilityShareButton({
    compatibilityId,
    nameOne,
    nameTwo,
    score,
    sunOne,
    sunTwo,
    moonOne,
    moonTwo,
    summary,
}: CompatibilityShareButtonProps) {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [shareData, setShareData] = useState<CompatibilityShare | null>(null);
    const cardRef = useRef<View>(null);

    const handleOpenShare = useCallback(async () => {
        setIsModalVisible(true);
        setIsGenerating(true);

        try {
            const response = await createCompatibilityShare(compatibilityId);
            if (response.success && response.share) {
                setShareData(response.share);
            } else {
                Alert.alert('Erreur', response.error || 'Impossible de creer le lien de partage');
                setIsModalVisible(false);
            }
        } catch (error) {
            console.error('Share error:', error);
            Alert.alert('Erreur', 'Une erreur est survenue lors de la creation du partage');
            setIsModalVisible(false);
        } finally {
            setIsGenerating(false);
        }
    }, [compatibilityId]);

    const handleShareImage = useCallback(async () => {
        if (!cardRef.current || !captureRef || !Sharing) {
            Alert.alert('Erreur', 'Le partage d\'image n\'est pas disponible');
            return;
        }

        try {
            setIsGenerating(true);

            // Capture the card as an image
            const uri = await captureRef(cardRef, {
                format: 'png',
                quality: 1,
                result: 'tmpfile',
            });

            // Check if sharing is available
            const isAvailable = await Sharing.isAvailableAsync();
            if (!isAvailable) {
                Alert.alert('Erreur', 'Le partage n\'est pas disponible sur cet appareil');
                return;
            }

            // Share the image using expo-sharing
            await Sharing.shareAsync(uri, {
                mimeType: 'image/png',
                dialogTitle: 'Compatibilite Cosmique',
            });
        } catch (error: unknown) {
            // User cancelled share - this is normal
            console.error('Share error:', error);
        } finally {
            setIsGenerating(false);
        }
    }, [nameOne, nameTwo, score, shareData]);

    const handleShareLink = useCallback(async () => {
        if (!shareData) return;

        try {
            const message = `Decouvre notre compatibilite cosmique: ${nameOne} & ${nameTwo} - ${Math.round(score)}%\n\n${shareData.shareUrl}`;

            // Use React Native's built-in Share for text sharing
            await RNShare.share({
                title: 'Compatibilite Cosmique',
                message: message,
            });
        } catch (error: unknown) {
            const errorObj = error as { message?: string };
            if (errorObj.message !== 'Share dismissed') {
                console.error('Share error:', error);
            }
        }
    }, [nameOne, nameTwo, score, shareData]);

    const handleClose = useCallback(() => {
        setIsModalVisible(false);
        setShareData(null);
    }, []);

    return (
        <>
            <AppButton
                title="Partager"
                variant="secondary"
                onPress={handleOpenShare}
                icon={<AppText style={styles.shareIcon}>{'\u{1F4E4}'}</AppText>}
            />

            <Modal
                visible={isModalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={handleClose}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <AppHeading variant="h2">Partager</AppHeading>
                        <AppButton
                            title="Fermer"
                            variant="ghost"
                            size="small"
                            onPress={handleClose}
                            fullWidth={false}
                        />
                    </View>

                    <SpacerLG />

                    {/* Preview card */}
                    <View ref={cardRef} collapsable={false} style={styles.cardWrapper}>
                        <CompatibilityShareCard
                            nameOne={nameOne}
                            nameTwo={nameTwo}
                            score={score}
                            sunOne={sunOne}
                            sunTwo={sunTwo}
                            moonOne={moonOne}
                            moonTwo={moonTwo}
                            summary={summary}
                        />
                    </View>

                    <SpacerLG />

                    {/* Share buttons */}
                    <View style={styles.buttonsContainer}>
                        {modulesAvailable && (
                            <>
                                <AppButton
                                    title="Partager avec image"
                                    variant="primary"
                                    onPress={handleShareImage}
                                    loading={isGenerating}
                                    disabled={!shareData}
                                />
                                <SpacerMD />
                            </>
                        )}

                        <AppButton
                            title="Partager le lien"
                            variant={modulesAvailable ? "secondary" : "primary"}
                            onPress={handleShareLink}
                            disabled={!shareData}
                        />
                    </View>

                    {shareData && (
                        <View style={styles.linkInfo}>
                            <AppText style={styles.linkText}>
                                {shareData.shareUrl}
                            </AppText>
                        </View>
                    )}
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    shareIcon: {
        fontSize: 16,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: colors.background.primary,
        padding: spacing.screenPadding,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: spacing.xl,
    },
    cardWrapper: {
        alignSelf: 'center',
        width: 280,
        shadowColor: colors.brand.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    buttonsContainer: {
        paddingHorizontal: spacing.lg,
    },
    linkInfo: {
        marginTop: spacing.lg,
        padding: spacing.md,
        backgroundColor: colors.surface.default,
        borderRadius: radius.sm,
        alignItems: 'center',
    },
    linkText: {
        fontSize: 12,
        color: colors.text.muted,
    },
});

export default CompatibilityShareButton;
