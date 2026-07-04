import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing } from "../theme";
import { ProgressBar } from "./ProgressBar";

interface Props {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
  goalLabel: string;
  progress: number;
  met: boolean;
}

export function StatCard({ icon, label, value, goalLabel, progress, met }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, met && styles.iconWrapMet]}>
          <Ionicons name={icon} size={18} color={met ? colors.success : colors.primary} />
        </View>
        <Text style={styles.label}>{label}</Text>
        {met && <Ionicons name="checkmark-circle" size={16} color={colors.success} />}
      </View>
      <Text style={styles.value}>{value}</Text>
      <ProgressBar progress={progress} color={met ? colors.success : colors.primary} />
      <Text style={styles.goalLabel}>{goalLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexBasis: "48%",
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.xs,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: radii.pill,
    backgroundColor: "#E7F4F1",
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapMet: {
    backgroundColor: "#E4F6EA",
  },
  label: {
    flex: 1,
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: "600",
  },
  value: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  goalLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
});
