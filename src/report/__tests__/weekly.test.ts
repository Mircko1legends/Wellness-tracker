import { DEFAULT_WATER_SETTINGS } from "../../water/water";
import { defaultPlanPack } from "../../timeline/pack";
import { dayTimeline, setStepStatus, TimelineDayLog } from "../../timeline/plan";
import { brainstormDates, computeWeekReport, reportText, weekDays } from "../weekly";

const pack = defaultPlanPack();
const plan = { routine: pack.routine, meals: pack.meals };

describe("weekly report", () => {
  it("counts the ISO week from Monday up to today", () => {
    expect(weekDays("2026-10-07")).toEqual(["2026-10-05", "2026-10-06", "2026-10-07"]);
    expect(weekDays("2026-10-11")).toHaveLength(7);
  });

  it("splits micro-actions by area and lists the most skipped", () => {
    const monday = dayTimeline(plan, 1, 41);
    const gym = monday.find((a) => /Pesi/.test(a.title))!;
    const meal = monday.find((a) => a.title === "Pranzo")!;
    const skin = monday.flatMap((a) => a.steps).find((s) => /face wash/i.test(s.label))!;
    let log: TimelineDayLog[] = [];
    log = setStepStatus(log, "2026-10-05", gym.steps[0].id, "done");
    log = setStepStatus(log, "2026-10-05", gym.steps[1].id, "skipped");
    log = setStepStatus(log, "2026-10-05", meal.steps[0].id, "done");
    log = setStepStatus(log, "2026-10-05", skin.id, "done");
    const r = computeWeekReport(
      {
        plan,
        timelineLog: log,
        water: [{ date: "2026-10-05", bottles: 10 }],
        waterSettings: DEFAULT_WATER_SETTINGS,
        entries: [{ date: "2026-10-05", mood: -3, sleepHours: 8, waterBottles: 0 }],
        moodRange: 2,
        gymLog: [{ date: "2026-10-05", program: "LA", exercises: { squat: [{ kg: 40, reps: 8 }] }, savedAt: 1 }],
        goals: pack.goals ?? [],
      },
      "2026-10-05"
    );
    expect(r.areas.allenamento).toMatchObject({ done: 1, skipped: 1 });
    expect(r.areas.dieta.done).toBe(1);
    expect(r.areas.skincare.done).toBe(1);
    expect(r.mostSkipped[0].skipped).toBe(1);
    expect(r.water.daysOnTarget).toBe(1);
    expect(r.mood.stableDays).toBe(0);
    const text = reportText(r);
    expect(text).toContain("2026-W41");
    expect(text).toContain("Umore: −3");
    expect(text).toContain("Squat con bilanciere 40 kg");
  });

  it("never schedules the brainstorm before the first agreed Sunday", () => {
    expect(brainstormDates("2026-09-26", 2)).toEqual(["2026-10-04", "2026-10-11"]);
    expect(brainstormDates("2026-10-12", 1)).toEqual(["2026-10-18"]);
    expect(brainstormDates("2026-10-18", 1)).toEqual(["2026-10-18"]);
  });
});
