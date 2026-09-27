import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { PressableScale } from "../components/PressableScale";
import { StepButtons } from "../components/StepButtons";
import { StepperInput } from "../components/StepperInput";
import { WaterCard } from "../components/WaterCard";
import { useWater } from "../context/WaterContext";
import { sipShare } from "../water/water";
import { loadMinimalDay, saveMinimalDay } from "../storage/storage";
import { isoWeekNumber } from "../utils/weeklyTable";
import { ScreenHeader } from "../components/ScreenHeader";
import { useTimeline } from "../context/TimelineContext";
import { parseHm } from "../import/time";
import type { DayStackParamList } from "../navigation/DayStack";
import { colors, radii, spacing } from "../theme";
import { currentActivity, dayTimeline, isEssential, PlanActivity } from "../timeline/plan";
import { todayKey } from "../utils/date";
import { monthTopic } from "../data/studyCalendar";

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
  const { statusOf, setStep } = useTimeline();
  const [open, setOpen] = useState(current);
  const [openStep, setOpenStep] = useState<string | null>(null);
  useEffect(() => setOpen(current), [current]);
  const done = activity.steps.filter((s) => statusOf(date, s.id) === "done").length;
  const handled = activity.steps.filter((s) => statusOf(date, s.id) !== null).length;
  const complete = handled === activity.steps.length && handled > 0;
  const topic = activity.subject ? monthTopic(activity.subject, date) : null;

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
        {open && (activity.detail || topic) && (
          <View style={styles.activityInfo}>
            {activity.detail ? <Text style={styles.activityDetail}>{activity.detail}</Text> : null}
            {topic ? <Text style={styles.topic}>{topic}</Text> : null}
          </View>
        )}
        {open &&
          activity.steps.map((step) => {
            const status = statusOf(date, step.id);
            const expanded = openStep === step.id;
            return (
              <View key={step.id}>
                <View style={styles.step}>
                  <Text style={styles.stepTime}>{step.time}</Text>
                  <TouchableOpacity
                    style={{ flex: 1 }}
                    onPress={() => setOpenStep(expanded ? null : step.id)}
                    accessibilityLabel={`Spiegazione: ${step.label}`}
                    disabled={!step.detail}
                  >
                    <Text style={[styles.stepLabel, status !== null && styles.stepDone]}>
                      {step.label}
                      {step.detail ? <Text style={styles.more}>{expanded ? "  ▲" : "  ⓘ"}</Text> : null}
                    </Text>
                  </TouchableOpacity>
                  <StepButtons status={status} onChange={(s) => setStep(date, step.id, s)} />
                </View>
                {expanded && step.detail ? <Text style={styles.stepDetail}>{step.detail}</Text> : null}
              </View>
            );
          })}
      </View>
    </View>
  );
}

function WaterSettingsCard() {
  const { settings, updateSettings } = useWater();
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.card}>
      <View style={styles.switchRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>Promemoria per bere a sorsi</Text>
          <Text style={styles.hint}>
            Ogni {settings.intervalMin}′ dalle {settings.start} alle {settings.end}: circa {sipShare(settings)} di bottiglietta. L'acqua si segna
            solo quando finisci una bottiglietta.
          </Text>
        </View>
        <Switch
          value={settings.enabled}
          onValueChange={(enabled) => updateSettings({ ...settings, enabled })}
          trackColor={{ true: colors.primary, false: colors.border }}
        />
      </View>
      <TouchableOpacity onPress={() => setOpen(!open)}>
        <Text style={styles.link}>{open ? "Chiudi" : "Cambia frequenza e obiettivo"}</Text>
      </TouchableOpacity>
      {open && (
        <>
          <StepperInput label="Ogni" value={settings.intervalMin} unit="min" min={15} max={120} step={15} onChange={(intervalMin) => updateSettings({ ...settings, intervalMin })} />
          <StepperInput label="Obiettivo" value={settings.targetBottles} unit="bottigliette" min={4} max={12} step={1} onChange={(targetBottles) => updateSettings({ ...settings, targetBottles })} />
          <Text style={[styles.hint, { marginTop: 6 }]}>
            Se prendi il litio: cambiare di molto quanta acqua bevi può cambiare il livello di litio nel sangue. Prima di passare
            stabilmente a 5 litri, dillo al tuo psichiatra (potrebbe voler controllare la litiemia). Nei giorni di MMA e pesi
            bevi comunque anche durante l'allenamento.
          </Text>
        </>
      )}
    </View>
  );
}

export function DayScreen({ navigation }: Props) {
  const { loading, plan, settings, updateSettings } = useTimeline();
  const now = useNowMinutes();
  const date = todayKey();
  const weekday = new Date().getDay();
  const week = isoWeekNumber(date);
  const [minimalDate, setMinimalDate] = useState("");
  useEffect(() => {
    loadMinimalDay().then(setMinimalDate);
  }, []);
  const minimal = minimalDate === date;
  const fullTimeline = useMemo(() => dayTimeline(plan, weekday, week, date), [plan, weekday, week, date]);
  const timeline = minimal ? fullTimeline.filter(isEssential) : fullTimeline;
  const current = currentActivity(timeline, now);
  const empty = plan.routine.length === 0 && plan.meals.length === 0;
  const subtitle = new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });

  const setMinimal = async (on: boolean) => {
    const value = on ? date : "";
    setMinimalDate(value);
    await saveMinimalDay(value);
  };

  if (loading) return <View style={styles.container} />;

  return (
    <View style={styles.container}>
      <ScreenHeader title="La mia giornata" subtitle={subtitle} />
      <ScrollView contentContainerStyle={styles.content}>
        <WaterCard />

        {empty ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Carica la tua routine</Text>
            <Text style={styles.hint}>
              Scegli il PDF (o una foto, un file di testo o il file del piano) della tua routine: l'app la legge, la divide
              in piccole azioni con l'orario esatto e ti avvisa quando è il momento. Poi fai lo stesso con la dieta.
            </Text>
          </View>
        ) : null}

        {!empty && (
          <View style={[styles.card, styles.switchRow, minimal && styles.minimalOn]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Giornata no</Text>
              <Text style={styles.hint}>
                {minimal
                  ? "Oggi solo l'essenziale: pasti, igiene, scuola e sonno. Il resto torna domani, senza recuperare niente."
                  : "Se oggi è pesante, tieni solo l'essenziale. Vale solo per oggi."}
              </Text>
            </View>
            <Switch value={minimal} onValueChange={setMinimal} trackColor={{ true: colors.primary, false: colors.border }} />
          </View>
        )}

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

        <WaterSettingsCard />

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
  more: { color: colors.primary, fontSize: 12 },
  stepDetail: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 19,
    marginLeft: 42 + spacing.md + spacing.sm,
    marginRight: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.cardAlt,
    borderRadius: radii.sm,
  },
  activityInfo: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm, gap: 4 },
  activityDetail: { fontSize: 12, color: colors.textMuted, lineHeight: 17 },
  topic: { fontSize: 12, color: colors.primary, lineHeight: 17, fontWeight: "600" },
  switchRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  minimalOn: { borderColor: colors.primary },
  link: { color: colors.primary, fontSize: 13, fontWeight: "600", marginTop: spacing.sm },
});
