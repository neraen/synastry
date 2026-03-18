/**
 * State Components - Loading, Empty, Error states
 */

import React, { ReactNode } from 'react';
import { View, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing } from '@/theme';
import { AppText, AppHeading } from './Text';
import { AppButton } from './Button';
import { Spacer } from './Spacer';

// Loading State
interface LoadingStateProps {
    message?: string;
    size?: 'small' | 'large';
    style?: ViewStyle;
}

export function LoadingState({
    message,
    size = 'large',
    style,
}: LoadingStateProps) {
    return (
        <View style={[styles.container, style]}>
            <ActivityIndicator size={size} color={colors.brand.primary} />
            {message && (
                <>
                    <Spacer size="lg" />
                    <AppText variant="body" color="muted" align="center">
                        {message}
                    </AppText>
                </>
            )}
        </View>
    );
}

// Inline loading (for buttons, etc.)
interface InlineLoadingProps {
    color?: string;
}

export function InlineLoading({ color = colors.brand.primary }: InlineLoadingProps) {
    return <ActivityIndicator size="small" color={color} />;
}

// Empty State
interface EmptyStateProps {
    icon?: ReactNode;
    title: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
    style?: ViewStyle;
}

export function EmptyState({
    icon,
    title,
    description,
    actionLabel,
    onAction,
    style,
}: EmptyStateProps) {
    return (
        <View style={[styles.container, style]}>
            {icon && <View style={styles.icon}>{icon}</View>}
            <AppHeading variant="title" align="center">
                {title}
            </AppHeading>
            {description && (
                <>
                    <Spacer size="sm" />
                    <AppText variant="body" color="muted" align="center">
                        {description}
                    </AppText>
                </>
            )}
            {actionLabel && onAction && (
                <>
                    <Spacer size="xl" />
                    <AppButton
                        title={actionLabel}
                        onPress={onAction}
                        variant="outline"
                        fullWidth={false}
                    />
                </>
            )}
        </View>
    );
}

// Error State
interface ErrorStateProps {
    title?: string;
    message: string;
    onRetry?: () => void;
    retryLabel?: string;
    style?: ViewStyle;
}

export function ErrorState({
    title = 'Une erreur est survenue',
    message,
    onRetry,
    retryLabel = 'Réessayer',
    style,
}: ErrorStateProps) {
    return (
        <View style={[styles.container, style]}>
            <AppHeading variant="title" color="error" align="center">
                {title}
            </AppHeading>
            <Spacer size="sm" />
            <AppText variant="body" color="muted" align="center">
                {message}
            </AppText>
            {onRetry && (
                <>
                    <Spacer size="xl" />
                    <AppButton
                        title={retryLabel}
                        onPress={onRetry}
                        variant="outline"
                        fullWidth={false}
                    />
                </>
            )}
        </View>
    );
}

// Full screen loading overlay
interface LoadingOverlayProps {
    visible: boolean;
    message?: string;
}

export function LoadingOverlay({ visible, message }: LoadingOverlayProps) {
    if (!visible) return null;

    return (
        <View style={styles.overlay}>
            <View style={styles.overlayContent}>
                <ActivityIndicator size="large" color={colors.brand.primary} />
                {message && (
                    <>
                        <Spacer size="lg" />
                        <AppText variant="body" color="primary" align="center">
                            {message}
                        </AppText>
                    </>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.screenPadding,
    },
    icon: {
        marginBottom: spacing.lg,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.overlay.backdrop,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
    },
    overlayContent: {
        backgroundColor: colors.surface.elevated,
        borderRadius: 16,
        padding: spacing['3xl'],
        alignItems: 'center',
        minWidth: 200,
    },
});

export default LoadingState;
