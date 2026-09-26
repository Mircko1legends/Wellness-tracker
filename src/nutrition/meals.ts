import { AiSettings, callGemini, FetchLike } from "../import/gemini";
import { PlanActivity } from "../timeline/plan";
import { Food, FOODS, matchFood } from "./foods";

export interface Per100 {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MealItem {
  name: string;
  grams: number;
  weighed: boolean; // true = weighed on a scale (or known from the plan)
  scaled?: boolean; // share of a total weight read from the scale (split between foods is estimated)
  per100: Per100 | null; // null = no nutrition data found
  source: "tabella" | "openfoodfacts" | "manuale";
  foodName?: string; // what the values refer to, e.g. "Petto di pollo (crudo)"
}

export interface MealEntry {
  id: string;
  date: string;
  time: string;
  title: string;
  origin: "foto" | "piano" | "manuale";
  items: MealItem[];
  scale?: ScaleReading; // what the kitchen scale showed in the photo
}

export interface ScaleReading {
  grams: number; // number on the display
  tared: boolean; // zeroed with the empty plate on it
  plateGrams: number; // subtracted when not tared
}

export interface Totals extends Per100 {
  grams: number;
}

export function per100Of(food: Food): Per100 {
  return { kcal: food.kcal, protein: food.protein, carbs: food.carbs, fat: food.fat };
}

export function itemFromFood(name: string, grams: number, weighed: boolean, food: Food | null = matchFood(name)): MealItem {
  return food
    ? { name, grams, weighed, per100: per100Of(food), source: "tabella", foodName: food.name }
    : { name, grams, weighed, per100: null, source: "manuale" };
}

export function totals(items: MealItem[]): Totals {
  const sum: Totals = { grams: 0, kcal: 0, protein: 0, carbs: 0, fat: 0 };
  for (const item of items) {
    sum.grams += item.grams;
    if (!item.per100) continue;
    const k = item.grams / 100;
    sum.kcal += item.per100.kcal * k;
    sum.protein += item.per100.protein * k;
    sum.carbs += item.per100.carbs * k;
    sum.fat += item.per100.fat * k;
  }
  return {
    grams: Math.round(sum.grams),
    kcal: Math.round(sum.kcal),
    protein: Math.round(sum.protein),
    carbs: Math.round(sum.carbs),
    fat: Math.round(sum.fat),
  };
}

export type Reliability = "affidabile" | "totale" | "stima" | "incompleto";

/** Weighed + found in the table = reliable; a scale total split by eye is next; a photo alone is only an estimate. */
export function reliability(items: MealItem[]): Reliability {
  if (!items.length || items.some((i) => !i.per100)) return "incompleto";
  if (items.every((i) => i.weighed)) return "affidabile";
  if (items.every((i) => i.weighed || i.scaled)) return "totale";
  return "stima";
}

export const RELIABILITY_TEXT: Record<Reliability, string> = {
  affidabile: "Affidabile: grammi pesati e valori da tabella nutrizionale.",
  totale:
    "Quasi affidabile: il peso totale viene dalla bilancia, ma la divisione tra gli alimenti è stimata. Per il massimo usa \"Pesa a strati\".",
  stima: "Stima: le porzioni viste in foto possono sbagliare del 20–30% o più, soprattutto olio e condimenti. Pesa per avere dati affidabili.",
  incompleto: "Incompleto: qualche alimento non ha valori. Tocca l'alimento per sceglierlo dalla tabella o cercarlo online.",
};

/** Re-applies a corrected reading: foods whose grams came from the scale go back to their photo share. */
export function reapplyScale(items: MealItem[], scale: ScaleReading): MealItem[] {
  return applyScale(items.map((i) => (i.scaled ? { ...i, weighed: false, scaled: false } : i)), scale);
}

export function foodGramsOnScale(scale: ScaleReading): number {
  return Math.max(0, Math.round(scale.tared ? scale.grams : scale.grams - scale.plateGrams));
}

/**
 * Makes the foods add up to what the scale shows. One food → its weight is exact.
 * Several foods → the total is exact and the photo's proportions split it.
 */
export function applyScale(items: MealItem[], scale: ScaleReading): MealItem[] {
  const total = foodGramsOnScale(scale);
  const free = items.filter((i) => !i.weighed);
  const fixed = items.filter((i) => i.weighed).reduce((a, i) => a + i.grams, 0);
  const rest = Math.max(0, total - fixed);
  if (!free.length) return items;
  if (free.length === 1) return items.map((i) => (i.weighed ? i : { ...i, grams: rest, weighed: true, scaled: true }));
  const sum = free.reduce((a, i) => a + i.grams, 0) || free.length;
  return items.map((i) => (i.weighed ? i : { ...i, grams: Math.round((rest * (i.grams || 1)) / sum), scaled: true }));
}

const QTY = /^(\d+(?:[.,]\d+)?)\s*(kg|g|gr|ml|l)?\b\s*(?:di\s+)?(.*)$/i;

/** "150 g pollo", "250 ml latte", "3 uova", "1 banana", "insalata" → grams (estimated when no weight is given). */
export function parseItem(raw: string): MealItem | null {
  const noParens = raw.replace(/\(.*?\)/g, "").trim();
  // "frittata di patate (3 uova)": the amount is in brackets
  const inBrackets = /\((\d+(?:[.,]\d+)?\s*[^)]*)\)/.exec(raw);
  const base = !/^\d/.test(noParens) && inBrackets ? inBrackets[1] : noParens;
  const text = base.replace(/\s+o\s+.*$/i, ""); // "250 ml latte o 150 g yogurt" → first option
  if (!text) return null;
  const m = QTY.exec(text);
  let grams: number | null = null;
  let name = text;
  let weighed = false;
  if (m) {
    const n = Number(m[1].replace(",", "."));
    const unit = (m[2] ?? "").toLowerCase();
    name = m[3].trim() || text;
    if (unit === "kg" || unit === "l") grams = n * 1000;
    else if (unit) grams = n;
    else {
      const food = matchFood(name);
      grams = n * (food?.unitGrams ?? 100);
    }
    weighed = !!unit;
  }
  const food = matchFood(name);
  if (!food && !m) return null; // e.g. "salsa di soia", "pelati" without data and without quantity
  if (grams === null) grams = food?.unitGrams ?? 100;
  return itemFromFood(name, Math.round(grams), weighed, food);
}

/** Food items of a plan meal, read from its "Prepara/pesa: ..." steps (optional extras are left out). */
export function planMealItems(activity: PlanActivity): MealItem[] {
  const items: MealItem[] = [];
  for (const step of activity.steps) {
    const label = step.label;
    if (/più tardi|se hai fame|mangia seduto|sparecchia|prima di sederti/i.test(label)) continue;
    if (!/^(prepara|pesa|pasto)/i.test(label) && !/\d+\s*(g|ml)\b/i.test(label)) continue;
    let body = label.slice(label.lastIndexOf(":") + 1);
    const inner = /\(([^)]*\d+\s*(?:g|ml)[^)]*)\)/i.exec(body);
    if (inner) body = inner[1];
    for (const part of body.split("+")) {
      const item = parseItem(part);
      if (item) items.push(item);
    }
  }
  return items;
}

const MEAL_TITLE = /colazione|pranzo|cena|spuntino|merenda|snack|pasto/i;

export function planMeals(timeline: PlanActivity[]): { activity: PlanActivity; items: MealItem[] }[] {
  return timeline
    .filter((a) => a.kind === "meal" || MEAL_TITLE.test(a.title))
    .map((activity) => ({ activity, items: planMealItems(activity) }))
    .filter((m) => m.items.length > 0);
}

const FOOD_NAMES = () => FOODS.map((f) => f.aliases[0]).join(", ");

const SCALE_RULES = `Se il piatto è su una bilancia da cucina con il display visibile, leggi il numero sul display e mettilo in "scale" (in grammi; se il display è in kg converti). Se non c'è una bilancia o il numero non si legge bene, "scale" è null: non inventarlo.`;

export const MEAL_PHOTO_PROMPT = `Sei un nutrizionista. Guarda la foto del pasto e elenca ogni alimento visibile con la stima dei grammi nel piatto (peso cotto se è cotto).
Conta anche olio, condimenti, salse e bevande se si vedono. Non inventare alimenti che non vedi.
${SCALE_RULES}
Usa quando puoi uno di questi nomi semplici in italiano: ${FOOD_NAMES()}; per la pasta o il riso già cotti scrivi "pasta cotta" o "riso cotto".
Rispondi solo con JSON: {"scale":245,"items":[{"name":"pasta cotta","grams":180},{"name":"olio","grams":10}],"note":"eventuali dubbi in una frase"}`;

/** Weighing one food at a time on a tared plate: each photo adds one food, the scale difference is its exact weight. */
export function layerPrompt(previousGrams: number, previousFoods: string[]): string {
  return `Stiamo pesando un pasto un alimento alla volta su una bilancia da cucina.
Prima di questa foto la bilancia segnava ${previousGrams} g e sul piatto c'erano: ${previousFoods.length ? previousFoods.join(", ") : "niente (piatto vuoto, tara fatta)"}.
Leggi il numero sul display e dimmi quale alimento è stato aggiunto adesso (uno solo, il più evidente tra quelli nuovi).
${SCALE_RULES}
Usa quando puoi uno di questi nomi semplici in italiano: ${FOOD_NAMES()}.
Rispondi solo con JSON: {"scale":320,"items":[{"name":"riso cotto","grams":0}],"note":"eventuali dubbi in una frase"}`;
}

export interface PhotoResult {
  items: MealItem[];
  note: string;
  scaleGrams: number | null;
}

export function sanitizePhotoItems(raw: any): PhotoResult {
  const list = Array.isArray(raw?.items) ? raw.items : [];
  const items = list
    .map((i: any) => {
      const name = typeof i?.name === "string" ? i.name.trim().slice(0, 60) : "";
      const grams = Math.round(Number(i?.grams));
      if (!name || !Number.isFinite(grams) || grams < 0 || grams > 2000) return null;
      return itemFromFood(name, grams, false);
    })
    .filter((i: MealItem | null): i is MealItem => i !== null);
  const scale = Number(typeof raw?.scale === "object" && raw?.scale !== null ? raw.scale.grams : raw?.scale);
  return {
    items,
    note: typeof raw?.note === "string" ? raw.note.slice(0, 200) : "",
    scaleGrams: Number.isFinite(scale) && scale > 0 && scale < 10000 ? Math.round(scale) : null,
  };
}

export async function analyzeMealPhoto(
  base64: string,
  mimeType: string,
  settings: AiSettings,
  fetchImpl: FetchLike = fetch as unknown as FetchLike,
  prompt: string = MEAL_PHOTO_PROMPT
): Promise<PhotoResult> {
  return sanitizePhotoItems(await callGemini(prompt, base64, mimeType, settings, fetchImpl));
}

/** Adds the food of a new layer: its weight is the scale difference, so it counts as weighed. */
export function addLayer(items: MealItem[], previousGrams: number, result: PhotoResult, newReading: number): MealItem[] {
  const delta = Math.max(0, Math.round(newReading - previousGrams));
  const name = result.items[0]?.name ?? "alimento";
  return [...items, itemFromFood(name, delta, true)];
}

export interface OnlineFood {
  name: string;
  per100: Per100;
}

/** Packaged foods from Open Food Facts (open database, ODbL: attribution required). */
export async function searchOpenFoodFacts(query: string, fetchImpl: typeof fetch = fetch): Promise<OnlineFood[]> {
  const url =
    "https://world.openfoodfacts.org/cgi/search.pl?action=process&json=1&search_simple=1&page_size=10" +
    `&fields=product_name,brands,nutriments&search_terms=${encodeURIComponent(query)}`;
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`Open Food Facts: errore ${res.status}`);
  const body = await res.json();
  return (Array.isArray(body?.products) ? body.products : [])
    .map((p: any) => {
      const n = p?.nutriments ?? {};
      const kcal = Number(n["energy-kcal_100g"]);
      if (!p?.product_name || !Number.isFinite(kcal)) return null;
      return {
        name: [p.product_name, p.brands].filter(Boolean).join(" · ").slice(0, 80),
        per100: { kcal, protein: Number(n.proteins_100g) || 0, carbs: Number(n.carbohydrates_100g) || 0, fat: Number(n.fat_100g) || 0 },
      };
    })
    .filter((x: OnlineFood | null): x is OnlineFood => x !== null)
    .slice(0, 6);
}
