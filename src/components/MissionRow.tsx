import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Mission } from "../types";
import { colors, radii, spacing } from "../theme";
import { DifficultyStars } from "./DifficultyStars";

interface Props {
  mission: Mission;
  locked: boolean;
  completedToday?: boolean;
}

export function MissionRow({ mission, locked, completedToday }: Props) {
  return (
    <View style={[styles.row, locked && styles.rowLocked]}>
      <View style={[styles.iconWrap, locked && styles.iconWrapLocked]}>
        <Ionicons
          name={locked ? "lock-closed" : ((mission.icon as any) ?? "checkmark-outline")}
          size={18}
          color={locked ? colors.textMuted : colors.primary}
        />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, locked && styles.textMuted]}>{mission.name}</Text>
          {completedToday && !locked && (
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
          )}
        </View>
        <Text style={[styles.description, locked && styles.textMuted]}>{mission.description}</Text>
        <View style={styles.metaRow}>
          <DifficultyStars difficulty={mission.difficulty} />
          <Text style={[styles.xp, locked && styles.textMuted]}>+{mission.xpReward} XP</Text>
        </View>
      </View>
      {locked && <Text style={styles.unlockLabel}>Lv. {mission.unlockLevel}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowLocked: {
    opacity: 0.6,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: "#E7F4F1",
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapLocked: {
    backgroundColor: colors.border,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  name: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  description: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  xp: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
  },
  textMuted: {
    color: colors.textMuted,
  },
  unlockLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
    backgroundColor: colors.background,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
});
