import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { EXERCISES_BY_ID } from "../data/workoutProgram";
import { colors, radii, spacing } from "../theme";
import { ExerciseSetLog, WorkoutDay } from "../types";
import { PressableScale } from "./PressableScale";
import { SetTracker } from "./SetTracker";

interface Props {
  day: WorkoutDay;
  completedToday: boolean;
  disabled: boolean;
  todaysSets?: ExerciseSetLog[];
  onSave: (exerciseSets: ExerciseSetLog[]) => void;
}

export function WorkoutDayCard({ day, completedToday, disabled, todaysSets, onSave }: Props) {
  const initial = useMemo(() => {
    const map: Record<string, number> = {};
    day.exercises.forEach((p) => {
      const existing = todaysSets?.find((s) => s.exerciseId === p.exerciseId);
      map[p.exerciseId] = existing?.setsCompleted ?? 0;
    });
    return map;
  }, [day, todaysSets]);

  const [sets, setSets] = useState<Record<string, number>>(initial);

  useEffect(() => {
    setSets(initial);
  }, [initial]);

  const totalCompleted = Object.values(sets).reduce((a, b) => a + b, 0);
  const totalPrescribed = day.exercises.reduce((a, p) => a + p.sets, 0);
  const hasAnyProgress = totalCompleted > 0;
  const saveDisabled = disabled || !hasAnyProgress;

  const handleSave = () => {
    if (saveDisabled) return;
    const exerciseSets: ExerciseSetLog[] = day.exercises.map((p) => ({
      exerciseId: p.exerciseId,
      setsCompleted: sets[p.exerciseId] ?? 0,
    }));
    onSave(exerciseSets);
  };

  return (
    <View style={[styles.card, completedToday && styles.cardCompleted]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.name}>{day.name}</Text>
          <Text style={styles.focus}>{day.focus}</Text>
        </View>
        {completedToday && <Ionicons name="checkmark-circle" size={22} color={colors.success} />}
      </View>

      <Text style={styles.totalText}>
        Serie totali: {totalCompleted}/{totalPrescribed}
      </Text>

      {day.exercises.map((prescription) => (
        <SetTracker
          key={prescription.exerciseId}
          exercise={EXERCISES_BY_ID[prescription.exerciseId]}
          prescription={prescription}
          setsCompleted={sets[prescription.exerciseId] ?? 0}
          onChangeSetsCompleted={(n) => setSets((s) => ({ ...s, [prescription.exerciseId]: n }))}
          locked={completedToday || disabled}
        />
      ))}

      {!completedToday && (
        <PressableScale
          style={[styles.completeButton, saveDisabled && styles.completeButtonDisabled]}
          onPress={handleSave}
        >
          <Text style={[styles.completeButtonText, saveDisabled && styles.completeButtonTextDisabled]}>
            {disabled ? "Hai già allenato oggi" : "Salva allenamento"}
          </Text>
        </PressableScale>
      )}
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
    marginBottom: spacing.xs,
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
  totalText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: spacing.xs,
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
