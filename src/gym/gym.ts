export type ProgramId = "A" | "B";

export interface GymExercise {
  id: string;
  name: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  /** kg added when every set hits the top of the range (per dumbbell for dumbbell lifts). */
  increment: number;
  startKg: number;
}

export interface GymSet {
  kg: number;
  reps: number;
}

export interface GymSession {
  date: string;
  program: ProgramId;
  exercises: Record<string, GymSet[]>;
  savedAt: number;
}

// Mirrors the "Pesi 45′" steps of the built-in plan (core work stays a simple step in the timeline).
export const PROGRAMS: Record<ProgramId, GymExercise[]> = {
  A: [
    { id: "squat", name: "Squat (o goblet squat)", sets: 3, repsMin: 6, repsMax: 10, increment: 2.5, startKg: 20 },
    { id: "panca-manubri", name: "Panca piana con manubri (kg per manubrio)", sets: 3, repsMin: 8, repsMax: 12, increment: 1, startKg: 10 },
    { id: "rematore", name: "Rematore con manubrio o al cavo", sets: 3, repsMin: 8, repsMax: 12, increment: 1, startKg: 12 },
    { id: "stacco-rumeno", name: "Stacco rumeno", sets: 2, repsMin: 8, repsMax: 10, increment: 2.5, startKg: 20 },
  ],
  B: [
    { id: "pressa", name: "Pressa (o affondi)", sets: 3, repsMin: 8, repsMax: 12, increment: 5, startKg: 40 },
    { id: "military-manubri", name: "Military press con manubri (kg per manubrio)", sets: 3, repsMin: 8, repsMax: 10, increment: 1, startKg: 8 },
    { id: "lat-machine", name: "Lat machine (o trazioni)", sets: 3, repsMin: 6, repsMax: 12, increment: 2.5, startKg: 30 },
    { id: "hip-thrust", name: "Hip thrust (o leg curl)", sets: 2, repsMin: 10, repsMax: 12, increment: 5, startKg: 30 },
  ],
};

/** Which programme today's plan has, from the timeline titles ("Pesi 45′ · Scheda B"). */
export function programFromTitles(titles: string[]): ProgramId | null {
  for (const t of titles) {
    const m = /pesi.*scheda\s+([AB])\b/i.exec(t);
    if (m) return m[1].toUpperCase() as ProgramId;
  }
  return null;
}

export function lastSessionWith(log: GymSession[], exerciseId: string, beforeDate: string): GymSession | null {
  return (
    [...log]
      .filter((s) => s.date < beforeDate && s.exercises[exerciseId]?.some((set) => set.reps > 0))
      .sort((a, b) => b.date.localeCompare(a.date))[0] ?? null
  );
}

export interface Suggestion {
  kg: number;
  reps: number[]; // target per set
  note: string;
}

const round = (kg: number) => Math.round(kg * 4) / 4;

/**
 * Double progression: stay on a weight and add reps until every set reaches the top of the range,
 * then add weight and start again from the bottom.
 */
export function suggestNext(exercise: GymExercise, previous: GymSet[] | undefined): Suggestion {
  const done = (previous ?? []).filter((s) => s.reps > 0);
  if (!done.length) {
    return {
      kg: exercise.startKg,
      reps: Array(exercise.sets).fill(exercise.repsMin),
      note: "Prima volta: scegli un peso che ti lascia 2–3 ripetizioni di riserva. Il peso proposto è solo un punto di partenza.",
    };
  }
  const kg = Math.max(...done.map((s) => s.kg));
  const atKg = done.filter((s) => s.kg === kg);
  const allTop = atKg.length >= exercise.sets && atKg.every((s) => s.reps >= exercise.repsMax);
  if (allTop) {
    return {
      kg: round(kg + exercise.increment),
      reps: Array(exercise.sets).fill(exercise.repsMin),
      note: `Hai chiuso tutte le serie a ${exercise.repsMax}: sali di ${fmtKg(exercise.increment)} kg e riparti da ${exercise.repsMin}.`,
    };
  }
  const reps = Array.from({ length: exercise.sets }, (_, i) =>
    Math.min(exercise.repsMax, Math.max(exercise.repsMin, (atKg[i]?.reps ?? exercise.repsMin) + 1))
  );
  return { kg, reps, note: "Stesso peso: prova ad aggiungere una ripetizione dove riesci. Anche una sola conta." };
}

export function sessionVolume(session: GymSession): number {
  return Object.values(session.exercises).reduce((sum, sets) => sum + sets.reduce((s, set) => s + set.kg * set.reps, 0), 0);
}

export function upsertSession(log: GymSession[], session: GymSession): GymSession[] {
  return [...log.filter((s) => !(s.date === session.date && s.program === session.program)), session].sort((a, b) =>
    a.date.localeCompare(b.date)
  );
}

/** Heaviest weight used on an exercise in a set of sessions, for "progress since" lines. */
export function bestKg(log: GymSession[], exerciseId: string): number | null {
  const kgs = log.flatMap((s) => (s.exercises[exerciseId] ?? []).filter((x) => x.reps > 0).map((x) => x.kg));
  return kgs.length ? Math.max(...kgs) : null;
}

export function formatSets(sets: GymSet[]): string {
  const done = sets.filter((s) => s.reps > 0);
  if (!done.length) return "—";
  const sameKg = done.every((s) => s.kg === done[0].kg);
  return sameKg ? `${fmtKg(done[0].kg)} kg × ${done.map((s) => s.reps).join(", ")}` : done.map((s) => `${fmtKg(s.kg)}×${s.reps}`).join(", ");
}

export function fmtKg(kg: number): string {
  return String(kg).replace(".", ",");
}
