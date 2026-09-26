import { durationMinutes, parseHm } from "../../import/time";
import { defaultPlanPack } from "../pack";
import { dayTimeline } from "../plan";

const pack = defaultPlanPack();
const plan = { routine: pack.routine, meals: pack.meals };

describe("built-in plan", () => {
  it("loads with goals and water settings", () => {
    expect(pack.routine.length).toBeGreaterThan(50);
    expect(pack.goals.map((g) => g.priority)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(pack.water).toEqual({ start: "06:30", end: "21:30", intervalMin: 60 });
  });

  it.each([0, 1, 2, 3, 4, 5, 6])("weekday %i fills 06:30–21:30 without gaps in both gym weeks", (weekday) => {
    for (const week of [41, 42]) {
      const day = dayTimeline(plan, weekday, week).filter((a) => a.title !== "Sonno");
      let cursor = parseHm("06:30")!;
      for (const a of day) {
        expect(parseHm(a.start)).toBe(cursor);
        cursor += durationMinutes(a.start, a.end);
      }
      expect(cursor).toBe(parseHm("21:30"));
    }
  });

  it("alternates gym programmes A/B by week", () => {
    const mondayOdd = dayTimeline(plan, 1, 41).find((a) => a.group === "Pesi 45′")!;
    const mondayEven = dayTimeline(plan, 1, 42).find((a) => a.group === "Pesi 45′")!;
    expect(mondayOdd.title).toContain("Scheda A");
    expect(mondayEven.title).toContain("Scheda B");
    expect(dayTimeline(plan, 3, 41).find((a) => a.group === "Pesi 45′")!.title).toContain("Scheda B");
  });

  it("has no gym on Tuesday/Thursday and the right Thursday school length", () => {
    expect(dayTimeline(plan, 2, 41).some((a) => a.title.startsWith("Muay"))).toBe(false);
    expect(dayTimeline(plan, 4, 41).find((a) => a.title === "Scuola")?.end).toBe("16:00");
  });
});
