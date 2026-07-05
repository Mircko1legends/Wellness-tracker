import { MedicationLogEntry, WellnessEntry, WellnessGoals, WorkoutLogEntry } from "../../types";
import { computeMedicationXp, computeTotalXp, levelInfo, xpForEntry, xpToReachLevel } from "../gamification";

const goals: WellnessGoals = {
  sleepHours: 8,
  waterGlasses: 8,
  setsGoal: 30,
  moodMin: 3,
};

function entryFor(overrides: Partial<WellnessEntry> = {}): WellnessEntry {
  return {
    date: "2026-01-01",
    mood: 3,
    sleepHours: 8,
    waterGlasses: 8,
    ...overrides,
  };
}

const setsMet = 30;

describe("xpForEntry", () => {
  it("awards xp for every core goal met", () => {
    expect(xpForEntry(entryFor(), goals, setsMet)).toBe(10 + 10 + 20 + 10);
  });

  it("awards partial xp when only some goals are met", () => {
    expect(xpForEntry(entryFor({ sleepHours: 2, mood: 1 }), goals, setsMet)).toBe(10 + 20);
  });

  it("adds xp for completed bonus missions", () => {
    const xp = xpForEntry(entryFor({ bonusMissions: ["meditation"] }), goals, setsMet);
    expect(xp).toBe(10 + 10 + 20 + 10 + 20);
  });

  it("ignores unknown bonus mission ids", () => {
    const xp = xpForEntry(entryFor({ bonusMissions: ["does-not-exist"] }), goals, setsMet);
    expect(xp).toBe(10 + 10 + 20 + 10);
  });

  it("does not award activity xp when the sets goal is not met", () => {
    expect(xpForEntry(entryFor(), goals, 0)).toBe(10 + 10 + 10);
  });
});

describe("computeTotalXp", () => {
  it("sums xp across all entries", () => {
    const entries = [entryFor(), entryFor({ sleepHours: 2 })];
    const workoutLogs: WorkoutLogEntry[] = [
      { date: "2026-01-01", tier: 1, dayId: "t1-a", exerciseSets: [{ exerciseId: "squat", setsCompleted: setsMet }] },
    ];
    expect(computeTotalXp(entries, goals, workoutLogs)).toBe(50 + 40);
  });
});

describe("computeMedicationXp", () => {
  it("awards a small fixed xp per logged dose", () => {
    const logs: MedicationLogEntry[] = [
      { date: "2026-01-01", medicationId: "a" },
      { date: "2026-01-01", medicationId: "b" },
      { date: "2026-01-02", medicationId: "a" },
    ];
    expect(computeMedicationXp(logs)).toBe(15);
  });

  it("is zero with no logs", () => {
    expect(computeMedicationXp([])).toBe(0);
  });
});

describe("levelInfo", () => {
  it("starts at level 1 with 0 xp", () => {
    const info = levelInfo(0);
    expect(info.level).toBe(1);
    expect(info.xpIntoLevel).toBe(0);
    expect(info.xpForNextLevel).toBe(xpToReachLevel(1));
  });

  it("levels up once enough xp accumulates", () => {
    const info = levelInfo(xpToReachLevel(1));
    expect(info.level).toBe(2);
    expect(info.xpIntoLevel).toBe(0);
  });

  it("tracks partial progress into the current level", () => {
    const info = levelInfo(xpToReachLevel(1) + 30);
    expect(info.level).toBe(2);
    expect(info.xpIntoLevel).toBe(30);
    expect(info.xpForNextLevel).toBe(xpToReachLevel(2));
  });

  it("requires more xp for each successive level", () => {
    expect(xpToReachLevel(2)).toBeGreaterThan(xpToReachLevel(1));
    expect(xpToReachLevel(5)).toBeGreaterThan(xpToReachLevel(4));
  });

  it("takes several consecutive days of full compliance to level up, not one or two", () => {
    // Max realistic daily xp at level 1: all 4 core goals (50) + the one
    // unlocked bonus habit, dailyShower (10).
    const maxDailyXpAtLevel1 = 60;
    expect(levelInfo(maxDailyXpAtLevel1 * 2).level).toBe(1);
    expect(levelInfo(maxDailyXpAtLevel1 * 5).level).toBe(1);
    expect(levelInfo(maxDailyXpAtLevel1 * 6).level).toBeGreaterThanOrEqual(2);
  });
});
