import { WorkoutLogEntry } from "../../types";
import { computeTierProgress, computeWorkoutXp, hasLoggedWorkoutToday, xpForWorkout } from "../workout";

function logsForTier(tier: number, count: number): WorkoutLogEntry[] {
  return Array.from({ length: count }, (_, i) => ({
    date: `2026-01-${String(i + 1).padStart(2, "0")}`,
    tier,
    dayId: tier % 2 === 0 ? "day-a" : "day-b",
  }));
}

describe("xpForWorkout", () => {
  it("increases with tier", () => {
    expect(xpForWorkout(2)).toBeGreaterThan(xpForWorkout(1));
  });
});

describe("computeWorkoutXp", () => {
  it("sums xp across all logged sessions", () => {
    const logs = [...logsForTier(1, 2), ...logsForTier(2, 1)];
    expect(computeWorkoutXp(logs)).toBe(xpForWorkout(1) * 2 + xpForWorkout(2));
  });
});

describe("computeTierProgress", () => {
  it("starts at tier 1 with no sessions logged", () => {
    const progress = computeTierProgress([]);
    expect(progress.tier).toBe(1);
    expect(progress.sessionsCompleted).toBe(0);
  });

  it("stays at tier 1 until the required sessions are completed", () => {
    const progress = computeTierProgress(logsForTier(1, 5));
    expect(progress.tier).toBe(1);
    expect(progress.sessionsCompleted).toBe(5);
  });

  it("unlocks tier 2 once tier 1 requirement is met", () => {
    const progress = computeTierProgress(logsForTier(1, 6));
    expect(progress.tier).toBe(2);
    expect(progress.sessionsCompleted).toBe(0);
  });

  it("progresses through multiple tiers", () => {
    const logs = [...logsForTier(1, 6), ...logsForTier(2, 8)];
    const progress = computeTierProgress(logs);
    expect(progress.tier).toBe(3);
  });

  it("caps at the max tier", () => {
    const logs = [
      ...logsForTier(1, 6),
      ...logsForTier(2, 8),
      ...logsForTier(3, 10),
      ...logsForTier(4, 12),
      ...logsForTier(5, 999),
    ];
    const progress = computeTierProgress(logs);
    expect(progress.tier).toBe(5);
    expect(progress.isMaxTier).toBe(true);
  });
});

describe("hasLoggedWorkoutToday", () => {
  it("detects a session logged today", () => {
    const logs: WorkoutLogEntry[] = [{ date: "2026-01-05", tier: 1, dayId: "t1-a" }];
    expect(hasLoggedWorkoutToday(logs, "2026-01-05")).toBe(true);
    expect(hasLoggedWorkoutToday(logs, "2026-01-06")).toBe(false);
  });
});
