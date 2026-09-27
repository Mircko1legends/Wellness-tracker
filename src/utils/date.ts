export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayKey(): string {
  return toDateKey(new Date());
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function lastNDateKeys(n: number, from: Date = new Date()): string[] {
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    keys.push(toDateKey(addDays(from, -i)));
  }
  return keys;
}

export function formatShortLabel(dateKey: string): string {
  const [, month, day] = dateKey.split("-");
  return `${day}/${month}`;
}

function isoWeek(dateKey: string): { year: number; week: number } {
  const date = parseDateKey(dateKey);
  const thursday = addDays(date, 3 - ((date.getDay() + 6) % 7));
  const yearStart = new Date(thursday.getFullYear(), 0, 1);
  const week = Math.ceil(((thursday.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: thursday.getFullYear(), week };
}

export function isoWeekNumber(dateKey: string): number {
  return isoWeek(dateKey).week;
}

/** ISO-8601 week label, e.g. "2026-W39". */
export function isoWeekLabel(dateKey: string): string {
  const { year, week } = isoWeek(dateKey);
  return `${year}-W${String(week).padStart(2, "0")}`;
}
