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
  addWorkoutLog,
  clearAllData,
  DEFAULT_BODYWEIGHT_KG,
  loadBodyweightKg,
  loadEntries,
  loadGoals,
  loadReminderSettings,
  loadWorkoutLogs,
  saveBodyweightKg,
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
  WorkoutLogEntry,
} from "../types";
import { computeTotalXp, LevelInfo, levelInfo, xpForEntry } from "../utils/gamification";
import { computeStreak } from "../utils/streak";
import { computeTierProgress, computeWorkoutXp, hasLoggedWorkoutToday, TierProgress, xpForWorkout } from "../utils/workout";
import { todayKey } from "../utils/date";

export interface LogEntryResult {
  xpEarned: number;
  leveledUp: boolean;
  newLevel: number;
  newlyUnlocked: Mission[];
}

export interface LogWorkoutResult {
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
  workoutLogs: WorkoutLogEntry[];
  tierProgress: TierProgress;
  workoutLoggedToday: boolean;
  bodyweightKg: number;
  updateBodyweightKg: (weightKg: number) => Promise<void>;
  logEntry: (entry: WellnessEntry) => Promise<LogEntryResult>;
  logWorkout: (dayId: string) => Promise<LogWorkoutResult>;
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
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLogEntry[]>([]);
  const [bodyweightKg, setBodyweightKg] = useState<number>(DEFAULT_BODYWEIGHT_KG);

  useEffect(() => {
    (async () => {
      const [loadedEntries, loadedGoals, loadedReminders, loadedWorkoutLogs, loadedBodyweight] =
        await Promise.all([
          loadEntries(),
          loadGoals(),
          loadReminderSettings(),
          loadWorkoutLogs(),
          loadBodyweightKg(),
        ]);
      setEntries(loadedEntries);
      setGoals(loadedGoals);
      setReminderSettings(loadedReminders);
      setWorkoutLogs(loadedWorkoutLogs);
      setBodyweightKg(loadedBodyweight);
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

  const logWorkout = async (dayId: string): Promise<LogWorkoutResult> => {
    const currentTier = computeTierProgress(workoutLogs).tier;
    const prevTotalXp = computeTotalXp(entries, goals) + computeWorkoutXp(workoutLogs);
    const prevLevel = levelInfo(prevTotalXp).level;

    const updatedLogs = await addWorkoutLog({ date: todayKey(), tier: currentTier, dayId });
    setWorkoutLogs(updatedLogs);

    const newTotalXp = computeTotalXp(entries, goals) + computeWorkoutXp(updatedLogs);
    const newLevelValue = levelInfo(newTotalXp).level;
    const leveledUp = newLevelValue > prevLevel;
    const newlyUnlocked = leveledUp
      ? MISSIONS.filter((m) => m.unlockLevel > prevLevel && m.unlockLevel <= newLevelValue)
      : [];

    return {
      xpEarned: xpForWorkout(currentTier),
      leveledUp,
      newLevel: newLevelValue,
      newlyUnlocked,
    };
  };

  const updateBodyweightKg = async (weightKg: number) => {
    await saveBodyweightKg(weightKg);
    setBodyweightKg(weightKg);
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
    setWorkoutLogs([]);
    setBodyweightKg(DEFAULT_BODYWEIGHT_KG);
    await syncDailyReminder(DEFAULT_REMINDER_SETTINGS);
  };

  const getEntryForDate = (date: string) => entries.find((e) => e.date === date);

  const streak = useMemo(() => computeStreak(entries, goals), [entries, goals]);
  const habitXp = useMemo(() => computeTotalXp(entries, goals), [entries, goals]);
  const workoutXp = useMemo(() => computeWorkoutXp(workoutLogs), [workoutLogs]);
  const totalXp = habitXp + workoutXp;
  const level = useMemo(() => levelInfo(totalXp), [totalXp]);
  const tierProgress = useMemo(() => computeTierProgress(workoutLogs), [workoutLogs]);
  const workoutLoggedToday = useMemo(
    () => hasLoggedWorkoutToday(workoutLogs, todayKey()),
    [workoutLogs]
  );
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
    workoutLogs,
    tierProgress,
    workoutLoggedToday,
    bodyweightKg,
    updateBodyweightKg,
    logEntry,
    logWorkout,
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
