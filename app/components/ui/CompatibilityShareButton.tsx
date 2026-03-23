/**
 * CompatibilityShareButton
 *
 * Button component for sharing compatibility results
 * Uses the new glassmorphism design system
 */

import React, { useState, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    Alert,
    Share as RNShare,
    Pressable,
    ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, radius, fonts } from '@/theme';
import { GhostButton } from './GhostButton';
import { GoldButton } from './GoldButton';
import { GlassCard } from './GlassCard';
import { CompatibilityShareCard } from './CompatibilityShareCard';
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
    const [isSharing, setIsSharing] = useState(false);
    const [shareData, setShareData] = useState<CompatibilityShare | null>(null);
    const cardRef = useRef<View>(null);

    const handleOpenShare = useCallback(async () => {
        setIsModalVisible(true);
        setIsGenerating(true);
        setShareData(null);

        try {
            const response = await createCompatibilityShare(compatibilityId);
            if (response.success && response.share) {
                setShareData(response.share);
            } else {
                Alert.alert('Erreur', response.error || 'Impossible de créer le lien de partage');
                setIsModalVisible(false);
            }
        } catch (error) {
            Alert.alert('Erreur', 'Une erreur est survenue lors de la création du partage');
            setIsModalVisible(false);
        } finally {
            setIsGenerating(false);
        }
    }, [compatibilityId]);

    const handleShareImage = useCallback(async () => {
        if (!cardRef.current || !captureRef || !Sharing) {
            Alert.alert('Non disponible', 'Le partage d\'image n\'est pas disponible sur cet appareil');
            return;
        }

        try {
            setIsSharing(true);

            const uri = await captureRef(cardRef, {
                format: 'png',
                quality: 1,
                result: 'tmpfile',
            });

            const isAvailable = await Sharing.isAvailableAsync();
            if (!isAvailable) {
                Alert.alert('Non disponible', 'Le partage n\'est pas disponible sur cet appareil');
                return;
            }

            await Sharing.shareAsync(uri, {
                mimeType: 'image/png',
                dialogTitle: 'Compatibilité Cosmique',
            });
        } catch (error) {
            console.error('Share image error:', error);
        } finally {
            setIsSharing(false);
        }
    }, []);

    const handleShareLink = useCallback(async () => {
        if (!shareData) return;

        try {
            const message = `✦ Compatibilité cosmique ✦\n${nameOne} & ${nameTwo} — ${Math.round(score)}%\n\n${shareData.shareUrl}`;
            await RNShare.share({
                title: 'Compatibilité Cosmique',
                message,
            });
        } catch (error: unknown) {
            const errorObj = error as { message?: string };
            if (errorObj.message !== 'Share dismissed') {
                console.error('Share link error:', error);
            }
        }
    }, [nameOne, nameTwo, score, shareData]);

    const handleClose = useCallback(() => {
        setIsModalVisible(false);
        setShareData(null);
    }, []);

    return (
        <>
            <GhostButton label="PARTAGER" onPress={handleOpenShare} />

            <Modal
                visible={isModalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={handleClose}
            >
                <View style={styles.modalContainer}>
                    {/* Handle */}
                    <View style={styles.handleContainer}>
                        <View style={styles.handle} />
                    </View>

                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <View style={styles.headerLeft}>
                            <Text style={styles.logoIcon}>✦</Text>
                            <Text style={styles.headerTitle}>Partager</Text>
                        </View>
                        <Pressable onPress={handleClose} hitSlop={12} style={styles.closeBtn}>
                            <Feather name="x" size={20} color={colors.onSurfaceMuted} />
                        </Pressable>
                    </View>

                    {/* Loading state */}
                    {isGenerating ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator color={colors.primary} size="large" />
                            <Text style={styles.loadingText}>Génération du lien…</Text>
                        </View>
                    ) : (
                        <>
                            {/* Card preview */}
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

                            <View style={styles.divider} />

                            {/* Share options */}
                            <View style={styles.actionsContainer}>
                                {modulesAvailable && (
                                    <View style={styles.actionRow}>
                                        <GoldButton
                                            label={isSharing ? "PARTAGE EN COURS…" : "PARTAGER L'IMAGE"}
                                            onPress={handleShareImage}
                                            rightIcon
                                        />
                                    </View>
                                )}

                                <View style={styles.actionRow}>
                                    <GhostButton
                                        label="PARTAGER LE LIEN"
                                        onPress={handleShareLink}
                                    />
                                </View>

                                {shareData && (
                                    <View style={styles.linkBox}>
                                        <Feather name="link" size={12} color={colors.onSurfaceMuted} />
                                        <Text style={styles.linkText} numberOfLines={1}>
                                            {shareData.shareUrl}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </>
                    )}
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        backgroundColor: colors.surfaceLow,
        paddingHorizontal: spacing.xl,
    },
    handleContainer: {
        alignItems: 'center',
        paddingTop: spacing.md,
        paddingBottom: spacing.lg,
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.outline,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.xxl,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    logoIcon: {
        fontSize: 14,
        color: colors.primary,
        lineHeight: 18,
    },
    headerTitle: {
        fontFamily: fonts.display.regular,
        fontSize: 22,
        color: colors.onSurface,
        letterSpacing: 0.3,
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.surfaceContainerHigh,
        alignItems: 'center',
        justifyContent: 'center',
    },

    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.lg,
    },
    loadingText: {
        fontFamily: fonts.body.regular,
        fontSize: 14,
        color: colors.onSurfaceMuted,
    },

    cardWrapper: {
        alignSelf: 'center',
        width: 280,
        marginBottom: spacing.xxl,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
        elevation: 8,
    },
    divider: {
        height: 1,
        backgroundColor: colors.surfaceContainerHigh,
        marginBottom: spacing.xxl,
    },

    actionsContainer: {
        gap: spacing.md,
    },
    actionRow: {
        // full-width buttons
    },

    linkBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.surfaceContainer,
        borderRadius: radius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        marginTop: spacing.sm,
    },
    linkText: {
        flex: 1,
        fontFamily: fonts.body.regular,
        fontSize: 11,
        color: colors.onSurfaceMuted,
    },
});

export default CompatibilityShareButton;