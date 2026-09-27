import type { HealthDaily } from "./healthData";
import type { WeightEntry } from "../nutrition/weight";

/** Health Connect exists only on Android: in the browser everything is a no-op. */
export const isHealthConnectPlatform = false;
export type HealthStatus = "available" | "needs-update" | "unavailable";
export const healthStatus = async (): Promise<HealthStatus> => "unavailable";
export const connectHealth = async (): Promise<string[]> => [];
export const openHealthSettings = () => {};
export interface HealthSyncResult {
  weights: WeightEntry[];
  daily: HealthDaily;
}
export const readHealth = async (): Promise<HealthSyncResult> => ({ weights: [], daily: {} });
