import { loadFixture } from "../../import/__fixtures__/load";
import { parseDiet } from "../../import/dietParser";
import { parseRoutine } from "../../import/routineParser";
import { buildMeals, buildRoutine, currentActivity, dayTimeline, microStepsFor, nextActivity, toggleDone } from "../plan";

describe("microStepsFor", () => {
  it("spreads template steps across the activity with exact times", () => {
    const steps = microStepsFor("a", "Sveglia e idratazione", "06:30", "07:00");
    expect(steps.map((s) => `${s.time} ${s.label}`)).toEqual([
      "06:30 Spegni la sveglia e alzati subito",
      "06:40 Bevi un bicchiere d'acqua",
      "06:45 Luce naturale: apri le finestre",
      "06:55 Rifai il letto",
    ]);
  });

  it("splits study into pomodoros sized to the block", () => {
    const labels = microStepsFor("a", "Studio", "14:30", "17:00").map((s) => s.label);
    expect(labels.filter((l) => l.startsWith("Pomodoro"))).toHaveLength(4);
    expect(labels[labels.length - 1]).toContain("ripassare domani");
  });

  it("falls back to start/finish steps for unknown activities", () => {
    expect(microStepsFor("a", "Volontariato", "10:00", "11:00").map((s) => s.time)).toEqual(["10:00", "10:55"]);
  });

  it("handles activities crossing midnight", () => {
    const steps = microStepsFor("a", "Sonno", "23:30", "06:30");
    expect(steps.map((s) => s.time)).toEqual(["23:30", "06:25"]);
  });
});

describe("dayTimeline", () => {
  const routine = buildRoutine(parseRoutine(loadFixture("week"))!.activities);
  const meals = buildMeals(parseDiet(loadFixture("diet"))!.meals);
  const plan = { routine, meals };

  it("keeps only activities for that weekday", () => {
    const saturday = dayTimeline({ routine, meals: [] }, 6).map((a) => a.title);
    expect(saturday).not.toContain("Scuola");
    expect(saturday).not.toContain("MMA");
    expect(dayTimeline({ routine, meals: [] }, 2).map((a) => a.title)).toContain("MMA");
  });

  it("puts the diet's foods into the routine's breakfast slot and adds other meals", () => {
    const monday = dayTimeline(plan, 1);
    const breakfast = monday.find((a) => a.title === "Colazione")!;
    expect(breakfast.start).toBe("07:00");
    expect(breakfast.steps[0].label).toBe("Pesa/prepara 80 g fiocchi d'avena");
    expect(monday.filter((a) => a.title === "Colazione")).toHaveLength(1);
    expect(monday.map((a) => a.title)).toEqual(expect.arrayContaining(["Pranzo", "Cena", "Spuntino", "Pre-workout"]));
  });

  it("finds the current and next activity", () => {
    const monday = dayTimeline(plan, 1);
    expect(currentActivity(monday, 15 * 60)?.title).toBe("Studio");
    expect(nextActivity(monday, 15 * 60)!.start > "15:00").toBe(true);
  });
});

describe("toggleDone", () => {
  it("toggles a step for one day", () => {
    const once = toggleDone([], "2026-09-26", "x");
    expect(once).toEqual([{ date: "2026-09-26", doneIds: ["x"] }]);
    expect(toggleDone(once, "2026-09-26", "x")).toEqual([{ date: "2026-09-26", doneIds: [] }]);
  });
});
