/**
 * CityAutocomplete — inline city search with dropdown.
 * Replaces the Modal-based city picker: single tap to select, no context switch.
 *
 * Parent ScrollView MUST have keyboardShouldPersistTaps="handled".
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
    ViewStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { searchCities, CitySearchResult } from '@/services/birthProfile';
import { colors, spacing, radius, fonts } from '@/theme';

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
}

export function CityAutocomplete({
    label,
    placeholder = 'Rechercher une ville…',
    value,
    onSelect,
    onClear,
    disabled = false,
    style,
}: CityAutocompleteProps) {
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
        <View style={[styles.wrapper, style]}>
            {label && <Text style={styles.label}>{label}</Text>}

            <View style={[styles.inputRow, !!value && styles.inputRowFilled]}>
                <TextInput
                    style={styles.input}
                    value={query}
                    onChangeText={handleChangeText}
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