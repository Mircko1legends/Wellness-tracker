import { DietMeal } from "../import/dietParser";
import { DAY_MINUTES, durationMinutes, formatHm, parseHm, roundTo } from "../import/time";
import { ImportedActivity } from "../import/types";

export interface PlanStep {
  id: string;
  time: string; // "HH:MM"
  label: string;
}

export interface PlanActivity {
  id: string;
  title: string;
  start: string;
  end: string;
  color?: string;
  days?: number[]; // 0 = Sunday; undefined = every day
  weeks?: "odd" | "even"; // ISO week parity, e.g. alternating gym programmes A/B
  essential?: boolean; // kept on a "giornata no"
  group?: string; // shared name for variants (used in notifications), e.g. "Pesi 45'"
  kind: "routine" | "meal";
  steps: PlanStep[];
}

export interface TimelinePlan {
  routine: PlanActivity[];
  meals: PlanActivity[];
  routineSource?: { name: string; method: string; importedAt: number };
  dietSource?: { name: string; method: string; importedAt: number };
}

export const EMPTY_PLAN: TimelinePlan = { routine: [], meals: [] };

export interface TimelineDayLog {
  date: string;
  doneIds: string[]; // step ids
  skippedIds?: string[];
}

export type StepStatus = "done" | "skipped" | null;

type Template = { match: RegExp; steps: (ctx: TemplateContext) => string[] };
interface TemplateContext {
  title: string;
  minutes: number;
}

const MEAL_WORDS = /colazione|pranzo|cena|spuntino|merenda|snack|pasto|pre[- ]?(workout|allenamento)|post[- ]?(workout|allenamento)/i;

function pomodoroSteps({ minutes }: TemplateContext): string[] {
  const steps = ["Scrivania libera, telefono in un'altra stanza, scegli UNA materia e l'obiettivo"];
  const blocks = Math.max(1, Math.floor((minutes - 10) / 30));
  for (let i = 1; i <= blocks; i++) {
    steps.push(`Pomodoro ${i}: 25' concentrato solo sull'obiettivo`);
    steps.push(i % 4 === 0 ? "Pausa lunga 15': alzati, bevi, niente social" : "Pausa 5': alzati e bevi");
  }
  steps.push("Scrivi cosa hai fatto e cosa ripassare domani");
  return steps;
}

const TEMPLATES: Template[] = [
  { match: /sveglia|risveglio|alzarsi|wake/i, steps: () => ["Spegni la sveglia e alzati subito", "Bevi un bicchiere d'acqua", "Luce naturale: apri le finestre", "Rifai il letto"] },
  { match: /doccia|skincare|igiene|bagno/i, steps: () => ["Doccia", "Detergente viso", "Crema idratante", "Protezione solare se esci di giorno", "Deodorante e denti"] },
  { match: /scuola|lezion|universit/i, steps: () => ["Controlla zaino e orario delle lezioni", "Esci di casa in orario", "In classe: telefono silenzioso, prendi appunti", "Uscita: annota i compiti assegnati"] },
  { match: /studio|compiti|ripasso|maturit|sant'?anna|test/i, steps: pomodoroSteps },
  { match: /inglese|english|c1/i, steps: () => ["10' vocaboli e flashcard", "Ascolto o lettura in inglese", "10' scrivi o parla in inglese", "Segna le parole nuove"] },
  { match: /palestra|gym|pesi|allenamento/i, steps: () => ["Prepara borsa, asciugamano e borraccia", "Riscaldamento 10'", "Scheda del giorno: segna serie e ripetizioni", "Stretching 5'", "Reidratati: bevi acqua"] },
  { match: /mma|muay|thai|box|kick|lotta|bjj|arti marziali/i, steps: () => ["Borsa: guantoni, bende, paradenti, borraccia", "Riscaldamento", "Allenamento", "Stretching e reidratazione"] },
  { match: /lettura|leggere|libro/i, steps: () => ["Telefono lontano", "Leggi", "Annota un'idea che ti è piaciuta"] },
  { match: /routine serale|sera|preparazione notte/i, steps: () => ["Prepara vestiti e zaino per domani", "Skincare serale", "Togli le lenti a contatto e spunta nell'app", "Stop schermi"] },
  { match: /sonno|dormire|letto|nanna/i, steps: () => ["Luci basse, telefono lontano dal letto", "A letto"] },
  { match: MEAL_WORDS, steps: () => ["Prepara il pasto", "Mangia seduto, senza telefono", "Sparecchia e lava quello che hai usato"] },
];

/** Spreads steps over the activity: first at the start, the rest at even intervals, rounded to 5'. */
function scheduleSteps(activityId: string, start: string, minutes: number, labels: string[]): PlanStep[] {
  const startMin = parseHm(start) ?? 0;
  const span = Math.max(0, minutes - 5);
  return labels.map((label, i) => ({
    id: `${activityId}-s${i}`,
    time: formatHm(startMin + (labels.length > 1 ? roundTo((span * i) / (labels.length - 1)) : 0)),
    label,
  }));
}

export function microStepsFor(activityId: string, title: string, start: string, end: string): PlanStep[] {
  const minutes = durationMinutes(start, end);
  const template = TEMPLATES.find((t) => t.match.test(title));
  const labels = template ? template.steps({ title, minutes }) : [`Inizia: ${title}`, `Chiudi: ${title} e prepara il passo dopo`];
  return scheduleSteps(activityId, start, minutes, labels);
}

function slug(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "attivita";
}

export function buildRoutine(activities: ImportedActivity[]): PlanActivity[] {
  return activities.map((a, i) => {
    const id = `r${i}-${slug(a.title)}`;
    const steps = a.steps?.length
      ? a.steps.map((s, j) => ({ id: `${id}-s${j}`, time: s.time, label: s.label }))
      : microStepsFor(id, a.title, a.start, a.end);
    return { id, title: a.title, start: a.start, end: a.end, color: a.color, days: a.days, kind: "routine", steps };
  });
}

const MEAL_MINUTES = 25;

export function buildMeals(meals: DietMeal[]): PlanActivity[] {
  return meals.map((meal, i) => {
    const id = `m${i}-${slug(meal.name)}`;
    const end = formatHm((parseHm(meal.time) ?? 0) + MEAL_MINUTES);
    const labels = [
      ...meal.items.map((item) => (item.quantity ? `Pesa/prepara ${item.text}` : `Prepara ${item.text}`)),
      "Mangia seduto, senza telefono",
      "Sparecchia e lava quello che hai usato",
    ];
    return { id, title: meal.name, start: meal.time, end, kind: "meal", steps: scheduleSteps(id, meal.time, MEAL_MINUTES, labels) };
  });
}

function overlaps(a: PlanActivity, b: PlanActivity): boolean {
  const as = parseHm(a.start)!;
  const bs = parseHm(b.start)!;
  const ae = as + durationMinutes(a.start, a.end);
  const be = bs + durationMinutes(b.start, b.end);
  return as < be && bs < ae;
}

export function isActiveOn(activity: PlanActivity, weekday: number, isoWeek?: number): boolean {
  if (activity.days && !activity.days.includes(weekday)) return false;
  if (activity.weeks && isoWeek !== undefined && (isoWeek % 2 === 1 ? "odd" : "even") !== activity.weeks) return false;
  return true;
}

const ESSENTIAL_WORDS = /sonno|igiene|routine serale|colazione|pranzo|cena|scuola|farmac|litio|lenti/i;

/** On a "giornata no" only these stay: explicit flag, or meals/sleep/hygiene/school by default. */
export function isEssential(activity: PlanActivity): boolean {
  return activity.essential ?? (activity.kind === "meal" || ESSENTIAL_WORDS.test(activity.title));
}

/**
 * The day's timeline: routine activities for that weekday, with diet meals merged into the routine's
 * meal slots (the meal's food steps replace the generic ones) and any other meals added on their own.
 */
export function dayTimeline(plan: TimelinePlan, weekday: number, isoWeek?: number): PlanActivity[] {
  const routine = plan.routine.filter((a) => isActiveOn(a, weekday, isoWeek));
  const usedMeals = new Set<string>();
  const merged = routine.map((activity) => {
    if (!MEAL_WORDS.test(activity.title)) return activity;
    const meal = plan.meals.find(
      (m) => !usedMeals.has(m.id) && isActiveOn(m, weekday, isoWeek) && (overlaps(activity, m) || m.title.toLowerCase() === activity.title.toLowerCase())
    );
    if (!meal) return activity;
    usedMeals.add(meal.id);
    const minutes = durationMinutes(activity.start, activity.end);
    const labels = meal.steps.map((s) => s.label);
    return { ...activity, kind: "meal" as const, steps: scheduleSteps(activity.id, activity.start, minutes, labels) };
  });
  const extraMeals = plan.meals.filter((m) => !usedMeals.has(m.id) && isActiveOn(m, weekday, isoWeek));
  return [...merged, ...extraMeals].sort((a, b) => a.start.localeCompare(b.start));
}

/** The activity running at `minutes` (handles activities that cross midnight). */
export function currentActivity(timeline: PlanActivity[], minutes: number): PlanActivity | null {
  return (
    timeline.find((a) => {
      const s = parseHm(a.start)!;
      const d = durationMinutes(a.start, a.end);
      return (minutes - s + DAY_MINUTES) % DAY_MINUTES < d;
    }) ?? null
  );
}

export function nextActivity(timeline: PlanActivity[], minutes: number): PlanActivity | null {
  const upcoming = timeline.filter((a) => (parseHm(a.start) ?? 0) > minutes);
  return upcoming[0] ?? timeline[0] ?? null;
}

export function stepStatus(log: TimelineDayLog[], date: string, stepId: string): StepStatus {
  const day = log.find((d) => d.date === date);
  if (day?.doneIds.includes(stepId)) return "done";
  if (day?.skippedIds?.includes(stepId)) return "skipped";
  return null;
}

/** Sets a step to done/skipped; setting the same status again clears it. */
export function setStepStatus(log: TimelineDayLog[], date: string, stepId: string, status: StepStatus): TimelineDayLog[] {
  const day = log.find((d) => d.date === date) ?? { date, doneIds: [], skippedIds: [] };
  const current = stepStatus(log, date, stepId);
  const next = current === status ? null : status;
  const doneIds = day.doneIds.filter((id) => id !== stepId);
  const skippedIds = (day.skippedIds ?? []).filter((id) => id !== stepId);
  if (next === "done") doneIds.push(stepId);
  if (next === "skipped") skippedIds.push(stepId);
  return [...log.filter((d) => d.date !== date), { date, doneIds, skippedIds }].sort((a, b) => a.date.localeCompare(b.date));
}
