import { matchFood } from "../foods";
import { searchOpenFoodFacts, parseItem, planMealItems, reliability, sanitizePhotoItems, totals } from "../meals";
import { defaultPlanPack } from "../../timeline/pack";
import { dayTimeline } from "../../timeline/plan";

describe("food matching", () => {
  it("prefers the most specific alias", () => {
    expect(matchFood("tonno sott'olio")?.id).toBe("tonno-olio");
    expect(matchFood("160 g tonno")?.id).toBe("tonno");
    expect(matchFood("Burro d’arachidi")?.id).toBe("burro-arachidi");
    expect(matchFood("uova strapazzate")?.id).toBe("uova");
    expect(matchFood("salsa di soia")).toBeNull();
  });
});

describe("quantities", () => {
  it("reads grams, millilitres and pieces", () => {
    expect(parseItem("150 g pollo")).toMatchObject({ grams: 150, weighed: true, foodName: "Petto di pollo (crudo)" });
    expect(parseItem("300 ml latte")).toMatchObject({ grams: 300, weighed: true });
    expect(parseItem("3 uova strapazzate")).toMatchObject({ grams: 150, weighed: false });
    expect(parseItem("1 banana")?.grams).toBe(120);
    expect(parseItem("250 ml latte o 150 g yogurt")?.foodName).toBe("Latte parzialmente scremato");
    expect(parseItem("salsa di soia")).toBeNull();
    expect(parseItem("frittata di patate e cipolla (3 uova)")).toMatchObject({ grams: 150, foodName: "Uova" });
  });

  it("computes totals and reliability", () => {
    const items = [parseItem("100 g avena")!, parseItem("300 ml latte")!];
    expect(totals(items)).toMatchObject({ kcal: 530, protein: 23 });
    expect(reliability(items)).toBe("affidabile");
    expect(reliability([parseItem("1 banana")!])).toBe("stima");
  });
});

describe("plan meals", () => {
  it("reads the food of the built-in plan's meals", () => {
    const pack = defaultPlanPack();
    const monday = dayTimeline({ routine: pack.routine, meals: pack.meals }, 1, 41);
    const lunch = monday.find((a) => a.title === "Pranzo")!;
    const items = planMealItems(lunch);
    expect(items.map((i) => i.foodName)).toEqual(expect.arrayContaining(["Petto di pollo (crudo)", "Olio extravergine d'oliva"]));
    expect(totals(items).protein).toBeGreaterThan(30);
  });
});

describe("photo analysis", () => {
  it("keeps only sane items and marks them as not weighed", () => {
    const r = sanitizePhotoItems({ items: [{ name: "pasta cotta", grams: 180 }, { name: "x", grams: -3 }, { name: "olio", grams: "10" }], note: "olio stimato" });
    expect(r.items).toHaveLength(2);
    expect(r.items.every((i) => !i.weighed)).toBe(true);
    expect(r.note).toBe("olio stimato");
  });
});

describe("Open Food Facts", () => {
  it("keeps products with energy per 100 g", async () => {
    const fake = (async () => ({
      ok: true,
      json: async () => ({
        products: [
          { product_name: "Pesto", brands: "Marca", nutriments: { "energy-kcal_100g": 520, proteins_100g: 5, carbohydrates_100g: 6, fat_100g: 52 } },
          { product_name: "Senza valori", nutriments: {} },
        ],
      }),
    })) as unknown as typeof fetch;
    const r = await searchOpenFoodFacts("pesto", fake);
    expect(r).toEqual([{ name: "Pesto · Marca", per100: { kcal: 520, protein: 5, carbs: 6, fat: 52 } }]);
  });
});
