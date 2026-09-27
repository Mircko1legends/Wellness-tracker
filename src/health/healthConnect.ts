import { getSdkStatus, initialize, readRecords, requestPermission, SdkAvailabilityStatus, openHealthConnectSettings } from "react-native-health-connect";
import { bodyFatByDay, buildHealthDaily, HealthDaily, minutesByDay, sleepByNight, stepsByDay, weightsFromRecords } from "./healthData";
import type { WeightEntry } from "../nutrition/weight";

export const isHealthConnectPlatform = true;

const RECORDS = ["Weight", "BodyFat", "SleepSession", "ExerciseSession", "Steps"] as const;

export type HealthStatus = "available" | "needs-update" | "unavailable";

export async function healthStatus(): Promise<HealthStatus> {
  try {
    const status = await getSdkStatus();
    if (status === SdkAvailabilityStatus.SDK_AVAILABLE) return "available";
    if (status === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) return "needs-update";
    return "unavailable";
  } catch {
    return "unavailable";
  }
}

/** Opens the Health Connect permission screen; returns which data types you allowed. */
export async function connectHealth(): Promise<string[]> {
  await initialize();
  const granted = await requestPermission(RECORDS.map((recordType) => ({ accessType: "read" as const, recordType })));
  return granted.map((p) => ("recordType" in p ? String(p.recordType) : "")).filter(Boolean);
}

export function openHealthSettings() {
  openHealthConnectSettings();
}

async function readAll<T>(type: (typeof RECORDS)[number], from: Date, to: Date): Promise<T[]> {
  const out: T[] = [];
  let pageToken: string | undefined;
  for (let i = 0; i < 10; i++) {
    const res: any = await readRecords(type as any, {
      timeRangeFilter: { operator: "between", startTime: from.toISOString(), endTime: to.toISOString() },
      pageSize: 1000,
      ...(pageToken ? { pageToken } : {}),
    });
    out.push(...(res.records as T[]));
    pageToken = res.pageToken;
    if (!pageToken) break;
  }
  return out;
}

export interface HealthSyncResult {
  weights: WeightEntry[];
  daily: HealthDaily;
}

/** Reads the last `days` days from Health Connect (only the types you allowed; the others are skipped). */
export async function readHealth(days = 60): Promise<HealthSyncResult> {
  await initialize();
  const to = new Date();
  const from = new Date(to.getTime() - days * 86_400_000);
  const safe = async <T,>(type: (typeof RECORDS)[number]) => readAll<T>(type, from, to).catch(() => [] as T[]);
  const [weights, fat, sleep, exercise, steps] = await Promise.all([
    safe<any>("Weight"),
    safe<any>("BodyFat"),
    safe<any>("SleepSession"),
    safe<any>("ExerciseSession"),
    safe<any>("Steps"),
  ]);
  return {
    weights: weightsFromRecords(weights),
    daily: buildHealthDaily({ sleep: sleepByNight(sleep), steps: stepsByDay(steps), exercise: minutesByDay(exercise), bodyFat: bodyFatByDay(fat) }),
  };
}
