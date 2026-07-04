import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DEFAULT_GOALS,
  DEFAULT_REMINDER_SETTINGS,
  ReminderSettings,
  WellnessEntry,
  WellnessGoals,
} from "../types";

const KEYS = {
  entries: "@wellness/entries",
  goals: "@wellness/goals",
  reminders: "@wellness/reminders",
} as const;

export async function loadEntries(): Promise<WellnessEntry[]> {
  const raw = await AsyncStorage.getItem(KEYS.entries);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as WellnessEntry[];
  } catch {
    return [];
  }
}

export async function saveEntries(entries: WellnessEntry[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.entries, JSON.stringify(entries));
}

export async function upsertEntry(entry: WellnessEntry): Promise<WellnessEntry[]> {
  const entries = await loadEntries();
  const index = entries.findIndex((e) => e.date === entry.date);
  if (index >= 0) {
    entries[index] = entry;
  } else {
    entries.push(entry);
  }
  entries.sort((a, b) => a.date.localeCompare(b.date));
  await saveEntries(entries);
  return entries;
}

export async function loadGoals(): Promise<WellnessGoals> {
  const raw = await AsyncStorage.getItem(KEYS.goals);
  if (!raw) return DEFAULT_GOALS;
  try {
    return { ...DEFAULT_GOALS, ...JSON.parse(raw) } as WellnessGoals;
  } catch {
    return DEFAULT_GOALS;
  }
}

export async function saveGoals(goals: WellnessGoals): Promise<void> {
  await AsyncStorage.setItem(KEYS.goals, JSON.stringify(goals));
}

export async function loadReminderSettings(): Promise<ReminderSettings> {
  const raw = await AsyncStorage.getItem(KEYS.reminders);
  if (!raw) return DEFAULT_REMINDER_SETTINGS;
  try {
    return { ...DEFAULT_REMINDER_SETTINGS, ...JSON.parse(raw) } as ReminderSettings;
  } catch {
    return DEFAULT_REMINDER_SETTINGS;
  }
}

export async function saveReminderSettings(settings: ReminderSettings): Promise<void> {
  await AsyncStorage.setItem(KEYS.reminders, JSON.stringify(settings));
}

export async function clearAllData(): Promise<void> {
  await AsyncStorage.multiRemove([KEYS.entries, KEYS.goals, KEYS.reminders]);
}
