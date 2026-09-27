import { useNavigation } from "@react-navigation/native";
import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { PressableScale } from "../components/PressableScale";
import { ScreenHeader } from "../components/ScreenHeader";
import { StepperInput } from "../components/StepperInput";
import { useWellness } from "../context/WellnessContext";
import { colors, radii, spacing } from "../theme";

export function GoalsScreen() {
  const navigation = useNavigation();
  const { goals, updateGoals } = useWellness();

  const [sleepHours, setSleepHours] = useState(goals.sleepHours);
  const [waterBottles, setWaterBottles] = useState(goals.waterBottles);
  const [trainingHoursWeek, setTrainingHoursWeek] = useState(goals.trainingHoursWeek);
  const [moodRange, setMoodRange] = useState(goals.moodRange);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    await updateGoals({ sleepHours, waterBottles, trainingHoursWeek, moodRange });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="I tuoi obiettivi"
        subtitle="Di base: 9 ore di sonno, 10 bottigliette, 8 ore di allenamento a settimana"
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
          label="Acqua (bottigliette da 0,5 L)"
          value={waterBottles}
          unit="bottigliette"
          max={14}
          onChange={setWaterBottles}
        />
        <StepperInput
          label="Allenamento a settimana (pesi + MMA + tecnica)"
          value={trainingHoursWeek}
          unit="h"
          step={0.5}
          min={0.5}
          max={20}
          onChange={setTrainingHoursWeek}
        />
        <Text style={styles.hint}>
          In ore e mezze ore, così conta sia la palestra sia l'MMA. Il piano di adesso ne prevede 8: lunedì 1h20 di pesi,
          martedì e giovedì pesi + MMA, venerdì pesi, più shadow e tecnica a casa. Ogni giorno l'obiettivo è fare le ore
          previste per quel giorno (nei giorni di riposo è già raggiunto).
        </Text>
        <StepperInput
          label="Zona stabile dell'umore (da −N a +N)"
          value={moodRange}
          unit="±"
          min={1}
          max={4}
          onChange={setMoodRange}
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
  hint: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
    lineHeight: 15,
  },
});
