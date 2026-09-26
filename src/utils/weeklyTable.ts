import { addDays, parseDateKey, toDateKey } from "./date";

/** Raw AsyncStorage values keyed by storage key, as they appear in a backup. */
export type StorageSnapshot = Record<string, string>;

const DAY_NAMES = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];

export function weekStartKey(dateKey: string): string {
  const date = parseDateKey(dateKey);
  const offsetFromMonday = (date.getDay() + 6) % 7;
  return toDateKey(addDays(date, -offsetFromMonday));
}

function isoWeek(dateKey: string): { year: number; week: number } {
  const date = parseDateKey(dateKey);
  const thursday = addDays(date, 3 - ((date.getDay() + 6) % 7));
  const yearStart = new Date(thursday.getFullYear(), 0, 1);
  const week = Math.ceil(((thursday.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: thursday.getFullYear(), week };
}

export function isoWeekNumber(dateKey: string): number {
  return isoWeek(dateKey).week;
}

/** ISO-8601 week label, e.g. "2026-W39". */
export function isoWeekLabel(dateKey: string): string {
  const { year, week } = isoWeek(dateKey);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

function parseArray<T>(snapshot: StorageSnapshot, key: string): T[] {
  try {
    const value = JSON.parse(snapshot[key] ?? "[]");
    return Array.isArray(value) ? (value as T[]) : [];
  } catch {
    return [];
  }
}

function csvField(value: string | number): string {
  const text = String(value);
  return /[",;\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

interface Entry {
  date: string;
  mood?: number;
  sleepHours?: number;
  waterGlasses?: number;
  bonusMissions?: string[];
  notes?: string;
}
interface WorkoutLog {
  date: string;
  exerciseSets?: { repsPerSet: number[] }[];
}
interface Medication {
  id: string;
  enabled: boolean;
}
interface MedicationLog {
  date: string;
  medicationId: string;
}
interface LensLog {
  date: string;
  removedAt?: number;
}
interface TimelineLog {
  date: string;
  doneIds: string[];
  skippedIds?: string[];
}

export const WEEKLY_TABLE_HEADER = [
  "Data",
  "Giorno",
  "Umore (1-5)",
  "Sonno (h)",
  "Acqua (bicchieri)",
  "Serie allenamento",
  "Farmaci presi",
  "Lenti tolte",
  "Azioni routine fatte",
  "Azioni saltate",
  "Missioni extra",
  "Note",
];

/** One CSV row per day of the week that contains `dateKey`, Monday to Sunday. */
export function buildWeeklyTableCsv(snapshot: StorageSnapshot, dateKey: string): string {
  const entries = parseArray<Entry>(snapshot, "@wellness/entries");
  const workouts = parseArray<WorkoutLog>(snapshot, "@wellness/workoutLogs");
  const medications = parseArray<Medication>(snapshot, "@wellness/medications").filter((m) => m.enabled);
  const medicationLogs = parseArray<MedicationLog>(snapshot, "@wellness/medicationLogs");
  const lensLogs = parseArray<LensLog>(snapshot, "@wellness/lensLog");
  const timelineLogs = parseArray<TimelineLog>(snapshot, "@wellness/timelineLog");
  const lensTracked = "@wellness/lens" in snapshot;
  const waterLog = parseArray<{ date: string; glasses: number }>(snapshot, "@wellness/waterLog");

  const monday = parseDateKey(weekStartKey(dateKey));
  const rows = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i);
    const key = toDateKey(date);
    const entry = entries.find((e) => e.date === key);
    const sets = workouts
      .filter((w) => w.date === key)
      .reduce((sum, w) => sum + (w.exerciseSets ?? []).reduce((s, e) => s + e.repsPerSet.length, 0), 0);
    const medsTaken = medicationLogs.filter(
      (l) => l.date === key && medications.some((m) => m.id === l.medicationId)
    ).length;
    const timelineDay = timelineLogs.find((l) => l.date === key);
    const routineDone = timelineDay?.doneIds.length ?? 0;
    const routineSkipped = timelineDay?.skippedIds?.length ?? 0;

    return [
      key,
      DAY_NAMES[date.getDay()],
      entry?.mood ?? "",
      entry?.sleepHours ?? "",
      Math.max(entry?.waterGlasses ?? 0, waterLog.find((w) => w.date === key)?.glasses ?? 0) || "",
      sets,
      medications.length > 0 ? `${medsTaken}/${medications.length}` : "",
      lensTracked ? (lensLogs.some((l) => l.date === key && l.removedAt) ? "sì" : "no") : "",
      routineDone,
      routineSkipped,
      (entry?.bonusMissions ?? []).length,
      entry?.notes ?? "",
    ]
      .map(csvField)
      .join(",");
  });

  return [WEEKLY_TABLE_HEADER.join(","), ...rows].join("\n");
}
