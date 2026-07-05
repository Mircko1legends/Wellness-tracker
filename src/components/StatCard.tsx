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
  accentColor?: string;
  accentBg?: string;
}

export function StatCard({
  icon,
  label,
  value,
  goalLabel,
  progress,
  met,
  accentColor = colors.primary,
  accentBg = colors.cardAlt,
}: Props) {
  return (
    <View style={[styles.card, met && styles.cardMet]}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: met ? "#173324" : accentBg }]}>
          <Ionicons name={icon} size={18} color={met ? colors.success : accentColor} />
        </View>
        <Text style={styles.label}>{label}</Text>
        {met && <Ionicons name="checkmark-circle" size={16} color={colors.success} />}
      </View>
      <Text style={styles.value}>{value}</Text>
      <ProgressBar progress={progress} color={met ? colors.success : accentColor} />
      <Text style={styles.goalLabel}>{goalLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexBasis: "48%",
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  cardMet: {
    borderColor: colors.success,
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
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    flex: 1,
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: "600",
  },
  value: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.5,
  },
  goalLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
});
