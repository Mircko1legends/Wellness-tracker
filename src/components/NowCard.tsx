import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTimeline } from "../context/TimelineContext";
import { colors, radii, spacing } from "../theme";
import { currentActivity, dayTimeline, nextActivity } from "../timeline/plan";
import { todayKey } from "../utils/date";

/** "Adesso" on the dashboard: the running activity and its next unchecked micro-action. */
export function NowCard() {
  const navigation = useNavigation<any>();
  const { plan, isDone, toggleStep } = useTimeline();
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const timeline = useMemo(() => dayTimeline(plan, now.getDay()), [plan, now.getDay()]);
  if (timeline.length === 0) return null;

  const date = todayKey();
  const current = currentActivity(timeline, minutes);
  const next = nextActivity(timeline, minutes);
  const step = current?.steps.find((s) => !isDone(date, s.id));

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={() => navigation.navigate("DayTab")}>
      <Text style={styles.eyebrow}>{current ? `ADESSO · ${current.start}–${current.end}` : "TEMPO LIBERO"}</Text>
      <Text style={styles.title}>{current?.title ?? "Nessuna attività in corso"}</Text>
      {current && step && (
        <TouchableOpacity style={styles.step} onPress={() => toggleStep(date, step.id)}>
          <Ionicons name="square-outline" size={20} color={colors.primary} />
          <Text style={styles.stepText}>
            {step.time} {step.label}
          </Text>
        </TouchableOpacity>
      )}
      {current && !step && <Text style={styles.done}>Tutte le azioni fatte ✓</Text>}
      {next && next.id !== current?.id && (
        <View style={styles.nextRow}>
          <Text style={styles.next}>
            Poi: {next.start} {next.title}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radii.md, borderWidth: 2, borderColor: colors.primary, padding: spacing.md, marginBottom: spacing.md },
  eyebrow: { fontSize: 11, fontWeight: "800", color: colors.primary, letterSpacing: 0.5 },
  title: { fontSize: 18, fontWeight: "800", color: colors.text, marginTop: 2 },
  step: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm, backgroundColor: colors.cardAlt, borderRadius: radii.sm, padding: spacing.sm },
  stepText: { flex: 1, fontSize: 14, color: colors.text },
  done: { fontSize: 13, color: colors.success, marginTop: spacing.sm },
  nextRow: { flexDirection: "row", alignItems: "center", marginTop: spacing.sm },
  next: { flex: 1, fontSize: 12, color: colors.textMuted },
});
