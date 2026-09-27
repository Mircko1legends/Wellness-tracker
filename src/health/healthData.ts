import { toDateKey } from "../utils/date";
import type { WeightEntry } from "../nutrition/weight";

/** What Health Connect adds to the app, per day (local date). */
export interface HealthDay {
  sleepHours?: number; // night ending that morning
  steps?: number;
  exerciseMinutes?: number;
  bodyFat?: number; // %
}

export type HealthDaily = Record<string, HealthDay>;

interface WeightLike {
  time: string;
  weight: { value: number; unit: string };
}
interface IntervalLike {
  startTime: string;
  endTime: string;
}
interface StepsLike extends IntervalLike {
  count: number;
}
interface BodyFatLike {
  time: string;
  percentage: number;
}

const localDate = (iso: string) => toDateKey(new Date(iso));

function kilograms(w: WeightLike["weight"]): number {
  const factor: Record<string, number> = { kilograms: 1, grams: 0.001, pounds: 0.45359237, ounces: 0.0283495, milligrams: 1e-6, micrograms: 1e-9 };
  return w.value * (factor[w.unit] ?? 1);
}

/** One weight per day: the first of the morning (the one the plan asks for: after the bathroom, before drinking). */
export function weightsFromRecords(records: WeightLike[]): WeightEntry[] {
  const byDay = new Map<string, { t: number; kg: number }>();
  for (const r of records) {
    const date = localDate(r.time);
    const t = new Date(r.time).getTime();
    const prev = byDay.get(date);
    if (!prev || t < prev.t) byDay.set(date, { t, kg: Math.round(kilograms(r.weight) * 10) / 10 });
  }
  return [...byDay.entries()].map(([date, v]) => ({ date, kg: v.kg })).sort((a, b) => a.date.localeCompare(b.date));
}

/** Sleep sessions summed per night, counted on the morning they end. */
export function sleepByNight(records: IntervalLike[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of records) {
    const hours = (new Date(r.endTime).getTime() - new Date(r.startTime).getTime()) / 3_600_000;
    if (hours <= 0 || hours > 16) continue;
    const date = localDate(r.endTime);
    out[date] = Math.round(((out[date] ?? 0) + hours) * 4) / 4;
  }
  return out;
}

export function minutesByDay(records: IntervalLike[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of records) {
    const min = (new Date(r.endTime).getTime() - new Date(r.startTime).getTime()) / 60_000;
    if (min <= 0 || min > 600) continue;
    const date = localDate(r.startTime);
    out[date] = Math.round((out[date] ?? 0) + min);
  }
  return out;
}

export function stepsByDay(records: StepsLike[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of records) {
    const date = localDate(r.startTime);
    out[date] = (out[date] ?? 0) + r.count;
  }
  return out;
}

export function bodyFatByDay(records: BodyFatLike[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of [...records].sort((a, b) => a.time.localeCompare(b.time))) out[localDate(r.time)] = Math.round(r.percentage * 10) / 10;
  return out;
}

export function buildHealthDaily(parts: {
  sleep: Record<string, number>;
  steps: Record<string, number>;
  exercise: Record<string, number>;
  bodyFat: Record<string, number>;
}): HealthDaily {
  const out: HealthDaily = {};
  const put = (date: string, patch: HealthDay) => (out[date] = { ...out[date], ...patch });
  for (const [d, v] of Object.entries(parts.sleep)) put(d, { sleepHours: v });
  for (const [d, v] of Object.entries(parts.steps)) put(d, { steps: v });
  for (const [d, v] of Object.entries(parts.exercise)) put(d, { exerciseMinutes: v });
  for (const [d, v] of Object.entries(parts.bodyFat)) put(d, { bodyFat: v });
  return out;
}

/** Weigh-ins from the scale fill the days you didn't weigh in by hand; a manual value always wins. */
export function mergeWeights(manual: WeightEntry[], fromScale: WeightEntry[]): WeightEntry[] {
  const days = new Set(manual.map((w) => w.date));
  return [...manual, ...fromScale.filter((w) => !days.has(w.date))].sort((a, b) => a.date.localeCompare(b.date));
}
