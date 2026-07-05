import { Medication, MedicationLogEntry, WellnessEntry, WellnessGoals } from "../types";
import { addDays, lastNDateKeys } from "./date";
import { computeMedicationAdherence } from "./medicationAdherence";

// Thresholds are intentionally lenient: this is a gentle nudge, not a
// clinical alarm, so it should only speak up when a pattern is clearly
// worth a conversation with your care team, not for ordinary day-to-day noise.
const SLEEP_STDDEV_THRESHOLD_HOURS = 1.5;
const MOOD_LOW_DAYS_THRESHOLD = 3;
const MOOD_TREND_DROP_THRESHOLD = 1;
const MEDICATION_ADHERENCE_CONCERN_THRESHOLD = 0.8;

export interface WeeklyCheckin {
  sleepStdDevHours: number | null;
  sleepIrregular: boolean;
  moodLowDaysCount: number;
  moodTrendDown: boolean;
  moodConcern: boolean;
  medicationAdherenceRate: number | null;
  medicationConcern: boolean;
  hasConcerns: boolean;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((acc, v) => acc + v, 0) / values.length;
}

function standardDeviation(values: number[]): number {
  const avg = average(values) ?? 0;
  const variance = values.reduce((acc, v) => acc + (v - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function computeWeeklyCheckin(
  entries: WellnessEntry[],
  goals: WellnessGoals,
  medications: Medication[],
  medicationLogs: MedicationLogEntry[],
  today: Date = new Date()
): WeeklyCheckin {
  const currentWeekKeys = new Set(lastNDateKeys(7, today));
  const previousWeekKeys = new Set(lastNDateKeys(7, addDays(today, -7)));

  const currentEntries = entries.filter((e) => currentWeekKeys.has(e.date));
  const previousEntries = entries.filter((e) => previousWeekKeys.has(e.date));

  const sleepStdDevHours =
    currentEntries.length >= 3 ? standardDeviation(currentEntries.map((e) => e.sleepHours)) : null;
  const sleepIrregular = sleepStdDevHours !== null && sleepStdDevHours > SLEEP_STDDEV_THRESHOLD_HOURS;

  const moodLowDaysCount = currentEntries.filter((e) => e.mood < goals.moodMin).length;

  const currentMoodAvg = average(currentEntries.map((e) => e.mood));
  const previousMoodAvg = average(previousEntries.map((e) => e.mood));
  const moodTrendDown =
    currentMoodAvg !== null &&
    previousMoodAvg !== null &&
    previousMoodAvg - currentMoodAvg >= MOOD_TREND_DROP_THRESHOLD;

  const adherence = computeMedicationAdherence(medications, medicationLogs, 7, today);
  const medicationConcern =
    adherence.rate !== null && adherence.rate < MEDICATION_ADHERENCE_CONCERN_THRESHOLD;

  const moodConcern = moodLowDaysCount >= MOOD_LOW_DAYS_THRESHOLD || moodTrendDown;
  const hasConcerns = sleepIrregular || moodConcern || medicationConcern;

  return {
    sleepStdDevHours,
    sleepIrregular,
    moodLowDaysCount,
    moodTrendDown,
    moodConcern,
    medicationAdherenceRate: adherence.rate,
    medicationConcern,
    hasConcerns,
  };
}
