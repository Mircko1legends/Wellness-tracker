import { MISSIONS_BY_ID } from "../data/missions";
import { WellnessEntry, WellnessGoals } from "../types";

export interface LevelInfo {
  level: number;
  totalXp: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  progress: number; // 0..1 toward next level
}

/** XP required to go from `level` to `level + 1`. Grows linearly so early levels come quickly. */
export function xpToReachLevel(level: number): number {
  return 100 + (level - 1) * 20;
}

export function levelInfo(totalXp: number): LevelInfo {
  let level = 1;
  let remaining = totalXp;
  while (remaining >= xpToReachLevel(level)) {
    remaining -= xpToReachLevel(level);
    level++;
  }
  const xpForNextLevel = xpToReachLevel(level);
  return {
    level,
    totalXp,
    xpIntoLevel: remaining,
    xpForNextLevel,
    progress: remaining / xpForNextLevel,
  };
}

export function xpForEntry(entry: WellnessEntry, goals: WellnessGoals): number {
  let xp = 0;
  if (entry.sleepHours >= goals.sleepHours) xp += MISSIONS_BY_ID.sleep.xpReward;
  if (entry.waterGlasses >= goals.waterGlasses) xp += MISSIONS_BY_ID.water.xpReward;
  if (entry.activityMinutes >= goals.activityMinutes) xp += MISSIONS_BY_ID.activity.xpReward;
  if (entry.mood >= goals.moodMin) xp += MISSIONS_BY_ID.mood.xpReward;
  for (const id of entry.bonusMissions ?? []) {
    const mission = MISSIONS_BY_ID[id];
    if (mission) xp += mission.xpReward;
  }
  return xp;
}

export function computeTotalXp(entries: WellnessEntry[], goals: WellnessGoals): number {
  return entries.reduce((sum, entry) => sum + xpForEntry(entry, goals), 0);
}
