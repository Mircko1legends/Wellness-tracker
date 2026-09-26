import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ScreenHeader } from "../components/ScreenHeader";
import { useTimeline } from "../context/TimelineContext";
import {
  bestKg,
  fmtKg,
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
} from "../gym/gym";
import type { WorkoutStackParamList } from "../navigation/WorkoutStack";
import { loadGymLog, saveGymLog } from "../storage/storage";
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
}: {
  exercise: GymExercise;
  log: GymSession[];
  date: string;
  sets: DraftSet[];
  onChange: (sets: DraftSet[]) => void;
}) {
  const last = lastSessionWith(log, exercise.id, date);
  const suggestion = suggestNext(exercise, last?.exercises[exercise.id]);
  const kgStep = exercise.increment >= 2.5 ? 2.5 : 1;
  const update = (i: number, patch: Partial<DraftSet>) => onChange(sets.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  return (
    <View style={styles.card}>
      <Text style={styles.exName}>{exercise.name}</Text>
      <Text style={styles.hint}>
        {exercise.sets} × {exercise.repsMin}–{exercise.repsMax}
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
          Dopo ogni serie correggi kg e ripetizioni se serve e tocca ✓. Si salva da solo. Se il maestro o un istruttore ti
          dice di cambiare esercizio o carico, ascolta loro.
        </Text>

        {PROGRAMS[program].map((ex) => (
          <ExerciseCard key={ex.id} exercise={ex} log={log} date={date} sets={draft[ex.id] ?? []} onChange={(s) => changeExercise(ex.id, s)} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
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
