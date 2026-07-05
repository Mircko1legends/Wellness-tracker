import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { MissionChip } from "../components/MissionChip";
import { MoodPicker } from "../components/MoodPicker";
import { PressableScale } from "../components/PressableScale";
import { ScreenHeader } from "../components/ScreenHeader";
import { StepperInput } from "../components/StepperInput";
import { useWellness } from "../context/WellnessContext";
import { colors, radii, spacing } from "../theme";
import { MoodScore, WellnessEntry } from "../types";
import { todayKey } from "../utils/date";

const EMPTY_ENTRY: Omit<WellnessEntry, "date"> = {
  mood: 3,
  sleepHours: 7,
  waterGlasses: 4,
  notes: "",
  bonusMissions: [],
};

export function LogEntryScreen() {
  const { logEntry, getEntryForDate, unlockedMissions } = useWellness();
  const date = todayKey();
  const existing = getEntryForDate(date);
  const bonusMissionOptions = unlockedMissions.filter((m) => !m.core);

  const [mood, setMood] = useState<MoodScore>(existing?.mood ?? EMPTY_ENTRY.mood);
  const [sleepHours, setSleepHours] = useState(existing?.sleepHours ?? EMPTY_ENTRY.sleepHours);
  const [waterGlasses, setWaterGlasses] = useState(
    existing?.waterGlasses ?? EMPTY_ENTRY.waterGlasses
  );
  const [notes, setNotes] = useState(existing?.notes ?? EMPTY_ENTRY.notes ?? "");
  const [bonusMissions, setBonusMissions] = useState<string[]>(existing?.bonusMissions ?? []);
  const [feedback, setFeedback] = useState<{ xp: number; leveledUp: boolean; newLevel: number } | null>(
    null
  );

  useEffect(() => {
    setFeedback(null);
  }, [mood, sleepHours, waterGlasses, notes, bonusMissions]);

  const toggleBonusMission = (id: string) => {
    setBonusMissions((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    const result = await logEntry({
      date,
      mood,
      sleepHours,
      waterGlasses,
      notes,
      bonusMissions,
    });
    setFeedback({ xp: result.xpEarned, leveledUp: result.leveledUp, newLevel: result.newLevel });
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Registra la giornata"
        subtitle={existing ? "Modifica la voce di oggi" : "Oggi"}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
      <ScrollView contentContainerStyle={styles.content}>
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
        <View style={styles.workoutHint}>
          <Ionicons name="barbell-outline" size={16} color={colors.textMuted} />
          <Text style={styles.workoutHintText}>
            Le serie di allenamento si registrano nella scheda "Allenamento", non qui.
          </Text>
        </View>

        {bonusMissionOptions.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Missioni bonus</Text>
            {bonusMissionOptions.map((mission) => (
              <MissionChip
                key={mission.id}
                mission={mission}
                selected={bonusMissions.includes(mission.id)}
                onToggle={() => toggleBonusMission(mission.id)}
              />
            ))}
          </>
        )}

        <Text style={styles.sectionLabel}>Note (opzionale)</Text>
        <TextInput
          style={styles.notes}
          placeholder="Come ti senti oggi?"
          placeholderTextColor={colors.textMuted}
          multiline
          value={notes}
          onChangeText={setNotes}
        />

        {feedback && (
          <View style={styles.feedbackCard}>
            <Ionicons name="sparkles" size={18} color={colors.accent} />
            <Text style={styles.feedbackText}>
              {feedback.leveledUp
                ? `Livello raggiunto! Ora sei livello ${feedback.newLevel} (+${feedback.xp} XP)`
                : `+${feedback.xp} XP guadagnati`}
            </Text>
          </View>
        )}

        <PressableScale style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>{feedback ? "Salvato ✓" : "Salva"}</Text>
        </PressableScale>
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  workoutHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  workoutHintText: {
    flex: 1,
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 15,
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
  feedbackCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.cardAlt,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.primary,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  feedbackText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  saveButtonText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: "800",
  },
});
