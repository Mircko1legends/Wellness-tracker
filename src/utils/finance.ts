export type MonthKey = string; // "YYYY-MM"
export type FlowKind = "income" | "expense";

export interface RecurringFlow {
  id: string;
  label: string;
  amount: number; // always positive, direction given by kind
  kind: FlowKind;
  startMonth: MonthKey;
  endMonth?: MonthKey; // last month it applies to, inclusive
}

export interface OneOffFlow {
  id: string;
  month: MonthKey;
  label: string;
  amount: number;
  kind: FlowKind;
}

/** Money the user says was actually left at the end of `month`; it carries into the next month. */
export interface LeftoverDeclaration {
  month: MonthKey;
  amount: number;
}

export interface FinanceData {
  recurring: RecurringFlow[];
  oneOffs: OneOffFlow[];
  leftovers: LeftoverDeclaration[];
}

export const EMPTY_FINANCE: FinanceData = { recurring: [], oneOffs: [], leftovers: [] };

export type MonthStatus = "past" | "current" | "future";

export interface MonthSummary {
  month: MonthKey;
  status: MonthStatus;
  carriedIn: number;
  income: number;
  expenses: number;
  available: number; // carriedIn + income - expenses
  declaredLeftover: number | null;
  /** Past months only: what the user didn't account for. Positive = spent elsewhere, negative = unrecorded income. */
  unaccounted: number | null;
}

const MONTH_NAMES = [
  "gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
  "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre",
];

export function monthKeyOf(date: Date): MonthKey {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function addMonths(month: MonthKey, n: number): MonthKey {
  const [y, m] = month.split("-").map(Number);
  const total = y * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

export function formatMonth(month: MonthKey): string {
  const [y, m] = month.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

export function isRecurringActive(flow: RecurringFlow, month: MonthKey): boolean {
  return flow.startMonth <= month && (!flow.endMonth || month <= flow.endMonth);
}

export function flowsForMonth(data: FinanceData, month: MonthKey) {
  return {
    recurring: data.recurring.filter((f) => isRecurringActive(f, month)),
    oneOffs: data.oneOffs.filter((f) => f.month === month),
  };
}

function declaredLeftoverFor(data: FinanceData, month: MonthKey): number | null {
  return data.leftovers.find((l) => l.month === month)?.amount ?? null;
}

export function summarizeMonth(data: FinanceData, month: MonthKey, currentMonth: MonthKey): MonthSummary {
  const { recurring, oneOffs } = flowsForMonth(data, month);
  const all = [...recurring, ...oneOffs];
  const income = all.filter((f) => f.kind === "income").reduce((s, f) => s + f.amount, 0);
  const expenses = all.filter((f) => f.kind === "expense").reduce((s, f) => s + f.amount, 0);

  const status: MonthStatus = month < currentMonth ? "past" : month === currentMonth ? "current" : "future";
  // Only an explicit declaration carries money forward; anything undeclared counts as spent.
  const carriedIn = status === "future" ? 0 : declaredLeftoverFor(data, addMonths(month, -1)) ?? 0;
  const available = carriedIn + income - expenses;

  const declaredLeftover = declaredLeftoverFor(data, month);
  let unaccounted: number | null = null;
  if (status === "past") {
    unaccounted = declaredLeftover === null ? Math.max(0, available) : available - declaredLeftover;
  }

  return { month, status, carriedIn, income, expenses, available, declaredLeftover, unaccounted };
}

/** The previous month, if it had any money movement and the user hasn't said yet what was left over. */
export function pendingLeftoverMonth(data: FinanceData, currentMonth: MonthKey): MonthKey | null {
  const previous = addMonths(currentMonth, -1);
  if (declaredLeftoverFor(data, previous) !== null) return null;
  const { recurring, oneOffs } = flowsForMonth(data, previous);
  return recurring.length + oneOffs.length > 0 ? previous : null;
}

export function declareLeftover(data: FinanceData, month: MonthKey, amount: number): FinanceData {
  return {
    ...data,
    leftovers: [...data.leftovers.filter((l) => l.month !== month), { month, amount }],
  };
}

export function removeLeftoverDeclaration(data: FinanceData, month: MonthKey): FinanceData {
  return { ...data, leftovers: data.leftovers.filter((l) => l.month !== month) };
}

/** Changes a recurring amount from `fromMonth` onward, keeping past months as they were. */
export function changeRecurringAmount(
  data: FinanceData,
  id: string,
  newAmount: number,
  fromMonth: MonthKey,
  newId: string
): FinanceData {
  const flow = data.recurring.find((f) => f.id === id);
  if (!flow) return data;
  if (flow.startMonth >= fromMonth) {
    return { ...data, recurring: data.recurring.map((f) => (f.id === id ? { ...f, amount: newAmount } : f)) };
  }
  const closed: RecurringFlow = { ...flow, endMonth: addMonths(fromMonth, -1) };
  const continued: RecurringFlow = { ...flow, id: newId, amount: newAmount, startMonth: fromMonth };
  return {
    ...data,
    recurring: [...data.recurring.map((f) => (f.id === id ? closed : f)), continued],
  };
}

export function endRecurring(data: FinanceData, id: string, lastMonth: MonthKey): FinanceData {
  return {
    ...data,
    recurring: data.recurring.map((f) => (f.id === id ? { ...f, endMonth: lastMonth } : f)),
  };
}

export interface QuickEntry {
  kind: FlowKind;
  amount: number;
  label: string;
}

/**
 * Parses "-50 internet", "internet -50", "+1200 stipendio", "12,50 € pranzo".
 * A leading "-" is an expense, "+" is income; no sign falls back to `defaultKind`.
 */
export function parseQuickEntry(text: string, defaultKind: FlowKind = "expense"): QuickEntry | null {
  const normalized = text.replace(/−/g, "-").trim();
  const match = normalized.match(/([+-])?\s*(\d+(?:[.,]\d{1,2})?)\s*€?/);
  if (!match) return null;
  const amount = Number(match[2].replace(",", "."));
  if (!(amount > 0)) return null;
  const label = (normalized.slice(0, match.index) + " " + normalized.slice(match.index! + match[0].length))
    .replace(/€/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!label) return null;
  const kind: FlowKind = match[1] === "-" ? "expense" : match[1] === "+" ? "income" : defaultKind;
  return { kind, amount, label };
}

export function formatEuro(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(amount).toFixed(2).replace(".", ",");
  const [int, dec] = abs.split(",");
  return `${sign}${int.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${dec} €`;
}
