import { adviserContext, adviserPrompt, askFinanceAdviser, sanitizeAdvice } from "../adviser";

const data = {
  recurring: [
    { id: "r1", label: "Entrate", amount: 460, kind: "income" as const, startMonth: "2026-09" },
    { id: "r2", label: "Internet", amount: 50, kind: "expense" as const, startMonth: "2026-09" },
  ],
  oneOffs: [{ id: "o1", month: "2026-10", label: "Certificato medico", amount: 40, kind: "expense" as const }],
  leftovers: [],
};
const goals = [{ id: "goal1", title: "100 alla maturità", priority: 1, milestones: [{ id: "m", title: "Media ≥ 9", due: "2026-12" }] }];

describe("finance adviser", () => {
  it("gives the model next month's numbers, the budget rules and the goals", () => {
    const ctx = adviserContext(data, goals, "2026-09", "Allenamento 6 h/8 h");
    expect(ctx).toContain("ottobre 2026: entrate 460 €, uscite 90 €");
    expect(ctx).toContain("1. 100 alla maturità: 0%");
    const prompt = adviserPrompt(ctx, "guantoni 35 €, videogioco 60 €");
    expect(prompt).toContain("fondo concorso");
    expect(prompt).toContain("guantoni 35 €");
  });

  it("keeps a sane shape whatever the AI returns", () => {
    const a = sanitizeAdvice({ summary: "ok", available: "120", mustBuy: [{ item: "Guantoni", price: 35, why: "MMA" }, { price: 3 }], ideas: "x" }, "gemini-2.5-pro");
    expect(a.available).toBe(120);
    expect(a.mustBuy).toEqual([{ item: "Guantoni", price: 35, why: "MMA" }]);
    expect(a.ideas).toEqual([]);
    expect(a.model).toBe("gemini-2.5-pro");
  });

  it("asks Gemini with text only (no file)", async () => {
    let body: any = null;
    const impl = async (_url: string, init: any) => {
      body = JSON.parse(init.body);
      return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ summary: "Tutto ok", tips: ["Compra usato"] }) }] } }] }) };
    };
    const advice = await askFinanceAdviser(data, goals, "2026-09", "", "niente", { geminiApiKey: "K", model: "gemini-2.5-pro" }, impl as any);
    expect(advice.summary).toBe("Tutto ok");
    expect(body.contents[0].parts).toHaveLength(1);
  });
});
