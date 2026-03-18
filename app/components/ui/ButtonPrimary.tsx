import React from "react";
import { Pressable, Text, StyleSheet, ViewStyle } from "react-native";
import { COLORS } from "@/constants/colors";

type Props = {
    title: string;
    onPress?: () => void;
    style?: ViewStyle;
    disabled?: boolean;
};

export default function ButtonPrimary({ title, onPress, style, disabled }: Props) {
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            style={({ pressed }) => [
                styles.btn,
                pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 },
                disabled && styles.disabled,
                style,
            ]}
            android_ripple={{ color: "rgba(255,255,255,0.15)" }}
            accessibilityRole="button"
            accessibilityLabel={title}
        >
            <Text style={[styles.text, disabled && styles.textDisabled]}>{title}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    btn: {
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 24,
        backgroundColor: COLORS.GOLD,
        shadowColor: "#000",
        shadowOpacity: 0.25,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 8 },
        elevation: 4,
        alignItems: "center",
    },
    disabled: {
        opacity: 0.5,
    },
    text: {
        color: COLORS.BG,
        fontSize: 16,
        fontWeight: "800",
        letterSpacing: 1,
    },
    textDisabled: {
        opacity: 0.7,
    },
});