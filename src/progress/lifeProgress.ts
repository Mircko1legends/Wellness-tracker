import type { LifeGoal } from "../goals/goals";
import type { GymSession } from "../gym/gym";
import { durationMinutes } from "../import/time";
import { MealEntry, reliability } from "../nutrition/meals";
import type { WeightEntry } from "../nutrition/weight";
import { dayTimeline, EMPTY_PLAN, PlanActivity, TimelineDayLog, TimelinePlan } from "../timeline/plan";
import { DEFAULT_GOALS, MedicationLogEntry, WellnessEntry, WellnessGoals } from "../types";
import { addDays, isoWeekNumber, parseDateKey, toDateKey } from "../utils/date";
import type { FinanceData } from "../utils/finance";
import type { LensDay } from "../utils/lens";
import { isMoodStable, migrateLegacyMood } from "../utils/mood";
import { DEFAULT_WATER_SETTINGS, migrateWaterLog, migrateWaterSettings, WaterDay, WaterSettings } from "../water/water";

/** Everything the app has logged, read in one go from storage (see takeSnapshot). */
export interface ProgressData {
  entries: WellnessEntry[];
  goals: WellnessGoals;
  plan: TimelinePlan;
  timelineLog: TimelineDayLog[];
  water: WaterDay[];
  waterSettings: WaterSettings;
  gymLog: GymSession[];
  mealLog: MealEntry[];
  weightLog: WeightEntry[];
  medicationLogs: MedicationLogEntry[];
  medicationCount: number;
  lensLog: LensDay[];
  finance: FinanceData | null;
  lifeGoals: LifeGoal[];
  photos: { date: string }[];
}

function parse<T>(raw: Record<string, string>, key: string, fallback: T): T {
  try {
    return raw[key] ? (JSON.parse(raw[key]) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function progressDataFromSnapshot(raw: Record<string, string>): ProgressData {
  const entries = parse<any[]>(raw, "@wellness/entries", []).map((e) => ({
    ...e,
    mood: e.moodScale === 11 ? e.mood : migrateLegacyMood(e.mood),
    waterBottles: typeof e.waterBottles === "number" ? e.waterBottles : Math.round((e.waterGlasses ?? 0) / 2),
  })) as WellnessEntry[];
  const storedGoals = parse<any>(raw, "@wellness/goals", null);
  const goals: WellnessGoals =
    storedGoals && typeof storedGoals.waterBottles === "number" ? { ...DEFAULT_GOALS, ...storedGoals } : DEFAULT_GOALS;
  const medications = parse<{ enabled?: boolean }[]>(raw, "@wellness/medications", []);
  return {
    entries,
    goals,
    plan: parse<TimelinePlan>(raw, "@wellness/timeline", EMPTY_PLAN),
    timelineLog: parse(raw, "@wellness/timelineLog", []),
    water: migrateWaterLog(parse(raw, "@wellness/waterLog", [])),
    waterSettings: raw["@wellness/water"] ? migrateWaterSettings(parse(raw, "@wellness/water", null)) : DEFAULT_WATER_SETTINGS,
    gymLog: parse(raw, "@wellness/gymLog", []),
    mealLog: parse(raw, "@wellness/mealLog", []),
    weightLog: parse(raw, "@wellness/weightLog", []),
    medicationLogs: parse(raw, "@wellness/medicationLogs", []),
    medicationCount: medications.filter((m) => m.enabled !== false).length,
    lensLog: parse(raw, "@wellness/lensLog", []),
    finance: parse<FinanceData | null>(raw, "@wellness/finance", null),
    lifeGoals: parse(raw, "@wellness/lifeGoals", []),
    photos: parse(raw, "@wellness/progressPhotos", []),
  };
}

// ---------------------------------------------------------------- training time
export const TRAINING_TITLE = /^Pesi|^MMA$|^Tecnica MMA|^Shadow/;

export function timelineFor(plan: TimelinePlan, date: string): PlanActivity[] {
  return dayTimeline(plan, parseDateKey(date).getDay(), isoWeekNumber(date), date);
}

/** Minutes of training done (share of each training activity's steps marked done) and planned for the day. */
export function trainingMinutes(plan: TimelinePlan, log: TimelineDayLog[], date: string): { done: number; planned: number } {
  const day = log.find((d) => d.date === date);
  let done = 0;
  let planned = 0;
  for (const a of timelineFor(plan, date)) {
    if (!TRAINING_TITLE.test(a.title)) continue;
    const minutes = durationMinutes(a.start, a.end);
    planned += minutes;
    if (!day || !a.steps.length) continue;
    const doneSteps = a.steps.filter((s) => day.doneIds.includes(s.id)).length;
    done += (minutes * doneSteps) / a.steps.length;
  }
  return { done: Math.round(done), planned };
}

/** Training is counted in hours and half hours. */
export function toHalfHours(minutes: number): number {
  return Math.round(minutes / 30) / 2;
}

export function weekTraining(data: ProgressData, today: string): { doneHours: number; plannedHours: number } {
  const d = parseDateKey(today);
  const monday = addDays(d, -((d.getDay() + 6) % 7));
  let done = 0;
  let planned = 0;
  for (let i = 0; i < 7; i++) {
    const key = toDateKey(addDays(monday, i));
    const t = trainingMinutes(data.plan, data.timelineLog, key);
    const manual = data.entries.find((e) => e.date === key)?.trainingHours;
    done += key <= today ? (manual !== undefined ? manual * 60 : t.done) : 0;
    planned += t.planned;
  }
  return { doneHours: toHalfHours(done), plannedHours: toHalfHours(planned) };
}

// ---------------------------------------------------------------- daily goals and streak
export interface DayGoals {
  sleep: boolean;
  water: boolean;
  mood: boolean;
  training: boolean;
  all: boolean;
}

export function bottlesFor(data: ProgressData, date: string): number {
  const logged = data.water.find((w) => w.date === date)?.bottles ?? 0;
  return Math.max(logged, data.entries.find((e) => e.date === date)?.waterBottles ?? 0);
}

export function dayGoals(data: ProgressData, date: string): DayGoals | null {
  const entry = data.entries.find((e) => e.date === date);
  if (!entry) return null;
  const t = trainingMinutes(data.plan, data.timelineLog, date);
  const trainedHours = entry.trainingHours ?? t.done / 60;
  const result = {
    sleep: entry.sleepHours >= data.goals.sleepHours,
    water: bottlesFor(data, date) >= data.goals.waterBottles,
    mood: isMoodStable(entry.mood, data.goals.moodRange),
    training: t.planned === 0 || trainedHours >= t.planned / 60 - 0.25,
  };
  return { ...result, all: Object.values(result).every(Boolean) };
}

const GRACE_COOLDOWN_DAYS = 7;

/** Days in a row with every daily goal met; one missed day a week is forgiven, so one bad day doesn't erase everything. */
export function streaks(data: ProgressData, today: string): { current: number; best: number } {
  if (!data.entries.length) return { current: 0, best: 0 };
  const first = data.entries.map((e) => e.date).sort()[0];
  const end = data.entries.some((e) => e.date === today) ? today : toDateKey(addDays(parseDateKey(today), -1));
  let running = 0;
  let best = 0;
  let misses = 0;
  let sinceGrace = Infinity;
  for (let cursor = parseDateKey(first); toDateKey(cursor) <= end; cursor = addDays(cursor, 1)) {
    const met = dayGoals(data, toDateKey(cursor))?.all ?? false;
    if (met) {
      running++;
      misses = 0;
      sinceGrace++;
      best = Math.max(best, running);
    } else {
      misses++;
      if (misses === 1 && sinceGrace >= GRACE_COOLDOWN_DAYS) sinceGrace = 0;
      else {
        running = 0;
        misses = 0;
        sinceGrace = Infinity;
      }
    }
  }
  return { current: running, best };
}

// ---------------------------------------------------------------- XP and level 0–99
/**
 * Every logged action is worth something, even a little; big life milestones are worth a lot.
 * Rough scale: a full day ≈ 350–400 XP, one year of those plus the year's milestones ≈ level 50;
 * 99 needs years of extreme functioning and new goals reached, maybe never — it is a direction, not a finish line.
 */
export const XP = {
  stepDone: 3,
  stepSkipped: 1, // logging honestly still counts
  dayLog: 10,
  bottle: 3,
  gymSet: 2,
  meal: 5,
  mealReliable: 5,
  weighIn: 5,
  medication: 10,
  lensStep: 1,
  lensRemoved: 10,
  financeItem: 2,
  photo: 20,
  mission: 10,
};

export function milestoneXp(priority: number): number {
  return Math.max(1000, 2500 - 250 * (priority - 1));
}

export interface XpBreakdown {
  total: number;
  today: number;
  byArea: Record<string, number>;
}

export function computeXp(data: ProgressData, today: string): XpBreakdown {
  const byArea: Record<string, number> = {};
  let total = 0;
  let todayXp = 0;
  const add = (area: string, xp: number, date?: string) => {
    if (!xp) return;
    byArea[area] = (byArea[area] ?? 0) + xp;
    total += xp;
    if (date === today) todayXp += xp;
  };
  for (const d of data.timelineLog) {
    add("Giornata", d.doneIds.length * XP.stepDone + (d.skippedIds?.length ?? 0) * XP.stepSkipped, d.date);
  }
  for (const e of data.entries) add("Registro", XP.dayLog, e.date);
  for (const w of data.water) add("Acqua", Math.min(w.bottles, data.goals.waterBottles + 2) * XP.bottle, w.date);
  for (const s of data.gymLog) add("Palestra", Object.values(s.exercises).reduce((n, sets) => n + sets.length, 0) * XP.gymSet, s.date);
  for (const m of data.mealLog) add("Pasti", XP.meal + (reliability(m.items) === "affidabile" ? XP.mealReliable : 0), m.date);
  for (const w of data.weightLog) add("Peso", XP.weighIn, w.date);
  for (const m of data.medicationLogs) add("Farmaci", XP.medication, m.date);
  for (const l of data.lensLog) add("Lenti", l.doneSteps.length * XP.lensStep + (l.removedAt ? XP.lensRemoved : 0), l.date);
  if (data.finance) {
    add("Finanza", (data.finance.recurring.length + data.finance.oneOffs.length + data.finance.leftovers.length) * XP.financeItem);
  }
  for (const p of data.photos) add("Foto", XP.photo, p.date);
  for (const g of data.lifeGoals) {
    for (const m of g.milestones) {
      if (m.done) add("Obiettivi", milestoneXp(g.priority), m.doneAt ? toDateKey(new Date(m.doneAt)) : undefined);
    }
  }
  const first = [...data.entries.map((e) => e.date), ...data.timelineLog.map((d) => d.date)].sort()[0];
  if (first) {
    for (let c = parseDateKey(first); toDateKey(c) <= today; c = addDays(c, 1)) {
      const key = toDateKey(c);
      add("Missioni", missionsFor(data, key).filter((m) => m.done).length * XP.mission, key);
    }
  }
  return { total, today: todayXp, byArea };
}

export const MAX_LEVEL = 99;

/** Total XP needed to reach a level: quick at the start, then slower and slower. */
export function xpForLevel(level: number): number {
  return level <= 0 ? 0 : Math.round(37 * Math.pow(level, 2.3));
}

const TITLES: [number, string][] = [
  [0, "Punto di partenza"],
  [1, "Fondamenta"],
  [10, "Costanza"],
  [20, "Disciplina"],
  [30, "Slancio"],
  [40, "Padronanza"],
  [50, "Eccellenza"],
  [60, "Maestria"],
  [70, "Alto funzionamento"],
  [80, "Estremo funzionamento"],
  [90, "Leggenda personale"],
  [99, "La miglior versione di te"],
];

export interface LevelInfo {
  level: number;
  title: string;
  xpIntoLevel: number;
  xpForNextLevel: number;
  progress: number;
}

export function levelFor(totalXp: number): LevelInfo {
  let level = 0;
  while (level < MAX_LEVEL && xpForLevel(level + 1) <= totalXp) level++;
  const title = [...TITLES].reverse().find(([from]) => level >= from)![1];
  if (level >= MAX_LEVEL) return { level, title, xpIntoLevel: 0, xpForNextLevel: 0, progress: 1 };
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return { level, title, xpIntoLevel: totalXp - base, xpForNextLevel: next - base, progress: (totalXp - base) / (next - base) };
}

// ---------------------------------------------------------------- first-month bonus missions
export interface BonusMission {
  id: string;
  name: string;
  description: string;
  icon: string;
}

/** Habits to lock in during the first month (October 2026): all anchored to a fixed moment of the day. */
export const FIRST_MONTH_MISSIONS: BonusMission[] = [
  { id: "wake", name: "Sveglia 06:30, subito in piedi", description: "Ogni giorno, weekend compreso. Si spunta da solo con «Sveglia» in Igiene mattina.", icon: "alarm-outline" },
  { id: "shower", name: "Doccia", description: "In palestra o la sera a casa. Si spunta con un passo della doccia nella Giornata.", icon: "water-outline" },
  { id: "meds", name: "Farmaci all'orario", description: "Tutti quelli della giornata segnati come presi.", icon: "medkit-outline" },
  { id: "lens", name: "Lenti tolte in tempo", description: "«Lenti tolte» spuntato nella routine serale o in Lenti.", icon: "eye-outline" },
  { id: "skincare", name: "Skincare mattina e sera", description: "Tutti i passaggi della skincare di oggi fatti.", icon: "sparkles-outline" },
  { id: "water", name: "10 bottigliette", description: "L'obiettivo d'acqua di oggi.", icon: "beaker-outline" },
  { id: "meals", name: "Tutti i pasti con proteine", description: "Ogni pasto del piano di oggi segnato come fatto.", icon: "restaurant-outline" },
  { id: "english", name: "Inglese sul bus", description: "I 45′ del bus di andata usati per l'inglese (giorni di scuola).", icon: "language-outline" },
  { id: "training", name: "Allenamento del giorno", description: "Pesi, MMA o tecnica previsti oggi, fatti (nei giorni di riposo non conta).", icon: "barbell-outline" },
  { id: "sleep", name: "Luci spente alle 21:30", description: "Ultimo passo della routine serale: telefono fuori dalla camera.", icon: "moon-outline" },
];

const SKIN = /face wash|hyaluronic cream|spf|melano|retinol|cure natural/i;
const MEAL = /^(colazione|pranzo|cena|merenda|spuntino)/i;

/** A mission is done automatically from what you log; null = not applicable today (e.g. no meds set up, weekend English). */
export function missionStatus(data: ProgressData, date: string, id: string): boolean | null {
  const acts = timelineFor(data.plan, date);
  const log = data.timelineLog.find((d) => d.date === date);
  const done = (stepId: string) => !!log?.doneIds.includes(stepId);
  const manual = data.entries.find((e) => e.date === date)?.bonusMissions?.includes(id) ?? false;
  const auto = (() => {
    switch (id) {
      case "wake":
        return acts.some((a) => a.steps.some((s) => /^Sveglia|^Pesati/.test(s.label) && done(s.id)));
      case "shower":
        return acts.some((a) => /^Doccia/.test(a.title) && a.steps.some((s) => done(s.id)));
      case "meds": {
        if (!data.medicationCount) return null;
        return data.medicationLogs.filter((m) => m.date === date).length >= data.medicationCount;
      }
      case "lens":
        return data.lensLog.some((l) => l.date === date && l.removedAt) || acts.some((a) => a.steps.some((s) => /^Togli le lenti/.test(s.label) && done(s.id)));
      case "skincare": {
        const steps = acts.flatMap((a) => a.steps.filter((s) => SKIN.test(s.label)));
        return steps.length ? steps.every((s) => done(s.id)) : null;
      }
      case "water":
        return bottlesFor(data, date) >= data.goals.waterBottles;
      case "meals": {
        const meals = acts.filter((a) => MEAL.test(a.title));
        return meals.length ? meals.every((a) => a.steps.some((s) => done(s.id))) : null;
      }
      case "english": {
        const bus = acts.find((a) => a.title === "Bus · inglese");
        return bus ? bus.steps.filter((s) => done(s.id)).length >= 2 : null;
      }
      case "training": {
        const t = trainingMinutes(data.plan, data.timelineLog, date);
        return t.planned ? t.done >= t.planned * 0.75 : null;
      }
      case "sleep":
        return acts.some((a) => a.steps.some((s) => /^Luci basse/.test(s.label) && done(s.id)));
      default:
        return null;
    }
  })();
  if (auto === null) return manual ? true : null;
  return auto || manual;
}

export function missionsFor(data: ProgressData, date: string): (BonusMission & { done: boolean; applicable: boolean })[] {
  return FIRST_MONTH_MISSIONS.map((m) => {
    const status = missionStatus(data, date, m.id);
    return { ...m, done: status === true, applicable: status !== null };
  });
}
