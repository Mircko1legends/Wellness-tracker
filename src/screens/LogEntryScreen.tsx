import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { MoodPicker } from "../components/MoodPicker";
import { StepperInput } from "../components/StepperInput";
import { useWellness } from "../context/WellnessContext";
import { colors, radii, spacing } from "../theme";
import { MoodScore, WellnessEntry } from "../types";
import { todayKey } from "../utils/date";

const EMPTY_ENTRY: Omit<WellnessEntry, "date"> = {
  mood: 3,
  sleepHours: 7,
  waterGlasses: 4,
  activityMinutes: 0,
  notes: "",
};

export function LogEntryScreen() {
  const { logEntry, getEntryForDate } = useWellness();
  const date = todayKey();
  const existing = getEntryForDate(date);

  const [mood, setMood] = useState<MoodScore>(existing?.mood ?? EMPTY_ENTRY.mood);
  const [sleepHours, setSleepHours] = useState(existing?.sleepHours ?? EMPTY_ENTRY.sleepHours);
  const [waterGlasses, setWaterGlasses] = useState(
    existing?.waterGlasses ?? EMPTY_ENTRY.waterGlasses
  );
  const [activityMinutes, setActivityMinutes] = useState(
    existing?.activityMinutes ?? EMPTY_ENTRY.activityMinutes
  );
  const [notes, setNotes] = useState(existing?.notes ?? EMPTY_ENTRY.notes ?? "");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(false);
  }, [mood, sleepHours, waterGlasses, activityMinutes, notes]);

  const handleSave = async () => {
    await logEntry({ date, mood, sleepHours, waterGlasses, activityMinutes, notes });
    setSaved(true);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Registra la giornata</Text>
        <Text style={styles.subtitle}>{existing ? "Modifica la voce di oggi" : "Oggi"}</Text>

        <Text style={styles.sectionLabel}>Umore</Text>
        <MoodPicker value={mood} onChange={setMood} />

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

        <Text style={styles.sectionLabel}>Note (opzionale)</Text>
        <TextInput
          style={styles.notes}
          placeholder="Come ti senti oggi?"
          placeholderTextColor={colors.textMuted}
          multiline
          value={notes}
          onChangeText={setNotes}
        />

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>{saved ? "Salvato ✓" : "Salva"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  notes: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    minHeight: 80,
    textAlignVertical: "top",
    color: colors.text,
    marginBottom: spacing.lg,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
