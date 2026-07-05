import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { PressableScale } from "../components/PressableScale";
import { ScreenHeader } from "../components/ScreenHeader";
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
    <View style={styles.container}>
      <ScreenHeader
        title="I tuoi obiettivi"
        subtitle="Traguardi giornalieri usati per calcolare progressi e streak"
      />
      <ScrollView contentContainerStyle={styles.content}>
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

        <PressableScale style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>{saved ? "Obiettivi salvati ✓" : "Salva obiettivi"}</Text>
        </PressableScale>
      </ScrollView>
    </View>
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
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  saveButtonText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: "800",
  },
});
