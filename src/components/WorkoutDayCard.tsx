import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { EXERCISES_BY_ID } from "../data/workoutProgram";
import { colors, radii, spacing } from "../theme";
import { WorkoutDay } from "../types";
import { PressableScale } from "./PressableScale";

interface Props {
  day: WorkoutDay;
  completedToday: boolean;
  disabled: boolean;
  onComplete: () => void;
}

export function WorkoutDayCard({ day, completedToday, disabled, onComplete }: Props) {
  return (
    <View style={[styles.card, completedToday && styles.cardCompleted]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.name}>{day.name}</Text>
          <Text style={styles.focus}>{day.focus}</Text>
        </View>
        {completedToday && <Ionicons name="checkmark-circle" size={22} color={colors.success} />}
      </View>

      {day.exercises.map((prescription) => {
        const exercise = EXERCISES_BY_ID[prescription.exerciseId];
        return (
          <View key={prescription.exerciseId} style={styles.exerciseRow}>
            <View style={styles.exerciseIconWrap}>
              <Ionicons name={(exercise.icon as any) ?? "body-outline"} size={16} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.exerciseName}>{exercise.name}</Text>
              <Text style={styles.exerciseMuscle}>{exercise.muscle}</Text>
            </View>
            <Text style={styles.exercisePrescription}>
              {prescription.sets}x{prescription.reps}
            </Text>
          </View>
        );
      })}

      <PressableScale
        style={[styles.completeButton, disabled && styles.completeButtonDisabled]}
        onPress={disabled ? () => {} : onComplete}
      >
        <Text style={[styles.completeButtonText, disabled && styles.completeButtonTextDisabled]}>
          {completedToday ? "Completato oggi ✓" : disabled ? "Hai già allenato oggi" : "Completa allenamento"}
        </Text>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardCompleted: {
    borderColor: colors.success,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  name: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
  },
  focus: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  exerciseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  exerciseIconWrap: {
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    backgroundColor: colors.cardAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  exerciseName: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  exerciseMuscle: {
    fontSize: 11,
    color: colors.textMuted,
  },
  exercisePrescription: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.primary,
  },
  completeButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
    marginTop: spacing.md,
  },
  completeButtonDisabled: {
    backgroundColor: colors.cardAlt,
  },
  completeButtonText: {
    color: colors.onPrimary,
    fontWeight: "800",
    fontSize: 14,
  },
  completeButtonTextDisabled: {
    color: colors.textMuted,
  },
});
