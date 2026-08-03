import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useWellness } from "../context/WellnessContext";
import { colors, radii, spacing } from "../theme";
import { Exercise, ExercisePrescription } from "../types";
import { parsePrescription } from "../utils/prescription";
import { averageRecentReps } from "../utils/workout";

interface Props {
  exercise: Exercise;
  prescription: ExercisePrescription;
  repsPerSet: number[];
  onChangeRepsPerSet: (reps: number[]) => void;
  locked: boolean;
}

export function SetTracker({ exercise, prescription, repsPerSet, onChangeRepsPerSet, locked }: Props) {
  const [showInfo, setShowInfo] = useState(false);
  const { workoutLogs } = useWellness();
  const target = parsePrescription(prescription.reps);

  const togglePill = (index: number) => {
    if (locked) return;
    const setNumber = index + 1;
    if (setNumber <= repsPerSet.length) {
      onChangeRepsPerSet(repsPerSet.slice(0, index));
    } else {
      const extended = [...repsPerSet];
      while (extended.length < setNumber) extended.push(target.isAmrap ? 0 : target.target);
      onChangeRepsPerSet(extended);
    }
  };

  const adjustSetReps = (index: number, delta: number) => {
    if (locked) return;
    const updated = [...repsPerSet];
    updated[index] = Math.max(0, updated[index] + delta);
    onChangeRepsPerSet(updated);
  };

  const avgRecent = averageRecentReps(workoutLogs, exercise.id);
  const showProgressionHint =
    !locked && !target.isAmrap && avgRecent !== null && avgRecent >= target.target * 1.5;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{exercise.name}</Text>
          <Text style={styles.muscle}>{exercise.muscle}</Text>
        </View>
        <Text style={styles.prescription}>
          {prescription.sets}x{prescription.reps}
        </Text>
        <TouchableOpacity
          onPress={() => setShowInfo((s) => !s)}
          hitSlop={8}
          style={styles.infoButton}
          accessibilityLabel={`Mostra istruzioni: ${exercise.name}`}
        >
          <Ionicons
            name="information-circle-outline"
            size={18}
            color={showInfo ? colors.primary : colors.textMuted}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.pillsRow}>
        {Array.from({ length: prescription.sets }).map((_, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => togglePill(i)}
            disabled={locked}
            style={[styles.pill, i < repsPerSet.length && styles.pillFilled]}
          >
            <Text style={[styles.pillText, i < repsPerSet.length && styles.pillTextFilled]}>{i + 1}</Text>
          </TouchableOpacity>
        ))}
        <Text style={styles.countText}>
          {repsPerSet.length}/{prescription.sets} serie{target.perSide ? " · per lato" : ""}
        </Text>
      </View>

      {repsPerSet.length > 0 && (
        <View style={styles.repsRow}>
          {repsPerSet.map((reps, i) => (
            <View key={i} style={styles.repsChip}>
              <Text style={styles.repsChipLabel}>S{i + 1}</Text>
              <TouchableOpacity onPress={() => adjustSetReps(i, -1)} disabled={locked} hitSlop={6}>
                <Ionicons name="remove" size={13} color={colors.textMuted} />
              </TouchableOpacity>
              <Text style={styles.repsChipValue}>
                {reps}
                {target.isTimeBased ? "s" : ""}
              </Text>
              <TouchableOpacity onPress={() => adjustSetReps(i, 1)} disabled={locked} hitSlop={6}>
                <Ionicons name="add" size={13} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {showProgressionHint && (
        <View style={styles.hintCard}>
          <Ionicons name="trending-up" size={14} color={colors.primary} />
          <Text style={styles.hintText}>
            Media recente {Math.round(avgRecent as number)}
            {target.isTimeBased ? "s" : " reps"} contro un obiettivo di {target.target}: prova una
            variante più difficile.
          </Text>
        </View>
      )}

      {showInfo && (
        <View style={styles.formCard}>
          <Text style={styles.formText}>{exercise.instructions}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  name: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  muscle: {
    fontSize: 11,
    color: colors.textMuted,
  },
  prescription: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.primary,
  },
  infoButton: {
    padding: 2,
  },
  pillsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginTop: spacing.xs,
  },
  pill: {
    width: 26,
    height: 26,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  pillFilled: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
  },
  pillTextFilled: {
    color: colors.onPrimary,
  },
  countText: {
    fontSize: 11,
    color: colors.textMuted,
    marginLeft: spacing.xs,
    fontWeight: "600",
  },
  repsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: spacing.xs,
  },
  repsChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.cardAlt,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  repsChipLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textMuted,
  },
  repsChipValue: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.text,
    minWidth: 22,
    textAlign: "center",
  },
  hintCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: spacing.xs,
    padding: spacing.xs,
    backgroundColor: colors.cardAlt,
    borderRadius: radii.sm,
  },
  hintText: {
    flex: 1,
    fontSize: 11,
    color: colors.primary,
    fontWeight: "600",
    lineHeight: 15,
  },
  formCard: {
    alignItems: "center",
    backgroundColor: colors.cardAlt,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  formText: {
    fontSize: 12,
    color: colors.text,
    textAlign: "center",
    marginTop: spacing.xs,
    lineHeight: 16,
  },
});
