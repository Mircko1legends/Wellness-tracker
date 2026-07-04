export type MoodScore = 1 | 2 | 3 | 4 | 5;

export interface WellnessEntry {
  date: string; // YYYY-MM-DD, one entry per day
  mood: MoodScore;
  sleepHours: number;
  waterGlasses: number;
  activityMinutes: number;
  notes?: string;
}

export interface WellnessGoals {
  sleepHours: number;
  waterGlasses: number;
  activityMinutes: number;
  moodMin: MoodScore;
}

export interface ReminderSettings {
  enabled: boolean;
  hour: number; // 0-23
  minute: number; // 0-59
}

export const DEFAULT_GOALS: WellnessGoals = {
  sleepHours: 8,
  waterGlasses: 8,
  activityMinutes: 30,
  moodMin: 3,
};

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  enabled: false,
  hour: 20,
  minute: 0,
};
