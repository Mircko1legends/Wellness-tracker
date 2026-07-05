import { MedicationLogEntry, WellnessEntry, WellnessGoals } from "../../types";
import { computeMedicationXp, computeTotalXp, levelInfo, xpForEntry, xpToReachLevel } from "../gamification";

const goals: WellnessGoals = {
  sleepHours: 8,
  waterGlasses: 8,
  activityMinutes: 30,
  moodMin: 3,
};

function entryFor(overrides: Partial<WellnessEntry> = {}): WellnessEntry {
  return {
    date: "2026-01-01",
    mood: 3,
    sleepHours: 8,
    waterGlasses: 8,
    activityMinutes: 30,
    ...overrides,
  };
}

describe("xpForEntry", () => {
  it("awards xp for every core goal met", () => {
    expect(xpForEntry(entryFor(), goals)).toBe(10 + 10 + 20 + 10);
  });

  it("awards partial xp when only some goals are met", () => {
    expect(xpForEntry(entryFor({ sleepHours: 2, mood: 1 }), goals)).toBe(10 + 20);
  });

  it("adds xp for completed bonus missions", () => {
    const xp = xpForEntry(entryFor({ bonusMissions: ["meditation"] }), goals);
    expect(xp).toBe(10 + 10 + 20 + 10 + 20);
  });

  it("ignores unknown bonus mission ids", () => {
    const xp = xpForEntry(entryFor({ bonusMissions: ["does-not-exist"] }), goals);
    expect(xp).toBe(10 + 10 + 20 + 10);
  });
});

describe("computeTotalXp", () => {
  it("sums xp across all entries", () => {
    const entries = [entryFor(), entryFor({ sleepHours: 2 })];
    expect(computeTotalXp(entries, goals)).toBe(50 + 40);
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
});
