import { WellnessEntry, WorkoutLogEntry } from "../../types";
import { computeWeeklyComparison } from "../comparison";
import { addDays, toDateKey } from "../date";

function entryFor(date: string, overrides: Partial<WellnessEntry> = {}): WellnessEntry {
  return {
    date,
    mood: 3,
    sleepHours: 7,
    waterGlasses: 6,
    ...overrides,
  };
}

describe("computeWeeklyComparison", () => {
  const today = new Date("2026-01-14T12:00:00"); // a Wednesday

  it("returns null averages when there is no data", () => {
    const result = computeWeeklyComparison([], [], today);
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
    const result = computeWeeklyComparison(entries, [], today);
    expect(result.sleepHours.current).toBeCloseTo(8);
    expect(result.sleepHours.previous).toBeCloseTo(5);
  });

  it("averages sets completed per day across each 7-day window, counting workout-free days as 0", () => {
    const workoutLogs: WorkoutLogEntry[] = [
      {
        date: toDateKey(today),
        tier: 1,
        dayId: "t1-a",
        exerciseSets: [{ exerciseId: "squat", setsCompleted: 14 }],
      },
    ];
    const result = computeWeeklyComparison([], workoutLogs, today);
    expect(result.setsCompleted.current).toBeCloseTo(14 / 7);
    expect(result.setsCompleted.previous).toBe(0);
  });
});
