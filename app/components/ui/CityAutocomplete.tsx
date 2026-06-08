/**
 * CityAutocomplete — inline city search with dropdown.
 * Replaces the Modal-based city picker: single tap to select, no context switch.
 *
 * Parent ScrollView MUST have keyboardShouldPersistTaps="handled".
 * Pass scrollRef + scrollYRef to enable auto-scroll above the keyboard.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
    ViewStyle,
    ScrollView,
    Keyboard,
    Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { searchCities, CitySearchResult } from '@/services/birthProfile';
import { colors, spacing, radius, fonts } from '@/theme';

const getCityContext = (item: CitySearchResult) => {
    const parts = [];
    if (item.postcode) parts.push(item.postcode);
    if (item.admin2) parts.push(item.admin2);
    if (item.admin1 && item.admin1 !== item.admin2) parts.push(item.admin1);
    if (item.country) parts.push(item.country);
    return parts.length > 0 ? parts.join(', ') : item.country;
};

const ROW_HEIGHT = 68;

interface CityAutocompleteProps {
    label?: string;
    placeholder?: string;
    /** Display name of the currently selected city (empty string if none). */
    value: string;
    onSelect: (city: CitySearchResult) => void;
    /** Called when the user clears the input — use to reset lat/lng in parent. */
    onClear?: () => void;
    disabled?: boolean;
    style?: ViewStyle;
    /** Ref to the ancestor ScrollView — required for auto-scroll. */
    scrollRef?: React.RefObject<ScrollView>;
    /** Current scroll offset of the ancestor ScrollView (updated via onScroll). */
    scrollYRef?: React.MutableRefObject<number>;
}

export function CityAutocomplete({
    label,
    placeholder = 'Rechercher une ville…',
    value,
    onSelect,
    onClear,
    disabled = false,
    style,
    scrollRef,
    scrollYRef,
}: CityAutocompleteProps) {
    const wrapperRef = useRef<View>(null);
    const [query, setQuery] = useState(value || '');
    const [results, setResults] = useState<CitySearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    // Track keyboard height reliably
    useEffect(() => {
        const show = Keyboard.addListener('keyboardDidShow', (e) => {
            setKeyboardHeight(e.endCoordinates.height);
        });
        const hide = Keyboard.addListener('keyboardDidHide', () => {
            setKeyboardHeight(0);
        });
        return () => { show.remove(); hide.remove(); };
    }, []);

    // Sync when value changes from parent (city selected or form reset)
    useEffect(() => {
        setQuery(value || '');
        if (!value) {
            setResults([]);
            setShowResults(false);
        }
    }, [value]);

    /**
     * Scroll so the full dropdown is visible above the keyboard.
     *
     * Uses measureInWindow (real screen coordinates) + current scroll offset
     * to compute the exact delta needed.
     */
    const scrollToShowDropdown = useCallback((numResults: number, kbHeight?: number) => {
        if (!scrollRef?.current || !wrapperRef.current) return;

        const effectiveKbHeight = kbHeight ?? keyboardHeight;
        if (effectiveKbHeight === 0) return; // keyboard not visible, nothing to do

        const INPUT_HEIGHT = label ? 28 + 4 + 52 : 52; // label + gap + input
        const dropdownH = numResults > 0 ? Math.min(numResults * ROW_HEIGHT, ROW_HEIGHT * 3 + 8) : 0;
        const MARGIN = 24;
        const screenHeight = Dimensions.get('window').height;
        const visibleBottom = screenHeight - effectiveKbHeight - MARGIN;

        wrapperRef.current.measureInWindow((x, y, width, height) => {
            const dropdownBottom = y + INPUT_HEIGHT + dropdownH;
            if (dropdownBottom > visibleBottom) {
                const delta = dropdownBottom - visibleBottom;
                const currentScrollY = scrollYRef?.current ?? 0;
                scrollRef.current?.scrollTo({
                    y: currentScrollY + delta,
                    animated: true,
                });
            }
        });
    }, [scrollRef, scrollYRef, keyboardHeight, label]);

    // Auto-scroll when results appear
    useEffect(() => {
        if (showResults && results.length > 0) {
            // Wait one frame for the dropdown to be laid out
            const id = requestAnimationFrame(() => {
                scrollToShowDropdown(results.length);
            });
            return () => cancelAnimationFrame(id);
        }
    }, [showResults, results.length, scrollToShowDropdown]);

    const handleFocus = useCallback(() => {
        // Wait for keyboard slide-in, then scroll so at least the input is visible
        const timer = setTimeout(() => {
            const kbHeight = Keyboard.metrics?.()?.height ?? keyboardHeight;
            scrollToShowDropdown(results.length, kbHeight || keyboardHeight);
        }, 400);
        return () => clearTimeout(timer);
    }, [scrollToShowDropdown, results.length, keyboardHeight]);

    const handleChangeText = useCallback(async (text: string) => {
        setQuery(text);
        if (text.length < 2) {
            setResults([]);
            setShowResults(false);
            if (text.length === 0) onClear?.();
            return;
        }
        setIsSearching(true);
        setShowResults(true);
        try {
            const cityResults = await searchCities(text);
            setResults(cityResults);
        } catch {
            setResults([]);
        } finally {
            setIsSearching(false);
        }
    }, [onClear]);

    const handleSelect = useCallback((city: CitySearchResult) => {
        setShowResults(false);
        setResults([]);
        onSelect(city);
    }, [onSelect]);

    return (
        <View ref={wrapperRef} style={[styles.wrapper, style]}>
            {label && <Text style={styles.label}>{label}</Text>}

            <View style={[styles.inputRow, !!value && styles.inputRowFilled]}>
                <TextInput
                    style={styles.input}
                    value={query}
                    onChangeText={handleChangeText}
                    onFocus={handleFocus}
                    placeholder={placeholder}
                    placeholderTextColor={`${colors.onSurfaceMuted}80`}
                    editable={!disabled}
                    autoCapitalize="words"
                    autoCorrect={false}
                    autoComplete="off"
                    returnKeyType="search"
                />
                {isSearching ? (
                    <ActivityIndicator size="small" color={colors.primary} style={styles.icon} />
                ) : (
                    <Feather name="search" size={15} color={colors.onSurfaceMuted} style={styles.icon} />
                )}
            </View>

            {showResults && results.length > 0 && (
                <View style={styles.dropdown}>
                    {results.map((item, index) => (
                        <TouchableOpacity
                            key={`${item.name}-${item.latitude}-${index}`}
                            style={[
                                styles.resultRow,
                                index < results.length - 1 && styles.resultBorder,
                            ]}
                            onPress={() => handleSelect(item)}
                            activeOpacity={0.6}
                        >
                            <View style={styles.resultTexts}>
                                <Text style={styles.cityName}>{item.name}</Text>
                                <Text style={styles.cityCountry}>{getCityContext(item)}</Text>
                            </View>
                            <Text style={styles.arrow}>→</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        width: '100%',
    },
    label: {
        fontFamily: fonts.body.medium,
        fontSize: 13,
        color: colors.onSurfaceMuted,
        marginBottom: spacing.sm,
        letterSpacing: 0.3,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceContainer,
        borderRadius: radius.md,
        minHeight: 52,
        paddingHorizontal: spacing.lg,
        borderWidth: 1,
        borderColor: `${colors.outline}66`,
    },
    inputRowFilled: {
        borderColor: colors.primary,
    },
    input: {
        flex: 1,
        fontFamily: fonts.body.regular,
        fontSize: 16,
        color: colors.onSurface,
        paddingVertical: 0,
    },
    icon: {
        marginLeft: spacing.sm,
    },
    dropdown: {
        marginTop: spacing.xs,
        backgroundColor: colors.surfaceContainerHigh,
        borderRadius: radius.md,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: `${colors.outline}40`,
    },
    resultRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
    },
    resultBorder: {
        borderBottomWidth: 1,
        borderBottomColor: `${colors.outline}30`,
    },
    resultTexts: {
        flex: 1,
    },
    cityName: {
        fontFamily: fonts.body.medium,
        fontSize: 14,
        color: colors.onSurface,
        marginBottom: 2,
    },
    cityCountry: {
        fontFamily: fonts.body.regular,
        fontSize: 12,
        color: colors.onSurfaceMuted,
    },
    arrow: {
        fontFamily: fonts.body.regular,
        fontSize: 16,
        color: colors.primary,
        marginLeft: spacing.md,
    },
});