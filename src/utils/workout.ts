import { MAX_WORKOUT_TIER, WORKOUT_TIERS_BY_LEVEL } from "../data/workoutProgram";
import { WorkoutLogEntry } from "../types";

export function xpForWorkout(tier: number): number {
  return 30 + tier * 10;
}

export function computeWorkoutXp(logs: WorkoutLogEntry[]): number {
  return logs.reduce((sum, log) => sum + xpForWorkout(log.tier), 0);
}

export interface TierProgress {
  tier: number;
  sessionsCompleted: number;
  sessionsToUnlockNext: number;
  isMaxTier: boolean;
}

/** Determines the current unlocked tier and progress from the full workout log history. */
export function computeTierProgress(logs: WorkoutLogEntry[], startingTier: number = 1): TierProgress {
  let tier = Math.min(Math.max(Math.round(startingTier), 1), MAX_WORKOUT_TIER);

  while (tier < MAX_WORKOUT_TIER) {
    const required = WORKOUT_TIERS_BY_LEVEL[tier].sessionsToUnlockNext;
    const completedAtTier = logs.filter((log) => log.tier === tier).length;
    if (completedAtTier < required) break;
    tier++;
  }

  const sessionsCompleted = logs.filter((log) => log.tier === tier).length;
  const sessionsToUnlockNext = WORKOUT_TIERS_BY_LEVEL[tier].sessionsToUnlockNext;

  return {
    tier,
    sessionsCompleted,
    sessionsToUnlockNext,
    isMaxTier: tier >= MAX_WORKOUT_TIER,
  };
}

export function hasLoggedWorkoutToday(logs: WorkoutLogEntry[], today: string): boolean {
  return logs.some((log) => log.date === today);
}

/** Total sets completed across any workout(s) logged on the given date. */
export function setsCompletedOnDate(logs: WorkoutLogEntry[], date: string): number {
  return logs
    .filter((log) => log.date === date)
    .flatMap((log) => log.exerciseSets ?? [])
    .reduce((sum, s) => sum + s.repsPerSet.length, 0);
}

/**
 * Average actual reps logged for an exercise across its most recent sessions,
 * used to nudge the user toward a harder variant once they're consistently
 * blowing past the prescribed target.
 */
export function averageRecentReps(
  logs: WorkoutLogEntry[],
  exerciseId: string,
  sessionCount: number = 3
): number | null {
  const recentSessions = [...logs]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((log) => log.exerciseSets?.find((s) => s.exerciseId === exerciseId))
    .filter((s): s is NonNullable<typeof s> => !!s && s.repsPerSet.length > 0)
    .slice(0, sessionCount);

  if (recentSessions.length === 0) return null;

  const allReps = recentSessions.flatMap((s) => s.repsPerSet);
  return allReps.reduce((a, b) => a + b, 0) / allReps.length;
}
