import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Linking, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ScreenHeader } from "../components/ScreenHeader";
import { useTimeline } from "../context/TimelineContext";
import {
  bestKg,
  fmtKg,
  formatRest,
  formatSets,
  GymExercise,
  GymSession,
  GymSet,
  lastSessionWith,
  ProgramId,
  PROGRAMS,
  programFromTitles,
  sessionVolume,
  suggestNext,
  upsertSession,
  youtubeSearchUrl,
} from "../gym/gym";
import { cancelRestAlarm, ringNow, scheduleRestAlarm } from "../gym/restTimer";
import type { WorkoutStackParamList } from "../navigation/WorkoutStack";
import { loadGymLog, loadGymVideos, saveGymLog } from "../storage/storage";
import { colors, radii, spacing } from "../theme";
import { dayTimeline } from "../timeline/plan";
import { formatShortLabel, todayKey } from "../utils/date";
import { isoWeekNumber } from "../utils/weeklyTable";

type Props = NativeStackScreenProps<WorkoutStackParamList, "Gym">;

interface DraftSet extends GymSet {
  done: boolean;
}
type Draft = Record<string, DraftSet[]>;

function buildDraft(program: ProgramId, log: GymSession[], date: string): Draft {
  const today = log.find((s) => s.date === date && s.program === program);
  const draft: Draft = {};
  for (const ex of PROGRAMS[program]) {
    const suggestion = suggestNext(ex, lastSessionWith(log, ex.id, date)?.exercises[ex.id]);
    draft[ex.id] = Array.from({ length: ex.sets }, (_, i) => {
      const saved = today?.exercises[ex.id]?.[i];
      return saved && saved.reps > 0 ? { ...saved, done: true } : { kg: suggestion.kg, reps: suggestion.reps[i], done: false };
    });
  }
  return draft;
}

function Stepper({ value, label, step, onChange }: { value: number; label: string; step: number; onChange: (v: number) => void }) {
  return (
    <View style={styles.stepper}>
      <TouchableOpacity accessibilityLabel={`Meno ${label}`} style={styles.stepBtn} onPress={() => onChange(Math.max(0, value - step))}>
        <Ionicons name="remove" size={16} color={colors.primary} />
      </TouchableOpacity>
      <Text style={styles.stepValue}>
        {fmtKg(value)}
        <Text style={styles.stepUnit}> {label}</Text>
      </Text>
      <TouchableOpacity accessibilityLabel={`Più ${label}`} style={styles.stepBtn} onPress={() => onChange(value + step)}>
        <Ionicons name="add" size={16} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

function ExerciseCard({
  exercise,
  log,
  date,
  sets,
  onChange,
  onVideo,
}: {
  exercise: GymExercise;
  log: GymSession[];
  date: string;
  sets: DraftSet[];
  onChange: (sets: DraftSet[]) => void;
  onVideo: () => void;
}) {
  const last = lastSessionWith(log, exercise.id, date);
  const suggestion = suggestNext(exercise, last?.exercises[exercise.id]);
  const kgStep = exercise.increment >= 2.5 ? 2.5 : 1;
  const update = (i: number, patch: Partial<DraftSet>) => onChange(sets.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  return (
    <View style={styles.card}>
      <View style={styles.exHeader}>
        <Text style={[styles.exName, { flex: 1 }]}>{exercise.name}</Text>
        <TouchableOpacity accessibilityLabel={`Video tecnica ${exercise.name}`} style={styles.videoBtn} onPress={onVideo}>
          <Ionicons name="logo-youtube" size={16} color={colors.text} />
          <Text style={styles.videoText}>Tecnica</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.hint}>
        {exercise.sets} × {exercise.repsMin}–{exercise.repsMax} · recupero {formatRest(exercise.restSec)}
        {last ? `  ·  ultima volta (${formatShortLabel(last.date)}): ${formatSets(last.exercises[exercise.id])}` : ""}
      </Text>
      <Text style={styles.suggestion}>{suggestion.note}</Text>
      {sets.map((set, i) => (
        <View key={i} style={[styles.setRow, set.done && styles.setDone]}>
          <Text style={styles.setLabel}>{i + 1}</Text>
          <Stepper value={set.kg} label="kg" step={kgStep} onChange={(kg) => update(i, { kg })} />
          <Stepper value={set.reps} label="rip" step={1} onChange={(reps) => update(i, { reps })} />
          <TouchableOpacity
            accessibilityRole="checkbox"
            accessibilityState={{ checked: set.done }}
            accessibilityLabel={`Serie ${i + 1} ${exercise.name} fatta`}
            onPress={() => update(i, { done: !set.done })}
            style={[styles.check, set.done && styles.checkOn]}
          >
            <Ionicons name="checkmark" size={18} color={set.done ? colors.onPrimary : colors.textMuted} />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

export function GymScreen({ navigation }: Props) {
  const { plan } = useTimeline();
  const date = todayKey();
  const planned = useMemo(
    () => programFromTitles(dayTimeline(plan, new Date().getDay(), isoWeekNumber(date)).map((a) => a.title)),
    [plan, date]
  );
  const [log, setLog] = useState<GymSession[] | null>(null);
  const [program, setProgram] = useState<ProgramId>("A");
  const [draft, setDraft] = useState<Draft>({});
  const logRef = useRef<GymSession[]>([]);
  const [rest, setRest] = useState<{ endAt: number; total: number; exercise: string } | null>(null);
  const [now, setNow] = useState(Date.now());
  const [restDone, setRestDone] = useState("");

  useEffect(() => {
    if (!rest) return;
    const timer = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= rest.endAt) {
        ringNow();
        setRestDone(`Recupero finito: prossima serie di ${rest.exercise}`);
        setRest(null);
      }
    }, 250);
    return () => clearInterval(timer);
  }, [rest]);

  useEffect(() => {
    if (!restDone) return;
    const t = setTimeout(() => setRestDone(""), 8000);
    return () => clearTimeout(t);
  }, [restDone]);

  const startRest = (exercise: GymExercise, seconds = exercise.restSec) => {
    const endAt = Date.now() + seconds * 1000;
    setRestDone("");
    setNow(Date.now());
    setRest({ endAt, total: seconds, exercise: exercise.name.replace(/ \(.*\)$/, "") });
    scheduleRestAlarm(seconds, exercise.name.replace(/ \(.*\)$/, "")).catch(() => {});
  };

  const addRest = (delta: number) => {
    if (!rest) return;
    const endAt = Math.max(Date.now() + 1000, rest.endAt + delta * 1000);
    setRest({ ...rest, endAt, total: rest.total + delta });
    scheduleRestAlarm((endAt - Date.now()) / 1000, rest.exercise).catch(() => {});
  };

  const stopRest = () => {
    setRest(null);
    cancelRestAlarm().catch(() => {});
  };

  const openVideo = async (exercise: GymExercise) => {
    if (Platform.OS === "web") {
      const id = (await loadGymVideos())[exercise.id];
      Linking.openURL(id ? `https://www.youtube.com/watch?v=${id}` : youtubeSearchUrl(exercise.videoQuery));
      return;
    }
    navigation.navigate("ExerciseVideo", { exerciseId: exercise.id, name: exercise.name, query: exercise.videoQuery });
  };

  useEffect(() => {
    loadGymLog().then((l) => {
      const todays = l.find((s) => s.date === date);
      const last = [...l].filter((s) => s.date < date).sort((a, b) => b.date.localeCompare(a.date))[0];
      const initial: ProgramId = planned ?? todays?.program ?? (last ? (last.program === "A" ? "B" : "A") : "A");
      logRef.current = l;
      setLog(l);
      setProgram(initial);
      setDraft(buildDraft(initial, l, date));
    });
  }, [planned, date]);

  const switchProgram = (p: ProgramId) => {
    setProgram(p);
    setDraft(buildDraft(p, logRef.current, date));
  };

  const changeExercise = async (exerciseId: string, sets: DraftSet[]) => {
    const before = draft[exerciseId] ?? [];
    if (sets.some((set, i) => set.done && !before[i]?.done)) {
      const exercise = PROGRAMS[program].find((e) => e.id === exerciseId);
      if (exercise) startRest(exercise);
    }
    const nextDraft = { ...draft, [exerciseId]: sets };
    setDraft(nextDraft);
    const exercises: GymSession["exercises"] = {};
    for (const [id, s] of Object.entries(nextDraft)) {
      const done = s.filter((x) => x.done).map(({ kg, reps }) => ({ kg, reps }));
      if (done.length) exercises[id] = done;
    }
    const without = logRef.current.filter((s) => !(s.date === date && s.program === program));
    const next = Object.keys(exercises).length ? upsertSession(without, { date, program, exercises, savedAt: Date.now() }) : without;
    logRef.current = next;
    setLog(next);
    await saveGymLog(next);
  };

  if (!log) return <View style={styles.container} />;

  const history = [...log].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  const progress = PROGRAMS[program]
    .map((ex) => {
      const first = log.find((s) => s.exercises[ex.id]?.length);
      const best = bestKg(log, ex.id);
      return first && best !== null ? { ex, from: Math.max(...first.exercises[ex.id].map((s) => s.kg)), best } : null;
    })
    .filter((x): x is { ex: GymExercise; from: number; best: number } => x !== null);

  return (
    <View style={styles.container}>
      <ScreenHeader
        eyebrow="Registro pesi"
        title={`Scheda ${program}`}
        subtitle={planned ? `Oggi in programma: Scheda ${planned}` : "Oggi niente pesi in programma: puoi comunque registrare"}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.row}>
          {(["A", "B"] as ProgramId[]).map((p) => (
            <TouchableOpacity key={p} style={[styles.tab, program === p && styles.tabOn]} onPress={() => switchProgram(p)}>
              <Text style={[styles.tabText, program === p && styles.tabTextOn]}>Scheda {p}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.hint}>
          Dopo ogni serie correggi kg e ripetizioni se serve e tocca ✓: si salva da solo e parte il recupero, che suona
          anche a schermo spento. Se il maestro o un istruttore ti
          dice di cambiare esercizio o carico, ascolta loro.
        </Text>

        {PROGRAMS[program].map((ex) => (
          <ExerciseCard key={ex.id} exercise={ex} log={log} date={date} sets={draft[ex.id] ?? []} onChange={(s) => changeExercise(ex.id, s)} onVideo={() => openVideo(ex)} />
        ))}

        {progress.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>I tuoi progressi</Text>
            {progress.map(({ ex, from, best }) => (
              <Text key={ex.id} style={styles.line}>
                {ex.name.replace(/ \(.*\)$/, "")}: {fmtKg(from)} → {fmtKg(best)} kg
              </Text>
            ))}
          </View>
        )}

        {history.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Ultimi allenamenti</Text>
            {history.map((s) => (
              <Text key={`${s.date}-${s.program}`} style={styles.line}>
                {formatShortLabel(s.date)} · Scheda {s.program} · {Object.keys(s.exercises).length} esercizi · {Math.round(sessionVolume(s))} kg totali
              </Text>
            ))}
          </View>
        )}

        <TouchableOpacity onPress={() => navigation.navigate("Bodyweight")}>
          <Text style={styles.link}>Allenamento a corpo libero (per i giorni fuori dalla palestra)</Text>
        </TouchableOpacity>
      </ScrollView>
      {rest && (
        <View style={styles.timer} accessibilityLiveRegion="polite">
          <View style={{ flex: 1 }}>
            <Text style={styles.timerLabel}>Recupero · {rest.exercise}</Text>
            <Text style={styles.timerValue}>{formatRest(Math.ceil((rest.endAt - now) / 1000))}</Text>
          </View>
          <TouchableOpacity style={styles.timerBtn} onPress={() => addRest(-15)}>
            <Text style={styles.timerBtnText}>−15″</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.timerBtn} onPress={() => addRest(30)}>
            <Text style={styles.timerBtnText}>+30″</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.timerBtn} onPress={stopRest}>
            <Text style={styles.timerBtnText}>Salta</Text>
          </TouchableOpacity>
        </View>
      )}
      {!rest && restDone ? (
        <TouchableOpacity style={[styles.timer, styles.timerDone]} onPress={() => setRestDone("")}>
          <Text style={styles.timerDoneText}>{restDone}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: 120 },
  row: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
  tab: { flex: 1, paddingVertical: spacing.sm, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  tabOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { color: colors.text, fontWeight: "700" },
  tabTextOn: { color: colors.onPrimary },
  hint: { fontSize: 12, color: colors.textMuted, lineHeight: 17, marginBottom: spacing.sm },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardTitle: { fontSize: 15, fontWeight: "800", color: colors.text, marginBottom: 6 },
  exHeader: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  videoBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#C4302B", borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 4 },
  videoText: { color: colors.text, fontSize: 11, fontWeight: "800" },
  timer: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.cardAlt,
    borderColor: colors.primary,
    borderWidth: 2,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  timerLabel: { color: colors.textMuted, fontSize: 12, fontWeight: "700" },
  timerValue: { color: colors.primary, fontSize: 30, fontWeight: "900", fontVariant: ["tabular-nums"] },
  timerBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border },
  timerBtnText: { color: colors.text, fontWeight: "700", fontSize: 13 },
  timerDone: { backgroundColor: colors.primary },
  timerDoneText: { color: colors.onPrimary, fontWeight: "800", fontSize: 14, flex: 1, textAlign: "center" },
  exName: { fontSize: 15, fontWeight: "800", color: colors.text, marginBottom: 2 },
  suggestion: { fontSize: 12, color: colors.primary, marginBottom: spacing.sm, lineHeight: 17 },
  setRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4, borderRadius: radii.sm },
  setDone: { opacity: 0.6 },
  setLabel: { width: 14, color: colors.textMuted, fontWeight: "700", fontSize: 12 },
  stepper: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.cardAlt, borderRadius: radii.sm },
  stepBtn: { padding: 8 },
  stepValue: { color: colors.text, fontWeight: "800", fontSize: 14 },
  stepUnit: { color: colors.textMuted, fontWeight: "400", fontSize: 11 },
  check: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  line: { fontSize: 13, color: colors.text, lineHeight: 20 },
  link: { color: colors.primary, fontSize: 13, fontWeight: "600", marginTop: spacing.sm, textAlign: "center" },
});
