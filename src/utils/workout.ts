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
export function computeTierProgress(logs: WorkoutLogEntry[]): TierProgress {
  let tier = 1;

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
