import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Mission } from "../types";
import { colors, radii, spacing } from "../theme";
import { DifficultyStars } from "./DifficultyStars";

interface Props {
  mission: Mission;
  selected: boolean;
  onToggle: () => void;
}

export function MissionChip({ mission, selected, onToggle }: Props) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onToggle}
      activeOpacity={0.8}
    >
      <View style={[styles.iconWrap, selected && styles.iconWrapSelected]}>
        <Ionicons
          name={(mission.icon as any) ?? "checkmark-outline"}
          size={16}
          color={selected ? "#fff" : colors.primary}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{mission.name}</Text>
        <DifficultyStars difficulty={mission.difficulty} size={10} />
      </View>
      <Text style={[styles.xp, selected && styles.xpSelected]}>+{mission.xpReward} XP</Text>
      {selected && <Ionicons name="checkmark-circle" size={18} color={colors.success} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: "#E7F4F1",
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: radii.pill,
    backgroundColor: "#E7F4F1",
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapSelected: {
    backgroundColor: colors.primary,
  },
  name: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  xp: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
  },
  xpSelected: {
    color: colors.primaryDark,
  },
});
