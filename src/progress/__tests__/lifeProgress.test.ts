import { defaultPlanPack } from "../../timeline/pack";
import { dayTimeline, setStepStatus, TimelineDayLog } from "../../timeline/plan";
import { DEFAULT_GOALS } from "../../types";
import { DEFAULT_WATER_SETTINGS } from "../../water/water";
import {
  computeXp,
  dayGoals,
  levelFor,
  missionStatus,
  ProgressData,
  progressDataFromSnapshot,
  streaks,
  trainingMinutes,
  weekTraining,
  xpForLevel,
} from "../lifeProgress";

const pack = defaultPlanPack();
const plan = { routine: pack.routine, meals: pack.meals };
const TUE = "2026-12-01";

function data(over: Partial<ProgressData> = {}): ProgressData {
  return {
    entries: [],
    goals: DEFAULT_GOALS,
    plan,
    timelineLog: [],
    water: [],
    waterSettings: DEFAULT_WATER_SETTINGS,
    gymLog: [],
    mealLog: [],
    weightLog: [],
    medicationLogs: [],
    medicationCount: 0,
    lensLog: [],
    finance: null,
    lifeGoals: [],
    photos: [],
    ...over,
  };
}

function doAll(log: TimelineDayLog[], date: string, titles: RegExp): TimelineDayLog[] {
  const acts = dayTimeline(plan, new Date(date).getDay(), undefined, date).filter((a) => titles.test(a.title));
  return acts.reduce((l, a) => a.steps.reduce((ll, s) => setStepStatus(ll, date, s.id, "done"), l), log);
}

describe("levels 0–99", () => {
  it("starts at 0 and grows slower and slower", () => {
    expect(levelFor(0)).toMatchObject({ level: 0, title: "Punto di partenza" });
    expect(levelFor(37).level).toBe(1);
    expect(xpForLevel(10)).toBeGreaterThan(7000);
    expect(xpForLevel(99)).toBeGreaterThan(1_000_000);
    expect(levelFor(xpForLevel(99)).level).toBe(99);
    expect(levelFor(10_000_000).title).toBe("La miglior versione di te");
  });
});

describe("training hours", () => {
  it("counts weights and MMA on Tuesday from the steps done", () => {
    const log = doAll([], TUE, /^Pesi|^MMA$/);
    const t = trainingMinutes(plan, log, TUE);
    expect(t.planned).toBe(135);
    expect(t.done).toBe(135);
    expect(trainingMinutes(plan, [], "2026-12-02").planned).toBe(15); // Wednesday: shadow only
  });

  it("sums the week in half hours", () => {
    const w = weekTraining(data(), TUE);
    expect(w.plannedHours).toBe(8);
    expect(w.doneHours).toBe(0);
  });
});

describe("XP from every action", () => {
  it("gives a little for every logged thing and a lot for milestones", () => {
    const log = setStepStatus(setStepStatus([], TUE, "x1", "done"), TUE, "x2", "skipped");
    const xp = computeXp(
      data({
        timelineLog: log,
        water: [{ date: TUE, bottles: 4 }],
        entries: [{ date: TUE, mood: 0, sleepHours: 9, waterBottles: 4 }],
        lifeGoals: [{ id: "goal1", title: "Maturità", priority: 1, milestones: [{ id: "m", title: "x", due: "2026-12", done: true, doneAt: new Date(TUE).getTime() }] }],
      }),
      TUE
    );
    expect(xp.byArea.Giornata).toBe(4);
    expect(xp.byArea.Acqua).toBe(12);
    expect(xp.byArea.Registro).toBe(10);
    expect(xp.byArea.Obiettivi).toBe(2500);
    expect(xp.today).toBe(xp.total);
  });
});

describe("daily goals, streak and missions", () => {
  it("meets the day with 9 h sleep, 10 bottles, stable mood and the planned training", () => {
    const d = data({
      entries: [{ date: TUE, mood: 1, sleepHours: 9, waterBottles: 10 }],
      timelineLog: doAll([], TUE, /^Pesi|^MMA$/),
    });
    expect(dayGoals(d, TUE)).toMatchObject({ sleep: true, water: true, mood: true, training: true, all: true });
    expect(streaks(d, TUE)).toEqual({ current: 1, best: 1 });
    expect(missionStatus(d, TUE, "training")).toBe(true);
    expect(missionStatus(d, TUE, "water")).toBe(true);
    expect(missionStatus(d, TUE, "meds")).toBeNull(); // no medicines set up
    expect(missionStatus(d, "2026-12-05", "english")).toBeNull(); // Saturday: no bus
  });

  it("reads old data from a storage snapshot", () => {
    const d = progressDataFromSnapshot({
      "@wellness/entries": JSON.stringify([{ date: TUE, mood: 4, sleepHours: 9, waterGlasses: 8 }]),
      "@wellness/waterLog": JSON.stringify([{ date: TUE, glasses: 6 }]),
    });
    expect(d.entries[0]).toMatchObject({ mood: 2, waterBottles: 4 });
    expect(d.water[0].bottles).toBe(3);
  });
});
