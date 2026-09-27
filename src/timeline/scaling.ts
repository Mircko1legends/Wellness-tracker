import { PlanActivity, TimelinePlan } from "./plan";

/**
 * The menu is written for 70 kg (Nutrition system, section 05): for every 5 kg less, 30 g less pasta or rice
 * at lunch and at dinner and no optional evening snack; for every 5 kg more, 30 g more.
 * Potatoes and bread follow the substitution table: 100 g pasta = 400 g potatoes = 150 g bread.
 */
export const MENU_REFERENCE_KG = 70;

export function weightSteps(weightKg: number): number {
  const diff = weightKg - MENU_REFERENCE_KG;
  return diff >= 0 ? Math.floor(diff / 5) : -Math.floor(-diff / 5);
}

const PER_STEP: [RegExp, number][] = [
  [/(\d+)\s*g\s+(?=(?:di\s+)?(?:pasta|riso))/i, 30],
  [/(\d+)\s*g\s+(?=(?:di\s+)?patate)/i, 120],
  [/(\d+)\s*g\s+(?=(?:di\s+)?pane)/i, 45],
];

/** Scales the first carbohydrate portion found in the text (pasta/rice first, then potatoes, then bread). */
export function scaleCarbs(label: string, steps: number): string {
  if (!steps) return label;
  for (const [re, per] of PER_STEP) {
    const m = re.exec(label);
    if (!m) continue;
    const grams = Math.max(per, Number(m[1]) + steps * per);
    return label.slice(0, m.index) + label.slice(m.index).replace(m[1], String(grams));
  }
  return label;
}

function scaleActivity(activity: PlanActivity, steps: number): PlanActivity {
  if (!activity.steps.some((s) => s.carbs || s.optional)) return activity;
  return {
    ...activity,
    steps: activity.steps
      .filter((s) => !(s.optional && steps < 0))
      .map((s) => (s.carbs ? { ...s, label: scaleCarbs(s.label, steps) } : s)),
  };
}

export function scalePlanForWeight(plan: TimelinePlan, weightKg: number | null): TimelinePlan {
  const steps = weightKg ? weightSteps(weightKg) : 0;
  if (!steps) return plan;
  return { ...plan, routine: plan.routine.map((a) => scaleActivity(a, steps)), meals: plan.meals.map((a) => scaleActivity(a, steps)) };
}
