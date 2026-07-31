import { useNavigation } from "@react-navigation/native";
import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { PressableScale } from "../components/PressableScale";
import { ScreenHeader } from "../components/ScreenHeader";
import { StepperInput } from "../components/StepperInput";
import { useWellness } from "../context/WellnessContext";
import { MAX_WORKOUT_TIER, WORKOUT_TIERS_BY_LEVEL } from "../data/workoutProgram";
import { colors, radii, spacing } from "../theme";
import { MoodScore } from "../types";

export function GoalsScreen() {
  const navigation = useNavigation();
  const { goals, updateGoals } = useWellness();

  const [sleepHours, setSleepHours] = useState(goals.sleepHours);
  const [waterGlasses, setWaterGlasses] = useState(goals.waterGlasses);
  const [setsGoal, setSetsGoal] = useState(goals.setsGoal);
  const [moodMin, setMoodMin] = useState<MoodScore>(goals.moodMin);
  const [startingWorkoutTier, setStartingWorkoutTier] = useState(goals.startingWorkoutTier);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    await updateGoals({ sleepHours, waterGlasses, setsGoal, moodMin, startingWorkoutTier });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="I tuoi obiettivi"
        subtitle="Traguardi giornalieri usati per calcolare progressi e streak"
        onBack={() => navigation.goBack()}
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
          label="Serie di allenamento"
          value={setsGoal}
          unit="serie"
          max={60}
          onChange={setSetsGoal}
        />
        <StepperInput
          label="Umore minimo"
          value={moodMin}
          unit="/5"
          min={1}
          max={5}
          onChange={(v) => setMoodMin(v as MoodScore)}
        />
        <StepperInput
          label="Livello di partenza allenamento"
          value={startingWorkoutTier}
          unit={`· ${WORKOUT_TIERS_BY_LEVEL[startingWorkoutTier]?.name ?? ""}`}
          min={1}
          max={MAX_WORKOUT_TIER}
          onChange={setStartingWorkoutTier}
        />
        <Text style={styles.hint}>
          Se sei già allenato non serve rifare le settimane da principiante: alza il livello di
          partenza e la scheda parte direttamente da lì.
        </Text>

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
  hint: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
    lineHeight: 15,
  },
});
