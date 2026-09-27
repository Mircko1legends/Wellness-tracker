import { formatHm, parseHm } from "../import/time";

/**
 * Water is counted in the 0.5 L bottles actually used, and only when one is finished.
 * Reminders ask for a few sips often, so the daily amount is spread and never drunk in big gulps.
 */
export interface WaterSettings {
  enabled: boolean;
  start: string; // first reminder
  end: string; // no reminders at or after this time
  intervalMin: number;
  bottleMl: number;
  targetBottles: number;
}

export interface WaterDay {
  date: string;
  bottles: number;
}

export const DEFAULT_WATER_SETTINGS: WaterSettings = {
  enabled: true,
  start: "06:30",
  end: "21:30",
  // 10 bottles over 06:30–21:30 = 5 L in 15 h: every 30' is about a third of a bottle, a few sips.
  intervalMin: 30,
  bottleMl: 500,
  targetBottles: 10,
};

export function reminderTimes(settings: Pick<WaterSettings, "start" | "end" | "intervalMin">): string[] {
  const start = parseHm(settings.start);
  const end = parseHm(settings.end);
  if (start === null || end === null || settings.intervalMin < 15) return [];
  const span = end > start ? end - start : end + 24 * 60 - start;
  const times: string[] = [];
  for (let t = 0; t < span; t += settings.intervalMin) times.push(formatHm(start + t));
  return times;
}

export function targetBottles(settings: WaterSettings): number {
  return settings.targetBottles;
}

export function bottlesOn(log: WaterDay[], date: string): number {
  return log.find((d) => d.date === date)?.bottles ?? 0;
}

export function addBottles(log: WaterDay[], date: string, delta: number): WaterDay[] {
  const bottles = Math.max(0, bottlesOn(log, date) + delta);
  return [...log.filter((d) => d.date !== date), { date, bottles }].sort((a, b) => a.date.localeCompare(b.date));
}

export function litersText(bottles: number, bottleMl: number): string {
  return String(Number(((bottles * bottleMl) / 1000).toFixed(2))).replace(".", ",");
}

/** Share of a bottle for each reminder, e.g. "1/3". */
export function sipShare(settings: WaterSettings): string {
  const perReminderMl = (settings.targetBottles * settings.bottleMl) / Math.max(1, reminderTimes(settings).length);
  const ratio = perReminderMl / settings.bottleMl;
  if (ratio <= 0.2) return "1/5";
  if (ratio <= 0.28) return "1/4";
  if (ratio <= 0.4) return "1/3";
  if (ratio <= 0.6) return "metà";
  return "quasi tutta";
}

export function reminderBody(settings: WaterSettings): string {
  return `Qualche sorso adesso: circa ${sipShare(settings)} di bottiglietta. Quando la finisci, segna +1. Obiettivo: ${settings.targetBottles} bottigliette (${litersText(settings.targetBottles, settings.bottleMl)} L).`;
}

/** Old data counted 250 ml glasses: convert once to bottles. */
export function migrateWaterSettings(raw: any): WaterSettings {
  if (raw && typeof raw.bottleMl === "number" && typeof raw.targetBottles === "number") return { ...DEFAULT_WATER_SETTINGS, ...raw };
  return { ...DEFAULT_WATER_SETTINGS, enabled: raw?.enabled ?? true };
}

export function migrateWaterLog(raw: any[]): WaterDay[] {
  return (Array.isArray(raw) ? raw : []).map((d) =>
    typeof d?.bottles === "number" ? d : { date: d.date, bottles: Math.round(((d?.glasses ?? 0) * 250) / 500) }
  );
}
