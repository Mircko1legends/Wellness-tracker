export type ProgramId = "LB" | "UA" | "LA" | "UB";

export interface GymExercise {
  id: string;
  name: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  /** kg added when every set hits the top of the range: +2.5 upper body, +5 squat, deadlift and leg press (PDF). */
  increment: number;
  /** Starting weight for you now (58.7 kg, back after years off): deliberately light for the first 3 weeks. 0 = body weight. */
  startKg: number;
  /** Rest between sets from the PDF: fundamentals 2–3′, isolation 60–90″ (longer rests = more reps = more growth). */
  restSec: number;
  videoQuery: string;
  note: string;
  /** Left out on Thursday, when MMA comes right after the weights. */
  skipBeforeMma?: boolean;
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

const ex = (e: GymExercise) => e;

// Nutrition & Training System, section 12: 40 sets for the upper body, 40 for the lower body.
export const PROGRAMS: Record<ProgramId, GymExercise[]> = {
  LB: [
    ex({ id: "stacco", name: "Stacco da terra", sets: 4, repsMin: 4, repsMax: 6, increment: 5, startKg: 40, restSec: 180, videoQuery: "stacco da terra tecnica corretta", note: "Tecnica prima del carico, sempre. Filmati di lato ogni tanto." }),
    ex({ id: "pressa", name: "Pressa 45°", sets: 3, repsMin: 8, repsMax: 12, increment: 5, startKg: 60, restSec: 120, videoQuery: "leg press 45 tecnica corretta", note: "Oppure hack squat." }),
    ex({ id: "bulgaro", name: "Squat bulgaro (kg per manubrio)", sets: 3, repsMin: 8, repsMax: 10, increment: 2, startKg: 6, restSec: 90, videoQuery: "squat bulgaro tecnica corretta", note: "Per gamba. Corregge gli squilibri tra le due gambe." }),
    ex({ id: "leg-extension", name: "Leg extension", sets: 3, repsMin: 12, repsMax: 15, increment: 2.5, startKg: 20, restSec: 60, videoQuery: "leg extension tecnica corretta", note: "Pausa di un secondo in alto." }),
    ex({ id: "calf-seduto", name: "Calf raise da seduto", sets: 4, repsMin: 12, repsMax: 15, increment: 2.5, startKg: 20, restSec: 60, videoQuery: "calf raise seduto tecnica", note: "Lavora il soleo." }),
  ],
  UA: [
    ex({ id: "panca", name: "Panca piana con bilanciere", sets: 4, repsMin: 5, repsMax: 8, increment: 2.5, startKg: 30, restSec: 150, videoQuery: "panca piana bilanciere tecnica corretta", note: "Il movimento su cui misuri i progressi della parte alta." }),
    ex({ id: "rematore-bil", name: "Rematore con bilanciere", sets: 4, repsMin: 6, repsMax: 10, increment: 2.5, startKg: 30, restSec: 120, videoQuery: "rematore bilanciere tecnica corretta", note: "Schiena piatta, tira verso l'ombelico." }),
    ex({ id: "military", name: "Military press in piedi", sets: 3, repsMin: 6, repsMax: 10, increment: 2.5, startKg: 20, restSec: 120, videoQuery: "military press in piedi tecnica corretta", note: "Oppure lento avanti con manubri se la spalla tira." }),
    ex({ id: "lat-larga", name: "Lat machine presa larga", sets: 3, repsMin: 8, repsMax: 12, increment: 2.5, startKg: 30, restSec: 90, videoQuery: "lat machine presa larga tecnica corretta", note: "Passa alle trazioni assistite appena ci riesci." }),
    ex({ id: "curl-bil", name: "Curl con bilanciere", sets: 3, repsMin: 8, repsMax: 12, increment: 2.5, startKg: 15, restSec: 75, videoQuery: "curl bilanciere tecnica corretta", note: "Gomiti fermi al fianco." }),
    ex({ id: "pushdown", name: "Push-down ai cavi", sets: 3, repsMin: 10, repsMax: 12, increment: 2.5, startKg: 15, restSec: 75, videoQuery: "push down cavi tricipiti tecnica", note: "Oppure French press con manubrio." }),
  ],
  LA: [
    ex({ id: "squat", name: "Squat con bilanciere", sets: 4, repsMin: 5, repsMax: 8, increment: 5, startKg: 30, restSec: 180, videoQuery: "squat bilanciere tecnica corretta", note: "Il movimento su cui misuri i progressi della parte bassa." }),
    ex({ id: "rdl", name: "Stacco rumeno", sets: 3, repsMin: 8, repsMax: 10, increment: 5, startKg: 30, restSec: 120, videoQuery: "stacco rumeno tecnica corretta", note: "Scendi finché senti tirare dietro la coscia, non oltre." }),
    ex({ id: "affondi", name: "Affondi camminati (kg per manubrio)", sets: 3, repsMin: 10, repsMax: 12, increment: 2, startKg: 6, restSec: 120, videoQuery: "affondi camminati manubri tecnica", note: "Per gamba. Oppure pressa 45° se la palestra è affollata.", skipBeforeMma: true }),
    ex({ id: "leg-curl", name: "Leg curl", sets: 3, repsMin: 10, repsMax: 12, increment: 2.5, startKg: 20, restSec: 90, videoQuery: "leg curl tecnica corretta", note: "Due secondi in discesa." }),
    ex({ id: "calf-piedi", name: "Calf raise in piedi", sets: 4, repsMin: 12, repsMax: 15, increment: 2.5, startKg: 30, restSec: 60, videoQuery: "calf raise in piedi tecnica", note: "Pausa di un secondo in alto e in basso." }),
  ],
  UB: [
    ex({ id: "trazioni", name: "Trazioni alla sbarra (0 = corpo libero)", sets: 4, repsMin: 6, repsMax: 10, increment: 2.5, startKg: 0, restSec: 150, videoQuery: "trazioni alla sbarra tecnica corretta", note: "Assistite o lat machine presa inversa se non arrivi a 6: in quel caso scrivi il peso della lat." }),
    ex({ id: "panca-incl", name: "Panca inclinata con manubri (kg per manubrio)", sets: 4, repsMin: 8, repsMax: 10, increment: 2, startKg: 10, restSec: 120, videoQuery: "panca inclinata manubri tecnica corretta", note: "Inclinazione 30°, non di più." }),
    ex({ id: "rematore-man", name: "Rematore con manubrio, un braccio", sets: 3, repsMin: 10, repsMax: 12, increment: 2, startKg: 12, restSec: 90, videoQuery: "rematore manubrio un braccio tecnica", note: "Appoggio su panca, tira lungo il fianco." }),
    ex({ id: "alzate", name: "Alzate laterali (kg per manubrio)", sets: 3, repsMin: 12, repsMax: 15, increment: 1, startKg: 4, restSec: 60, videoQuery: "alzate laterali tecnica corretta", note: "Leggere: qui serve la sensazione, non il carico." }),
    ex({ id: "dip", name: "Dip alle parallele (0 = corpo libero)", sets: 3, repsMin: 8, repsMax: 12, increment: 2.5, startKg: 0, restSec: 90, videoQuery: "dip parallele tecnica corretta", note: "Oppure panca presa stretta (in quel caso scrivi il peso)." }),
    ex({ id: "hammer", name: "Curl a martello (kg per manubrio)", sets: 3, repsMin: 10, repsMax: 12, increment: 2, startKg: 8, restSec: 60, videoQuery: "curl a martello tecnica", note: "Presa neutra, lavora anche l'avambraccio." }),
  ],
};

export const PROGRAM_NAMES: Record<ProgramId, string> = { LB: "Lower B", UA: "Upper A", LA: "Lower A", UB: "Upper B" };

/** Which programme today's plan has, from the timeline titles ("Pesi 75′ · Upper A"). */
export function programFromTitles(titles: string[]): { program: ProgramId; beforeMma: boolean } | null {
  for (const t of titles) {
    const m = /pesi.*(upper|lower)\s+([AB])/i.exec(t);
    if (m) {
      return { program: `${m[1][0].toUpperCase()}${m[2].toUpperCase()}` as ProgramId, beforeMma: titles.some((x) => x === "MMA") };
    }
  }
  return null;
}

export function isProgramId(v: unknown): v is ProgramId {
  return v === "LB" || v === "UA" || v === "LA" || v === "UB";
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
      note: "Prima volta: il peso proposto è leggero apposta (prime 3 settimane = imparare il movimento). Se le ultime 2 ripetizioni sono facili, alla serie dopo aggiungi un po\u2019. Correggilo solo se serve.",
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

export function formatRest(sec: number): string {
  const m = Math.floor(sec / 60);
  const r = Math.max(0, Math.round(sec % 60));
  return `${m}:${String(r).padStart(2, "0")}`;
}

/** YouTube video id from a watch/short/embed/youtu.be link. */
export function youtubeId(url: string): string | null {
  const m = /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/.exec(url);
  return m ? m[1] : null;
}

export function youtubeSearchUrl(query: string): string {
  return `https://m.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

/** Official embeddable player in privacy-enhanced mode. */
export function youtubeEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?playsinline=1&rel=0`;
}
