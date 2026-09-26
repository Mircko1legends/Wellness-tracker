export type MoodBand = "down" | "neutral" | "up";

export interface MoodLevel {
  value: number; // -5 ... +5
  label: string;
  hint: string;
  color: string;
}

/**
 * 5 levels up, 5 down, 1 neutral. "Up" is not "better": the aim is staying near 0.
 * Descriptions are starting points to refine with the psychologist.
 */
export const MOOD_LEVELS: MoodLevel[] = [
  { value: 5, label: "Molto su", hint: "Pensieri velocissimi, quasi non dormo, impulsivo", color: "#FF453A" },
  { value: 4, label: "Su forte", hint: "Energia altissima, poco sonno, fatico a fermarmi", color: "#FF6B3D" },
  { value: 3, label: "Su", hint: "Molto carico, parlo e faccio più del solito", color: "#FF9F43" },
  { value: 2, label: "Un po' su", hint: "Più energia e voglia di fare del solito", color: "#FFC857" },
  { value: 1, label: "Leggermente su", hint: "Di buon umore, attivo", color: "#E3E36A" },
  { value: 0, label: "Neutro", hint: "Stabile, nella mia norma", color: "#3FD97F" },
  { value: -1, label: "Leggermente giù", hint: "Un po' spento", color: "#7FD1E8" },
  { value: -2, label: "Un po' giù", hint: "Poca energia, fatico a iniziare le cose", color: "#5AB0F0" },
  { value: -3, label: "Giù", hint: "Triste, faccio solo il minimo", color: "#4A86E8" },
  { value: -4, label: "Giù forte", hint: "Quasi niente mi interessa, tutto costa fatica", color: "#5B5FD9" },
  { value: -5, label: "Molto giù", hint: "Pensieri molto neri, non riesco a funzionare", color: "#7A4FD0" },
];

export const DEFAULT_MOOD_RANGE = 2;

export function moodLevel(value: number): MoodLevel {
  return MOOD_LEVELS.find((l) => l.value === value) ?? MOOD_LEVELS[5];
}

export function formatMood(value: number): string {
  return value > 0 ? `+${value}` : value < 0 ? `−${Math.abs(value)}` : "0";
}

export function moodBand(value: number): MoodBand {
  return value > 0 ? "up" : value < 0 ? "down" : "neutral";
}

/** Inside the personal stable zone, e.g. -2 ... +2. */
export function isMoodStable(value: number, range: number): boolean {
  return Math.abs(value) <= range;
}

/** Old entries used 1 (worst) ... 5 (best); map them onto the new scale around 0. */
export function migrateLegacyMood(old: number): number {
  return Math.max(-5, Math.min(5, Math.round((old - 3) * 2)));
}

/** Extremes where it's worth reaching out today rather than waiting for the next appointment. */
export function needsSupport(value: number): boolean {
  return Math.abs(value) >= 5;
}
