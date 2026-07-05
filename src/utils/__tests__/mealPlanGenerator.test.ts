import { RECIPES } from "../../data/recipes";
import { computeMealPlanTotals, generateDailyMealPlan } from "../mealPlanGenerator";

describe("generateDailyMealPlan", () => {
  it("returns colazione, two spuntini, pranzo, and cena in order", () => {
    const meals = generateDailyMealPlan(new Date("2026-03-01T12:00:00"));
    expect(meals.map((m) => m.slot)).toEqual([
      "colazione",
      "spuntino",
      "pranzo",
      "spuntino",
      "cena",
    ]);
  });

  it("only ever picks recipes matching their own slot", () => {
    const meals = generateDailyMealPlan(new Date("2026-03-01T12:00:00"));
    for (const meal of meals) {
      expect(meal.recipe.mealSlot).toBe(meal.slot);
    }
  });

  it("is deterministic for the same date", () => {
    const a = generateDailyMealPlan(new Date("2026-05-10T09:00:00"));
    const b = generateDailyMealPlan(new Date("2026-05-10T21:00:00"));
    expect(a.map((m) => m.recipe.id)).toEqual(b.map((m) => m.recipe.id));
  });

  it("picks two different recipes for the two spuntino slots on the same day", () => {
    const meals = generateDailyMealPlan(new Date("2026-03-01T12:00:00"));
    const spuntini = meals.filter((m) => m.slot === "spuntino");
    expect(spuntini[0].recipe.id).not.toBe(spuntini[1].recipe.id);
  });

  it("rotates through every recipe in a slot before repeating", () => {
    const colazioneCount = RECIPES.filter((r) => r.mealSlot === "colazione").length;
    const seenIds = new Set<string>();
    for (let i = 0; i < colazioneCount; i++) {
      const date = new Date("2026-01-01T12:00:00");
      date.setDate(date.getDate() + i);
      const meals = generateDailyMealPlan(date);
      seenIds.add(meals.find((m) => m.slot === "colazione")!.recipe.id);
    }
    expect(seenIds.size).toBe(colazioneCount);
  });

  it("gives a different plan on a different day (not stuck on one recipe)", () => {
    const day1 = generateDailyMealPlan(new Date("2026-01-01T12:00:00"));
    const day2 = generateDailyMealPlan(new Date("2026-01-02T12:00:00"));
    expect(day1.map((m) => m.recipe.id)).not.toEqual(day2.map((m) => m.recipe.id));
  });
});

describe("computeMealPlanTotals", () => {
  it("sums calories and macros across all meals", () => {
    const meals = generateDailyMealPlan(new Date("2026-03-01T12:00:00"));
    const totals = computeMealPlanTotals(meals);
    const expectedCalories = meals.reduce((sum, m) => sum + m.recipe.calories, 0);
    expect(totals.calories).toBe(expectedCalories);
    expect(totals.proteinG).toBe(meals.reduce((sum, m) => sum + m.recipe.proteinG, 0));
  });

  it("is 0 across the board with no meals", () => {
    expect(computeMealPlanTotals([])).toEqual({ calories: 0, proteinG: 0, carbsG: 0, fatG: 0 });
  });
});
