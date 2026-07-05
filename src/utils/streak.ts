import { WellnessEntry, WellnessGoals, WorkoutLogEntry } from "../types";
import { addDays, parseDateKey, toDateKey } from "./date";
import { setsCompletedOnDate } from "./workout";

// One missed day is forgiven without breaking the streak, at most once per
// this many days: a bad day (common with mood/psychotic symptoms, not just
// "lack of discipline") shouldn't erase all progress. Two misses in a row
// still breaks it, so the streak stays meaningful.
const GRACE_COOLDOWN_DAYS = 7;

export function goalsMet(entry: WellnessEntry, goals: WellnessGoals, setsCompletedToday: number): boolean {
  return (
    entry.sleepHours >= goals.sleepHours &&
    entry.waterGlasses >= goals.waterGlasses &&
    setsCompletedToday >= goals.setsGoal &&
    entry.mood >= goals.moodMin
  );
}

export function goalsMetCount(entry: WellnessEntry, goals: WellnessGoals, setsCompletedToday: number): number {
  let count = 0;
  if (entry.sleepHours >= goals.sleepHours) count++;
  if (entry.waterGlasses >= goals.waterGlasses) count++;
  if (setsCompletedToday >= goals.setsGoal) count++;
  if (entry.mood >= goals.moodMin) count++;
  return count;
}

/**
 * Counts consecutive days (ending today) where all goals were met, allowing
 * one forgiven miss per GRACE_COOLDOWN_DAYS so a single off day doesn't zero
 * out the streak. Today is skipped as a starting point if it has no entry
 * yet, so an in-progress streak isn't broken just because today hasn't been
 * logged.
 */
export function computeStreak(
  entries: WellnessEntry[],
  goals: WellnessGoals,
  workoutLogs: WorkoutLogEntry[],
  today: Date = new Date()
): number {
  const byDate = new Map(entries.map((e) => [e.date, e]));

  let cursor = today;
  if (!byDate.has(toDateKey(cursor))) {
    cursor = addDays(cursor, -1);
  }

  let streak = 0;
  let consecutiveMisses = 0;
  let daysSinceGraceUsed = Infinity;

  while (true) {
    const dateKey = toDateKey(cursor);
    const entry = byDate.get(dateKey);
    const met = !!entry && goalsMet(entry, goals, setsCompletedOnDate(workoutLogs, dateKey));

    if (met) {
      streak++;
      consecutiveMisses = 0;
      daysSinceGraceUsed++;
      cursor = addDays(cursor, -1);
      continue;
    }

    consecutiveMisses++;
    const graceAvailable = consecutiveMisses === 1 && daysSinceGraceUsed >= GRACE_COOLDOWN_DAYS;
    if (!graceAvailable) break;

    daysSinceGraceUsed = 0;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/**
 * The longest streak ever reached (same grace rule as computeStreak),
 * scanned across all logged history. Shown alongside the current streak so
 * a reset after a hard stretch doesn't feel like losing all progress.
 */
export function computeBestStreak(
  entries: WellnessEntry[],
  goals: WellnessGoals,
  workoutLogs: WorkoutLogEntry[],
  today: Date = new Date()
): number {
  if (entries.length === 0) return 0;

  const byDate = new Map(entries.map((e) => [e.date, e]));
  const firstDateKey = entries.map((e) => e.date).sort()[0];

  let cursor = parseDateKey(firstDateKey);
  const end = byDate.has(toDateKey(today)) ? today : addDays(today, -1);

  let best = 0;
  let running = 0;
  let consecutiveMisses = 0;
  let daysSinceGraceUsed = Infinity;

  while (cursor <= end) {
    const dateKey = toDateKey(cursor);
    const entry = byDate.get(dateKey);
    const met = !!entry && goalsMet(entry, goals, setsCompletedOnDate(workoutLogs, dateKey));

    if (met) {
      running++;
      consecutiveMisses = 0;
      daysSinceGraceUsed++;
      best = Math.max(best, running);
    } else {
      consecutiveMisses++;
      const graceAvailable = consecutiveMisses === 1 && daysSinceGraceUsed >= GRACE_COOLDOWN_DAYS;
      if (graceAvailable) {
        daysSinceGraceUsed = 0;
      } else {
        running = 0;
        consecutiveMisses = 0;
        daysSinceGraceUsed = Infinity;
      }
    }
    cursor = addDays(cursor, 1);
  }
  return best;
}
