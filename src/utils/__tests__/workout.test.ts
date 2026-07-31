import { WorkoutLogEntry } from "../../types";
import {
  averageRecentReps,
  computeTierProgress,
  computeWorkoutXp,
  hasLoggedWorkoutToday,
  setsCompletedOnDate,
  xpForWorkout,
} from "../workout";

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
      ...logsForTier(5, 10),
      ...logsForTier(6, 12),
      ...logsForTier(7, 999),
    ];
    const progress = computeTierProgress(logs);
    expect(progress.tier).toBe(7);
    expect(progress.isMaxTier).toBe(true);
  });

  it("honors a manual starting tier, skipping session-gated beginner tiers", () => {
    const progress = computeTierProgress([], 6);
    expect(progress.tier).toBe(6);
    expect(progress.sessionsCompleted).toBe(0);
  });

  it("never lets a lower starting tier override progress already earned from logs", () => {
    const progress = computeTierProgress(logsForTier(1, 6), 1);
    expect(progress.tier).toBe(2);
  });
});

describe("hasLoggedWorkoutToday", () => {
  it("detects a session logged today", () => {
    const logs: WorkoutLogEntry[] = [{ date: "2026-01-05", tier: 1, dayId: "t1-a" }];
    expect(hasLoggedWorkoutToday(logs, "2026-01-05")).toBe(true);
    expect(hasLoggedWorkoutToday(logs, "2026-01-06")).toBe(false);
  });
});

describe("setsCompletedOnDate", () => {
  it("sums sets completed across all exercises logged on that date", () => {
    const logs: WorkoutLogEntry[] = [
      {
        date: "2026-01-05",
        tier: 1,
        dayId: "t1-a",
        exerciseSets: [
          { exerciseId: "squat", repsPerSet: [10, 10, 8] },
          { exerciseId: "plank", repsPerSet: [20, 20] },
        ],
      },
    ];
    expect(setsCompletedOnDate(logs, "2026-01-05")).toBe(5);
  });

  it("is 0 for a date with no logged workout", () => {
    expect(setsCompletedOnDate([], "2026-01-05")).toBe(0);
  });

  it("is 0 for a logged workout with no exerciseSets detail", () => {
    const logs: WorkoutLogEntry[] = [{ date: "2026-01-05", tier: 1, dayId: "t1-a" }];
    expect(setsCompletedOnDate(logs, "2026-01-05")).toBe(0);
  });
});

describe("averageRecentReps", () => {
  function logWithReps(date: string, exerciseId: string, repsPerSet: number[]): WorkoutLogEntry {
    return { date, tier: 6, dayId: "t6-a", exerciseSets: [{ exerciseId, repsPerSet }] };
  }

  it("is null when the exercise has never been logged", () => {
    expect(averageRecentReps([], "diamond-pushup")).toBeNull();
  });

  it("averages reps across the most recent sessions only", () => {
    const logs = [
      logWithReps("2026-01-01", "diamond-pushup", [10, 10]),
      logWithReps("2026-01-02", "diamond-pushup", [20, 20]),
      logWithReps("2026-01-03", "diamond-pushup", [20, 20]),
      logWithReps("2026-01-04", "diamond-pushup", [20, 20]),
    ];
    // sessionCount defaults to 3, so the oldest session (10,10) should be excluded
    expect(averageRecentReps(logs, "diamond-pushup")).toBe(20);
  });

  it("ignores other exercises", () => {
    const logs = [logWithReps("2026-01-01", "squat", [15, 15])];
    expect(averageRecentReps(logs, "diamond-pushup")).toBeNull();
  });
});
