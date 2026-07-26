import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors, radii, spacing } from "../theme";
import { Exercise, ExercisePrescription } from "../types";

interface Props {
  exercise: Exercise;
  prescription: ExercisePrescription;
  setsCompleted: number;
  onChangeSetsCompleted: (n: number) => void;
  locked: boolean;
}

export function SetTracker({ exercise, prescription, setsCompleted, onChangeSetsCompleted, locked }: Props) {
  const [showForm, setShowForm] = useState(false);

  const togglePill = (index: number) => {
    if (locked) return;
    const setNumber = index + 1;
    onChangeSetsCompleted(setsCompleted === setNumber ? setNumber - 1 : setNumber);
  };

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
          onPress={() => setShowForm((s) => !s)}
          hitSlop={8}
          style={styles.formButton}
          accessibilityLabel={`Mostra la forma corretta: ${exercise.name}`}
        >
          <Ionicons name="body" size={18} color={showForm ? colors.primary : colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.pillsRow}>
        {Array.from({ length: prescription.sets }).map((_, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => togglePill(i)}
            disabled={locked}
            style={[styles.pill, i < setsCompleted && styles.pillFilled]}
          >
            <Text style={[styles.pillText, i < setsCompleted && styles.pillTextFilled]}>{i + 1}</Text>
          </TouchableOpacity>
        ))}
        <Text style={styles.countText}>
          {setsCompleted}/{prescription.sets} serie
        </Text>
      </View>

      {showForm && (
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
  formButton: {
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
