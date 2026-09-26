import { addGlasses, DEFAULT_WATER_SETTINGS, glassesOn, reminderBody, reminderTimes, targetGlasses } from "../water";

describe("water", () => {
  it("spreads reminders across the waking day", () => {
    const times = reminderTimes(DEFAULT_WATER_SETTINGS);
    expect(times[0]).toBe("06:30");
    expect(times[times.length - 1]).toBe("20:30");
    expect(times).toHaveLength(15);
    expect(reminderTimes({ start: "07:00", end: "09:00", intervalMin: 45 })).toEqual(["07:00", "07:45", "08:30"]);
  });

  it("rejects nonsense intervals", () => {
    expect(reminderTimes({ start: "07:00", end: "09:00", intervalMin: 5 })).toEqual([]);
  });

  it("counts glasses per day without going below zero", () => {
    let log = addGlasses([], "d", 1);
    log = addGlasses(log, "d", 1);
    expect(glassesOn(log, "d")).toBe(2);
    expect(glassesOn(addGlasses(log, "d", -5), "d")).toBe(0);
  });

  it("derives the target in glasses", () => {
    expect(targetGlasses(DEFAULT_WATER_SETTINGS)).toBe(11);
    expect(reminderBody(DEFAULT_WATER_SETTINGS)).toContain("2,75 L (11 bicchieri)");
  });
});
