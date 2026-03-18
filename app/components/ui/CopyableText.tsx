/**
 * CopyableText Component
 *
 * A text component that copies its content to clipboard when pressed,
 * showing a subtle tooltip feedback.
 */

import React, { useState, useCallback } from 'react';
import {
    View,
    TouchableOpacity,
    StyleSheet,
    Animated,
    ViewStyle,
    TextStyle,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { AppText } from './Text';
import { colors, spacing, borderRadius, typography } from '@/theme';

interface CopyableTextProps {
    text: string;
    style?: TextStyle;
    containerStyle?: ViewStyle;
    toastMessage?: string;
    children?: React.ReactNode;
}

export function CopyableText({
    text,
    style,
    containerStyle,
    toastMessage = 'Texte copié',
    children,
}: CopyableTextProps) {
    const [showToast, setShowToast] = useState(false);
    const [toastOpacity] = useState(new Animated.Value(0));

    const handleCopy = useCallback(async () => {
        await Clipboard.setStringAsync(text);

        setShowToast(true);

        // Fade in
        Animated.timing(toastOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
        }).start(() => {
            // Wait then fade out
            setTimeout(() => {
                Animated.timing(toastOpacity, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }).start(() => {
                    setShowToast(false);
                });
            }, 1500);
        });
    }, [text, toastOpacity]);

    return (
        <View style={[styles.container, containerStyle]}>
            <TouchableOpacity
                onPress={handleCopy}
                activeOpacity={0.7}
                style={styles.touchable}
            >
                {children || (
                    <AppText variant="body" color="secondary" style={style}>
                        {text}
                    </AppText>
                )}

                {/* Copy hint icon */}
                <View style={styles.copyHint}>
                    <AppText style={styles.copyIcon}>📋</AppText>
                </View>
            </TouchableOpacity>

            {/* Toast */}
            {showToast && (
                <Animated.View
                    style={[
                        styles.toast,
                        { opacity: toastOpacity },
                    ]}
                >
                    <AppText style={styles.toastText}>
                        {toastMessage}
                    </AppText>
                </Animated.View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'relative',
    },
    touchable: {
        position: 'relative',
    },
    copyHint: {
        position: 'absolute',
        top: spacing.xs,
        right: spacing.xs,
        opacity: 0.5,
    },
    copyIcon: {
        fontSize: 14,
    },
    toast: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: [{ translateX: -50 }, { translateY: -15 }],
        backgroundColor: colors.surface.elevated,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.badge,
        borderWidth: 1,
        borderColor: colors.brand.primary,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        zIndex: 100,
    },
    toastText: {
        ...typography.caption,
        color: colors.brand.primary,
        fontWeight: '600',
    },
});

export default CopyableText;
