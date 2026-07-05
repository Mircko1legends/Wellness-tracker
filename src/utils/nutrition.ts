export interface NutritionTargets {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

/**
 * Rough lean-bulk targets from bodyweight: a modest surplus over an estimated
 * sedentary-to-moderate maintenance level, ~2g/kg protein, ~25% of calories from fat.
 * Not medical advice — a reasonable, budget-friendly starting point to adjust from.
 */
export function calculateLeanBulkTargets(weightKg: number): NutritionTargets {
  const maintenance = weightKg * 24;
  const calories = Math.round(maintenance * 1.12);
  const proteinG = Math.round(weightKg * 2);
  const fatG = Math.round((calories * 0.25) / 9);
  const remainingCalories = calories - proteinG * 4 - fatG * 9;
  const carbsG = Math.max(0, Math.round(remainingCalories / 4));

  return { calories, proteinG, carbsG, fatG };
}
