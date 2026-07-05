import { MealSlot, Recipe, RECIPES } from "../data/recipes";

export interface DailyMeal {
  slot: MealSlot;
  label: string;
  recipe: Recipe;
}

export interface MealPlanTotals {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diffMs = date.getTime() - start.getTime();
  return Math.floor(diffMs / 86400000);
}

function recipesForSlot(slot: MealSlot): Recipe[] {
  return RECIPES.filter((r) => r.mealSlot === slot);
}

function pick(pool: Recipe[], index: number): Recipe {
  return pool[((index % pool.length) + pool.length) % pool.length];
}

/**
 * Deterministic per-day rotation: the same date always yields the same plan,
 * different dates cycle through the whole recipe pool for each slot before
 * repeating, so meals stay different day to day without ever crashing.
 */
export function generateDailyMealPlan(today: Date = new Date()): DailyMeal[] {
  const day = dayOfYear(today);

  const colazione = recipesForSlot("colazione");
  const spuntino = recipesForSlot("spuntino");
  const pranzo = recipesForSlot("pranzo");
  const cena = recipesForSlot("cena");

  return [
    { slot: "colazione", label: "Colazione", recipe: pick(colazione, day) },
    { slot: "spuntino", label: "Spuntino", recipe: pick(spuntino, day) },
    { slot: "pranzo", label: "Pranzo", recipe: pick(pranzo, day) },
    {
      slot: "spuntino",
      label: "Spuntino",
      recipe: pick(spuntino, day + Math.floor(spuntino.length / 2)),
    },
    { slot: "cena", label: "Cena", recipe: pick(cena, day) },
  ];
}

export function computeMealPlanTotals(meals: DailyMeal[]): MealPlanTotals {
  return meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.recipe.calories,
      proteinG: acc.proteinG + m.recipe.proteinG,
      carbsG: acc.carbsG + m.recipe.carbsG,
      fatG: acc.fatG + m.recipe.fatG,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  );
}
