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

export type Reliability = "affidabile" | "stima" | "incompleto";

/** Weighed + found in the table = reliable; anything estimated from a photo is only an estimate. */
export function reliability(items: MealItem[]): Reliability {
  if (!items.length || items.some((i) => !i.per100)) return "incompleto";
  return items.every((i) => i.weighed) ? "affidabile" : "stima";
}

export const RELIABILITY_TEXT: Record<Reliability, string> = {
  affidabile: "Affidabile: grammi pesati e valori da tabella nutrizionale.",
  stima: "Stima: le porzioni viste in foto possono sbagliare del 20–30% o più, soprattutto olio e condimenti. Pesa per avere dati affidabili.",
  incompleto: "Incompleto: qualche alimento non ha valori. Tocca l'alimento per sceglierlo dalla tabella o cercarlo online.",
};

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

export const MEAL_PHOTO_PROMPT = `Sei un nutrizionista. Guarda la foto del pasto e elenca ogni alimento visibile con la stima dei grammi nel piatto (peso cotto se è cotto).
Conta anche olio, condimenti, salse e bevande se si vedono. Non inventare alimenti che non vedi.
Usa quando puoi uno di questi nomi semplici in italiano: ${FOODS.map((f) => f.aliases[0]).join(", ")}; per la pasta o il riso già cotti scrivi "pasta cotta" o "riso cotto".
Rispondi solo con JSON: {"items":[{"name":"pasta cotta","grams":180},{"name":"olio","grams":10}],"note":"eventuali dubbi in una frase"}`;

export function sanitizePhotoItems(raw: any): { items: MealItem[]; note: string } {
  const list = Array.isArray(raw?.items) ? raw.items : [];
  const items = list
    .map((i: any) => {
      const name = typeof i?.name === "string" ? i.name.trim().slice(0, 60) : "";
      const grams = Math.round(Number(i?.grams));
      if (!name || !Number.isFinite(grams) || grams <= 0 || grams > 2000) return null;
      return itemFromFood(name, grams, false);
    })
    .filter((i: MealItem | null): i is MealItem => i !== null);
  return { items, note: typeof raw?.note === "string" ? raw.note.slice(0, 200) : "" };
}

export async function analyzeMealPhoto(base64: string, mimeType: string, settings: AiSettings, fetchImpl: FetchLike = fetch as unknown as FetchLike) {
  return sanitizePhotoItems(await callGemini(MEAL_PHOTO_PROMPT, base64, mimeType, settings, fetchImpl));
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
