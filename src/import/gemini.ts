import { DietMeal, parseDietItem } from "./dietParser";
import { formatHm, parseHm } from "./time";
import { ImportedActivity } from "./types";

export interface AiSettings {
  geminiApiKey: string;
  /** "auto" = the smartest model your key can use, falling back to Flash when its free quota runs out. */
  model: string;
}

export const AUTO_MODEL = "auto";
export const DEFAULT_AI_SETTINGS: AiSettings = { geminiApiKey: "", model: AUTO_MODEL };

const ROUTINE_PROMPT = `Leggi questo file: contiene una routine giornaliera o settimanale (può essere un grafico con un colore per attività, una torta delle 24 ore, una tabella o un elenco).
Estrai TUTTE le attività con orario di inizio e di fine (HH:MM, 24 ore). Se è una routine settimanale indica i giorni in cui vale ogni attività (0=domenica, 1=lunedì ... 6=sabato), altrimenti days = null.
Per ogni attività scomponila in micro-azioni molto piccole e concrete, ognuna con il suo orario esatto HH:MM compreso tra inizio e fine dell'attività.
Non inventare attività che non ci sono. Rispondi solo con JSON in questo formato:
{"activities":[{"title":"...","start":"HH:MM","end":"HH:MM","color":"#rrggbb o null","days":[1,2] o null,"steps":[{"time":"HH:MM","label":"..."}]}]}`;

const DIET_PROMPT = `Leggi questo file: contiene un piano alimentare.
Estrai tutti i pasti con l'orario (HH:MM, 24 ore; se manca, proponi un orario ragionevole) e gli alimenti con le quantità esattamente come scritte.
Non inventare alimenti o quantità. Rispondi solo con JSON in questo formato:
{"meals":[{"name":"Colazione","time":"HH:MM","items":["80 g fiocchi d'avena","250 ml latte"]}]}`;

export class AiReadError extends Error {}

export type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body?: string }) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<any>;
}>;

const API = "https://generativelanguage.googleapis.com/v1beta";

/**
 * Orders the models a key can use from the best reasoning to the cheapest: every "pro" by version (newest first),
 * then "flash", then "flash-lite". Embedding, image, audio and live models are left out.
 */
export function rankModels(names: string[]): string[] {
  const parsed = names
    .map((n) => n.replace(/^models\//, ""))
    .filter((n) => /^gemini-/.test(n) && !/embedding|image|tts|audio|live|native|aqa|computer-use|robotics/i.test(n))
    .map((n) => {
      const version = Number(/^gemini-(\d+(?:\.\d+)?)/.exec(n)?.[1] ?? 0);
      const tier = /flash-lite|lite/.test(n) ? 1 : /flash/.test(n) ? 2 : /pro/.test(n) ? 3 : 0;
      const stable = /preview|exp/.test(n) ? 0 : 1;
      return { n, version, tier, stable };
    })
    .filter((m) => m.tier > 0);
  parsed.sort((a, b) => b.tier - a.tier || b.version - a.version || b.stable - a.stable || a.n.length - b.n.length);
  return [...new Set(parsed.map((m) => m.n))];
}

const FALLBACK_MODELS = ["gemini-2.5-pro", "gemini-2.5-flash"];
const modelCache = new Map<string, string[]>();

/** The models to try, best first (listed from your key; cached for the session). */
export async function modelCandidates(settings: AiSettings, fetchImpl: FetchLike): Promise<string[]> {
  if (settings.model && settings.model !== AUTO_MODEL) return [settings.model.trim()];
  const key = settings.geminiApiKey.trim();
  const cached = modelCache.get(key);
  if (cached) return cached;
  try {
    const res = await fetchImpl(`${API}/models?pageSize=200`, { method: "GET", headers: { "x-goog-api-key": key } });
    if (res.ok) {
      const body = await res.json();
      const usable = (Array.isArray(body?.models) ? body.models : [])
        .filter((m: any) => (m?.supportedGenerationMethods ?? []).includes("generateContent"))
        .map((m: any) => String(m.name));
      const ranked = rankModels(usable);
      if (ranked.length) {
        // Best reasoning first, then the best Flash as the free fallback.
        const bestPro = ranked.filter((m) => /pro/.test(m)).slice(0, 2);
        const bestFlash = ranked.filter((m) => /flash/.test(m) && !/lite/.test(m)).slice(0, 1);
        const list = [...bestPro, ...bestFlash].length ? [...bestPro, ...bestFlash] : ranked.slice(0, 2);
        modelCache.set(key, list);
        return list;
      }
    }
  } catch {
    // offline or blocked: use the known names
  }
  return FALLBACK_MODELS;
}

/** The model that answered the last request (shown in the app). */
export let lastModelUsed = "";

export async function callGemini(
  prompt: string,
  base64: string | null,
  mimeType: string | null,
  settings: AiSettings,
  fetchImpl: FetchLike
): Promise<any> {
  if (!settings.geminiApiKey.trim()) throw new AiReadError("Manca la chiave API di Gemini: aggiungila nelle impostazioni dell'IA.");
  const parts = base64 && mimeType ? [{ inline_data: { mime_type: mimeType, data: base64 } }, { text: prompt }] : [{ text: prompt }];
  const candidates = await modelCandidates(settings, fetchImpl);
  let lastError: AiReadError | null = null;
  for (const model of candidates) {
    let res;
    try {
      res = await fetchImpl(`${API}/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": settings.geminiApiKey.trim() },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.1 },
        }),
      });
    } catch {
      throw new AiReadError("Nessuna connessione: l'IA serve internet.");
    }
    if (!res.ok) {
      if (res.status === 429) lastError = new AiReadError("Limite gratuito di Gemini raggiunto per ora: riprova più tardi.");
      else if (res.status === 400 || res.status === 403) lastError = new AiReadError("Chiave API non valida o modello non disponibile.");
      else if (res.status === 404) lastError = new AiReadError(`Modello ${model} non disponibile.`);
      else lastError = new AiReadError(`Gemini ha risposto con errore ${res.status}.`);
      // Quota finished or model not available for this key: try the next (cheaper) model.
      if ([429, 403, 404].includes(res.status) || (res.status === 400 && candidates.length > 1)) continue;
      throw lastError;
    }
    const body = await res.json();
    lastModelUsed = model;
    const text: string = (body?.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("");
    try {
      return JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ""));
    } catch {
      throw new AiReadError("L'IA non ha restituito un risultato leggibile.");
    }
  }
  throw lastError ?? new AiReadError("Nessun modello di Gemini disponibile.");
}

function time(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const m = parseHm(value.trim().replace(".", ":"));
  return m === null ? null : formatHm(m);
}

export function sanitizeRoutine(raw: any): ImportedActivity[] {
  const list = Array.isArray(raw?.activities) ? raw.activities : [];
  return list
    .map((a: any): ImportedActivity | null => {
      const start = time(a?.start);
      const end = time(a?.end);
      const title = typeof a?.title === "string" ? a.title.trim() : "";
      if (!start || !end || !title) return null;
      const days = Array.isArray(a.days) ? a.days.filter((d: unknown) => Number.isInteger(d) && (d as number) >= 0 && (d as number) <= 6) : [];
      const steps = (Array.isArray(a.steps) ? a.steps : [])
        .map((s: any) => ({ time: time(s?.time), label: typeof s?.label === "string" ? s.label.trim() : "" }))
        .filter((s: { time: string | null; label: string }) => s.time && s.label) as { time: string; label: string }[];
      return {
        title,
        start,
        end,
        ...(typeof a.color === "string" && /^#[0-9a-f]{6}$/i.test(a.color) ? { color: a.color } : {}),
        ...(days.length ? { days: [...new Set<number>(days)].sort() } : {}),
        ...(steps.length ? { steps } : {}),
      };
    })
    .filter((a: ImportedActivity | null): a is ImportedActivity => a !== null)
    .sort((a: ImportedActivity, b: ImportedActivity) => a.start.localeCompare(b.start));
}

export function sanitizeDiet(raw: any): DietMeal[] {
  const list = Array.isArray(raw?.meals) ? raw.meals : [];
  return list
    .map((m: any): DietMeal | null => {
      const t = time(m?.time);
      const name = typeof m?.name === "string" ? m.name.trim() : "";
      const items = (Array.isArray(m?.items) ? m.items : []).filter((i: unknown) => typeof i === "string" && i.trim());
      if (!t || !name || !items.length) return null;
      return { name, time: t, items: items.map((i: string) => parseDietItem(i)) };
    })
    .filter((m: DietMeal | null): m is DietMeal => m !== null)
    .sort((a: DietMeal, b: DietMeal) => a.time.localeCompare(b.time));
}

export async function readRoutineWithAi(base64: string, mimeType: string, settings: AiSettings, fetchImpl: FetchLike = fetch as unknown as FetchLike) {
  const activities = sanitizeRoutine(await callGemini(ROUTINE_PROMPT, base64, mimeType, settings, fetchImpl));
  if (activities.length === 0) throw new AiReadError("L'IA non ha trovato attività con orari in questo file.");
  return activities;
}

export async function readDietWithAi(base64: string, mimeType: string, settings: AiSettings, fetchImpl: FetchLike = fetch as unknown as FetchLike) {
  const meals = sanitizeDiet(await callGemini(DIET_PROMPT, base64, mimeType, settings, fetchImpl));
  if (meals.length === 0) throw new AiReadError("L'IA non ha trovato pasti in questo file.");
  return meals;
}
