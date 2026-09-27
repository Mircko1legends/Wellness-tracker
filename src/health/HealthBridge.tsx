import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { useWellness } from "../context/WellnessContext";
import { loadHealthDaily, loadHealthSync, loadWeightLog, saveHealthDaily, saveHealthSync, saveWeightLog } from "../storage/storage";
import { isHealthConnectPlatform, readHealth } from "./healthConnect";
import { mergeWeights } from "./healthData";

const MIN_INTERVAL_MS = 30 * 60_000;

/** Pulls weight, sleep, training and steps from Health Connect when the app opens (at most every 30 minutes). */
export async function syncHealthNow(updateBodyweightKg?: (kg: number) => Promise<void>): Promise<{ weights: number; days: number } | null> {
  const state = await loadHealthSync();
  if (!isHealthConnectPlatform || !state.connected) return null;
  const { weights, daily } = await readHealth(60);
  const [log, oldDaily] = await Promise.all([loadWeightLog(), loadHealthDaily()]);
  const merged = mergeWeights(log, weights);
  await saveWeightLog(merged);
  await saveHealthDaily({ ...oldDaily, ...daily });
  await saveHealthSync({ ...state, lastSyncAt: Date.now() });
  const latest = merged[merged.length - 1];
  if (latest && updateBodyweightKg) await updateBodyweightKg(latest.kg);
  return { weights: weights.length, days: Object.keys(daily).length };
}

export function HealthBridge() {
  const { updateBodyweightKg, loading } = useWellness();
  const lastRun = useRef(0);
  useEffect(() => {
    if (loading || !isHealthConnectPlatform) return;
    const run = () => {
      if (Date.now() - lastRun.current < MIN_INTERVAL_MS) return;
      lastRun.current = Date.now();
      syncHealthNow(updateBodyweightKg).catch(() => {});
    };
    run();
    const sub = AppState.addEventListener("change", (s) => s === "active" && run());
    return () => sub.remove();
  }, [loading]);
  return null;
}
