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
import { MoodPicker } from "../components/MoodPicker";
import { PressableScale } from "../components/PressableScale";
import { ScreenHeader } from "../components/ScreenHeader";
import { StepperInput } from "../components/StepperInput";
import { useWater } from "../context/WaterContext";
import { useWellness } from "../context/WellnessContext";
import { colors, radii, spacing } from "../theme";
import { MoodScore, WellnessEntry } from "../types";
import { todayKey } from "../utils/date";
import { FIRST_MONTH_MISSIONS, toHalfHours, XP } from "../progress/lifeProgress";
import { useLifeProgress } from "../progress/useLifeProgress";
import { loadHealthDaily } from "../storage/storage";
import type { HealthDay } from "../health/healthData";
import { TouchableOpacity } from "react-native";

const EMPTY_ENTRY: Omit<WellnessEntry, "date"> = {
  mood: 0,
  moodScale: 11,
  sleepHours: 9,
  waterBottles: 0,
  notes: "",
  bonusMissions: [],
};

export function LogEntryScreen() {
  const { logEntry, getEntryForDate } = useWellness();
  const progress = useLifeProgress();
  const date = todayKey();
  const existing = getEntryForDate(date);

  const [mood, setMood] = useState<MoodScore>(existing?.mood ?? EMPTY_ENTRY.mood);
  const [sleepHours, setSleepHours] = useState(existing?.sleepHours ?? EMPTY_ENTRY.sleepHours);
  const water = useWater();
  // Bottles counted with "+1" during the day prefill the log.
  const [waterBottles, setWaterBottles] = useState(existing?.waterBottles ?? water.todayBottles);
  useEffect(() => {
    if (!existing) setWaterBottles((b) => Math.max(b, water.todayBottles));
  }, [water.todayBottles, existing]);
  const derivedHours = toHalfHours(progress?.trainingToday.done ?? 0);
  // Training hours come from the Giornata; typing a number here overrides them for today.
  const [trainingHours, setTrainingHours] = useState<number | undefined>(existing?.trainingHours);
  const [notes, setNotes] = useState(existing?.notes ?? EMPTY_ENTRY.notes ?? "");
  const [bonusMissions, setBonusMissions] = useState<string[]>(existing?.bonusMissions ?? []);
  const [saved, setSaved] = useState(false);
  const [health, setHealth] = useState<HealthDay | null>(null);

  // A watch or phone that writes to Health Connect fills sleep for you (you can still change it).
  useEffect(() => {
    loadHealthDaily()
      .then((d) => {
        const h = d[date] ?? null;
        setHealth(h);
        if (h?.sleepHours && !existing) setSleepHours(Math.round(h.sleepHours * 2) / 2);
      })
      .catch(() => {});
  }, [date]);

  useEffect(() => {
    setSaved(false);
  }, [mood, sleepHours, waterBottles, notes, bonusMissions, trainingHours]);

  const toggleBonusMission = (id: string) => {
    setBonusMissions((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  };

  const handleSave = async () => {
    await logEntry({
      date,
      mood,
      moodScale: 11,
      sleepHours,
      waterBottles,
      ...(trainingHours !== undefined ? { trainingHours } : {}),
      notes,
      bonusMissions,
    });
    setSaved(true);
    progress?.refresh();
  };

  const autoDone = new Set(progress?.missions.filter((m) => m.done && !bonusMissions.includes(m.id)).map((m) => m.id) ?? []);

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
        {health?.sleepHours ? (
          <Text style={styles.workoutHintText}>Sonno letto da Health Connect: {String(health.sleepHours).replace(".", ",")} h</Text>
        ) : null}
        <StepperInput
          label="Acqua (bottigliette da 0,5 L finite)"
          value={waterBottles}
          unit="bottigliette"
          max={14}
          onChange={setWaterBottles}
        />
        <StepperInput
          label="Allenamento di oggi (pesi + MMA + tecnica)"
          value={trainingHours ?? derivedHours}
          unit="h"
          step={0.5}
          max={6}
          onChange={setTrainingHours}
        />
        <View style={styles.workoutHint}>
          <Ionicons name="barbell-outline" size={16} color={colors.textMuted} />
          <Text style={styles.workoutHintText}>
            {trainingHours === undefined
              ? "Calcolato da quello che hai spuntato nella Giornata: cambialo solo se hai fatto di più o di meno."
              : "Hai scritto tu le ore di oggi: contano queste."}
            {health?.exerciseMinutes ? ` Il tuo orologio ha registrato ${health.exerciseMinutes}′ di allenamento.` : ""}
          </Text>
        </View>

        <Text style={styles.sectionLabel}>Missioni del primo mese</Text>
        {FIRST_MONTH_MISSIONS.map((mission) => {
          const auto = autoDone.has(mission.id);
          const manual = bonusMissions.includes(mission.id);
          return (
            <TouchableOpacity
              key={mission.id}
              style={[styles.mission, (auto || manual) && styles.missionOn]}
              onPress={() => !auto && toggleBonusMission(mission.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: auto || manual }}
            >
              <Ionicons name={auto || manual ? "checkmark-circle" : "ellipse-outline"} size={20} color={auto || manual ? colors.success : colors.textMuted} />
              <View style={{ flex: 1 }}>
                <Text style={styles.missionName}>{mission.name}</Text>
                <Text style={styles.workoutHintText}>{auto ? "Fatta: presa dalla Giornata" : mission.description}</Text>
              </View>
              <Text style={styles.missionXp}>+{XP.mission}</Text>
            </TouchableOpacity>
          );
        })}

        <Text style={styles.sectionLabel}>Note (opzionale)</Text>
        <TextInput
          style={styles.notes}
          placeholder="Come ti senti oggi?"
          placeholderTextColor={colors.textMuted}
          multiline
          value={notes}
          onChangeText={setNotes}
        />

        {saved && progress && (
          <View style={styles.feedbackCard}>
            <Ionicons name="sparkles" size={18} color={colors.accent} />
            <Text style={styles.feedbackText}>
              Salvato. Oggi hai già +{progress.xp.today} XP · livello {progress.level.level} ({progress.level.title})
            </Text>
          </View>
        )}

        <PressableScale style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>{saved ? "Salvato ✓" : "Salva"}</Text>
        </PressableScale>
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  mission: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: 6,
  },
  missionOn: { borderColor: colors.success },
  missionName: { color: colors.text, fontWeight: "700", fontSize: 14 },
  missionXp: { color: colors.primary, fontWeight: "700", fontSize: 12 },
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
