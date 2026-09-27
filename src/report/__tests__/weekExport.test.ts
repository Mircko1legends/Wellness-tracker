import { defaultPlanPack } from "../../timeline/pack";
import { dayTimeline, setStepStatus } from "../../timeline/plan";
import { buildWeekExport } from "../weekExport";

const pack = defaultPlanPack();
const plan = { routine: pack.routine, meals: pack.meals };

describe("week export for the daily carousels", () => {
  it("lists every action of each day with its status, plus wishes and regrets", () => {
    const mon = "2026-12-07";
    const acts = dayTimeline(plan, 1, undefined, mon);
    let log = setStepStatus([], mon, acts[0].steps[0].id, "done");
    log = setStepStatus(log, mon, acts[0].steps[1].id, "skipped");
    const snap = {
      "@wellness/timeline": JSON.stringify(plan),
      "@wellness/timelineLog": JSON.stringify(log),
      "@wellness/entries": JSON.stringify([
        { date: mon, mood: -2, moodScale: 11, sleepHours: 9, waterBottles: 10, wished: "finire fisica\n- chiamare il nonno", unwanted: "social a letto" },
      ]),
      "@wellness/bodyweightKg": "58.7",
      "@wellness/medications": JSON.stringify([{ id: "l", name: "Litio", enabled: true }]),
      "@wellness/medicationLogs": JSON.stringify([{ date: mon, medicationId: "l" }]),
    };
    const week = buildWeekExport(snap, "2026-12-09");
    expect(week.from).toBe("2026-12-07");
    expect(week.days).toHaveLength(7);
    const day = week.days[0];
    expect(day.label).toMatch(/^lunedì 7 dicembre$/);
    expect(day.activities[0].steps[0].status).toBe("done");
    expect(day.activities[0].steps[1].status).toBe("skipped");
    expect(day.summary.done).toBe(1);
    expect(day.wished).toEqual(["finire fisica", "chiamare il nonno"]);
    expect(day.unwanted).toEqual(["social a letto"]);
    expect(day.checks.map((c) => c.label)).toEqual(["Sonno", "Umore nella zona stabile", "Acqua", "Allenamento", "Farmaci"]);
    expect(day.checks.find((c) => c.label === "Farmaci")).toMatchObject({ ok: true, detail: "1/1 (Litio)" });
    // lunch portions are the ones scaled to the body weight
    expect(day.activities.find((a) => a.title === "Pranzo")!.steps[0].label).toContain("60 g riso");
  });
});
