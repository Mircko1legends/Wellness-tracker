import { AiSettings, callGemini, FetchLike } from "../import/gemini";
import * as gemini from "../import/gemini";
import type { LifeGoal } from "../goals/goals";
import { goalProgress, nextMilestone } from "../goals/goals";
import { addMonths, FinanceData, flowsForMonth, formatMonth, MonthKey, summarizeMonth } from "../utils/finance";

/** Budget rules from "Routine annuale 2026–27", section 7: the adviser must respect them. */
export const BUDGET_RULES = `Regole di budget dell'utente (dal suo piano annuale):
- Entrate circa 460 € al mese. Spese fisse: internet 50 €, arti marziali ~60 €, palestra ~60 € (stime).
- Ripartizione dei ~290 € restanti, in ordine di priorità: 1) fondo concorso e studio 50 € (TOLC, libri, viaggio e soggiorno a Pisa per il concorso del Sant'Anna ad agosto/settembre); 2) attrezzatura sportiva 30 €; 3) alimentazione per la massa 40 €; 4) igiene di base 15 €; 5) fondo imprevisti/risparmio 60 € (non si tocca per spese discrezionali); 6) svago 60 € (si accumula se non speso); 7) skincare 0–20 € (discrezionale); margine non assegnato 15 €.
- Se arti marziali o palestra costano più della stima, la differenza si toglie prima dal margine, poi dallo svago, poi dalla skincare. Mai dal fondo concorso o dagli imprevisti.
- Acquisti discrezionali grossi (es. Nintendo 3DS usata) solo se: quote fisse pagate, fondo imprevisti intatto, prezzo coperto dal fondo svago accumulato + margine. Altrimenti si rimandano senza drammi.`;

export interface AdviceItem {
  item: string;
  price: number | null;
  why: string;
}

export interface FinanceAdvice {
  summary: string;
  available: number | null;
  mustBuy: AdviceItem[];
  postpone: (AdviceItem & { when: string })[];
  skip: AdviceItem[];
  tips: string[];
  ideas: (AdviceItem & { impact: string })[];
  model: string;
}

function money(n: number): string {
  return `${Math.round(n)} €`;
}

/** What the adviser knows: last, current and next month, goals and progress. */
export function adviserContext(data: FinanceData, goals: LifeGoal[], currentMonth: MonthKey, progressNotes: string): string {
  const next = addMonths(currentMonth, 1);
  const lines: string[] = [];
  for (const m of [addMonths(currentMonth, -1), currentMonth, next]) {
    const s = summarizeMonth(data, m, currentMonth);
    const flows = flowsForMonth(data, m);
    const list = [
      ...flows.recurring.map((f) => `${f.kind === "income" ? "+" : "−"}${money(f.amount)} ${f.label} (fissa)`),
      ...flows.oneOffs.map((f) => `${f.kind === "income" ? "+" : "−"}${money(f.amount)} ${f.label}`),
    ];
    lines.push(
      `${formatMonth(m)}: entrate ${money(s.income)}, uscite ${money(s.expenses)}, riportato dal mese prima ${money(s.carriedIn)}, disponibile ${money(s.available)}${
        s.unaccounted !== null && s.unaccounted > 0 ? `, speso in altro non registrato ${money(s.unaccounted)}` : ""
      }. Voci: ${list.join("; ") || "nessuna"}`
    );
  }
  const goalLines = [...goals]
    .sort((a, b) => a.priority - b.priority)
    .map((g) => {
      const next = nextMilestone(g);
      return `${g.priority}. ${g.title}: ${goalProgress(g).percent}%${next ? ` (prossima tappa: ${next.title}, ${next.due})` : ""}`;
    });
  return [`Mese corrente: ${formatMonth(currentMonth)}. Mese da pianificare: ${formatMonth(next)}.`, ...lines, "", "Obiettivi di vita in ordine di priorità:", ...goalLines, "", progressNotes].join("\n");
}

export function adviserPrompt(context: string, wishes: string): string {
  return `Sei un consulente di finanza personale esperto, concreto e prudente, per uno studente di 18–19 anni in Italia con entrate piccole.
${BUDGET_RULES}

Situazione:
${context}

Cosa vorrebbe pagare o comprare il mese prossimo (testo libero, prezzi se li sa):
${wishes || "(niente di specifico)"}

Compito:
1. Dividi le sue richieste in: da comprare assolutamente (necessarie o con alto impatto sui suoi obiettivi, dentro il budget), da rimandare (con quando ha senso), da evitare.
2. Dai consigli pratici per spendere meno o meglio (es. usato, discount, alternative gratuite), sempre rispettando le regole di budget.
3. Se, dopo le spese fisse, le quote e le cose da comprare, avanza denaro: proponi una lista di acquisti in ordine di impatto sui suoi obiettivi e sui progressi attuali (studio, concorso, fisico, MMA, inglese, cura di sé), con prezzo stimato. Niente acquisti che mettono a rischio il fondo concorso o il fondo imprevisti.
4. Mai consigliare prestiti, investimenti speculativi, scommesse o integratori/farmaci. Prezzi sempre come stime.
Rispondi in italiano, solo con JSON:
{"summary":"2-3 frasi","available":123,"mustBuy":[{"item":"...","price":0,"why":"..."}],"postpone":[{"item":"...","price":0,"why":"...","when":"..."}],"skip":[{"item":"...","price":0,"why":"..."}],"tips":["..."],"ideas":[{"item":"...","price":0,"impact":"alto|medio|basso","why":"..."}]}`;
}

const list = (v: unknown): any[] => (Array.isArray(v) ? v.slice(0, 12) : []);
const text = (v: unknown, max = 300) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const price = (v: unknown) => (v !== null && v !== "" && Number.isFinite(Number(v)) ? Math.round(Number(v) * 100) / 100 : null);

export function sanitizeAdvice(raw: any, model: string): FinanceAdvice {
  const item = (i: any): AdviceItem => ({ item: text(i?.item, 80), price: price(i?.price), why: text(i?.why) });
  return {
    summary: text(raw?.summary, 600),
    available: price(raw?.available),
    mustBuy: list(raw?.mustBuy).map(item).filter((i) => i.item),
    postpone: list(raw?.postpone).map((i) => ({ ...item(i), when: text(i?.when, 80) })).filter((i) => i.item),
    skip: list(raw?.skip).map(item).filter((i) => i.item),
    tips: list(raw?.tips).map((t) => text(t)).filter(Boolean),
    ideas: list(raw?.ideas).map((i) => ({ ...item(i), impact: text(i?.impact, 10) || "medio" })).filter((i) => i.item),
    model,
  };
}

export async function askFinanceAdviser(
  data: FinanceData,
  goals: LifeGoal[],
  currentMonth: MonthKey,
  progressNotes: string,
  wishes: string,
  settings: AiSettings,
  fetchImpl: FetchLike = fetch as unknown as FetchLike
): Promise<FinanceAdvice> {
  const raw = await callGemini(adviserPrompt(adviserContext(data, goals, currentMonth, progressNotes), wishes), null, null, settings, fetchImpl);
  return sanitizeAdvice(raw, gemini.lastModelUsed);
}
