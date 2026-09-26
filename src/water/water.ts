import { formatHm, parseHm } from "../import/time";

export interface WaterSettings {
  enabled: boolean;
  start: string; // first reminder
  end: string; // no reminders at or after this time
  intervalMin: number;
  glassMl: number;
  targetMl: number;
}

export interface WaterDay {
  date: string;
  glasses: number;
}

export const DEFAULT_WATER_SETTINGS: WaterSettings = {
  enabled: true,
  start: "06:30",
  end: "21:30",
  intervalMin: 60,
  glassMl: 250,
  targetMl: 2750,
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

export function targetGlasses(settings: WaterSettings): number {
  return Math.ceil(settings.targetMl / settings.glassMl);
}

export function glassesOn(log: WaterDay[], date: string): number {
  return log.find((d) => d.date === date)?.glasses ?? 0;
}

export function addGlasses(log: WaterDay[], date: string, delta: number): WaterDay[] {
  const glasses = Math.max(0, glassesOn(log, date) + delta);
  return [...log.filter((d) => d.date !== date), { date, glasses }].sort((a, b) => a.date.localeCompare(b.date));
}

/** A friendly reminder body that reflects how the day is going. */
export function reminderBody(settings: WaterSettings): string {
  const liters = String(Number((settings.targetMl / 1000).toFixed(2))).replace(".", ",");
  return `Un bicchiere d'acqua adesso. Obiettivo di oggi: ${liters} L (${targetGlasses(settings)} bicchieri).`;
}
