import React, { createContext, useContext, useEffect, useState } from "react";
import { loadWaterLog, loadWaterSettings, saveWaterLog, saveWaterSettings } from "../storage/storage";
import { todayKey } from "../utils/date";
import { syncWaterReminders } from "../water/notifications";
import { addBottles, DEFAULT_WATER_SETTINGS, bottlesOn, WaterDay, WaterSettings } from "../water/water";
import { useWellness } from "./WellnessContext";

interface WaterContextValue {
  settings: WaterSettings;
  todayBottles: number;
  log: WaterDay[];
  add: (delta: number) => Promise<void>;
  updateSettings: (next: WaterSettings) => Promise<void>;
}

const WaterContext = createContext<WaterContextValue | undefined>(undefined);

export function WaterProvider({ children }: { children: React.ReactNode }) {
  const { getEntryForDate, logEntry } = useWellness();
  const [settings, setSettings] = useState<WaterSettings>(DEFAULT_WATER_SETTINGS);
  const [log, setLog] = useState<WaterDay[]>([]);

  useEffect(() => {
    (async () => {
      const [s, l] = await Promise.all([loadWaterSettings(), loadWaterLog()]);
      setSettings(s);
      setLog(l);
      syncWaterReminders(s).catch(() => {});
    })();
  }, []);

  const add = async (delta: number) => {
    const date = todayKey();
    const next = addBottles(log, date, delta);
    setLog(next);
    await saveWaterLog(next);
    // Keep the daily log in sync when it exists, without inventing a mood for a day not logged yet.
    const entry = getEntryForDate(date);
    if (entry) await logEntry({ ...entry, waterBottles: bottlesOn(next, date) });
  };

  const updateSettings = async (next: WaterSettings) => {
    setSettings(next);
    await saveWaterSettings(next);
    syncWaterReminders(next).catch(() => {});
  };

  return (
    <WaterContext.Provider value={{ settings, log, todayBottles: bottlesOn(log, todayKey()), add, updateSettings }}>
      {children}
    </WaterContext.Provider>
  );
}

export function useWater(): WaterContextValue {
  const ctx = useContext(WaterContext);
  if (!ctx) throw new Error("useWater must be used within WaterProvider");
  return ctx;
}
