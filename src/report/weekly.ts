import { goalProgress, LifeGoal, nextMilestone } from "../goals/goals";
import { bestKg, GymSession, PROGRAMS } from "../gym/gym";
import { MealEntry, reliability, totals } from "../nutrition/meals";
import { WeightEntry, weightTrend } from "../nutrition/weight";
import { dayTimeline, PlanActivity, PlanStep, stepStatus, TimelineDayLog, TimelinePlan } from "../timeline/plan";
import { WellnessEntry } from "../types";
import { addDays, parseDateKey, toDateKey } from "../utils/date";
import { formatMood } from "../utils/mood";
import { glassesOn, targetGlasses, WaterDay, WaterSettings } from "../water/water";
import { isoWeekLabel, isoWeekNumber } from "../utils/weeklyTable";

export type AreaId = "routine" | "dieta" | "allenamento" | "skincare" | "studio";

export const AREA_LABELS: Record<AreaId, string> = {
  routine: "Routine",
  dieta: "Dieta",
  allenamento: "Allenamento",
  skincare: "Skincare",
  studio: "Studio e inglese",
};

const SKINCARE = /skincare|detergente|crema|spf|protezione solare|siero|idratante/i;
const MEAL = /colazione|pranzo|cena|spuntino|merenda|snack|pasto|cucina|spesa/i;
const TRAINING = /pesi|muay|palestra|mma|allenamento|boxe/i;
const STUDY = /studio|inglese|english|compiti|ripasso|maturit|sant'?anna|pomodoro|scuola/i;

export function areaOf(activity: PlanActivity, step: PlanStep): AreaId {
  if (SKINCARE.test(step.label)) return "skincare";
  if (activity.kind === "meal" || MEAL.test(activity.title)) return "dieta";
  if (TRAINING.test(activity.title)) return "allenamento";
  if (STUDY.test(activity.title)) return "studio";
  return "routine";
}

export interface AreaStats {
  done: number;
  skipped: number;
  total: number;
}

export interface WeekReport {
  week: string; // "2026-W40"
  from: string;
  to: string; // last day counted (today at most)
  areas: Record<AreaId, AreaStats>;
  mostSkipped: { title: string; skipped: number }[];
  water: { daysOnTarget: number; days: number; avgGlasses: number | null; target: number };
  mood: { values: { date: string; mood: number }[]; average: number | null; stableDays: number };
  gym: { sessions: number; best: { name: string; kg: number }[] };
  lastProgressPhoto: string | null;
  weight: { weighIns: number; kgPerWeek: number | null; pctPerWeek: number | null };
  meals: { days: number; avgKcal: number | null; avgProtein: number | null; logged: number; reliable: number };
  goals: { title: string; percent: number; next: string | null }[];
}

export interface WeekReportInput {
  plan: TimelinePlan;
  timelineLog: TimelineDayLog[];
  water: WaterDay[];
  waterSettings: WaterSettings;
  entries: WellnessEntry[];
  moodRange: number;
  gymLog: GymSession[];
  goals: LifeGoal[];
  mealLog?: MealEntry[];
  weightLog?: WeightEntry[];
  progressPhotos?: { date: string; kind: string }[];
}

/** Monday of the ISO week containing `date`, up to `date` itself. */
export function weekDays(date: string): string[] {
  const d = parseDateKey(date);
  const monday = addDays(d, -((d.getDay() + 6) % 7));
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const key = toDateKey(addDays(monday, i));
    if (key > date) break;
    days.push(key);
  }
  return days;
}

export function computeWeekReport(input: WeekReportInput, today: string): WeekReport {
  const days = weekDays(today);
  const empty = (): AreaStats => ({ done: 0, skipped: 0, total: 0 });
  const areas: Record<AreaId, AreaStats> = { routine: empty(), dieta: empty(), allenamento: empty(), skincare: empty(), studio: empty() };
  const skippedByTitle = new Map<string, number>();

  for (const date of days) {
    const timeline = dayTimeline(input.plan, parseDateKey(date).getDay(), isoWeekNumber(date));
    for (const activity of timeline) {
      for (const step of activity.steps) {
        const area = areas[areaOf(activity, step)];
        const status = stepStatus(input.timelineLog, date, step.id);
        area.total++;
        if (status === "done") area.done++;
        if (status === "skipped") {
          area.skipped++;
          const title = activity.group ?? activity.title;
          skippedByTitle.set(title, (skippedByTitle.get(title) ?? 0) + 1);
        }
      }
    }
  }

  const target = targetGlasses(input.waterSettings);
  const glasses = days.map((d) => glassesOn(input.water, d)).filter((g) => g > 0);
  const moodValues = input.entries
    .filter((e) => days.includes(e.date))
    .map((e) => ({ date: e.date, mood: e.mood }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const weekSessions = input.gymLog.filter((s) => days.includes(s.date));
  const exercises = [...PROGRAMS.A, ...PROGRAMS.B];
  const weekMeals = (input.mealLog ?? []).filter((m) => days.includes(m.date));
  const mealDays = [...new Set(weekMeals.map((m) => m.date))];
  const perDay = mealDays.map((d) => totals(weekMeals.filter((m) => m.date === d).flatMap((m) => m.items)));
  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

  return {
    week: isoWeekLabel(today),
    from: days[0],
    to: days[days.length - 1],
    areas,
    mostSkipped: [...skippedByTitle.entries()]
      .map(([title, skipped]) => ({ title, skipped }))
      .sort((a, b) => b.skipped - a.skipped)
      .slice(0, 3),
    water: {
      daysOnTarget: glasses.filter((g) => g >= target).length,
      days: days.length,
      avgGlasses: glasses.length ? Math.round((glasses.reduce((a, b) => a + b, 0) / glasses.length) * 10) / 10 : null,
      target,
    },
    mood: {
      values: moodValues,
      average: moodValues.length ? Math.round((moodValues.reduce((a, b) => a + b.mood, 0) / moodValues.length) * 10) / 10 : null,
      stableDays: moodValues.filter((m) => Math.abs(m.mood) <= input.moodRange).length,
    },
    gym: {
      sessions: weekSessions.length,
      best: exercises
        .map((ex) => ({ name: ex.name.replace(/ \(.*\)$/, ""), kg: bestKg(weekSessions, ex.id) }))
        .filter((x): x is { name: string; kg: number } => x.kg !== null),
    },
    lastProgressPhoto: (input.progressPhotos ?? []).map((p) => p.date).sort().pop() ?? null,
    weight: (() => {
      const t = weightTrend(input.weightLog ?? [], today);
      return {
        weighIns: (input.weightLog ?? []).filter((w) => days.includes(w.date)).length,
        kgPerWeek: t?.kgPerWeek ?? null,
        pctPerWeek: t?.pctPerWeek ?? null,
      };
    })(),
    meals: {
      days: mealDays.length,
      avgKcal: avg(perDay.map((t) => t.kcal)),
      avgProtein: avg(perDay.map((t) => t.protein)),
      logged: weekMeals.length,
      reliable: weekMeals.filter((m) => reliability(m.items) === "affidabile").length,
    },
    goals: [...input.goals]
      .sort((a, b) => a.priority - b.priority)
      .map((g) => ({ title: g.title, percent: goalProgress(g).percent, next: nextMilestone(g)?.title ?? null })),
  };
}

export function percent(stats: AreaStats): number | null {
  return stats.total ? Math.round((stats.done / stats.total) * 100) : null;
}

/** Plain text to paste into the Sunday brainstorm chat. */
export function reportText(r: WeekReport): string {
  const lines = [`Resoconto settimana ${r.week} (${r.from} → ${r.to})`, ""];
  lines.push("Micro-azioni fatte:");
  for (const id of Object.keys(AREA_LABELS) as AreaId[]) {
    const s = r.areas[id];
    if (!s.total) continue;
    lines.push(`- ${AREA_LABELS[id]}: ${s.done}/${s.total} (${percent(s)}%), saltate ${s.skipped}, non segnate ${s.total - s.done - s.skipped}`);
  }
  if (r.mostSkipped.length) lines.push(`Più saltate: ${r.mostSkipped.map((m) => `${m.title} (${m.skipped})`).join(", ")}`);
  lines.push("");
  lines.push(
    r.water.avgGlasses === null
      ? "Acqua: non registrata"
      : `Acqua: media ${r.water.avgGlasses} bicchieri/giorno, obiettivo (${r.water.target}) raggiunto ${r.water.daysOnTarget}/${r.water.days} giorni`
  );
  lines.push(
    r.mood.values.length
      ? `Umore: ${r.mood.values.map((m) => formatMood(m.mood)).join(" ")} · media ${r.mood.average} · ${r.mood.stableDays}/${r.mood.values.length} giorni nella zona stabile`
      : "Umore: non registrato"
  );
  lines.push(
    `Palestra: ${r.gym.sessions} sessioni${r.gym.best.length ? ` · ${r.gym.best.map((b) => `${b.name} ${String(b.kg).replace(".", ",")} kg`).join(", ")}` : ""}`
  );
  lines.push(
    r.meals.days
      ? `Pasti registrati: ${r.meals.logged} in ${r.meals.days} giorni · media ${r.meals.avgKcal} kcal e ${r.meals.avgProtein} g proteine nei giorni registrati · pesati/affidabili ${r.meals.reliable}/${r.meals.logged}`
      : "Pasti: non registrati"
  );
  lines.push(
    r.weight.kgPerWeek === null
      ? `Peso: ${r.weight.weighIns} pesate questa settimana (tendenza non ancora calcolabile)`
      : `Peso: tendenza ${r.weight.kgPerWeek >= 0 ? "+" : ""}${r.weight.kgPerWeek} kg/settimana (${r.weight.pctPerWeek}%), ${r.weight.weighIns} pesate questa settimana`
  );
  if (r.lastProgressPhoto) lines.push(`Ultima foto progressi: ${r.lastProgressPhoto}`);
  if (r.goals.length) {
    lines.push("");
    lines.push("Obiettivi:");
    for (const g of r.goals) lines.push(`- ${g.title}: ${g.percent}%${g.next ? ` · prossima tappa: ${g.next}` : ""}`);
  }
  lines.push("");
  lines.push("Cosa mi è pesato: ");
  lines.push("Cosa mi è mancato: ");
  return lines.join("\n");
}

export const BRAINSTORM_START = "2026-10-04";

/** The next Sunday evenings for the brainstorm reminder, never before the agreed first one. */
export function brainstormDates(today: string, count = 8): string[] {
  const start = today > BRAINSTORM_START ? today : BRAINSTORM_START;
  const d = parseDateKey(start);
  const firstSunday = addDays(d, (7 - d.getDay()) % 7);
  return Array.from({ length: count }, (_, i) => toDateKey(addDays(firstSunday, i * 7)));
}
