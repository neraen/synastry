import React from "react";
import { View, Text, TextInput, StyleSheet, TextInputProps } from "react-native";
import { COLORS } from "@/constants/colors";

type Props = TextInputProps & {
    label?: string;
    error?: string;
};

export default function TextField({ label, error, style, ...rest }: Props) {
    return (
        <View style={{ width: "100%" }}>
            {label ? <Text style={styles.label}>{label}</Text> : null}
            <TextInput
                placeholderTextColor={COLORS.TEXT_DIM}
                style={[styles.input, style, !!error && styles.inputError]}
                {...rest}
            />
            {!!error && <Text style={styles.error}>{error}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    label: {
        color: COLORS.TEXT_MUTED,
        marginBottom: 8,
        fontSize: 14,
    },
    input: {
        backgroundColor: COLORS.INPUT_BG,
        borderWidth: 1,
        borderColor: COLORS.INPUT_BORDER,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 14,
        color: COLORS.TEXT,
        fontSize: 16,
    },
    inputError: {
        borderColor: COLORS.ERROR,
    },
    error: {
        color: COLORS.ERROR,
        marginTop: 6,
        fontSize: 13,
    },
});
