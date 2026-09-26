import { goalProgress, LifeGoal, mergeGoals, milestoneTiming, nextMilestone, sortGoals, toggleMilestone } from "../goals";
import { parsePlanPack } from "../../timeline/pack";

const goal: LifeGoal = {
  id: "mat",
  title: "100 alla maturità",
  priority: 1,
  milestones: [
    { id: "a", title: "Media ≥ 9", due: "2027-02" },
    { id: "b", title: "Test diagnostico", due: "2026-10" },
    { id: "c", title: "Esame", due: "2027-06" },
  ],
};

describe("goals", () => {
  it("computes progress and the next milestone by date", () => {
    const toggled = toggleMilestone([goal], "mat", "b", 1)[0];
    expect(goalProgress(toggled)).toEqual({ done: 1, total: 3, percent: 33 });
    expect(nextMilestone(toggled)?.id).toBe("a");
    expect(toggleMilestone([toggled], "mat", "b", 2)[0].milestones.find((m) => m.id === "b")?.done).toBe(false);
  });

  it("orders by priority and classifies timing", () => {
    expect(sortGoals([{ ...goal, id: "x", priority: 3 }, goal]).map((g) => g.id)).toEqual(["mat", "x"]);
    expect(milestoneTiming(goal.milestones[1], "2026-11")).toBe("past");
    expect(milestoneTiming(goal.milestones[1], "2026-10")).toBe("now");
  });

  it("keeps done marks when re-importing", () => {
    const done = toggleMilestone([goal], "mat", "a", 5);
    const merged = mergeGoals(done, [{ ...goal, milestones: [...goal.milestones, { id: "d", title: "Nuovo", due: "2027-03" }] }]);
    expect(merged[0].milestones.find((m) => m.id === "a")).toMatchObject({ done: true, doneAt: 5 });
    expect(merged[0].milestones).toHaveLength(4);
  });
});

describe("parsePlanPack", () => {
  it("accepts a valid pack and drops invalid pieces", () => {
    const pack = parsePlanPack(
      JSON.stringify({
        app: "wellness-tracker-plan",
        name: "Test",
        routine: [
          { id: "r1", title: "Studio", start: "15:15", end: "16:30", days: [1, 9], weeks: "odd", essential: false, steps: [{ time: "15:15", label: "Scrivi l'obiettivo" }, { time: "xx", label: "bad" }] },
          { title: "Senza orari" },
        ],
        meals: [],
        goals: [{ id: "g", title: "Goal", milestones: [{ title: "M", due: "2026-10" }, { title: "bad", due: "ottobre" }] }],
        water: { start: "06:30", end: "21:30", intervalMin: 60 },
      })
    )!;
    expect(pack.routine).toHaveLength(1);
    expect(pack.routine[0]).toMatchObject({ days: [1], weeks: "odd", essential: false, kind: "routine" });
    expect(pack.routine[0].steps).toEqual([{ id: "r1-s0", time: "15:15", label: "Scrivi l'obiettivo" }]);
    expect(pack.goals[0].milestones).toHaveLength(1);
    expect(pack.water).toEqual({ start: "06:30", end: "21:30", intervalMin: 60 });
  });

  it("rejects other JSON files", () => {
    expect(parsePlanPack('{"app":"wellness-tracker"}')).toBeNull();
    expect(parsePlanPack("not json")).toBeNull();
  });
});
