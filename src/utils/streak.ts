import { WellnessEntry, WellnessGoals } from "../types";
import { addDays, toDateKey } from "./date";

export function goalsMet(entry: WellnessEntry, goals: WellnessGoals): boolean {
  return (
    entry.sleepHours >= goals.sleepHours &&
    entry.waterGlasses >= goals.waterGlasses &&
    entry.activityMinutes >= goals.activityMinutes &&
    entry.mood >= goals.moodMin
  );
}

export function goalsMetCount(entry: WellnessEntry, goals: WellnessGoals): number {
  let count = 0;
  if (entry.sleepHours >= goals.sleepHours) count++;
  if (entry.waterGlasses >= goals.waterGlasses) count++;
  if (entry.activityMinutes >= goals.activityMinutes) count++;
  if (entry.mood >= goals.moodMin) count++;
  return count;
}

/**
 * Counts consecutive days (ending today) where all goals were met.
 * Today is skipped as a starting point if it has no entry yet, so an
 * in-progress streak isn't broken just because today hasn't been logged.
 */
export function computeStreak(
  entries: WellnessEntry[],
  goals: WellnessGoals,
  today: Date = new Date()
): number {
  const byDate = new Map(entries.map((e) => [e.date, e]));

  let cursor = today;
  if (!byDate.has(toDateKey(cursor))) {
    cursor = addDays(cursor, -1);
  }

  let streak = 0;
  while (true) {
    const entry = byDate.get(toDateKey(cursor));
    if (!entry || !goalsMet(entry, goals)) break;
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}
