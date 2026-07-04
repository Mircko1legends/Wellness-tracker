export type MoodScore = 1 | 2 | 3 | 4 | 5;

export interface WellnessEntry {
  date: string; // YYYY-MM-DD, one entry per day
  mood: MoodScore;
  sleepHours: number;
  waterGlasses: number;
  activityMinutes: number;
  notes?: string;
  bonusMissions?: string[]; // ids of unlocked bonus missions completed this day
}

export type MissionDifficulty = 1 | 2 | 3;

export interface Mission {
  id: string;
  name: string;
  description: string;
  icon: string;
  difficulty: MissionDifficulty;
  xpReward: number;
  unlockLevel: number;
  core: boolean; // core missions map to the 4 base tracked metrics, always unlocked
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
