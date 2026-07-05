import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { MISSIONS } from "../data/missions";
import { syncDailyReminder, syncMedicationReminders } from "../notifications";
import {
  addWorkoutLog,
  clearAllData,
  DEFAULT_BODYWEIGHT_KG,
  loadBodyweightKg,
  loadEntries,
  loadGoals,
  loadMedicationLogs,
  loadMedications,
  loadReminderSettings,
  loadWorkoutLogs,
  saveBodyweightKg,
  saveGoals,
  saveMedicationLogs,
  saveMedications,
  saveReminderSettings,
  upsertEntry,
} from "../storage/storage";
import {
  DEFAULT_GOALS,
  DEFAULT_REMINDER_SETTINGS,
  ExerciseSetLog,
  Medication,
  MedicationLogEntry,
  Mission,
  ReminderSettings,
  WellnessEntry,
  WellnessGoals,
  WorkoutLogEntry,
} from "../types";
import { computeMedicationXp, computeTotalXp, LevelInfo, levelInfo, xpForEntry } from "../utils/gamification";
import { computeBestStreak, computeStreak } from "../utils/streak";
import {
  computeTierProgress,
  computeWorkoutXp,
  hasLoggedWorkoutToday,
  setsCompletedOnDate,
  TierProgress,
  xpForWorkout,
} from "../utils/workout";
import { todayKey } from "../utils/date";

function generateId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

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
  bestStreak: number;
  totalXp: number;
  level: LevelInfo;
  unlockedMissions: Mission[];
  lockedMissions: Mission[];
  nextMission: Mission | undefined;
  workoutLogs: WorkoutLogEntry[];
  tierProgress: TierProgress;
  workoutLoggedToday: boolean;
  setsCompletedToday: number;
  bodyweightKg: number;
  updateBodyweightKg: (weightKg: number) => Promise<void>;
  medications: Medication[];
  medicationLogs: MedicationLogEntry[];
  addMedication: (medication: Omit<Medication, "id">) => Promise<void>;
  updateMedication: (medication: Medication) => Promise<void>;
  deleteMedication: (medicationId: string) => Promise<void>;
  isMedicationTakenToday: (medicationId: string) => boolean;
  toggleMedicationTakenToday: (medicationId: string) => Promise<void>;
  logEntry: (entry: WellnessEntry) => Promise<LogEntryResult>;
  logWorkout: (dayId: string, exerciseSets: ExerciseSetLog[]) => Promise<LogWorkoutResult>;
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
  const [medications, setMedications] = useState<Medication[]>([]);
  const [medicationLogs, setMedicationLogs] = useState<MedicationLogEntry[]>([]);

  useEffect(() => {
    (async () => {
      const [
        loadedEntries,
        loadedGoals,
        loadedReminders,
        loadedWorkoutLogs,
        loadedBodyweight,
        loadedMedications,
        loadedMedicationLogs,
      ] = await Promise.all([
        loadEntries(),
        loadGoals(),
        loadReminderSettings(),
        loadWorkoutLogs(),
        loadBodyweightKg(),
        loadMedications(),
        loadMedicationLogs(),
      ]);
      setEntries(loadedEntries);
      setGoals(loadedGoals);
      setReminderSettings(loadedReminders);
      setWorkoutLogs(loadedWorkoutLogs);
      setBodyweightKg(loadedBodyweight);
      setMedications(loadedMedications);
      setMedicationLogs(loadedMedicationLogs);
      setLoading(false);
      syncDailyReminder(loadedReminders).catch(() => {});
      syncMedicationReminders(loadedMedications).catch(() => {});
    })();
  }, []);

  const logEntry = async (entry: WellnessEntry): Promise<LogEntryResult> => {
    const prevLevel = levelInfo(computeTotalXp(entries, goals, workoutLogs)).level;
    const updated = await upsertEntry(entry);
    setEntries(updated);

    const newLevelValue = levelInfo(computeTotalXp(updated, goals, workoutLogs)).level;
    const leveledUp = newLevelValue > prevLevel;
    const newlyUnlocked = leveledUp
      ? MISSIONS.filter((m) => m.unlockLevel > prevLevel && m.unlockLevel <= newLevelValue)
      : [];

    return {
      xpEarned: xpForEntry(entry, goals, setsCompletedOnDate(workoutLogs, entry.date)),
      leveledUp,
      newLevel: newLevelValue,
      newlyUnlocked,
    };
  };

  const logWorkout = async (dayId: string, exerciseSets: ExerciseSetLog[]): Promise<LogWorkoutResult> => {
    const currentTier = computeTierProgress(workoutLogs).tier;
    const prevTotalXp = computeTotalXp(entries, goals, workoutLogs) + computeWorkoutXp(workoutLogs);
    const prevLevel = levelInfo(prevTotalXp).level;

    const updatedLogs = await addWorkoutLog({ date: todayKey(), tier: currentTier, dayId, exerciseSets });
    setWorkoutLogs(updatedLogs);

    const newTotalXp = computeTotalXp(entries, goals, updatedLogs) + computeWorkoutXp(updatedLogs);
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

  const addMedication = async (medication: Omit<Medication, "id">) => {
    const updated = [...medications, { ...medication, id: generateId() }];
    await saveMedications(updated);
    setMedications(updated);
    await syncMedicationReminders(updated).catch(() => {});
  };

  const updateMedication = async (medication: Medication) => {
    const updated = medications.map((m) => (m.id === medication.id ? medication : m));
    await saveMedications(updated);
    setMedications(updated);
    await syncMedicationReminders(updated).catch(() => {});
  };

  const deleteMedication = async (medicationId: string) => {
    const updated = medications.filter((m) => m.id !== medicationId);
    await saveMedications(updated);
    setMedications(updated);
    await syncMedicationReminders(updated).catch(() => {});
  };

  const isMedicationTakenToday = (medicationId: string) =>
    medicationLogs.some((log) => log.medicationId === medicationId && log.date === todayKey());

  const toggleMedicationTakenToday = async (medicationId: string) => {
    const today = todayKey();
    const alreadyTaken = isMedicationTakenToday(medicationId);
    const updated = alreadyTaken
      ? medicationLogs.filter((log) => !(log.medicationId === medicationId && log.date === today))
      : [...medicationLogs, { date: today, medicationId }];
    await saveMedicationLogs(updated);
    setMedicationLogs(updated);
  };

  const updateGoals = async (newGoals: WellnessGoals) => {
    await saveGoals(newGoals);
    setGoals(newGoals);
  };

  const updateReminderSettings = async (settings: ReminderSettings) => {
    await saveReminderSettings(settings);
    setReminderSettings(settings);
    await syncDailyReminder(settings).catch(() => {});
  };

  const resetAllData = async () => {
    await clearAllData();
    setEntries([]);
    setGoals(DEFAULT_GOALS);
    setReminderSettings(DEFAULT_REMINDER_SETTINGS);
    setWorkoutLogs([]);
    setBodyweightKg(DEFAULT_BODYWEIGHT_KG);
    setMedications([]);
    setMedicationLogs([]);
    await syncDailyReminder(DEFAULT_REMINDER_SETTINGS).catch(() => {});
    await syncMedicationReminders([]).catch(() => {});
  };

  const getEntryForDate = (date: string) => entries.find((e) => e.date === date);

  const streak = useMemo(
    () => computeStreak(entries, goals, workoutLogs),
    [entries, goals, workoutLogs]
  );
  const bestStreak = useMemo(
    () => computeBestStreak(entries, goals, workoutLogs),
    [entries, goals, workoutLogs]
  );
  const habitXp = useMemo(
    () => computeTotalXp(entries, goals, workoutLogs),
    [entries, goals, workoutLogs]
  );
  const workoutXp = useMemo(() => computeWorkoutXp(workoutLogs), [workoutLogs]);
  const medicationXp = useMemo(() => computeMedicationXp(medicationLogs), [medicationLogs]);
  const totalXp = habitXp + workoutXp + medicationXp;
  const level = useMemo(() => levelInfo(totalXp), [totalXp]);
  const tierProgress = useMemo(() => computeTierProgress(workoutLogs), [workoutLogs]);
  const workoutLoggedToday = useMemo(
    () => hasLoggedWorkoutToday(workoutLogs, todayKey()),
    [workoutLogs]
  );
  const setsCompletedToday = useMemo(
    () => setsCompletedOnDate(workoutLogs, todayKey()),
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
    bestStreak,
    totalXp,
    level,
    unlockedMissions,
    lockedMissions,
    nextMission,
    workoutLogs,
    tierProgress,
    workoutLoggedToday,
    setsCompletedToday,
    bodyweightKg,
    updateBodyweightKg,
    medications,
    medicationLogs,
    addMedication,
    updateMedication,
    deleteMedication,
    isMedicationTakenToday,
    toggleMedicationTakenToday,
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
