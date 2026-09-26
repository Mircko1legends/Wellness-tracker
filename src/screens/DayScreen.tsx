import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { PressableScale } from "../components/PressableScale";
import { ScreenHeader } from "../components/ScreenHeader";
import { useTimeline } from "../context/TimelineContext";
import { parseHm } from "../import/time";
import type { DayStackParamList } from "../navigation/DayStack";
import { colors, radii, spacing } from "../theme";
import { currentActivity, dayTimeline, PlanActivity } from "../timeline/plan";
import { todayKey } from "../utils/date";

type Props = NativeStackScreenProps<DayStackParamList, "Day">;

function useNowMinutes(): number {
  const read = () => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  };
  const [now, setNow] = useState(read);
  useEffect(() => {
    const timer = setInterval(() => setNow(read()), 30_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

function ActivityCard({ activity, current, past, date }: { activity: PlanActivity; current: boolean; past: boolean; date: string }) {
  const { isDone, toggleStep } = useTimeline();
  const [open, setOpen] = useState(current);
  useEffect(() => setOpen(current), [current]);
  const done = activity.steps.filter((s) => isDone(date, s.id)).length;
  const complete = done === activity.steps.length && done > 0;

  return (
    <View style={[styles.activity, current && styles.activityCurrent, past && !current && styles.activityPast]}>
      <View style={[styles.stripe, { backgroundColor: activity.color ?? (activity.kind === "meal" ? colors.success : colors.primary) }]} />
      <View style={{ flex: 1 }}>
        <TouchableOpacity style={styles.activityHeader} onPress={() => setOpen(!open)}>
          <View style={{ flex: 1 }}>
            <Text style={styles.activityTime}>
              {activity.start}–{activity.end}
              {current ? "  · ADESSO" : ""}
            </Text>
            <Text style={[styles.activityTitle, complete && styles.stepDone]}>{activity.title}</Text>
          </View>
          <Text style={[styles.progress, complete && { color: colors.success }]}>
            {done}/{activity.steps.length}
          </Text>
          <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={colors.textMuted} />
        </TouchableOpacity>
        {open &&
          activity.steps.map((step) => {
            const checked = isDone(date, step.id);
            return (
              <TouchableOpacity key={step.id} style={styles.step} onPress={() => toggleStep(date, step.id)}>
                <Ionicons name={checked ? "checkbox" : "square-outline"} size={20} color={checked ? colors.success : colors.textMuted} />
                <Text style={styles.stepTime}>{step.time}</Text>
                <Text style={[styles.stepLabel, checked && styles.stepDone]}>{step.label}</Text>
              </TouchableOpacity>
            );
          })}
      </View>
    </View>
  );
}

export function DayScreen({ navigation }: Props) {
  const { loading, plan, settings, updateSettings } = useTimeline();
  const now = useNowMinutes();
  const date = todayKey();
  const weekday = new Date().getDay();
  const timeline = useMemo(() => dayTimeline(plan, weekday), [plan, weekday]);
  const current = currentActivity(timeline, now);
  const empty = plan.routine.length === 0 && plan.meals.length === 0;
  const subtitle = new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });

  if (loading) return <View style={styles.container} />;

  return (
    <View style={styles.container}>
      <ScreenHeader title="La mia giornata" subtitle={subtitle} />
      <ScrollView contentContainerStyle={styles.content}>
        {empty ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Carica la tua routine</Text>
            <Text style={styles.hint}>
              Scegli il PDF (o una foto, o un file di testo) della tua routine: l'app la legge, la divide in piccole
              azioni con l'orario esatto e ti avvisa quando è il momento. Poi fai lo stesso con la dieta.
            </Text>
          </View>
        ) : null}

        <View style={styles.row}>
          <PressableScale style={[styles.button, { flex: 1 }]} onPress={() => navigation.navigate("Import", { kind: "routine" })}>
            <Text style={styles.buttonText}>{plan.routine.length ? "Aggiorna routine" : "Importa routine"}</Text>
          </PressableScale>
          <PressableScale style={[styles.ghost, { flex: 1 }]} onPress={() => navigation.navigate("Import", { kind: "diet" })}>
            <Text style={styles.ghostText}>{plan.meals.length ? "Aggiorna dieta" : "Importa dieta"}</Text>
          </PressableScale>
        </View>

        {!empty && timeline.length === 0 && <Text style={styles.hint}>Oggi la tua routine non prevede attività.</Text>}

        {timeline.map((activity) => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            date={date}
            current={current?.id === activity.id}
            past={(parseHm(activity.end) ?? 0) <= now && (parseHm(activity.end) ?? 0) > (parseHm(activity.start) ?? 0)}
          />
        ))}

        {!empty && (
          <View style={[styles.card, styles.switchRow]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Notifica ogni micro-azione</Text>
              <Text style={styles.hint}>Di base arriva una notifica all'inizio di ogni attività.</Text>
            </View>
            <Switch
              value={settings.notifyEachStep}
              onValueChange={(notifyEachStep) => updateSettings({ ...settings, notifyEachStep })}
              trackColor={{ true: colors.primary, false: colors.border }}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardTitle: { fontSize: 15, fontWeight: "800", color: colors.text, marginBottom: 4 },
  hint: { fontSize: 12, color: colors.textMuted, lineHeight: 17 },
  row: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  button: { backgroundColor: colors.primary, borderRadius: radii.md, paddingVertical: spacing.sm, alignItems: "center" },
  buttonText: { color: colors.onPrimary, fontWeight: "800", fontSize: 13 },
  ghost: { borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, paddingVertical: spacing.sm, alignItems: "center" },
  ghostText: { color: colors.text, fontWeight: "600", fontSize: 13 },
  activity: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    overflow: "hidden",
  },
  activityCurrent: { borderColor: colors.primary, borderWidth: 2 },
  activityPast: { opacity: 0.55 },
  stripe: { width: 6 },
  activityHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md },
  activityTime: { fontSize: 11, fontWeight: "700", color: colors.textMuted, letterSpacing: 0.3 },
  activityTitle: { fontSize: 15, fontWeight: "800", color: colors.text, marginTop: 2 },
  progress: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
  step: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 6 },
  stepTime: { fontSize: 12, fontWeight: "700", color: colors.primary, width: 42, marginTop: 2 },
  stepLabel: { flex: 1, fontSize: 13, color: colors.text, lineHeight: 18 },
  stepDone: { color: colors.textMuted, textDecorationLine: "line-through" },
  switchRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm },
});
