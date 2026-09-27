import { WellnessEntry } from "../../types";
import { computeWeeklyComparison } from "../comparison";
import { addDays, toDateKey } from "../date";

function entryFor(date: string, overrides: Partial<WellnessEntry> = {}): WellnessEntry {
  return {
    date,
    mood: 0,
    sleepHours: 7,
    waterBottles: 6,
    ...overrides,
  };
}

describe("computeWeeklyComparison", () => {
  const today = new Date("2026-01-14T12:00:00"); // a Wednesday

  it("returns null averages when there is no data", () => {
    const result = computeWeeklyComparison([], () => 0, today);
    expect(result.sleepHours.current).toBeNull();
    expect(result.sleepHours.previous).toBeNull();
  });

  it("averages only the days within each 7-day window", () => {
    const entries: WellnessEntry[] = [
      entryFor(toDateKey(addDays(today, -1)), { sleepHours: 9 }),
      entryFor(toDateKey(today), { sleepHours: 7 }),
      entryFor(toDateKey(addDays(today, -8)), { sleepHours: 4 }),
      entryFor(toDateKey(addDays(today, -9)), { sleepHours: 6 }),
    ];
    const result = computeWeeklyComparison(entries, () => 0, today);
    expect(result.sleepHours.current).toBeCloseTo(8);
    expect(result.sleepHours.previous).toBeCloseTo(5);
  });

  it("sums training hours over each 7-day window", () => {
    const todayKey = toDateKey(today);
    const result = computeWeeklyComparison([], (d) => (d === todayKey ? 2.5 : 0), today);
    expect(result.trainingHours.current).toBe(2.5);
    expect(result.trainingHours.previous).toBe(0);
  });
});
