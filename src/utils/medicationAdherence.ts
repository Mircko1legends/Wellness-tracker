import { Medication, MedicationLogEntry } from "../types";
import { lastNDateKeys } from "./date";

export interface MedicationAdherence {
  takenCount: number;
  expectedCount: number;
  rate: number | null; // 0-1, null when there are no enabled medications to track
}

export function computeMedicationAdherence(
  medications: Medication[],
  medicationLogs: MedicationLogEntry[],
  days: number,
  today: Date = new Date()
): MedicationAdherence {
  const enabled = medications.filter((m) => m.enabled);
  if (enabled.length === 0) {
    return { takenCount: 0, expectedCount: 0, rate: null };
  }

  const dateKeys = new Set(lastNDateKeys(days, today));
  const enabledIds = new Set(enabled.map((m) => m.id));

  const takenCount = medicationLogs.filter(
    (log) => dateKeys.has(log.date) && enabledIds.has(log.medicationId)
  ).length;
  const expectedCount = enabled.length * dateKeys.size;

  return { takenCount, expectedCount, rate: takenCount / expectedCount };
}
