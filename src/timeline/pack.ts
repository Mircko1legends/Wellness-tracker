import { LifeGoal, Milestone } from "../goals/goals";
import { formatHm, parseHm } from "../import/time";
import { PlanActivity, PlanStep } from "./plan";

export interface WaterSchedule {
  start: string;
  end: string;
  intervalMin: number;
}

/** A ready-made plan: routine and meals already split into micro-actions, plus goals. */
export interface PlanPack {
  name: string;
  routine: PlanActivity[];
  meals: PlanActivity[];
  goals: LifeGoal[];
  water?: WaterSchedule;
}

const PACK_APP = "wellness-tracker-plan";

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const time = (v: unknown) => {
  const m = typeof v === "string" ? parseHm(v.trim()) : null;
  return m === null ? null : formatHm(m);
};

function sanitizeActivity(raw: any, kind: "routine" | "meal", index: number): PlanActivity | null {
  const id = str(raw?.id) || `${kind[0]}${index}`;
  const title = str(raw?.title);
  const start = time(raw?.start);
  const end = time(raw?.end);
  if (!title || !start || !end) return null;
  const steps: PlanStep[] = (Array.isArray(raw.steps) ? raw.steps : [])
    .map((s: any, j: number) => ({ id: str(s?.id) || `${id}-s${j}`, time: time(s?.time) ?? "", label: str(s?.label) }))
    .filter((s: PlanStep) => s.time && s.label);
  const days = Array.isArray(raw.days) ? raw.days.filter((d: unknown) => Number.isInteger(d) && (d as number) >= 0 && (d as number) <= 6) : undefined;
  return {
    id,
    title,
    start,
    end,
    kind,
    steps,
    ...(days && days.length ? { days } : {}),
    ...(raw.weeks === "odd" || raw.weeks === "even" ? { weeks: raw.weeks } : {}),
    ...(typeof raw.essential === "boolean" ? { essential: raw.essential } : {}),
    ...(str(raw.group) ? { group: str(raw.group) } : {}),
    ...(/^#[0-9a-f]{6}$/i.test(str(raw.color)) ? { color: str(raw.color) } : {}),
  };
}

function sanitizeGoal(raw: any, index: number): LifeGoal | null {
  const title = str(raw?.title);
  if (!title) return null;
  const id = str(raw.id) || `g${index}`;
  const milestones: Milestone[] = (Array.isArray(raw.milestones) ? raw.milestones : [])
    .map((m: any, j: number) => ({ id: str(m?.id) || `${id}-m${j}`, title: str(m?.title), due: str(m?.due) }))
    .filter((m: Milestone) => m.title && /^\d{4}-\d{2}$/.test(m.due));
  return { id, title, priority: Number.isFinite(raw.priority) ? raw.priority : index + 1, ...(str(raw.target) ? { target: str(raw.target) } : {}), milestones };
}

export function parsePlanPack(json: string): PlanPack | null {
  try {
    return sanitizePlanPack(JSON.parse(json));
  } catch {
    return null;
  }
}

export function sanitizePlanPack(raw: any): PlanPack | null {
  if (raw?.app !== PACK_APP) return null;
  const list = (v: unknown) => (Array.isArray(v) ? v : []);
  const routine = list(raw.routine).map((a, i) => sanitizeActivity(a, "routine", i)).filter((a): a is PlanActivity => a !== null);
  const meals = list(raw.meals).map((a, i) => sanitizeActivity(a, "meal", i)).filter((a): a is PlanActivity => a !== null);
  const goals = list(raw.goals).map(sanitizeGoal).filter((g): g is LifeGoal => g !== null);
  const water =
    raw.water && time(raw.water.start) && time(raw.water.end) && Number(raw.water.intervalMin) >= 15
      ? { start: time(raw.water.start)!, end: time(raw.water.end)!, intervalMin: Number(raw.water.intervalMin) }
      : undefined;
  if (!routine.length && !meals.length && !goals.length) return null;
  return { name: str(raw.name) || "Piano", routine, meals, goals, ...(water ? { water } : {}) };
}

/** The plan built into the app (see scripts/build-default-plan.mjs). */
export function defaultPlanPack(): PlanPack {
  return sanitizePlanPack(require("../data/defaultPlan.json"))!;
}
