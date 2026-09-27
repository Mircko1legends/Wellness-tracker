import { addDays, isoWeekLabel, isoWeekNumber, parseDateKey, toDateKey } from "./date";

export { isoWeekLabel, isoWeekNumber };
import { progressDataFromSnapshot, toHalfHours, trainingMinutes } from "../progress/lifeProgress";

/** Raw AsyncStorage values keyed by storage key, as they appear in a backup. */
export type StorageSnapshot = Record<string, string>;

const DAY_NAMES = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];

export function weekStartKey(dateKey: string): string {
  const date = parseDateKey(dateKey);
  const offsetFromMonday = (date.getDay() + 6) % 7;
  return toDateKey(addDays(date, -offsetFromMonday));
}

/** Water days saved before bottles counted 250 ml glasses. */
function bottlesOf(day?: { bottles?: number; glasses?: number }): number {
  if (!day) return 0;
  return day.bottles ?? Math.round((day.glasses ?? 0) / 2);
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
  waterBottles?: number;
  trainingHours?: number;
  bonusMissions?: string[];
  notes?: string;
}
interface GymLog {
  date: string;
  exercises?: Record<string, unknown[]>;
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
  "Umore (−5/+5)",
  "Sonno (h)",
  "Acqua (bottigliette 0,5 L)",
  "Allenamento (h)",
  "Serie in palestra",
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
  const gym = parseArray<GymLog>(snapshot, "@wellness/gymLog");
  const progress = progressDataFromSnapshot(snapshot);
  const medications = parseArray<Medication>(snapshot, "@wellness/medications").filter((m) => m.enabled);
  const medicationLogs = parseArray<MedicationLog>(snapshot, "@wellness/medicationLogs");
  const lensLogs = parseArray<LensLog>(snapshot, "@wellness/lensLog");
  const timelineLogs = parseArray<TimelineLog>(snapshot, "@wellness/timelineLog");
  const lensTracked = "@wellness/lens" in snapshot;
  const waterLog = parseArray<{ date: string; bottles?: number; glasses?: number }>(snapshot, "@wellness/waterLog");

  const monday = parseDateKey(weekStartKey(dateKey));
  const rows = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i);
    const key = toDateKey(date);
    const entry = entries.find((e) => e.date === key);
    const sets = gym
      .filter((g) => g.date === key)
      .reduce((sum, g) => sum + Object.values(g.exercises ?? {}).reduce((n, list) => n + list.length, 0), 0);
    const hours = entry?.trainingHours ?? toHalfHours(trainingMinutes(progress.plan, progress.timelineLog, key).done);
    const medsTaken = medicationLogs.filter(
      (l) => l.date === key && medications.some((m) => m.id === l.medicationId)
    ).length;
    const timelineDay = timelineLogs.find((l) => l.date === key);
    const routineDone = timelineDay?.doneIds.length ?? 0;
    const routineSkipped = timelineDay?.skippedIds?.length ?? 0;

    return [
      key,
      DAY_NAMES[date.getDay()],
      entry?.mood === undefined ? "" : entry.mood > 0 ? `+${entry.mood}` : String(entry.mood),
      entry?.sleepHours ?? "",
      Math.max(entry?.waterBottles ?? 0, bottlesOf(waterLog.find((w) => w.date === key))) || "",
      hours,
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
