/** Rest between sets when an ExercisePrescription doesn't specify its own restSeconds. */
export const DEFAULT_REST_SECONDS = 60;

export interface ParsedPrescription {
  /** True for isometric holds prescribed in seconds (e.g. "30s", "20s per lato"). */
  isTimeBased: boolean;
  /** True for "AMRAP" (as many reps as possible): no fixed target to prefill. */
  isAmrap: boolean;
  /** True when the prescription is per limb/side (e.g. "8 per gamba"), logged one side at a time. */
  perSide: boolean;
  /** The leading number, e.g. 12 for "12", 30 for "30s", 8 for "8 per gamba". 0 for AMRAP. */
  target: number;
}

/** Parses the free-form `reps` string used across the workout program (e.g. "12", "30s", "8 per gamba", "AMRAP"). */
export function parsePrescription(reps: string): ParsedPrescription {
  const trimmed = reps.trim();
  if (/^amrap$/i.test(trimmed)) {
    return { isTimeBased: false, isAmrap: true, perSide: false, target: 0 };
  }
  const firstToken = trimmed.split(/\s+/)[0] ?? "";
  const isTimeBased = /^\d+s$/i.test(firstToken);
  const match = trimmed.match(/^(\d+)/);
  const target = match ? parseInt(match[1], 10) : 0;
  const perSide = /per\s+(gamba|lato|braccio)/i.test(trimmed);
  return { isTimeBased, isAmrap: false, perSide, target };
}
