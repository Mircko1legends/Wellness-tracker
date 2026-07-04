import { WellnessEntry, WellnessGoals } from "../../types";
import { computeStreak, goalsMet, goalsMetCount } from "../streak";
import { toDateKey, addDays } from "../date";

const goals: WellnessGoals = {
  sleepHours: 8,
  waterGlasses: 8,
  activityMinutes: 30,
  moodMin: 3,
};

function entryFor(date: string, overrides: Partial<WellnessEntry> = {}): WellnessEntry {
  return {
    date,
    mood: 4,
    sleepHours: 8,
    waterGlasses: 8,
    activityMinutes: 30,
    ...overrides,
  };
}

describe("goalsMet", () => {
  it("returns true when every metric meets or exceeds its goal", () => {
    expect(goalsMet(entryFor("2026-01-01"), goals)).toBe(true);
  });

  it("returns false when a single metric misses its goal", () => {
    expect(goalsMet(entryFor("2026-01-01", { sleepHours: 5 }), goals)).toBe(false);
  });
});

describe("goalsMetCount", () => {
  it("counts how many of the four metrics were met", () => {
    expect(
      goalsMetCount(entryFor("2026-01-01", { sleepHours: 5, mood: 2 }), goals)
    ).toBe(2);
  });
});

describe("computeStreak", () => {
  const today = new Date("2026-01-10T12:00:00");

  it("is 0 with no entries", () => {
    expect(computeStreak([], goals, today)).toBe(0);
  });

  it("counts consecutive successful days ending today", () => {
    const entries: WellnessEntry[] = [
      entryFor(toDateKey(addDays(today, -2))),
      entryFor(toDateKey(addDays(today, -1))),
      entryFor(toDateKey(today)),
    ];
    expect(computeStreak(entries, goals, today)).toBe(3);
  });

  it("does not break the streak if today has no entry yet", () => {
    const entries: WellnessEntry[] = [
      entryFor(toDateKey(addDays(today, -2))),
      entryFor(toDateKey(addDays(today, -1))),
    ];
    expect(computeStreak(entries, goals, today)).toBe(2);
  });

  it("stops counting at the first day that misses a goal", () => {
    const entries: WellnessEntry[] = [
      entryFor(toDateKey(addDays(today, -3)), { sleepHours: 2 }),
      entryFor(toDateKey(addDays(today, -2))),
      entryFor(toDateKey(addDays(today, -1))),
      entryFor(toDateKey(today)),
    ];
    expect(computeStreak(entries, goals, today)).toBe(3);
  });

  it("stops counting at a gap day with no entry", () => {
    const entries: WellnessEntry[] = [
      entryFor(toDateKey(addDays(today, -3))),
      entryFor(toDateKey(addDays(today, -1))),
      entryFor(toDateKey(today)),
    ];
    expect(computeStreak(entries, goals, today)).toBe(2);
  });

  it("resets to 0 if today's own entry misses a goal", () => {
    const entries: WellnessEntry[] = [
      entryFor(toDateKey(addDays(today, -1))),
      entryFor(toDateKey(today), { waterGlasses: 1 }),
    ];
    expect(computeStreak(entries, goals, today)).toBe(0);
  });
});
