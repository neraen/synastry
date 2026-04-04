/**
 * CityAutocomplete — inline city search with dropdown.
 * Replaces the Modal-based city picker: single tap to select, no context switch.
 *
 * Parent ScrollView MUST have keyboardShouldPersistTaps="handled".
 * Pass scrollRef to enable auto-scroll so the dropdown is never hidden by the keyboard.
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

const ROW_HEIGHT = 68; // approximate height of one result row

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
    /**
     * Ref to the ancestor ScrollView.
     * Required to auto-scroll so the dropdown appears above the keyboard.
     */
    scrollRef?: React.RefObject<ScrollView>;
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
}: CityAutocompleteProps) {
    const wrapperRef = useRef<View>(null);
    const [query, setQuery] = useState(value || '');
    const [results, setResults] = useState<CitySearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);

    // Sync when value changes from parent (city selected or form reset)
    useEffect(() => {
        setQuery(value || '');
        if (!value) {
            setResults([]);
            setShowResults(false);
        }
    }, [value]);

    /**
     * Scroll so the full dropdown (input + results) is above the keyboard.
     * Uses measureLayout relative to the ScrollView to get the content offset.
     */
    const scrollToShowDropdown = useCallback((numResults: number) => {
        if (!scrollRef?.current || !wrapperRef.current) return;
        const INPUT_HEIGHT = 52;
        const dropdownHeight = numResults > 0 ? Math.min(numResults * ROW_HEIGHT, ROW_HEIGHT * 3 + 8) : 0;
        const keyboardHeight = Keyboard.metrics?.()?.height ?? 320;
        const screenHeight = Dimensions.get('window').height;
        const visibleHeight = screenHeight - keyboardHeight;

        wrapperRef.current.measureLayout(
            scrollRef.current as any,
            (x, y) => {
                const bottomNeeded = y + INPUT_HEIGHT + dropdownHeight + 24;
                const targetScrollY = bottomNeeded - visibleHeight;
                if (targetScrollY > 0) {
                    scrollRef.current?.scrollTo({ y: targetScrollY, animated: true });
                }
            },
            () => {} // noop on failure
        );
    }, [scrollRef]);

    // Auto-scroll when results appear
    useEffect(() => {
        if (showResults && results.length > 0) {
            const timer = setTimeout(() => scrollToShowDropdown(results.length), 100);
            return () => clearTimeout(timer);
        }
    }, [showResults, results.length, scrollToShowDropdown]);

    const handleFocus = useCallback(() => {
        // Wait for keyboard slide-in animation before measuring
        const timer = setTimeout(() => scrollToShowDropdown(results.length), 350);
        return () => clearTimeout(timer);
    }, [scrollToShowDropdown, results.length]);

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
        // query will sync via useEffect when value prop updates
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
                                <Text style={styles.cityCountry}>{item.country}</Text>
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