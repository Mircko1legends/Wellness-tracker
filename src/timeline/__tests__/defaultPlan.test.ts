import { durationMinutes, parseHm } from "../../import/time";
import { defaultPlanPack } from "../pack";
import { dayTimeline } from "../plan";
import { scalePlanForWeight } from "../scaling";

const pack = defaultPlanPack();
const plan = { routine: pack.routine, meals: pack.meals };
// A Monday..Sunday week in October, after the brainstorm starts and with every skincare product introduced.
const WEEK = ["2026-12-06", "2026-11-30", "2026-12-01", "2026-12-02", "2026-12-03", "2026-12-04", "2026-12-05"];

describe("built-in plan", () => {
  it("loads with goals and water settings", () => {
    expect(pack.routine.length).toBeGreaterThan(100);
    expect(pack.goals.map((g) => g.priority)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(pack.water).toEqual({ start: "06:30", end: "21:30", intervalMin: 30 });
  });

  it.each([0, 1, 2, 3, 4, 5, 6])("weekday %i fills 06:30–21:30 without gaps, before and after new items start", (weekday) => {
    for (const date of ["2026-09-28", WEEK[weekday]]) {
      const day = dayTimeline(plan, weekday, 41, date).filter((a) => a.title !== "Sonno");
      let cursor = parseHm("06:30")!;
      for (const a of day) {
        expect(`${a.title} ${a.start}`).toBe(`${a.title} ${hmOf(cursor)}`);
        cursor += durationMinutes(a.start, a.end);
      }
      expect(cursor).toBe(parseHm("21:30"));
    }
  });

  it("puts weights on Mon/Tue/Thu/Fri and MMA on Tue/Thu, weights before MMA", () => {
    const training = (d: number) => dayTimeline(plan, d, 41, WEEK[d]).filter((a) => /^Pesi|^MMA$/.test(a.title)).map((a) => a.title);
    expect(training(1)).toEqual(["Pesi 80′ · Lower B"]);
    expect(training(2)).toEqual(["Pesi 75′ · Upper A", "MMA"]);
    expect(training(3)).toEqual([]);
    expect(training(4)).toEqual(["Pesi 65′ · Lower A (ridotta)", "MMA"]);
    expect(training(5)).toEqual(["Pesi 75′ · Upper B"]);
    const mma = dayTimeline(plan, 2, 41, WEEK[2]).find((a) => a.title === "MMA")!;
    expect([mma.start, mma.end]).toEqual(["19:00", "20:00"]);
    expect(dayTimeline(plan, 2, 41, WEEK[2]).find((a) => a.title === "Bus ritorno")!.start).toBe("20:20");
  });

  it("has the school snack, Thursday lunch at school and every step explained", () => {
    const thu = dayTimeline(plan, 4, 41, WEEK[4]);
    expect(thu.some((a) => a.title === "Spuntino doppio a scuola")).toBe(true);
    expect(thu.find((a) => a.title === "Pranzo a scuola")!.start).toBe("13:00");
    expect(pack.routine.every((a) => a.steps.every((s) => s.detail && s.detail.length > 20))).toBe(true);
    expect(pack.routine.some((a) => /Libero|Riposo|Muay/.test(a.title))).toBe(false);
  });

  it("introduces skincare products one at a time", () => {
    const labels = (date: string) => dayTimeline(plan, 1, 41, date).flatMap((a) => a.steps.map((s) => s.label)).join(" | ");
    expect(labels("2026-09-28")).not.toContain("Melano");
    expect(labels("2026-10-12")).toContain("Melano");
    expect(labels("2026-10-12")).not.toContain("Retinol");
    expect(labels("2026-10-26")).toContain("Retinol");
  });

  it("scales lunch and dinner carbs for 58.7 kg and drops the optional snack", () => {
    const scaled = scalePlanForWeight(plan, 58.7);
    const monday = dayTimeline(scaled, 1, 41, WEEK[1]);
    expect(monday.find((a) => a.title === "Pranzo")!.steps[0].label).toContain("60 g riso");
    expect(monday.flatMap((a) => a.steps).some((s) => s.label.startsWith("Se hai fame"))).toBe(false);
  });
});

function hmOf(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}
