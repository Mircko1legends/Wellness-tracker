import { WellnessEntry } from "../types";
import { addDays, lastNDateKeys } from "./date";

export interface MetricAverage {
  current: number | null;
  previous: number | null;
}

export interface WeeklyComparison {
  mood: MetricAverage;
  sleepHours: MetricAverage;
  waterBottles: MetricAverage;
  trainingHours: MetricAverage;
}

function average(entries: WellnessEntry[], dateKeys: string[], pick: (e: WellnessEntry) => number): number | null {
  const set = new Set(dateKeys);
  const matches = entries.filter((e) => set.has(e.date));
  if (matches.length === 0) return null;
  const sum = matches.reduce((acc, e) => acc + pick(e), 0);
  return sum / matches.length;
}

function weekTotal(dateKeys: string[], hoursOn: (date: string) => number): number {
  return dateKeys.reduce((sum, d) => sum + hoursOn(d), 0);
}

export function computeWeeklyComparison(
  entries: WellnessEntry[],
  trainingHoursOn: (date: string) => number,
  today: Date = new Date()
): WeeklyComparison {
  const currentWeek = lastNDateKeys(7, today);
  const previousWeek = lastNDateKeys(7, addDays(today, -7));

  return {
    mood: {
      // Distance from neutral: closer to 0 means steadier, whichever direction.
      current: average(entries, currentWeek, (e) => Math.abs(e.mood)),
      previous: average(entries, previousWeek, (e) => Math.abs(e.mood)),
    },
    sleepHours: {
      current: average(entries, currentWeek, (e) => e.sleepHours),
      previous: average(entries, previousWeek, (e) => e.sleepHours),
    },
    waterBottles: {
      current: average(entries, currentWeek, (e) => e.waterBottles),
      previous: average(entries, previousWeek, (e) => e.waterBottles),
    },
    trainingHours: {
      current: weekTotal(currentWeek, trainingHoursOn),
      previous: weekTotal(previousWeek, trainingHoursOn),
    },
  };
}
