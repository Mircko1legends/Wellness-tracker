import { addDays, parseDateKey, toDateKey } from "../utils/date";

export interface WeightEntry {
  date: string;
  kg: number;
}

export function upsertWeight(log: WeightEntry[], date: string, kg: number): WeightEntry[] {
  return [...log.filter((w) => w.date !== date), { date, kg: Math.round(kg * 10) / 10 }].sort((a, b) => a.date.localeCompare(b.date));
}

export interface WeightTrend {
  kgPerWeek: number;
  pctPerWeek: number;
  current: number; // value on the trend line today, smoother than the last weigh-in
  weighIns: number;
}

const WINDOW_DAYS = 28;

/** Linear trend of the last 4 weeks; day-to-day swings of 1–2 kg (water, food) cancel out. */
export function weightTrend(log: WeightEntry[], today: string): WeightTrend | null {
  const from = toDateKey(addDays(parseDateKey(today), -WINDOW_DAYS));
  const points = log.filter((w) => w.date >= from && w.date <= today);
  if (points.length < 3) return null;
  const t0 = parseDateKey(points[0].date).getTime();
  const xs = points.map((p) => (parseDateKey(p.date).getTime() - t0) / 86_400_000);
  if (xs[xs.length - 1] - xs[0] < 10) return null;
  const ys = points.map((p) => p.kg);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  const slope = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / xs.reduce((a, x) => a + (x - mx) ** 2, 0);
  const todayX = (parseDateKey(today).getTime() - t0) / 86_400_000;
  const current = my + slope * (todayX - mx);
  const kgPerWeek = slope * 7;
  return {
    kgPerWeek: Math.round(kgPerWeek * 100) / 100,
    pctPerWeek: Math.round((kgPerWeek / current) * 1000) / 10,
    current: Math.round(current * 10) / 10,
    weighIns: points.length,
  };
}

/**
 * Adjustment rule of the Nutrition system (section 04): weigh once a week, look at the 4-week trend.
 * Less than +0.2 kg a week → +200 kcal; more than +0.5 kg a week → −200 kcal. Growing faster only adds fat.
 */
export function bulkAdvice(trend: WeightTrend | null): string {
  if (!trend) return "Pesati la domenica appena sveglio, dopo il bagno e prima di bere. Dopo 3 pesate (circa 2 settimane) l'app ti dice come sta andando.";
  const k = trend.kgPerWeek;
  if (k < -0.1) return "Stai perdendo peso. Se non è voluto, aggiungi 200 kcal al giorno: 50 g di pasta o riso crudi in più, oppure 30 g di burro d'arachidi.";
  if (k < 0.2) return "Sali meno di 0,2 kg a settimana: aggiungi 200 kcal al giorno (50 g di pasta o riso crudi, oppure 30 g di burro d'arachidi) e ricontrolla tra 2 settimane.";
  if (k <= 0.5) return "Ritmo giusto (tra 0,2 e 0,5 kg a settimana): massa con poco grasso. Continua così.";
  return "Sali più di 0,5 kg a settimana: togli 200 kcal al giorno (50 g di pasta o riso crudi in meno). Crescere più in fretta significa solo crescere più grasso.";
}
