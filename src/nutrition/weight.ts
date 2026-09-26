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

/** Lean bulk: roughly +0.2–0.6% of body weight per week. Advice in small, reversible steps. */
export function bulkAdvice(trend: WeightTrend | null): string {
  if (!trend) return "Pesati 2–3 volte a settimana, al mattino dopo il bagno e prima di colazione. Dopo 10 giorni l'app ti dice come sta andando.";
  const p = trend.pctPerWeek;
  if (p < -0.1) return "Stai perdendo peso. Se non è voluto, aggiungi circa 200–300 kcal al giorno (per esempio 60 g di avena con 250 ml di latte).";
  if (p < 0.1) return "Il peso è quasi fermo. Per crescere prova ad aggiungere circa 150 kcal al giorno (per esempio 40 g di avena o una banana in più) e ricontrolla tra 2 settimane.";
  if (p < 0.2) return "Sali piano: va bene. Se tra 2 settimane è ancora così, aggiungi circa 100–150 kcal al giorno.";
  if (p <= 0.6) return "Ritmo ideale per mettere massa limitando il grasso. Continua così.";
  return "Sali in fretta: una parte potrebbe essere grasso. Prova a togliere circa 150 kcal al giorno (per esempio meno condimento o uno snack più leggero).";
}
