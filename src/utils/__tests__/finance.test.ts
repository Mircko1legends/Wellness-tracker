import {
  addMonths,
  changeRecurringAmount,
  declareLeftover,
  EMPTY_FINANCE,
  endRecurring,
  FinanceData,
  formatEuro,
  parseQuickEntry,
  pendingLeftoverMonth,
  summarizeMonth,
} from "../finance";

const base: FinanceData = {
  recurring: [
    { id: "salary", label: "Stipendio", amount: 1000, kind: "income", startMonth: "2026-09" },
    { id: "internet", label: "Internet", amount: 50, kind: "expense", startMonth: "2026-09" },
    { id: "mma", label: "MMA", amount: 50, kind: "expense", startMonth: "2026-09" },
  ],
  oneOffs: [{ id: "cert", month: "2026-10", label: "Certificato medico", amount: 40, kind: "expense" }],
  leftovers: [],
};

describe("addMonths", () => {
  it("crosses year boundaries both ways", () => {
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2027-01", -1)).toBe("2026-12");
    expect(addMonths("2026-10", 14)).toBe("2027-12");
  });
});

describe("summarizeMonth", () => {
  it("sums recurring and one-off flows for the month", () => {
    const s = summarizeMonth(base, "2026-10", "2026-10");
    expect(s.income).toBe(1000);
    expect(s.expenses).toBe(140);
    expect(s.available).toBe(860);
    expect(s.status).toBe("current");
  });

  it("counts an undeclared past leftover as spent elsewhere and carries nothing", () => {
    const sept = summarizeMonth(base, "2026-09", "2026-10");
    expect(sept.status).toBe("past");
    expect(sept.unaccounted).toBe(900);
    expect(summarizeMonth(base, "2026-10", "2026-10").carriedIn).toBe(0);
  });

  it("carries only the declared leftover and attributes the rest to other spending", () => {
    const data = declareLeftover(base, "2026-09", 300);
    const sept = summarizeMonth(data, "2026-09", "2026-10");
    expect(sept.unaccounted).toBe(600);
    const oct = summarizeMonth(data, "2026-10", "2026-10");
    expect(oct.carriedIn).toBe(300);
    expect(oct.available).toBe(1160);
  });

  it("reports unrecorded income when the declared leftover exceeds what was available", () => {
    const data = declareLeftover(base, "2026-09", 1000);
    expect(summarizeMonth(data, "2026-09", "2026-10").unaccounted).toBe(-100);
  });

  it("does not report negative spending for an undeclared overspent month", () => {
    const data: FinanceData = {
      ...EMPTY_FINANCE,
      oneOffs: [{ id: "x", month: "2026-09", label: "Attrezzatura", amount: 200, kind: "expense" }],
    };
    expect(summarizeMonth(data, "2026-09", "2026-10").unaccounted).toBe(0);
  });

  it("does not project carry-over into future months", () => {
    const data = declareLeftover(base, "2026-10", 500);
    expect(summarizeMonth(data, "2026-11", "2026-10").carriedIn).toBe(0);
  });
});

describe("pendingLeftoverMonth", () => {
  it("asks about the previous month once it had money movement", () => {
    expect(pendingLeftoverMonth(base, "2026-10")).toBe("2026-09");
  });

  it("stops asking after a declaration, including zero", () => {
    expect(pendingLeftoverMonth(declareLeftover(base, "2026-09", 0), "2026-10")).toBeNull();
  });

  it("does not ask about a month with no data", () => {
    expect(pendingLeftoverMonth(base, "2026-09")).toBeNull();
  });
});

describe("recurring changes", () => {
  it("ending a recurring flow keeps it in earlier months only", () => {
    const data = endRecurring(base, "mma", "2026-10");
    expect(summarizeMonth(data, "2026-10", "2026-10").expenses).toBe(140);
    expect(summarizeMonth(data, "2026-11", "2026-10").expenses).toBe(50);
  });

  it("changing an amount mid-way preserves history", () => {
    const data = changeRecurringAmount(base, "internet", 30, "2026-11", "internet-2");
    expect(summarizeMonth(data, "2026-10", "2026-10").expenses).toBe(140);
    expect(summarizeMonth(data, "2026-11", "2026-10").expenses).toBe(80);
  });

  it("changing an amount from its start month edits it in place", () => {
    const data = changeRecurringAmount(base, "internet", 30, "2026-09", "unused");
    expect(data.recurring).toHaveLength(3);
    expect(data.recurring.find((f) => f.id === "internet")?.amount).toBe(30);
  });
});

describe("parseQuickEntry", () => {
  it.each([
    ["-50 internet", { kind: "expense", amount: 50, label: "internet" }],
    ["internet -50", { kind: "expense", amount: 50, label: "internet" }],
    ["+1200 stipendio", { kind: "income", amount: 1200, label: "stipendio" }],
    ["−60 muay thai", { kind: "expense", amount: 60, label: "muay thai" }],
    ["12,50 € pranzo fuori", { kind: "expense", amount: 12.5, label: "pranzo fuori" }],
  ])("parses %s", (input, expected) => {
    expect(parseQuickEntry(input)).toEqual(expected);
  });

  it("uses the default kind when there is no sign", () => {
    expect(parseQuickEntry("300 regalo", "income")?.kind).toBe("income");
  });

  it("rejects entries without an amount or a label", () => {
    expect(parseQuickEntry("internet")).toBeNull();
    expect(parseQuickEntry("-50")).toBeNull();
    expect(parseQuickEntry("-0 niente")).toBeNull();
  });
});

describe("formatEuro", () => {
  it("formats Italian style", () => {
    expect(formatEuro(1234.5)).toBe("1.234,50 €");
    expect(formatEuro(-50)).toBe("-50,00 €");
  });
});
