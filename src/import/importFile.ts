import { DietMeal, parseDiet } from "./dietParser";
import { AiReadError, AiSettings, readDietWithAi, readRoutineWithAi } from "./gemini";
import { PickedFile } from "./pickFile";
import { parseRoutine } from "./routineParser";
import { ImportedActivity, ParseMethod, PdfAnalysis } from "./types";

export type ImportKind = "routine" | "diet";

export interface ImportOutcome {
  kind: ImportKind;
  fileName: string;
  method: ParseMethod;
  activities: ImportedActivity[];
  meals: DietMeal[];
  notes: string[];
  error?: string;
}

const MIN_CONFIDENCE = 0.6;

function decodeText(base64: string): string {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder("utf-8").decode(bytes);
}

/** A plain-text file becomes a one-column "page" so the same line parsers apply. */
export function textToAnalysis(text: string): PdfAnalysis {
  const lines = text.split(/\r?\n/).map((l) => l.replace(/[;\t]/g, " ").trim()).filter(Boolean);
  return {
    numPages: 1,
    pages: [
      { width: 1000, height: 1000, cell: 2, cols: 0, rows: 0, grid: "", palette: [], texts: lines.map((str, i) => ({ str, x: 10, y: 10 + i * 20, w: 900, h: 12 })) },
    ],
  };
}

function parseLocally(kind: ImportKind, analysis: PdfAnalysis) {
  if (kind === "routine") {
    const r = parseRoutine(analysis);
    return r ? { confidence: r.confidence, method: r.method, activities: r.activities, meals: [], notes: r.notes } : null;
  }
  const d = parseDiet(analysis);
  return d ? { confidence: d.confidence, method: "text" as ParseMethod, activities: [], meals: d.meals, notes: d.notes } : null;
}

async function readWithAi(kind: ImportKind, file: PickedFile, ai: AiSettings, notes: string[]): Promise<ImportOutcome> {
  const base = { kind, fileName: file.name, method: "ai" as ParseMethod, activities: [], meals: [], notes };
  try {
    if (kind === "routine") return { ...base, activities: await readRoutineWithAi(file.base64, file.mimeType, ai) };
    return { ...base, meals: await readDietWithAi(file.base64, file.mimeType, ai) };
  } catch (e) {
    return { ...base, error: e instanceof AiReadError ? e.message : "Errore durante la lettura con l'IA." };
  }
}

/**
 * Reads on the device first; falls back to the free Gemini tier only when the device result is
 * missing or unconvincing and a key is configured (or when explicitly forced).
 */
export async function importFile(
  kind: ImportKind,
  file: PickedFile,
  analyzePdf: (base64: string) => Promise<PdfAnalysis>,
  ai: AiSettings,
  forceAi = false
): Promise<ImportOutcome> {
  const hasAi = ai.geminiApiKey.trim().length > 0;
  if (forceAi) return readWithAi(kind, file, ai, []);

  let local: ReturnType<typeof parseLocally> = null;
  const notes: string[] = [];
  const isPdf = file.mimeType === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  const isText = file.mimeType.startsWith("text/");

  if (isPdf) {
    try {
      local = parseLocally(kind, await analyzePdf(file.base64));
    } catch {
      notes.push("Il telefono non è riuscito ad aprire il PDF.");
    }
  } else if (isText) {
    local = parseLocally(kind, textToAnalysis(decodeText(file.base64)));
  } else {
    notes.push("È un'immagine: senza IA il telefono non può leggere il testo.");
  }

  if (local && local.confidence >= MIN_CONFIDENCE) {
    return { kind, fileName: file.name, method: local.method, activities: local.activities, meals: local.meals, notes: local.notes };
  }
  if (hasAi) {
    return readWithAi(kind, file, ai, [...notes, ...(local ? ["La lettura sul telefono era incerta: ho usato l'IA."] : [])]);
  }
  if (local) {
    return {
      kind,
      fileName: file.name,
      method: local.method,
      activities: local.activities,
      meals: local.meals,
      notes: [...local.notes, "Lettura incerta: controlla bene prima di salvare."],
    };
  }
  return {
    kind,
    fileName: file.name,
    method: "manual",
    activities: [],
    meals: [],
    notes,
    error: "Non sono riuscito a leggere il file sul telefono. Aggiungi la chiave gratuita di Gemini per usare l'IA, oppure inserisci le attività a mano qui sotto.",
  };
}
