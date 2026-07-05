import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors, radii, spacing } from "../theme";

interface Props {
  label: string;
  value: number;
  unit: string;
  step?: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}

export function StepperInput({
  label,
  value,
  unit,
  step = 1,
  min = 0,
  max = 999,
  onChange,
}: Props) {
  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => onChange(clamp(value - step))}
          accessibilityLabel={`Diminuisci ${label}`}
        >
          <Ionicons name="remove" size={20} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.value}>
          {value} <Text style={styles.unit}>{unit}</Text>
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => onChange(clamp(value + step))}
          accessibilityLabel={`Aumenta ${label}`}
        >
          <Ionicons name="add" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.cardAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  unit: {
    fontSize: 13,
    fontWeight: "400",
    color: colors.textMuted,
  },
});
