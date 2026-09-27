import React, { createContext, useContext, useEffect, useState } from "react";
import { syncDailyReminder, syncMedicationReminders } from "../notifications";
import {
  clearAllData,
  DEFAULT_BODYWEIGHT_KG,
  loadBodyweightKg,
  loadEntries,
  loadGoals,
  loadMedicationLogs,
  loadMedications,
  loadReminderSettings,
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
  Medication,
  MedicationLogEntry,
  ReminderSettings,
  WellnessEntry,
  WellnessGoals,
} from "../types";
import { todayKey } from "../utils/date";

function generateId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}


interface WellnessContextValue {
  loading: boolean;
  entries: WellnessEntry[];
  goals: WellnessGoals;
  reminderSettings: ReminderSettings;
  bodyweightKg: number;
  updateBodyweightKg: (weightKg: number) => Promise<void>;
  medications: Medication[];
  medicationLogs: MedicationLogEntry[];
  addMedication: (medication: Omit<Medication, "id">) => Promise<void>;
  updateMedication: (medication: Medication) => Promise<void>;
  deleteMedication: (medicationId: string) => Promise<void>;
  isMedicationTakenToday: (medicationId: string) => boolean;
  toggleMedicationTakenToday: (medicationId: string) => Promise<void>;
  logEntry: (entry: WellnessEntry) => Promise<void>;
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
  const [bodyweightKg, setBodyweightKg] = useState<number>(DEFAULT_BODYWEIGHT_KG);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [medicationLogs, setMedicationLogs] = useState<MedicationLogEntry[]>([]);

  useEffect(() => {
    (async () => {
      const [
        loadedEntries,
        loadedGoals,
        loadedReminders,
        loadedBodyweight,
        loadedMedications,
        loadedMedicationLogs,
      ] = await Promise.all([
        loadEntries(),
        loadGoals(),
        loadReminderSettings(),
        loadBodyweightKg(),
        loadMedications(),
        loadMedicationLogs(),
      ]);
      setEntries(loadedEntries);
      setGoals(loadedGoals);
      setReminderSettings(loadedReminders);
      setBodyweightKg(loadedBodyweight);
      setMedications(loadedMedications);
      setMedicationLogs(loadedMedicationLogs);
      setLoading(false);
      syncDailyReminder(loadedReminders).catch(() => {});
      syncMedicationReminders(loadedMedications).catch(() => {});
    })();
  }, []);

  const logEntry = async (entry: WellnessEntry) => {
    setEntries(await upsertEntry(entry));
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
    setBodyweightKg(DEFAULT_BODYWEIGHT_KG);
    setMedications([]);
    setMedicationLogs([]);
    await syncDailyReminder(DEFAULT_REMINDER_SETTINGS).catch(() => {});
    await syncMedicationReminders([]).catch(() => {});
  };

  const getEntryForDate = (date: string) => entries.find((e) => e.date === date);

  const value: WellnessContextValue = {
    loading,
    entries,
    goals,
    reminderSettings,
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
