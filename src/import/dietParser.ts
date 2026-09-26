import { groupLines } from "./routineParser";
import { formatHm, parseHm } from "./time";
import { PdfAnalysis } from "./types";

export interface DietItem {
  text: string; // as written, e.g. "80 g fiocchi d'avena"
  quantity?: number;
  unit?: string;
  food: string;
}

export interface DietMeal {
  name: string;
  time: string; // "HH:MM"
  items: DietItem[];
}

export interface DietParseResult {
  meals: DietMeal[];
  confidence: number;
  notes: string[];
}

const MEAL_NAMES = /^(colazione|spuntino|merenda|pranzo|cena|snack|spuntino (?:di )?(?:mattina|metà mattina|pomeriggio)|pre[- ]?(?:workout|allenamento)|post[- ]?(?:workout|allenamento)|pasto\s*\d+)\b/i;

const DEFAULT_TIMES: [RegExp, string][] = [
  [/colazione/i, "07:30"],
  [/pre[- ]?(workout|allenamento)/i, "17:00"],
  [/post[- ]?(workout|allenamento)/i, "19:30"],
  [/pranzo/i, "13:00"],
  [/merenda|pomeriggio/i, "16:30"],
  [/spuntino|snack/i, "10:30"],
  [/cena/i, "20:00"],
];

const UNITS = "g|gr|grammi|kg|ml|l|lt|litri?|pz|pezzi?|fett[ae]|cucchia(?:io|i)|cucchiain[oi]|tazz[ae]|bicchier[ei]|vasett[oi]|scatolett[ae]|uova|uovo";
const QUANTITY = new RegExp(`^(\\d+(?:[.,]\\d+)?)\\s*(${UNITS})?\\.?\\s+(?:di\\s+)?(.+)$`, "i");
const BULLET = /^[\s\-–•*·]+/;
const TIME_IN_TEXT = /(\d{1,2})[:.](\d{2})/;

export function parseDietItem(raw: string): DietItem {
  const text = raw.replace(BULLET, "").trim();
  const match = text.match(QUANTITY);
  if (!match) return { text, food: text };
  return {
    text,
    quantity: Number(match[1].replace(",", ".")),
    unit: match[2]?.toLowerCase(),
    food: match[3].trim(),
  };
}

interface MealHeader {
  name: string;
  time: string | null;
  inline: string; // foods written on the header line itself, e.g. "Pranzo: riso, pollo"
}

function headerOf(line: string): MealHeader | null {
  let rest = line.trim();
  let time: string | null = null;
  const leadingTime = rest.match(/^(\d{1,2}[:.]\d{2})\s*[-–:|]?\s*/);
  if (leadingTime) {
    time = formatHm(parseHm(leadingTime[1].replace(".", ":")) ?? 0);
    rest = rest.slice(leadingTime[0].length);
  }
  const name = rest.match(MEAL_NAMES);
  if (!name) return null;
  if (!time) {
    const inText = rest.match(TIME_IN_TEXT);
    if (inText) time = formatHm(Number(inText[1]) * 60 + Number(inText[2]));
  }
  const after = rest.slice(name[0].length).replace(/\(?\s*(ore\s*)?\d{1,2}[:.]\d{2}\s*\)?/i, "").replace(/^[\s:–-]+/, "").trim();
  return { name: name[0].charAt(0).toUpperCase() + name[0].slice(1).toLowerCase(), time, inline: after };
}

/** Meal headers ("Colazione (07:15)", "13:00 Pranzo", "Cena ore 20:30") followed by food lines. */
export function parseDiet(analysis: PdfAnalysis): DietParseResult | null {
  const meals: (DietMeal & { timeGuessed: boolean })[] = [];
  for (const page of analysis.pages) {
    for (const line of groupLines(page.texts)) {
      const header = headerOf(line.text);
      if (header) {
        const guessed = DEFAULT_TIMES.find(([re]) => re.test(header.name))?.[1] ?? "12:00";
        meals.push({ name: header.name, time: header.time ?? guessed, items: [], timeGuessed: !header.time });
        header.inline
          .split(/[,;+]/)
          .map((p) => p.trim())
          .filter(Boolean)
          .forEach((p) => meals[meals.length - 1].items.push(parseDietItem(p)));
        continue;
      }
      const current = meals[meals.length - 1];
      if (current && line.text.trim()) current.items.push(parseDietItem(line.text));
    }
  }
  const valid = meals.filter((m) => m.items.length > 0);
  if (valid.length < 2) return null;
  const notes: string[] = [];
  if (valid.some((m) => m.timeGuessed)) notes.push("Alcuni pasti non avevano l'orario: ne ho proposto uno standard, modificalo se serve.");
  return {
    meals: valid.map(({ timeGuessed: _t, ...m }) => m).sort((a, b) => a.time.localeCompare(b.time)),
    confidence: valid.every((m) => !m.timeGuessed) ? 0.9 : 0.7,
    notes,
  };
}
