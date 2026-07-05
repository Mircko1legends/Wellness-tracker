import { calculateLeanBulkTargets } from "../nutrition";

describe("calculateLeanBulkTargets", () => {
  it("scales calories and protein up with bodyweight", () => {
    const light = calculateLeanBulkTargets(60);
    const heavy = calculateLeanBulkTargets(90);
    expect(heavy.calories).toBeGreaterThan(light.calories);
    expect(heavy.proteinG).toBeGreaterThan(light.proteinG);
  });

  it("targets roughly 2g of protein per kg of bodyweight", () => {
    const targets = calculateLeanBulkTargets(70);
    expect(targets.proteinG).toBe(140);
  });

  it("keeps carbs non-negative even at very low bodyweight", () => {
    const targets = calculateLeanBulkTargets(40);
    expect(targets.carbsG).toBeGreaterThanOrEqual(0);
  });

  it("accounts for protein and fat calories within the total", () => {
    const targets = calculateLeanBulkTargets(75);
    const proteinAndFatCalories = targets.proteinG * 4 + targets.fatG * 9;
    expect(proteinAndFatCalories).toBeLessThanOrEqual(targets.calories);
  });
});
