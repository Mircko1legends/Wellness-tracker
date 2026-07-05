import { Medication, MedicationLogEntry, WellnessEntry, WellnessGoals } from "../../types";
import { computeWeeklyCheckin } from "../weeklyCheckin";
import { addDays, toDateKey } from "../date";

const goals: WellnessGoals = {
  sleepHours: 8,
  waterGlasses: 8,
  activityMinutes: 30,
  moodMin: 3,
};

const today = new Date("2026-01-10T12:00:00");

function entryFor(daysAgo: number, overrides: Partial<WellnessEntry> = {}): WellnessEntry {
  return {
    date: toDateKey(addDays(today, -daysAgo)),
    mood: 4,
    sleepHours: 8,
    waterGlasses: 8,
    activityMinutes: 30,
    ...overrides,
  };
}

function medication(overrides: Partial<Medication> = {}): Medication {
  return { id: "m1", name: "Vitamina D", hour: 8, minute: 0, enabled: true, ...overrides };
}

describe("computeWeeklyCheckin", () => {
  it("flags nothing when there is no data at all", () => {
    const result = computeWeeklyCheckin([], goals, [], [], today);
    expect(result.hasConcerns).toBe(false);
    expect(result.sleepStdDevHours).toBeNull();
    expect(result.medicationAdherenceRate).toBeNull();
  });

  it("flags nothing when everything is steady and consistent", () => {
    const entries = [0, 1, 2, 3, 4, 5, 6].map((d) => entryFor(d));
    const result = computeWeeklyCheckin(entries, goals, [], [], today);
    expect(result.hasConcerns).toBe(false);
    expect(result.sleepIrregular).toBe(false);
    expect(result.moodLowDaysCount).toBe(0);
    expect(result.moodTrendDown).toBe(false);
  });

  it("flags irregular sleep when hours vary widely across the week", () => {
    const entries = [
      entryFor(0, { sleepHours: 4 }),
      entryFor(1, { sleepHours: 10 }),
      entryFor(2, { sleepHours: 3 }),
      entryFor(3, { sleepHours: 9 }),
    ];
    const result = computeWeeklyCheckin(entries, goals, [], [], today);
    expect(result.sleepIrregular).toBe(true);
    expect(result.hasConcerns).toBe(true);
  });

  it("counts days below the mood floor and flags after enough of them", () => {
    const entries = [
      entryFor(0, { mood: 2 }),
      entryFor(1, { mood: 2 }),
      entryFor(2, { mood: 2 }),
      entryFor(3, { mood: 4 }),
    ];
    const result = computeWeeklyCheckin(entries, goals, [], [], today);
    expect(result.moodLowDaysCount).toBe(3);
    expect(result.hasConcerns).toBe(true);
  });

  it("flags a downward mood trend compared to the previous week", () => {
    const entries = [
      // previous week: mood 5 every day
      entryFor(7, { mood: 5 }),
      entryFor(8, { mood: 5 }),
      entryFor(9, { mood: 5 }),
      // current week: mood 3 every day
      entryFor(0, { mood: 3 }),
      entryFor(1, { mood: 3 }),
      entryFor(2, { mood: 3 }),
    ];
    const result = computeWeeklyCheckin(entries, goals, [], [], today);
    expect(result.moodTrendDown).toBe(true);
    expect(result.hasConcerns).toBe(true);
  });

  it("flags a medication concern when adherence drops below the threshold", () => {
    const meds = [medication()];
    const logs: MedicationLogEntry[] = [0, 1].map((d) => ({
      date: toDateKey(addDays(today, -d)),
      medicationId: "m1",
    }));
    const result = computeWeeklyCheckin([], goals, meds, logs, today);
    expect(result.medicationConcern).toBe(true);
    expect(result.hasConcerns).toBe(true);
  });

  it("does not flag a medication concern with good adherence", () => {
    const meds = [medication()];
    const logs: MedicationLogEntry[] = [0, 1, 2, 3, 4, 5, 6].map((d) => ({
      date: toDateKey(addDays(today, -d)),
      medicationId: "m1",
    }));
    const result = computeWeeklyCheckin([], goals, meds, logs, today);
    expect(result.medicationConcern).toBe(false);
  });
});
