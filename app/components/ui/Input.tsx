/**
 * Input Components
 *
 * AppInput - Text input with label, error handling, and variants
 */

import React, { forwardRef, useState } from 'react';
import {
    View,
    TextInput,
    Text,
    StyleSheet,
    TextInputProps,
    ViewStyle,
    TextStyle,
    Pressable,
} from 'react-native';
import { colors, typography, spacing, borderRadius, layout } from '@/theme';

interface AppInputProps extends Omit<TextInputProps, 'style'> {
    label?: string;
    error?: string;
    hint?: string;
    disabled?: boolean;
    containerStyle?: ViewStyle;
    inputStyle?: TextStyle;
    rightIcon?: React.ReactNode;
    onRightIconPress?: () => void;
}

export const AppInput = forwardRef<TextInput, AppInputProps>(
    (
        {
            label,
            error,
            hint,
            disabled = false,
            containerStyle,
            inputStyle,
            rightIcon,
            onRightIconPress,
            ...textInputProps
        },
        ref
    ) => {
        const [isFocused, setIsFocused] = useState(false);

        const inputContainerStyle: ViewStyle = {
            borderColor: error
                ? colors.status.error
                : isFocused
                ? colors.border.focus
                : colors.input.border,
        };

        return (
            <View style={[styles.container, containerStyle]}>
                {label && (
                    <Text style={[styles.label, error && styles.labelError]}>
                        {label}
                    </Text>
                )}

                <View style={[styles.inputContainer, inputContainerStyle, disabled && styles.disabled]}>
                    <TextInput
                        ref={ref}
                        style={[styles.input, inputStyle]}
                        placeholderTextColor={colors.input.placeholder}
                        editable={!disabled}
                        onFocus={(e) => {
                            setIsFocused(true);
                            textInputProps.onFocus?.(e);
                        }}
                        onBlur={(e) => {
                            setIsFocused(false);
                            textInputProps.onBlur?.(e);
                        }}
                        {...textInputProps}
                    />
                    {rightIcon && (
                        <Pressable
                            onPress={onRightIconPress}
                            style={styles.rightIcon}
                            hitSlop={8}
                        >
                            {rightIcon}
                        </Pressable>
                    )}
                </View>

                {(error || hint) && (
                    <Text style={[styles.hint, error && styles.errorText]}>
                        {error || hint}
                    </Text>
                )}
            </View>
        );
    }
);

AppInput.displayName = 'AppInput';

// Specialized search input
interface SearchInputProps extends Omit<AppInputProps, 'label'> {
    onClear?: () => void;
}

export function SearchInput({ onClear, ...props }: SearchInputProps) {
    return (
        <AppInput
            {...props}
            placeholder={props.placeholder || 'Rechercher...'}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
        />
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    label: {
        ...typography.label,
        color: colors.text.secondary,
        marginBottom: spacing.sm,
    },
    labelError: {
        color: colors.status.error,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.input.background,
        borderWidth: 1,
        borderRadius: borderRadius.input,
        minHeight: layout.heights.input,
    },
    input: {
        flex: 1,
        ...typography.input,
        color: colors.text.primary,
        paddingHorizontal: spacing.inputPadding,
        paddingVertical: spacing.inputPadding,
    },
    rightIcon: {
        paddingRight: spacing.inputPadding,
    },
    hint: {
        ...typography.caption,
        color: colors.text.muted,
        marginTop: spacing.xs,
    },
    errorText: {
        color: colors.status.error,
    },
    disabled: {
        opacity: 0.5,
    },
});

export default AppInput;
