import { WellnessEntry, WellnessGoals } from "../../types";
import { computeBestStreak, computeStreak, goalsMet, goalsMetCount } from "../streak";
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

  it("forgives a single gap day with no entry instead of breaking the streak", () => {
    const entries: WellnessEntry[] = [
      entryFor(toDateKey(addDays(today, -3))),
      entryFor(toDateKey(addDays(today, -1))),
      entryFor(toDateKey(today)),
    ];
    expect(computeStreak(entries, goals, today)).toBe(3);
  });

  it("forgives a single missed-goal day today instead of resetting to 0", () => {
    const entries: WellnessEntry[] = [
      entryFor(toDateKey(addDays(today, -1))),
      entryFor(toDateKey(today), { waterGlasses: 1 }),
    ];
    expect(computeStreak(entries, goals, today)).toBe(1);
  });

  it("still breaks the streak on two consecutive missed days", () => {
    const entries: WellnessEntry[] = [
      entryFor(toDateKey(addDays(today, -4))),
      entryFor(toDateKey(addDays(today, -1))),
      entryFor(toDateKey(today)),
      // day -2 and -3 both have no entry: two misses in a row
    ];
    expect(computeStreak(entries, goals, today)).toBe(2);
  });

  it("does not grant a second grace day within the cooldown window", () => {
    const entries: WellnessEntry[] = [
      entryFor(toDateKey(addDays(today, -6)), { mood: 2 }), // missed goal, too soon for another grace
      entryFor(toDateKey(addDays(today, -5))),
      entryFor(toDateKey(addDays(today, -4))),
      // day -3 has no entry: this is the one grace day used
      entryFor(toDateKey(addDays(today, -2))),
      entryFor(toDateKey(addDays(today, -1))),
      entryFor(toDateKey(today)),
    ];
    // Counts today, -1, -2 (3), then the -3 gap is forgiven, then -4, -5 (2 more = 5),
    // then -6 missed the goal but the grace was already used less than 7 days ago, so it stops there.
    expect(computeStreak(entries, goals, today)).toBe(5);
  });
});

describe("computeBestStreak", () => {
  const today = new Date("2026-01-10T12:00:00");

  it("is 0 with no entries", () => {
    expect(computeBestStreak([], goals, today)).toBe(0);
  });

  it("matches the current streak when there is only one run", () => {
    const entries: WellnessEntry[] = [
      entryFor(toDateKey(addDays(today, -2))),
      entryFor(toDateKey(addDays(today, -1))),
      entryFor(toDateKey(today)),
    ];
    expect(computeBestStreak(entries, goals, today)).toBe(3);
  });

  it("remembers a longer run from earlier in the history even after a reset", () => {
    const entries: WellnessEntry[] = [
      entryFor(toDateKey(addDays(today, -20))),
      entryFor(toDateKey(addDays(today, -19))),
      entryFor(toDateKey(addDays(today, -18))),
      entryFor(toDateKey(addDays(today, -17))),
      entryFor(toDateKey(addDays(today, -16))),
      // long gap breaks the streak entirely (more than one miss in a row)
      entryFor(toDateKey(today)),
    ];
    expect(computeBestStreak(entries, goals, today)).toBe(5);
  });
});
