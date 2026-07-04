import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity } from "react-native";
import { StepperInput } from "../components/StepperInput";
import { useWellness } from "../context/WellnessContext";
import { colors, radii, spacing } from "../theme";
import { MoodScore } from "../types";

export function GoalsScreen() {
  const { goals, updateGoals } = useWellness();

  const [sleepHours, setSleepHours] = useState(goals.sleepHours);
  const [waterGlasses, setWaterGlasses] = useState(goals.waterGlasses);
  const [activityMinutes, setActivityMinutes] = useState(goals.activityMinutes);
  const [moodMin, setMoodMin] = useState<MoodScore>(goals.moodMin);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    await updateGoals({ sleepHours, waterGlasses, activityMinutes, moodMin });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>I tuoi obiettivi</Text>
      <Text style={styles.subtitle}>
        Imposta i traguardi giornalieri usati per calcolare i tuoi progressi e la streak.
      </Text>

      <StepperInput
        label="Ore di sonno"
        value={sleepHours}
        unit="h"
        step={0.5}
        max={16}
        onChange={setSleepHours}
      />
      <StepperInput
        label="Bicchieri d'acqua"
        value={waterGlasses}
        unit="bicchieri"
        max={30}
        onChange={setWaterGlasses}
      />
      <StepperInput
        label="Attività fisica"
        value={activityMinutes}
        unit="min"
        step={5}
        max={600}
        onChange={setActivityMinutes}
      />
      <StepperInput
        label="Umore minimo"
        value={moodMin}
        unit="/5"
        min={1}
        max={5}
        onChange={(v) => setMoodMin(v as MoodScore)}
      />

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>{saved ? "Obiettivi salvati ✓" : "Salva obiettivi"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
