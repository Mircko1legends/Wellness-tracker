import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MoodScore } from "../types";
import { colors, radii, spacing } from "../theme";

const MOODS: { score: MoodScore; emoji: string; label: string }[] = [
  { score: 1, emoji: "😞", label: "Pessimo" },
  { score: 2, emoji: "🙁", label: "Scarso" },
  { score: 3, emoji: "😐", label: "Normale" },
  { score: 4, emoji: "🙂", label: "Buono" },
  { score: 5, emoji: "😄", label: "Ottimo" },
];

interface Props {
  value: MoodScore;
  onChange: (score: MoodScore) => void;
}

export function MoodPicker({ value, onChange }: Props) {
  return (
    <View style={styles.row}>
      {MOODS.map((m) => {
        const selected = m.score === value;
        return (
          <TouchableOpacity
            key={m.score}
            onPress={() => onChange(m.score)}
            style={[styles.option, selected && styles.optionSelected]}
          >
            <Text style={styles.emoji}>{m.emoji}</Text>
            <Text style={[styles.label, selected && styles.labelSelected]}>{m.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  option: {
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.md,
    flex: 1,
    marginHorizontal: 2,
  },
  optionSelected: {
    backgroundColor: "#E7F4F1",
  },
  emoji: {
    fontSize: 26,
  },
  label: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  labelSelected: {
    color: colors.primaryDark,
    fontWeight: "700",
  },
});
