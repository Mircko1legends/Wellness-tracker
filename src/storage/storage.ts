import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DEFAULT_GOALS,
  DEFAULT_REMINDER_SETTINGS,
  Medication,
  MoodScore,
  MedicationLogEntry,
  ReminderSettings,
  WellnessEntry,
  WellnessGoals,
  WorkoutLogEntry,
} from "../types";
import { EMPTY_FINANCE, FinanceData } from "../utils/finance";
import { migrateLegacyMood } from "../utils/mood";
import { DEFAULT_LENS_SETTINGS, LensDay, LensSettings } from "../utils/lens";
import { AiSettings, DEFAULT_AI_SETTINGS } from "../import/gemini";
import { EMPTY_PLAN, TimelineDayLog, TimelinePlan } from "../timeline/plan";
import { LifeGoal } from "../goals/goals";
import { migrateWaterLog, migrateWaterSettings, WaterDay, WaterSettings } from "../water/water";
import { GymSession } from "../gym/gym";
import { MealEntry } from "../nutrition/meals";
import { WeightEntry } from "../nutrition/weight";
import type { ProgressPhoto } from "../progress/photos";
import type { HealthDaily } from "../health/healthData";

const KEYS = {
  entries: "@wellness/entries",
  goals: "@wellness/goals",
  reminders: "@wellness/reminders",
  workoutLogs: "@wellness/workoutLogs",
  medications: "@wellness/medications",
  medicationLogs: "@wellness/medicationLogs",
  bodyweightKg: "@wellness/bodyweightKg",
  finance: "@wellness/finance",
  lens: "@wellness/lens",
  lensLog: "@wellness/lensLog",
  timeline: "@wellness/timeline",
  timelineLog: "@wellness/timelineLog",
  timelineSettings: "@wellness/timelineSettings",
  aiSettings: "@wellness/aiSettings",
  lifeGoals: "@wellness/lifeGoals",
  water: "@wellness/water",
  waterLog: "@wellness/waterLog",
  dayMode: "@wellness/dayMode",
  defaultPlanApplied: "@wellness/defaultPlanApplied",
  defaultPlanVersion: "@wellness/defaultPlanVersion",
  defaultGoalsVersion: "@wellness/defaultGoalsVersion",
  gymLog: "@wellness/gymLog",
  gymVideos: "@wellness/gymVideos",
  mealLog: "@wellness/mealLog",
  mealSettings: "@wellness/mealSettings",
  weightLog: "@wellness/weightLog",
  progressPhotos: "@wellness/progressPhotos",
  healthDaily: "@wellness/healthDaily",
  healthSync: "@wellness/healthSync",
} as const;

export const DEFAULT_BODYWEIGHT_KG = 58.7;

export async function loadEntries(): Promise<WellnessEntry[]> {
  const raw = await AsyncStorage.getItem(KEYS.entries);
  if (!raw) return [];
  try {
    return (JSON.parse(raw) as WellnessEntry[]).map(migrateEntryMood).map(migrateEntryWater);
  } catch {
    return [];
  }
}

/** Entries written before the -5...+5 scale stored mood as 1...5. */
export function migrateEntryMood(entry: WellnessEntry): WellnessEntry {
  if (entry.moodScale === 11) return entry;
  return { ...entry, mood: migrateLegacyMood(entry.mood) as MoodScore, moodScale: 11 };
}

/** Water used to be logged in 250 ml glasses; now in 0.5 L bottles. */
export function migrateEntryWater(entry: WellnessEntry): WellnessEntry {
  const old = entry as WellnessEntry & { waterGlasses?: number };
  if (typeof old.waterBottles === "number") return entry;
  const { waterGlasses, ...rest } = old;
  return { ...rest, waterBottles: Math.round((waterGlasses ?? 0) / 2) };
}

export async function saveEntries(entries: WellnessEntry[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.entries, JSON.stringify(entries));
}

export async function upsertEntry(entry: WellnessEntry): Promise<WellnessEntry[]> {
  const entries = await loadEntries();
  // Always stamp the scale: an unstamped -5...+5 value would be "migrated" again on the next load.
  const stamped: WellnessEntry = { ...entry, moodScale: 11 };
  const index = entries.findIndex((e) => e.date === entry.date);
  if (index >= 0) {
    entries[index] = stamped;
  } else {
    entries.push(stamped);
  }
  entries.sort((a, b) => a.date.localeCompare(b.date));
  await saveEntries(entries);
  return entries;
}

export async function loadGoals(): Promise<WellnessGoals> {
  const raw = await AsyncStorage.getItem(KEYS.goals);
  if (!raw) return DEFAULT_GOALS;
  try {
    const parsed = JSON.parse(raw);
    // Goals saved before bottles and training hours: start from the new defaults (9 h sleep, 10 bottles).
    if (typeof parsed.waterBottles !== "number") return { ...DEFAULT_GOALS, moodRange: parsed.moodRange ?? DEFAULT_GOALS.moodRange };
    return { ...DEFAULT_GOALS, ...parsed } as WellnessGoals;
  } catch {
    return DEFAULT_GOALS;
  }
}

export async function saveGoals(goals: WellnessGoals): Promise<void> {
  await AsyncStorage.setItem(KEYS.goals, JSON.stringify(goals));
}

export async function loadReminderSettings(): Promise<ReminderSettings> {
  const raw = await AsyncStorage.getItem(KEYS.reminders);
  if (!raw) return DEFAULT_REMINDER_SETTINGS;
  try {
    return { ...DEFAULT_REMINDER_SETTINGS, ...JSON.parse(raw) } as ReminderSettings;
  } catch {
    return DEFAULT_REMINDER_SETTINGS;
  }
}

export async function saveReminderSettings(settings: ReminderSettings): Promise<void> {
  await AsyncStorage.setItem(KEYS.reminders, JSON.stringify(settings));
}

// Older builds logged a bare setsCompleted count instead of actual reps per
// set; normalize any such records so they don't crash code that now expects
// repsPerSet.
function normalizeWorkoutLog(log: WorkoutLogEntry): WorkoutLogEntry {
  if (!log.exerciseSets) return log;
  return {
    ...log,
    exerciseSets: log.exerciseSets.map((s) => {
      if (Array.isArray(s.repsPerSet)) return s;
      const legacyCount = (s as unknown as { setsCompleted?: number }).setsCompleted ?? 0;
      return { exerciseId: s.exerciseId, repsPerSet: Array(legacyCount).fill(0) };
    }),
  };
}

export async function loadWorkoutLogs(): Promise<WorkoutLogEntry[]> {
  const raw = await AsyncStorage.getItem(KEYS.workoutLogs);
  if (!raw) return [];
  try {
    const logs = JSON.parse(raw) as WorkoutLogEntry[];
    return logs.map(normalizeWorkoutLog);
  } catch {
    return [];
  }
}

export async function addWorkoutLog(log: WorkoutLogEntry): Promise<WorkoutLogEntry[]> {
  const logs = await loadWorkoutLogs();
  logs.push(log);
  await AsyncStorage.setItem(KEYS.workoutLogs, JSON.stringify(logs));
  return logs;
}

export async function loadMedications(): Promise<Medication[]> {
  const raw = await AsyncStorage.getItem(KEYS.medications);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Medication[];
  } catch {
    return [];
  }
}

export async function saveMedications(medications: Medication[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.medications, JSON.stringify(medications));
}

export async function loadMedicationLogs(): Promise<MedicationLogEntry[]> {
  const raw = await AsyncStorage.getItem(KEYS.medicationLogs);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as MedicationLogEntry[];
  } catch {
    return [];
  }
}

export async function saveMedicationLogs(logs: MedicationLogEntry[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.medicationLogs, JSON.stringify(logs));
}

export async function loadBodyweightKg(): Promise<number> {
  const raw = await AsyncStorage.getItem(KEYS.bodyweightKg);
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_BODYWEIGHT_KG;
}

export async function saveBodyweightKg(weightKg: number): Promise<void> {
  await AsyncStorage.setItem(KEYS.bodyweightKg, String(weightKg));
}

export async function loadFinance(): Promise<FinanceData> {
  const raw = await AsyncStorage.getItem(KEYS.finance);
  if (!raw) return EMPTY_FINANCE;
  try {
    return { ...EMPTY_FINANCE, ...JSON.parse(raw) } as FinanceData;
  } catch {
    return EMPTY_FINANCE;
  }
}

export async function saveFinance(data: FinanceData): Promise<void> {
  await AsyncStorage.setItem(KEYS.finance, JSON.stringify(data));
}

export async function loadLensSettings(): Promise<LensSettings> {
  const raw = await AsyncStorage.getItem(KEYS.lens);
  if (!raw) return DEFAULT_LENS_SETTINGS;
  try {
    return { ...DEFAULT_LENS_SETTINGS, ...JSON.parse(raw) } as LensSettings;
  } catch {
    return DEFAULT_LENS_SETTINGS;
  }
}

export async function saveLensSettings(settings: LensSettings): Promise<void> {
  await AsyncStorage.setItem(KEYS.lens, JSON.stringify(settings));
}

export async function loadLensLog(): Promise<LensDay[]> {
  const raw = await AsyncStorage.getItem(KEYS.lensLog);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as LensDay[];
  } catch {
    return [];
  }
}

export async function saveLensLog(log: LensDay[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.lensLog, JSON.stringify(log));
}

async function loadJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return fallback && typeof fallback === "object" && !Array.isArray(fallback) ? { ...fallback, ...parsed } : parsed;
  } catch {
    return fallback;
  }
}

export interface TimelineSettings {
  notifyEachStep: boolean;
}

export const DEFAULT_TIMELINE_SETTINGS: TimelineSettings = { notifyEachStep: false };

export const loadTimelinePlan = () => loadJson<TimelinePlan>(KEYS.timeline, EMPTY_PLAN);
export const saveTimelinePlan = (plan: TimelinePlan) => AsyncStorage.setItem(KEYS.timeline, JSON.stringify(plan));
export const loadTimelineLog = () => loadJson<TimelineDayLog[]>(KEYS.timelineLog, []);
export const saveTimelineLog = (log: TimelineDayLog[]) => AsyncStorage.setItem(KEYS.timelineLog, JSON.stringify(log));
export const loadTimelineSettings = () => loadJson<TimelineSettings>(KEYS.timelineSettings, DEFAULT_TIMELINE_SETTINGS);
export const saveTimelineSettings = (s: TimelineSettings) => AsyncStorage.setItem(KEYS.timelineSettings, JSON.stringify(s));
/** The old default was always Flash: move it to automatic (best model, Flash only as fallback). */
export const loadAiSettings = async () => {
  const s = await loadJson<AiSettings>(KEYS.aiSettings, DEFAULT_AI_SETTINGS);
  return s.model === "gemini-2.5-flash" ? { ...s, model: DEFAULT_AI_SETTINGS.model } : s;
};
export const saveAiSettings = (s: AiSettings) => AsyncStorage.setItem(KEYS.aiSettings, JSON.stringify(s));

export const loadLifeGoals = () => loadJson<LifeGoal[]>(KEYS.lifeGoals, []);
export const saveLifeGoals = (goals: LifeGoal[]) => AsyncStorage.setItem(KEYS.lifeGoals, JSON.stringify(goals));
export const loadWaterSettings = async () => migrateWaterSettings(await loadJson<any>(KEYS.water, null));
export const saveWaterSettings = (s: WaterSettings) => AsyncStorage.setItem(KEYS.water, JSON.stringify(s));
export const loadWaterLog = async () => migrateWaterLog(await loadJson<any[]>(KEYS.waterLog, []));
export const saveWaterLog = (log: WaterDay[]) => AsyncStorage.setItem(KEYS.waterLog, JSON.stringify(log));

export const loadGymLog = () => loadJson<GymSession[]>(KEYS.gymLog, []);
export const saveGymLog = (log: GymSession[]) => AsyncStorage.setItem(KEYS.gymLog, JSON.stringify(log));
/** Exercise id → YouTube video id chosen by the user. */
export const loadGymVideos = () => loadJson<Record<string, string>>(KEYS.gymVideos, {});
export const saveGymVideos = (v: Record<string, string>) => AsyncStorage.setItem(KEYS.gymVideos, JSON.stringify(v));
export const loadMealLog = () => loadJson<MealEntry[]>(KEYS.mealLog, []);
export const saveMealLog = (log: MealEntry[]) => AsyncStorage.setItem(KEYS.mealLog, JSON.stringify(log));
export interface MealSettings {
  tared: boolean; // usually zero the scale with the plate on
  plateGrams: number;
}
export const DEFAULT_MEAL_SETTINGS: MealSettings = { tared: true, plateGrams: 0 };
export const loadMealSettings = () => loadJson<MealSettings>(KEYS.mealSettings, DEFAULT_MEAL_SETTINGS);
export const loadWeightLog = () => loadJson<WeightEntry[]>(KEYS.weightLog, []);
export const saveWeightLog = (log: WeightEntry[]) => AsyncStorage.setItem(KEYS.weightLog, JSON.stringify(log));
export const loadProgressPhotos = () => loadJson<ProgressPhoto[]>(KEYS.progressPhotos, []);
export const saveProgressPhotos = (p: ProgressPhoto[]) => AsyncStorage.setItem(KEYS.progressPhotos, JSON.stringify(p));
export const loadHealthDaily = () => loadJson<HealthDaily>(KEYS.healthDaily, {});
export const saveHealthDaily = (d: HealthDaily) => AsyncStorage.setItem(KEYS.healthDaily, JSON.stringify(d));
export interface HealthSyncState {
  connected: boolean;
  lastSyncAt: number;
  granted: string[];
}
export const loadHealthSync = () => loadJson<HealthSyncState>(KEYS.healthSync, { connected: false, lastSyncAt: 0, granted: [] });
export const saveHealthSync = (s: HealthSyncState) => AsyncStorage.setItem(KEYS.healthSync, JSON.stringify(s));
export const saveMealSettings = (s: MealSettings) => AsyncStorage.setItem(KEYS.mealSettings, JSON.stringify(s));

/** The date on which "giornata no" was switched on; it only applies to that day. */
export const loadMinimalDay = async () => (await AsyncStorage.getItem(KEYS.dayMode)) ?? "";
export const saveMinimalDay = (date: string) => AsyncStorage.setItem(KEYS.dayMode, date);

/** The built-in plan is applied once; clearing it later must not bring it back on its own. */
export const isDefaultPlanApplied = async () => (await AsyncStorage.getItem(KEYS.defaultPlanApplied)) === "1";
export const markDefaultPlanApplied = () => AsyncStorage.setItem(KEYS.defaultPlanApplied, "1");
/** Which version of the built-in plan / goals is installed: a newer built-in version replaces it automatically. */
export const loadDefaultPlanVersion = async () => Number((await AsyncStorage.getItem(KEYS.defaultPlanVersion)) ?? 1);
export const saveDefaultPlanVersion = (v: number) => AsyncStorage.setItem(KEYS.defaultPlanVersion, String(v));
export const loadDefaultGoalsVersion = async () => Number((await AsyncStorage.getItem(KEYS.defaultGoalsVersion)) ?? 1);
export const saveDefaultGoalsVersion = (v: number) => AsyncStorage.setItem(KEYS.defaultGoalsVersion, String(v));

export async function clearAllData(): Promise<void> {
  await AsyncStorage.multiRemove([
    KEYS.entries,
    KEYS.goals,
    KEYS.reminders,
    KEYS.workoutLogs,
    KEYS.medications,
    KEYS.medicationLogs,
    KEYS.bodyweightKg,
    KEYS.finance,
    KEYS.lens,
    KEYS.lensLog,
    KEYS.timeline,
    KEYS.timelineLog,
    KEYS.timelineSettings,
    KEYS.aiSettings,
    KEYS.lifeGoals,
    KEYS.water,
    KEYS.waterLog,
    KEYS.dayMode,
    KEYS.defaultPlanApplied,
    KEYS.defaultPlanVersion,
    KEYS.defaultGoalsVersion,
    KEYS.gymLog,
    KEYS.gymVideos,
    KEYS.mealLog,
    KEYS.mealSettings,
    KEYS.weightLog,
    KEYS.progressPhotos,
    KEYS.healthDaily,
    KEYS.healthSync,
  ]);
}
