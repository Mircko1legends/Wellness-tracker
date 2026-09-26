import { bulkAdvice, upsertWeight, weightTrend } from "../weight";

describe("weight trend", () => {
  it("needs a few weigh-ins over at least 10 days", () => {
    expect(weightTrend([{ date: "2026-10-01", kg: 70 }, { date: "2026-10-03", kg: 70.2 }], "2026-10-05")).toBeNull();
    expect(bulkAdvice(null)).toContain("2–3 volte");
  });

  it("measures the weekly rate through daily noise", () => {
    let log = upsertWeight([], "2026-10-01", 70);
    log = upsertWeight(log, "2026-10-05", 70.6); // noisy high
    log = upsertWeight(log, "2026-10-08", 70.2);
    log = upsertWeight(log, "2026-10-12", 70.5);
    log = upsertWeight(log, "2026-10-15", 70.4);
    const t = weightTrend(log, "2026-10-15")!;
    expect(t.kgPerWeek).toBeGreaterThan(0.1);
    expect(t.kgPerWeek).toBeLessThan(0.35);
    expect(bulkAdvice(t)).toContain("Ritmo ideale");
  });

  it("suggests small changes when stuck or too fast", () => {
    expect(bulkAdvice({ kgPerWeek: 0, pctPerWeek: 0, current: 70, weighIns: 5 })).toContain("150 kcal");
    expect(bulkAdvice({ kgPerWeek: 0.7, pctPerWeek: 1, current: 70, weighIns: 5 })).toContain("togliere");
  });
});
