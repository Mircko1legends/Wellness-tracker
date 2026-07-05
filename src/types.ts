export type MoodScore = 1 | 2 | 3 | 4 | 5;

export interface WellnessEntry {
  date: string; // YYYY-MM-DD, one entry per day
  mood: MoodScore;
  sleepHours: number;
  waterGlasses: number;
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
  setsGoal: number; // target total workout sets completed per day
  moodMin: MoodScore;
}

export interface ReminderSettings {
  enabled: boolean;
  hour: number; // 0-23
  minute: number; // 0-59
}

export interface Exercise {
  id: string;
  name: string;
  muscle: string;
  instructions: string;
  icon: string;
}

export interface ExercisePrescription {
  exerciseId: string;
  sets: number;
  reps: string; // e.g. "12", "30s", "AMRAP"
}

export interface WorkoutDay {
  id: string;
  name: string;
  focus: string;
  exercises: ExercisePrescription[];
}

export interface WorkoutTier {
  level: number;
  name: string;
  description: string;
  sessionsToUnlockNext: number;
  days: WorkoutDay[];
}

export interface ExerciseSetLog {
  exerciseId: string;
  setsCompleted: number;
}

export interface WorkoutLogEntry {
  date: string; // YYYY-MM-DD
  tier: number;
  dayId: string;
  exerciseSets?: ExerciseSetLog[];
}

export interface Medication {
  id: string;
  name: string;
  dosage?: string;
  hour: number;
  minute: number;
  enabled: boolean;
}

export interface MedicationLogEntry {
  date: string; // YYYY-MM-DD
  medicationId: string;
}

export const DEFAULT_GOALS: WellnessGoals = {
  sleepHours: 8,
  waterGlasses: 8,
  setsGoal: 12,
  moodMin: 3,
};

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  enabled: false,
  hour: 20,
  minute: 0,
};
