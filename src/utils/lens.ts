import { addDays, parseDateKey, toDateKey } from "./date";

export interface LensSettings {
  enabled: boolean;
  deadlineHour: number;
  deadlineMinute: number;
  reminderOffsets: number[]; // minutes before the deadline
  yourName: string;
  friendName: string;
  friendPhone: string;
  friendMessage: string;
  lensStartDate: string | null; // first day the current pair was worn
  lensDurationDays: number;
  caseStartDate: string | null;
  caseDurationDays: number;
}

export interface LensDay {
  date: string; // lens day, see lensDayKey
  doneSteps: string[];
  removedAt?: number;
}

export const DEFAULT_LENS_SETTINGS: LensSettings = {
  enabled: false,
  deadlineHour: 23,
  deadlineMinute: 30,
  reminderOffsets: [60, 30, 15],
  yourName: "",
  friendName: "",
  friendPhone: "",
  friendMessage: "",
  lensStartDate: null,
  lensDurationDays: 30,
  caseStartDate: null,
  caseDurationDays: 90,
};

export interface LensStep {
  id: string;
  label: string;
}

export const MORNING_STEPS: LensStep[] = [
  { id: "am-hands", label: "Lavati e asciuga bene le mani (sapone neutro, niente creme)" },
  { id: "am-check", label: "Controlla la lente: integra e non rovesciata" },
  { id: "am-in", label: "Metti le lenti" },
  { id: "am-case", label: "Svuota l'astuccio, sciacqualo con soluzione e lascialo asciugare aperto e capovolto" },
];

export const EVENING_STEPS: LensStep[] = [
  { id: "pm-hands", label: "Lavati e asciuga bene le mani" },
  { id: "pm-out", label: "Togli le lenti" },
  { id: "pm-rub", label: "Pulisci e risciacqua le lenti con la soluzione, come indicato sulla confezione" },
  { id: "pm-fresh", label: "Soluzione nuova nell'astuccio (mai rabboccare quella vecchia)" },
  { id: "pm-close", label: "Metti le lenti nell'astuccio e chiudilo" },
];

export const LENS_RULES = [
  "Mai acqua sulle lenti o nell'astuccio: rubinetto, doccia, piscina, mare.",
  "Non dormire con le lenti.",
  "Occhio rosso, dolore, luce che dà fastidio o vista offuscata: togli le lenti e senti l'oculista.",
];

/** Lens actions just after midnight belong to the previous evening, so a "day" starts at 12:00. */
export function lensDayKey(now: Date): string {
  return toDateKey(new Date(now.getTime() - 12 * 60 * 60 * 1000));
}

export function defaultFriendMessage(yourName: string): string {
  const who = yourName.trim() || "il tuo amico";
  return (
    `Messaggio automatico dall'app di ${who}: non ha ancora confermato di essersi tolto le lenti a contatto. ` +
    `Chiamalo il prima possibile per assicurarti che le tolga.`
  );
}

export function effectiveFriendMessage(settings: LensSettings): string {
  return settings.friendMessage.trim() || defaultFriendMessage(settings.yourName);
}

export interface ReplacementStatus {
  dueDate: string;
  daysLeft: number; // 0 = replace today, negative = overdue
  dayNumber: number; // 1-based day of use
}

export function replacementStatus(startDate: string | null, durationDays: number, today: string): ReplacementStatus | null {
  if (!startDate) return null;
  const start = parseDateKey(startDate);
  const due = addDays(start, durationDays);
  const todayDate = parseDateKey(today);
  const daysLeft = Math.round((due.getTime() - todayDate.getTime()) / 86400000);
  const dayNumber = Math.round((todayDate.getTime() - start.getTime()) / 86400000) + 1;
  return { dueDate: toDateKey(due), daysLeft, dayNumber };
}

function upsertDay(log: LensDay[], date: string, update: (day: LensDay) => LensDay): LensDay[] {
  const existing = log.find((d) => d.date === date) ?? { date, doneSteps: [] };
  return [...log.filter((d) => d.date !== date), update(existing)].sort((a, b) => a.date.localeCompare(b.date));
}

export function toggleStep(log: LensDay[], date: string, stepId: string): LensDay[] {
  return upsertDay(log, date, (day) => ({
    ...day,
    doneSteps: day.doneSteps.includes(stepId) ? day.doneSteps.filter((s) => s !== stepId) : [...day.doneSteps, stepId],
  }));
}

export function markRemoved(log: LensDay[], date: string, at: number): LensDay[] {
  return upsertDay(log, date, (day) => ({ ...day, removedAt: at }));
}

export function undoRemoved(log: LensDay[], date: string): LensDay[] {
  return upsertDay(log, date, ({ removedAt: _removed, ...day }) => day);
}

export function formatReminderSchedule(settings: LensSettings): string[] {
  const deadline = settings.deadlineHour * 60 + settings.deadlineMinute;
  return [...settings.reminderOffsets]
    .sort((a, b) => b - a)
    .map((offset) => {
      const minutes = (deadline - offset + 24 * 60) % (24 * 60);
      return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
    });
}

export interface SmsDiagnosticsInput {
  smsPermission: boolean;
  smsAppOpAllowed: boolean;
  phoneStatePermission: boolean;
  defaultSmsSubscription: number;
  activeSims: number;
  lastSmsQueuedAt: number;
  lastSmsResultAt: number;
  lastSmsResultCode: number;
  lastSmsDeliveredAt: number;
  lastSmsError: string;
}

export interface SmsProblem {
  text: string;
  fix: string;
}

/** Why an SMS may not leave the phone, in the order worth checking. */
export function smsProblems(s: SmsDiagnosticsInput): SmsProblem[] {
  const problems: SmsProblem[] = [];
  if (!s.smsPermission) {
    problems.push({
      text: "Android dice che l'app non ha il permesso SMS.",
      fix:
        "Tocca \"Apri impostazioni dell'app\" → Autorizzazioni → SMS → Consenti. Se è grigio o compare \"impostazione con restrizioni\": nella pagina dell'app tocca ⋮ in alto a destra → \"Consenti impostazioni con restrizioni\", poi riattiva SMS. Se risulta già consentito, disattivalo e riattivalo.",
    });
  } else if (!s.smsAppOpAllowed) {
    problems.push({
      text: "Il permesso risulta dato, ma il sistema blocca comunque l'invio (impostazione con restrizioni o controllo del produttore).",
      fix:
        "Nella pagina dell'app tocca ⋮ → \"Consenti impostazioni con restrizioni\"; su Xiaomi/Redmi cerca anche \"Invia SMS\" o \"SMS di servizio\" tra le autorizzazioni e mettilo su Consenti.",
    });
  }
  if (s.defaultSmsSubscription === -1 && !s.phoneStatePermission) {
    problems.push({
      text: "Il telefono non ha una SIM predefinita per gli SMS (\"chiedi ogni volta\") e l'app non può sceglierne una.",
      fix: "Consenti il permesso Telefono, oppure in Impostazioni → Gestione SIM scegli una SIM per i messaggi.",
    });
  }
  if (s.activeSims === 0) {
    problems.push({ text: "Nessuna SIM attiva trovata.", fix: "Controlla che la SIM sia inserita e attiva." });
  }
  return problems;
}

const SMS_ERRORS: Record<number, string> = {
  1: "errore generico: di solito SIM per gli SMS non scelta, piano SMS/credito esaurito o numero sbagliato",
  2: "rete spenta o modalità aereo",
  3: "messaggio non valido",
  4: "nessun segnale",
  5: "troppi SMS in poco tempo",
};

/** The last SMS as Android reported it: queued → sent → delivered. */
export function lastSmsStatus(s: SmsDiagnosticsInput, now: number): string | null {
  if (!s.lastSmsQueuedAt) return null;
  if (s.lastSmsError) return `Non partito: ${s.lastSmsError}.`;
  if (s.lastSmsResultCode > 0) return `Rifiutato da Android: ${SMS_ERRORS[s.lastSmsResultCode] ?? `codice ${s.lastSmsResultCode}`}.`;
  if (s.lastSmsResultCode === -1) {
    return s.lastSmsDeliveredAt >= s.lastSmsQueuedAt
      ? "Inviato e consegnato al telefono dell'amico ✓"
      : "Inviato dal tuo telefono ✓ (la conferma di consegna può non arrivare: dipende dall'operatore).";
  }
  return now - s.lastSmsQueuedAt < 60_000
    ? "In invio…"
    : "Android non ha mai confermato l'invio: controlla SIM predefinita per gli SMS, credito e segnale.";
}
