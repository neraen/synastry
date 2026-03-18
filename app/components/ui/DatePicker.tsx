/**
 * DatePicker & TimePicker Components
 *
 * Cross-platform date and time pickers that match the design system.
 * Compatible with iOS and Android.
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Platform,
    Modal,
    ViewStyle,
} from 'react-native';
import DateTimePicker, {
    DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { colors, typography, spacing, borderRadius, layout, radius } from '@/theme';

interface AppDatePickerProps {
    label?: string;
    value: string; // YYYY-MM-DD format
    onChange: (date: string) => void;
    placeholder?: string;
    error?: string;
    hint?: string;
    disabled?: boolean;
    containerStyle?: ViewStyle;
    minimumDate?: Date;
    maximumDate?: Date;
}

/**
 * Format a Date object to YYYY-MM-DD string
 */
function formatDateToISO(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Format a date string for display (DD/MM/YYYY)
 */
function formatDateForDisplay(dateString: string): string {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
}

/**
 * Parse YYYY-MM-DD string to Date object
 */
function parseISODate(dateString: string): Date {
    if (!dateString) return new Date();
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
}

export function AppDatePicker({
    label,
    value,
    onChange,
    placeholder = 'Sélectionner une date',
    error,
    hint,
    disabled = false,
    containerStyle,
    minimumDate,
    maximumDate,
}: AppDatePickerProps) {
    const [showPicker, setShowPicker] = useState(false);
    const [tempDate, setTempDate] = useState<Date>(parseISODate(value));

    const handlePress = () => {
        if (!disabled) {
            setTempDate(parseISODate(value));
            setShowPicker(true);
        }
    };

    const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowPicker(false);
            if (event.type === 'set' && selectedDate) {
                onChange(formatDateToISO(selectedDate));
            }
        } else {
            // iOS: update temp date, confirm on modal close
            if (selectedDate) {
                setTempDate(selectedDate);
            }
        }
    };

    const handleIOSConfirm = () => {
        onChange(formatDateToISO(tempDate));
        setShowPicker(false);
    };

    const handleIOSCancel = () => {
        setShowPicker(false);
    };

    const displayValue = value ? formatDateForDisplay(value) : '';

    return (
        <View style={[styles.container, containerStyle]}>
            {label && (
                <Text style={[styles.label, error && styles.labelError]}>
                    {label}
                </Text>
            )}

            <TouchableOpacity
                style={[
                    styles.inputContainer,
                    error && styles.inputError,
                    disabled && styles.disabled,
                ]}
                onPress={handlePress}
                activeOpacity={0.7}
                disabled={disabled}
            >
                <Text
                    style={[
                        styles.inputText,
                        !displayValue && styles.placeholder,
                    ]}
                >
                    {displayValue || placeholder}
                </Text>
                <Text style={styles.icon}>📅</Text>
            </TouchableOpacity>

            {(error || hint) && (
                <Text style={[styles.hint, error && styles.errorText]}>
                    {error || hint}
                </Text>
            )}

            {/* Android: Native picker shows directly */}
            {Platform.OS === 'android' && showPicker && (
                <DateTimePicker
                    value={tempDate}
                    mode="date"
                    display="default"
                    onChange={handleChange}
                    minimumDate={minimumDate}
                    maximumDate={maximumDate}
                />
            )}

            {/* iOS: Modal with picker */}
            {Platform.OS === 'ios' && (
                <Modal
                    visible={showPicker}
                    transparent
                    animationType="slide"
                    onRequestClose={handleIOSCancel}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <TouchableOpacity onPress={handleIOSCancel}>
                                    <Text style={styles.modalButtonCancel}>
                                        Annuler
                                    </Text>
                                </TouchableOpacity>
                                <Text style={styles.modalTitle}>
                                    {label || 'Date'}
                                </Text>
                                <TouchableOpacity onPress={handleIOSConfirm}>
                                    <Text style={styles.modalButtonConfirm}>
                                        OK
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            <DateTimePicker
                                value={tempDate}
                                mode="date"
                                display="spinner"
                                onChange={handleChange}
                                minimumDate={minimumDate}
                                maximumDate={maximumDate}
                                locale="fr-FR"
                                style={styles.iosPicker}
                            />
                        </View>
                    </View>
                </Modal>
            )}
        </View>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// TIME PICKER
// ─────────────────────────────────────────────────────────────────────────────

interface AppTimePickerProps {
    label?: string;
    value: string; // HH:MM format
    onChange: (time: string) => void;
    placeholder?: string;
    error?: string;
    hint?: string;
    disabled?: boolean;
    containerStyle?: ViewStyle;
}

/**
 * Format a Date object to HH:MM string
 */
function formatTimeToHHMM(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

/**
 * Parse HH:MM string to Date object
 */
function parseHHMMTime(timeString: string): Date {
    const date = new Date();
    if (!timeString) {
        date.setHours(12, 0, 0, 0);
        return date;
    }
    const [hours, minutes] = timeString.split(':').map(Number);
    date.setHours(hours || 12, minutes || 0, 0, 0);
    return date;
}

export function AppTimePicker({
    label,
    value,
    onChange,
    placeholder = "Sélectionner l'heure",
    error,
    hint,
    disabled = false,
    containerStyle,
}: AppTimePickerProps) {
    const [showPicker, setShowPicker] = useState(false);
    const [tempTime, setTempTime] = useState<Date>(parseHHMMTime(value));

    const handlePress = () => {
        if (!disabled) {
            setTempTime(parseHHMMTime(value));
            setShowPicker(true);
        }
    };

    const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowPicker(false);
            if (event.type === 'set' && selectedDate) {
                onChange(formatTimeToHHMM(selectedDate));
            }
        } else {
            if (selectedDate) {
                setTempTime(selectedDate);
            }
        }
    };

    const handleIOSConfirm = () => {
        onChange(formatTimeToHHMM(tempTime));
        setShowPicker(false);
    };

    const handleIOSCancel = () => {
        setShowPicker(false);
    };

    return (
        <View style={[styles.container, containerStyle]}>
            {label && (
                <Text style={[styles.label, error && styles.labelError]}>
                    {label}
                </Text>
            )}

            <TouchableOpacity
                style={[
                    styles.inputContainer,
                    error && styles.inputError,
                    disabled && styles.disabled,
                ]}
                onPress={handlePress}
                activeOpacity={0.7}
                disabled={disabled}
            >
                <Text
                    style={[
                        styles.inputText,
                        !value && styles.placeholder,
                    ]}
                >
                    {value || placeholder}
                </Text>
                <Text style={styles.icon}>🕐</Text>
            </TouchableOpacity>

            {(error || hint) && (
                <Text style={[styles.hint, error && styles.errorText]}>
                    {error || hint}
                </Text>
            )}

            {/* Android: Native picker */}
            {Platform.OS === 'android' && showPicker && (
                <DateTimePicker
                    value={tempTime}
                    mode="time"
                    display="default"
                    onChange={handleChange}
                    is24Hour={true}
                />
            )}

            {/* iOS: Modal with picker */}
            {Platform.OS === 'ios' && (
                <Modal
                    visible={showPicker}
                    transparent
                    animationType="slide"
                    onRequestClose={handleIOSCancel}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <TouchableOpacity onPress={handleIOSCancel}>
                                    <Text style={styles.modalButtonCancel}>
                                        Annuler
                                    </Text>
                                </TouchableOpacity>
                                <Text style={styles.modalTitle}>
                                    {label || 'Heure'}
                                </Text>
                                <TouchableOpacity onPress={handleIOSConfirm}>
                                    <Text style={styles.modalButtonConfirm}>
                                        OK
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            <DateTimePicker
                                value={tempTime}
                                mode="time"
                                display="spinner"
                                onChange={handleChange}
                                is24Hour={true}
                                locale="fr-FR"
                                style={styles.iosPicker}
                            />
                        </View>
                    </View>
                </Modal>
            )}
        </View>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────

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
        justifyContent: 'space-between',
        backgroundColor: colors.input.background,
        borderWidth: 1,
        borderColor: colors.input.border,
        borderRadius: borderRadius.input,
        minHeight: layout.heights.input,
        paddingHorizontal: spacing.inputPadding,
        paddingVertical: spacing.inputPadding,
    },
    inputError: {
        borderColor: colors.status.error,
    },
    inputText: {
        ...typography.input,
        color: colors.text.primary,
        flex: 1,
    },
    placeholder: {
        color: colors.input.placeholder,
    },
    icon: {
        fontSize: 18,
        marginLeft: spacing.sm,
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
    // iOS Modal
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: colors.background.primary,
        borderTopLeftRadius: radius.xl,
        borderTopRightRadius: radius.xl,
        paddingBottom: spacing['3xl'],
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.subtle,
    },
    modalTitle: {
        ...typography.bodyMedium,
        color: colors.text.primary,
    },
    modalButtonCancel: {
        ...typography.body,
        color: colors.text.muted,
    },
    modalButtonConfirm: {
        ...typography.bodyMedium,
        color: colors.brand.primary,
    },
    iosPicker: {
        height: 200,
    },
});
