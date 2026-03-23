/**
 * Custom Wheel Date & Time Pickers
 *
 * Fully custom drum-roll pickers — no native dependency, identical on iOS and Android.
 * Design follows the app glassmorphism system.
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    TouchableWithoutFeedback,
    Modal,
    NativeSyntheticEvent,
    NativeScrollEvent,
    ViewStyle,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radius, fonts } from '@/theme';

// ─── Constants ────────────────────────────────────────────────────────────────

const ITEM_H = 48;
const VISIBLE = 5; // odd — center is selected
const PADDING = Math.floor(VISIBLE / 2) * ITEM_H;

const MONTHS_FR = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysInMonth(month: number, year: number): number {
    return new Date(year, month, 0).getDate();
}

function pad(n: number) {
    return String(n).padStart(2, '0');
}

function formatDateForDisplay(dateString: string): string {
    if (!dateString) return '';
    const [y, m, d] = dateString.split('-');
    return `${d}/${m}/${y}`;
}

function parseISODate(dateString: string): { day: number; month: number; year: number } {
    if (!dateString) {
        const now = new Date();
        return { day: now.getDate(), month: now.getMonth() + 1, year: now.getFullYear() };
    }
    const [y, m, d] = dateString.split('-').map(Number);
    return { day: d, month: m, year: y };
}

function parseHHMM(timeString: string): { hour: number; minute: number } {
    if (!timeString) return { hour: 12, minute: 0 };
    const [h, m] = timeString.split(':').map(Number);
    return { hour: h ?? 12, minute: m ?? 0 };
}

// ─── WheelColumn ─────────────────────────────────────────────────────────────

interface WheelColumnProps {
    items: string[];
    selectedIndex: number;
    onChange: (index: number) => void;
    flex?: number;
}

function WheelColumn({ items, selectedIndex, onChange, flex = 1 }: WheelColumnProps) {
    const scrollRef = useRef<ScrollView>(null);
    const pendingIndex = useRef(selectedIndex);

    useEffect(() => {
        // Small delay on Android to ensure layout is ready before scrolling
        const delay = Platform.OS === 'android' ? 80 : 0;
        const timer = setTimeout(() => {
            scrollRef.current?.scrollTo({ y: selectedIndex * ITEM_H, animated: false });
        }, delay);
        pendingIndex.current = selectedIndex;
        return () => clearTimeout(timer);
    }, [selectedIndex, items.length]);

    const commit = useCallback((y: number) => {
        const idx = Math.max(0, Math.min(Math.round(y / ITEM_H), items.length - 1));
        pendingIndex.current = idx;
        onChange(idx);
    }, [items.length, onChange]);

    const handleScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
        commit(e.nativeEvent.contentOffset.y);
    }, [commit]);

    return (
        <View style={[styles.wheelColumn, { flex }]}>
            <ScrollView
                ref={scrollRef}
                showsVerticalScrollIndicator={false}
                snapToInterval={ITEM_H}
                decelerationRate="fast"
                onMomentumScrollEnd={handleScrollEnd}
                onScrollEndDrag={handleScrollEnd}
                contentContainerStyle={{ paddingVertical: PADDING }}
                scrollEventThrottle={16}
                nestedScrollEnabled
            >
                {items.map((label, i) => {
                    const distance = Math.abs(i - selectedIndex);
                    const opacity = distance === 0 ? 1 : distance === 1 ? 0.45 : 0.2;
                    const isSelected = i === selectedIndex;
                    return (
                        <View key={i} style={styles.wheelItem}>
                            <Text style={[
                                styles.wheelText,
                                isSelected && styles.wheelTextSelected,
                                { opacity },
                            ]}>
                                {label}
                            </Text>
                        </View>
                    );
                })}
            </ScrollView>

            {/* Gradient overlays — wrapped in View so pointerEvents works on Android */}
            <View pointerEvents="none" style={[styles.fade, styles.fadeTop]}>
                <LinearGradient
                    colors={[colors.surfaceContainer, `${colors.surfaceContainer}00`]}
                    style={StyleSheet.absoluteFill}
                />
            </View>
            <View pointerEvents="none" style={[styles.fade, styles.fadeBottom]}>
                <LinearGradient
                    colors={[`${colors.surfaceContainer}00`, colors.surfaceContainer]}
                    style={StyleSheet.absoluteFill}
                />
            </View>

            {/* Selection lines */}
            <View pointerEvents="none" style={styles.selectionTop} />
            <View pointerEvents="none" style={styles.selectionBottom} />
        </View>
    );
}

// ─── DatePickerModal ──────────────────────────────────────────────────────────

interface DatePickerModalProps {
    visible: boolean;
    label?: string;
    day: number;
    month: number;
    year: number;
    minimumDate?: Date;
    maximumDate?: Date;
    onConfirm: (day: number, month: number, year: number) => void;
    onCancel: () => void;
}

function DatePickerModal({ visible, label, day, month, year, minimumDate, maximumDate, onConfirm, onCancel }: DatePickerModalProps) {
    const currentYear = new Date().getFullYear();
    const minYear = minimumDate ? minimumDate.getFullYear() : currentYear - 120;
    const maxYear = maximumDate ? maximumDate.getFullYear() : currentYear;
    const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => String(maxYear - i));

    const [selDay, setSelDay] = useState(day);
    const [selMonth, setSelMonth] = useState(month);
    const [selYear, setSelYear] = useState(year);

    useEffect(() => {
        if (visible) { setSelDay(day); setSelMonth(month); setSelYear(year); }
    }, [visible]);

    const numDays = daysInMonth(selMonth, selYear);
    const days = Array.from({ length: numDays }, (_, i) => String(i + 1));

    useEffect(() => {
        if (selDay > numDays) setSelDay(numDays);
    }, [numDays]);

    const yearIndex = Math.max(0, years.indexOf(String(selYear)));

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
            {/* Backdrop — TouchableWithoutFeedback does not intercept scroll gestures */}
            <TouchableWithoutFeedback onPress={onCancel}>
                <View style={styles.backdrop} />
            </TouchableWithoutFeedback>

            {/* Sheet — plain View, no Pressable, so ScrollViews inside work freely */}
            <View style={styles.sheet}>
                <View style={styles.handle} />
                <View style={styles.sheetHeader}>
                    <TouchableOpacity onPress={onCancel} hitSlop={12}>
                        <Text style={styles.btnCancel}>Annuler</Text>
                    </TouchableOpacity>
                    <Text style={styles.sheetTitle}>{label || 'Date de naissance'}</Text>
                    <TouchableOpacity onPress={() => onConfirm(selDay, selMonth, selYear)} hitSlop={12}>
                        <Text style={styles.btnConfirm}>Confirmer</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.wheelsRow}>
                    <WheelColumn
                        flex={1}
                        items={days}
                        selectedIndex={Math.min(selDay - 1, days.length - 1)}
                        onChange={(i) => setSelDay(i + 1)}
                    />
                    <WheelColumn
                        flex={2.2}
                        items={MONTHS_FR}
                        selectedIndex={selMonth - 1}
                        onChange={(i) => setSelMonth(i + 1)}
                    />
                    <WheelColumn
                        flex={1.3}
                        items={years}
                        selectedIndex={yearIndex}
                        onChange={(i) => setSelYear(Number(years[i]))}
                    />
                </View>
            </View>
        </Modal>
    );
}

// ─── TimePickerModal ──────────────────────────────────────────────────────────

interface TimePickerModalProps {
    visible: boolean;
    label?: string;
    hour: number;
    minute: number;
    onConfirm: (hour: number, minute: number) => void;
    onCancel: () => void;
}

function TimePickerModal({ visible, label, hour, minute, onConfirm, onCancel }: TimePickerModalProps) {
    const hours = Array.from({ length: 24 }, (_, i) => pad(i));
    const minutes = Array.from({ length: 60 }, (_, i) => pad(i));

    const [selHour, setSelHour] = useState(hour);
    const [selMinute, setSelMinute] = useState(minute);

    useEffect(() => {
        if (visible) { setSelHour(hour); setSelMinute(minute); }
    }, [visible]);

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
            <TouchableWithoutFeedback onPress={onCancel}>
                <View style={styles.backdrop} />
            </TouchableWithoutFeedback>

            <View style={styles.sheet}>
                <View style={styles.handle} />
                <View style={styles.sheetHeader}>
                    <TouchableOpacity onPress={onCancel} hitSlop={12}>
                        <Text style={styles.btnCancel}>Annuler</Text>
                    </TouchableOpacity>
                    <Text style={styles.sheetTitle}>{label || 'Heure de naissance'}</Text>
                    <TouchableOpacity onPress={() => onConfirm(selHour, selMinute)} hitSlop={12}>
                        <Text style={styles.btnConfirm}>Confirmer</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.wheelsRow}>
                    <WheelColumn
                        items={hours}
                        selectedIndex={selHour}
                        onChange={setSelHour}
                    />
                    <View style={styles.timeSeparator}>
                        <Text style={styles.timeSeparatorText}>:</Text>
                    </View>
                    <WheelColumn
                        items={minutes}
                        selectedIndex={selMinute}
                        onChange={setSelMinute}
                    />
                </View>
            </View>
        </Modal>
    );
}

// ─── AppDatePicker (public) ───────────────────────────────────────────────────

interface AppDatePickerProps {
    label?: string;
    value: string;
    onChange: (date: string) => void;
    placeholder?: string;
    error?: string;
    hint?: string;
    disabled?: boolean;
    containerStyle?: ViewStyle;
    minimumDate?: Date;
    maximumDate?: Date;
}

export function AppDatePicker({
    label, value, onChange, placeholder = 'Sélectionner une date',
    error, hint, disabled = false, containerStyle, minimumDate, maximumDate,
}: AppDatePickerProps) {
    const [open, setOpen] = useState(false);
    const parsed = parseISODate(value);

    return (
        <View style={[styles.container, containerStyle]}>
            {label && <Text style={[styles.label, error && styles.labelError]}>{label}</Text>}
            <TouchableOpacity
                style={[styles.trigger, error && styles.triggerError, disabled && styles.disabledStyle]}
                onPress={() => !disabled && setOpen(true)}
                activeOpacity={0.7}
                disabled={disabled}
            >
                <Text style={[styles.triggerText, !value && styles.placeholder]}>
                    {value ? formatDateForDisplay(value) : placeholder}
                </Text>
                <Text style={styles.triggerIcon}>📅</Text>
            </TouchableOpacity>
            {(error || hint) && (
                <Text style={[styles.hint, error && styles.hintError]}>{error || hint}</Text>
            )}
            <DatePickerModal
                visible={open}
                label={label}
                day={parsed.day}
                month={parsed.month}
                year={parsed.year}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                onConfirm={(d, m, y) => { onChange(`${y}-${pad(m)}-${pad(d)}`); setOpen(false); }}
                onCancel={() => setOpen(false)}
            />
        </View>
    );
}

// ─── AppTimePicker (public) ───────────────────────────────────────────────────

interface AppTimePickerProps {
    label?: string;
    value: string;
    onChange: (time: string) => void;
    placeholder?: string;
    error?: string;
    hint?: string;
    disabled?: boolean;
    containerStyle?: ViewStyle;
}

export function AppTimePicker({
    label, value, onChange, placeholder = "Sélectionner l'heure",
    error, hint, disabled = false, containerStyle,
}: AppTimePickerProps) {
    const [open, setOpen] = useState(false);
    const parsed = parseHHMM(value);

    return (
        <View style={[styles.container, containerStyle]}>
            {label && <Text style={[styles.label, error && styles.labelError]}>{label}</Text>}
            <TouchableOpacity
                style={[styles.trigger, error && styles.triggerError, disabled && styles.disabledStyle]}
                onPress={() => !disabled && setOpen(true)}
                activeOpacity={0.7}
                disabled={disabled}
            >
                <Text style={[styles.triggerText, !value && styles.placeholder]}>
                    {value || placeholder}
                </Text>
                <Text style={styles.triggerIcon}>🕐</Text>
            </TouchableOpacity>
            {(error || hint) && (
                <Text style={[styles.hint, error && styles.hintError]}>{error || hint}</Text>
            )}
            <TimePickerModal
                visible={open}
                label={label}
                hour={parsed.hour}
                minute={parsed.minute}
                onConfirm={(h, m) => { onChange(`${pad(h)}:${pad(m)}`); setOpen(false); }}
                onCancel={() => setOpen(false)}
            />
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { width: '100%' },

    label: {
        fontFamily: fonts.body.medium,
        fontSize: 13,
        color: colors.onSurfaceMuted,
        marginBottom: spacing.sm,
        letterSpacing: 0.3,
    },
    labelError: { color: colors.error },

    trigger: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.surfaceContainerHigh,
        borderRadius: radius.md,
        minHeight: 52,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    triggerError: { borderWidth: 1, borderColor: colors.error },
    disabledStyle: { opacity: 0.4 },
    triggerText: {
        fontFamily: fonts.body.regular,
        fontSize: 15,
        color: colors.onSurface,
        flex: 1,
    },
    placeholder: { color: `${colors.onSurfaceMuted}80` },
    triggerIcon: { fontSize: 18, marginLeft: spacing.sm },

    hint: {
        fontFamily: fonts.body.regular,
        fontSize: 12,
        color: colors.onSurfaceMuted,
        marginTop: spacing.xs,
    },
    hintError: { color: colors.error },

    // ── Modal layout ──
    // Backdrop fills the full screen behind the sheet
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    // Sheet is positioned at the bottom, plain View (no Pressable/Touchable)
    // so nested ScrollViews receive gestures freely on Android
    sheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.surfaceContainer,
        borderTopLeftRadius: radius.xl,
        borderTopRightRadius: radius.xl,
        paddingBottom: spacing.xxxl,
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: `${colors.onSurfaceMuted}40`,
        alignSelf: 'center',
        marginTop: spacing.md,
        marginBottom: spacing.sm,
    },
    sheetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: `${colors.onSurfaceMuted}15`,
    },
    sheetTitle: {
        fontFamily: fonts.body.semiBold,
        fontSize: 15,
        color: colors.onSurface,
    },
    btnCancel: {
        fontFamily: fonts.body.regular,
        fontSize: 15,
        color: colors.onSurfaceMuted,
    },
    btnConfirm: {
        fontFamily: fonts.body.semiBold,
        fontSize: 15,
        color: colors.primary,
    },

    // ── Wheels ──
    wheelsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
    },
    wheelColumn: {
        height: ITEM_H * VISIBLE,
        overflow: 'hidden',
        position: 'relative',
    },
    wheelItem: {
        height: ITEM_H,
        alignItems: 'center',
        justifyContent: 'center',
    },
    wheelText: {
        fontFamily: fonts.body.regular,
        fontSize: 17,
        color: colors.onSurface,
    },
    wheelTextSelected: {
        fontFamily: fonts.body.semiBold,
        fontSize: 18,
        color: colors.primary,
    },

    // Gradient fades — wrapped in View so pointerEvents is respected on Android
    fade: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: PADDING,
        zIndex: 2,
    },
    fadeTop: { top: 0 },
    fadeBottom: { bottom: 0 },

    // Selection lines
    selectionTop: {
        position: 'absolute',
        top: PADDING,
        left: spacing.sm,
        right: spacing.sm,
        height: 1,
        backgroundColor: `${colors.primary}40`,
        zIndex: 3,
    },
    selectionBottom: {
        position: 'absolute',
        top: PADDING + ITEM_H,
        left: spacing.sm,
        right: spacing.sm,
        height: 1,
        backgroundColor: `${colors.primary}40`,
        zIndex: 3,
    },

    // Time picker
    timeSeparator: {
        width: 24,
        alignItems: 'center',
        justifyContent: 'center',
        height: ITEM_H * VISIBLE,
    },
    timeSeparatorText: {
        fontFamily: fonts.body.bold,
        fontSize: 22,
        color: colors.onSurfaceMuted,
    },
});