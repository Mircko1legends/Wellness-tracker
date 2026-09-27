import { formatSets, GymSession, PROGRAMS } from "../gym/gym";
import { reliability, totals } from "../nutrition/meals";
import { bottlesFor, dayGoals, missionsFor, ProgressData, progressDataFromSnapshot, timelineFor, toHalfHours, trainingMinutes } from "../progress/lifeProgress";
import { scalePlanForWeight } from "../timeline/scaling";
import { addDays, isoWeekLabel, parseDateKey, toDateKey } from "../utils/date";
import { formatMood, moodLevel } from "../utils/mood";

/** A whole week, day by day and action by action: the file the daily videos are made from. */
export interface WeekExport {
  app: "wellness-tracker-week";
  version: 1;
  week: string;
  from: string;
  to: string;
  generatedAt: string;
  days: DayExport[];
}

export type ActionStatus = "done" | "skipped" | "none";

export interface DayExport {
  date: string;
  label: string; // "lunedì 5 ottobre"
  activities: { start: string; end: string; title: string; steps: { time: string; label: string; status: ActionStatus }[] }[];
  summary: { done: number; skipped: number; notMarked: number; total: number };
  checks: { label: string; ok: boolean; detail: string }[];
  gym: { exercise: string; sets: string }[];
  meals: { title: string; time: string; detail: string }[];
  missions: { name: string; done: boolean }[];
  wished: string[];
  unwanted: string[];
  notes: string;
}

const lines = (text?: string) =>
  (text ?? "")
    .split(/\n+/)
    .map((l) => l.replace(/^[-•*\s]+/, "").trim())
    .filter(Boolean);

const num = (n: number) => String(n).replace(".", ",");

function exerciseName(id: string): string {
  for (const list of Object.values(PROGRAMS)) {
    const e = list.find((x) => x.id === id);
    if (e) return e.name.replace(/ \(.*\)$/, "");
  }
  return id;
}

export function buildDayExport(data: ProgressData, date: string, medicationNames: string[], weightKg: number | null): DayExport {
  const plan = scalePlanForWeight(data.plan, weightKg);
  const log = data.timelineLog.find((d) => d.date === date);
  const status = (id: string): ActionStatus => (log?.doneIds.includes(id) ? "done" : log?.skippedIds?.includes(id) ? "skipped" : "none");
  const activities = timelineFor(plan, date).map((a) => ({
    start: a.start,
    end: a.end,
    title: a.title,
    steps: a.steps.map((s) => ({ time: s.time, label: s.label, status: status(s.id) })),
  }));
  const all = activities.flatMap((a) => a.steps);
  const entry = data.entries.find((e) => e.date === date);
  const goals = dayGoals(data, date);
  const t = trainingMinutes(data.plan, data.timelineLog, date);
  const trained = entry?.trainingHours ?? toHalfHours(t.done);
  const bottles = bottlesFor(data, date);
  const medsTaken = data.medicationLogs.filter((m) => m.date === date).length;
  const checks: DayExport["checks"] = [];
  if (entry) {
    checks.push({ label: "Sonno", ok: !!goals?.sleep, detail: `${num(entry.sleepHours)} h (obiettivo ${num(data.goals.sleepHours)} h)` });
    const lv = moodLevel(entry.mood);
    checks.push({ label: "Umore nella zona stabile", ok: !!goals?.mood, detail: `${formatMood(entry.mood)} · ${lv.label}` });
  }
  checks.push({ label: "Acqua", ok: bottles >= data.goals.waterBottles, detail: `${bottles}/${data.goals.waterBottles} bottigliette` });
  if (t.planned) checks.push({ label: "Allenamento", ok: trained >= t.planned / 60 - 0.25, detail: `${num(trained)} h su ${num(toHalfHours(t.planned))} h previste` });
  if (data.medicationCount) {
    checks.push({
      label: "Farmaci",
      ok: medsTaken >= data.medicationCount,
      detail: `${Math.min(medsTaken, data.medicationCount)}/${data.medicationCount}${medicationNames.length ? ` (${medicationNames.join(", ")})` : ""}`,
    });
  }
  const lensDay = data.lensLog.find((l) => l.date === date);
  if (data.lensLog.length) checks.push({ label: "Lenti tolte in tempo", ok: !!lensDay?.removedAt, detail: lensDay?.removedAt ? "sì" : "non segnato" });
  const weighed = data.weightLog.find((w) => w.date === date);
  if (weighed) checks.push({ label: "Pesata", ok: true, detail: `${num(weighed.kg)} kg` });

  const gym = data.gymLog
    .filter((s: GymSession) => s.date === date)
    .flatMap((s) => Object.entries(s.exercises).map(([id, sets]) => ({ exercise: exerciseName(id), sets: formatSets(sets) })));
  const meals = data.mealLog
    .filter((m) => m.date === date)
    .sort((a, b) => a.time.localeCompare(b.time))
    .map((m) => {
      const tt = totals(m.items);
      const rel = reliability(m.items);
      return { title: m.title, time: m.time, detail: `${tt.kcal} kcal · ${tt.protein} g proteine${rel === "affidabile" ? " · pesato" : rel === "stima" ? " · stima" : ""}` };
    });
  const missions = missionsFor(data, date)
    .filter((m) => m.applicable)
    .map((m) => ({ name: m.name, done: m.done }));

  const d = parseDateKey(date);
  const label = `${d.toLocaleDateString("it-IT", { weekday: "long" })} ${d.getDate()} ${d.toLocaleDateString("it-IT", { month: "long" })}`;

  return {
    date,
    label,
    activities,
    summary: {
      done: all.filter((s) => s.status === "done").length,
      skipped: all.filter((s) => s.status === "skipped").length,
      notMarked: all.filter((s) => s.status === "none").length,
      total: all.length,
    },
    checks,
    gym,
    meals,
    missions,
    wished: lines(entry?.wished),
    unwanted: lines(entry?.unwanted),
    notes: entry?.notes?.trim() ?? "",
  };
}

/** Monday..Sunday of the ISO week that contains `anyDay`. */
export function buildWeekExport(snapshot: Record<string, string>, anyDay: string, now = new Date()): WeekExport {
  const data = progressDataFromSnapshot(snapshot);
  let meds: string[] = [];
  try {
    meds = (JSON.parse(snapshot["@wellness/medications"] ?? "[]") as { name: string; enabled?: boolean }[])
      .filter((m) => m.enabled !== false)
      .map((m) => m.name);
  } catch {
    meds = [];
  }
  const weight = Number(snapshot["@wellness/bodyweightKg"]) || null;
  const d = parseDateKey(anyDay);
  const monday = addDays(d, -((d.getDay() + 6) % 7));
  const dates = Array.from({ length: 7 }, (_, i) => toDateKey(addDays(monday, i)));
  return {
    app: "wellness-tracker-week",
    version: 1,
    week: isoWeekLabel(anyDay),
    from: dates[0],
    to: dates[6],
    generatedAt: now.toISOString(),
    days: dates.map((date) => buildDayExport(data, date, meds, weight)),
  };
}
