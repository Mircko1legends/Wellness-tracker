import { WellnessEntry, WorkoutLogEntry } from "../types";
import { addDays, lastNDateKeys } from "./date";
import { setsCompletedOnDate } from "./workout";

export interface MetricAverage {
  current: number | null;
  previous: number | null;
}

export interface WeeklyComparison {
  mood: MetricAverage;
  sleepHours: MetricAverage;
  waterGlasses: MetricAverage;
  setsCompleted: MetricAverage;
}

function average(entries: WellnessEntry[], dateKeys: string[], pick: (e: WellnessEntry) => number): number | null {
  const set = new Set(dateKeys);
  const matches = entries.filter((e) => set.has(e.date));
  if (matches.length === 0) return null;
  const sum = matches.reduce((acc, e) => acc + pick(e), 0);
  return sum / matches.length;
}

function averageSetsPerDay(logs: WorkoutLogEntry[], dateKeys: string[]): number {
  const total = dateKeys.reduce((sum, d) => sum + setsCompletedOnDate(logs, d), 0);
  return total / dateKeys.length;
}

export function computeWeeklyComparison(
  entries: WellnessEntry[],
  workoutLogs: WorkoutLogEntry[],
  today: Date = new Date()
): WeeklyComparison {
  const currentWeek = lastNDateKeys(7, today);
  const previousWeek = lastNDateKeys(7, addDays(today, -7));

  return {
    mood: {
      current: average(entries, currentWeek, (e) => e.mood),
      previous: average(entries, previousWeek, (e) => e.mood),
    },
    sleepHours: {
      current: average(entries, currentWeek, (e) => e.sleepHours),
      previous: average(entries, previousWeek, (e) => e.sleepHours),
    },
    waterGlasses: {
      current: average(entries, currentWeek, (e) => e.waterGlasses),
      previous: average(entries, previousWeek, (e) => e.waterGlasses),
    },
    setsCompleted: {
      current: averageSetsPerDay(workoutLogs, currentWeek),
      previous: averageSetsPerDay(workoutLogs, previousWeek),
    },
  };
}
