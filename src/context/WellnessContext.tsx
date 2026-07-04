import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { MISSIONS } from "../data/missions";
import { syncDailyReminder } from "../notifications";
import {
  clearAllData,
  loadEntries,
  loadGoals,
  loadReminderSettings,
  saveGoals,
  saveReminderSettings,
  upsertEntry,
} from "../storage/storage";
import {
  DEFAULT_GOALS,
  DEFAULT_REMINDER_SETTINGS,
  Mission,
  ReminderSettings,
  WellnessEntry,
  WellnessGoals,
} from "../types";
import { computeTotalXp, LevelInfo, levelInfo, xpForEntry } from "../utils/gamification";
import { computeStreak } from "../utils/streak";

export interface LogEntryResult {
  xpEarned: number;
  leveledUp: boolean;
  newLevel: number;
  newlyUnlocked: Mission[];
}

interface WellnessContextValue {
  loading: boolean;
  entries: WellnessEntry[];
  goals: WellnessGoals;
  reminderSettings: ReminderSettings;
  streak: number;
  totalXp: number;
  level: LevelInfo;
  unlockedMissions: Mission[];
  lockedMissions: Mission[];
  nextMission: Mission | undefined;
  logEntry: (entry: WellnessEntry) => Promise<LogEntryResult>;
  updateGoals: (goals: WellnessGoals) => Promise<void>;
  updateReminderSettings: (settings: ReminderSettings) => Promise<void>;
  resetAllData: () => Promise<void>;
  getEntryForDate: (date: string) => WellnessEntry | undefined;
}

const WellnessContext = createContext<WellnessContextValue | undefined>(undefined);

export function WellnessProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<WellnessEntry[]>([]);
  const [goals, setGoals] = useState<WellnessGoals>(DEFAULT_GOALS);
  const [reminderSettings, setReminderSettings] = useState<ReminderSettings>(
    DEFAULT_REMINDER_SETTINGS
  );

  useEffect(() => {
    (async () => {
      const [loadedEntries, loadedGoals, loadedReminders] = await Promise.all([
        loadEntries(),
        loadGoals(),
        loadReminderSettings(),
      ]);
      setEntries(loadedEntries);
      setGoals(loadedGoals);
      setReminderSettings(loadedReminders);
      setLoading(false);
      syncDailyReminder(loadedReminders).catch(() => {});
    })();
  }, []);

  const logEntry = async (entry: WellnessEntry): Promise<LogEntryResult> => {
    const prevLevel = levelInfo(computeTotalXp(entries, goals)).level;
    const updated = await upsertEntry(entry);
    setEntries(updated);

    const newLevelValue = levelInfo(computeTotalXp(updated, goals)).level;
    const leveledUp = newLevelValue > prevLevel;
    const newlyUnlocked = leveledUp
      ? MISSIONS.filter((m) => m.unlockLevel > prevLevel && m.unlockLevel <= newLevelValue)
      : [];

    return {
      xpEarned: xpForEntry(entry, goals),
      leveledUp,
      newLevel: newLevelValue,
      newlyUnlocked,
    };
  };

  const updateGoals = async (newGoals: WellnessGoals) => {
    await saveGoals(newGoals);
    setGoals(newGoals);
  };

  const updateReminderSettings = async (settings: ReminderSettings) => {
    await saveReminderSettings(settings);
    setReminderSettings(settings);
    await syncDailyReminder(settings);
  };

  const resetAllData = async () => {
    await clearAllData();
    setEntries([]);
    setGoals(DEFAULT_GOALS);
    setReminderSettings(DEFAULT_REMINDER_SETTINGS);
    await syncDailyReminder(DEFAULT_REMINDER_SETTINGS);
  };

  const getEntryForDate = (date: string) => entries.find((e) => e.date === date);

  const streak = useMemo(() => computeStreak(entries, goals), [entries, goals]);
  const totalXp = useMemo(() => computeTotalXp(entries, goals), [entries, goals]);
  const level = useMemo(() => levelInfo(totalXp), [totalXp]);
  const unlockedMissions = useMemo(
    () => MISSIONS.filter((m) => m.unlockLevel <= level.level),
    [level.level]
  );
  const lockedMissions = useMemo(
    () =>
      MISSIONS.filter((m) => m.unlockLevel > level.level).sort(
        (a, b) => a.unlockLevel - b.unlockLevel
      ),
    [level.level]
  );
  const nextMission = lockedMissions[0];

  const value: WellnessContextValue = {
    loading,
    entries,
    goals,
    reminderSettings,
    streak,
    totalXp,
    level,
    unlockedMissions,
    lockedMissions,
    nextMission,
    logEntry,
    updateGoals,
    updateReminderSettings,
    resetAllData,
    getEntryForDate,
  };

  return <WellnessContext.Provider value={value}>{children}</WellnessContext.Provider>;
}

export function useWellness(): WellnessContextValue {
  const ctx = useContext(WellnessContext);
  if (!ctx) throw new Error("useWellness must be used within a WellnessProvider");
  return ctx;
}
