import {
  addBottles,
  bottlesOn,
  DEFAULT_WATER_SETTINGS,
  migrateWaterLog,
  migrateWaterSettings,
  reminderBody,
  reminderTimes,
  targetBottles,
} from "../water";

describe("water", () => {
  it("reminds every 30' across the waking day", () => {
    const times = reminderTimes(DEFAULT_WATER_SETTINGS);
    expect(times[0]).toBe("06:30");
    expect(times[times.length - 1]).toBe("21:00");
    expect(times).toHaveLength(30);
    expect(reminderTimes({ start: "07:00", end: "09:00", intervalMin: 45 })).toEqual(["07:00", "07:45", "08:30"]);
  });

  it("rejects nonsense intervals", () => {
    expect(reminderTimes({ start: "07:00", end: "09:00", intervalMin: 5 })).toEqual([]);
  });

  it("counts finished bottles per day without going below zero", () => {
    let log = addBottles([], "d", 1);
    log = addBottles(log, "d", 1);
    expect(bottlesOn(log, "d")).toBe(2);
    expect(bottlesOn(addBottles(log, "d", -5), "d")).toBe(0);
  });

  it("asks for sips, not glasses, towards 10 bottles", () => {
    expect(targetBottles(DEFAULT_WATER_SETTINGS)).toBe(10);
    const body = reminderBody(DEFAULT_WATER_SETTINGS);
    expect(body).toContain("1/3 di bottiglietta");
    expect(body).toContain("10 bottigliette (5 L)");
  });

  it("converts old glass data once", () => {
    expect(migrateWaterSettings({ enabled: false, glassMl: 250, targetMl: 2750, intervalMin: 60 })).toMatchObject({ enabled: false, targetBottles: 10, intervalMin: 30 });
    expect(migrateWaterLog([{ date: "d", glasses: 6 }, { date: "e", bottles: 3 }])).toEqual([{ date: "d", bottles: 3 }, { date: "e", bottles: 3 }]);
  });
});
