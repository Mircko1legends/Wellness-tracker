export const DAY_MINUTES = 24 * 60;

export function formatHm(minutes: number): string {
  const m = ((Math.round(minutes) % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

export function parseHm(text: string): number | null {
  const match = text.match(/^(\d{1,2})[:.](\d{2})$/);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  return h <= 24 && m < 60 ? (h * 60 + m) % (DAY_MINUTES + 1) : null;
}

export function roundTo(minutes: number, step = 5): number {
  return Math.round(minutes / step) * step;
}

/** Duration in minutes, handling activities that cross midnight. */
export function durationMinutes(start: string, end: string): number {
  const s = parseHm(start) ?? 0;
  const e = parseHm(end) ?? 0;
  const d = (e - s + DAY_MINUTES) % DAY_MINUTES;
  return d === 0 ? DAY_MINUTES : d;
}
