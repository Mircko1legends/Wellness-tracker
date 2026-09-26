import { buildWeeklyTableCsv, isoWeekLabel, isoWeekNumber, weekStartKey } from "../weeklyTable";

describe("week helpers", () => {
  it("finds the Monday of the week", () => {
    expect(weekStartKey("2026-09-26")).toBe("2026-09-21"); // saturday
    expect(weekStartKey("2026-09-27")).toBe("2026-09-21"); // sunday
    expect(weekStartKey("2026-09-21")).toBe("2026-09-21");
  });

  it("labels ISO weeks, including across the year boundary", () => {
    expect(isoWeekLabel("2026-09-26")).toBe("2026-W39");
    expect(isoWeekLabel("2027-01-01")).toBe("2026-W53");
    expect(isoWeekLabel("2027-01-04")).toBe("2027-W01");
    expect(isoWeekNumber("2026-09-28")).toBe(40);
  });
});

describe("buildWeeklyTableCsv", () => {
  const snapshot = {
    "@wellness/entries": JSON.stringify([
      { date: "2026-09-21", mood: 4, sleepHours: 7.5, waterGlasses: 8, bonusMissions: ["a", "b"], notes: "ok, bene" },
    ]),
    "@wellness/workoutLogs": JSON.stringify([
      { date: "2026-09-21", exerciseSets: [{ repsPerSet: [10, 10, 8] }, { repsPerSet: [12] }] },
    ]),
    "@wellness/medications": JSON.stringify([
      { id: "litio-m", enabled: true },
      { id: "litio-s", enabled: true },
      { id: "old", enabled: false },
    ]),
    "@wellness/medicationLogs": JSON.stringify([
      { date: "2026-09-21", medicationId: "litio-m" },
      { date: "2026-09-21", medicationId: "old" },
    ]),
    "@wellness/lens": "{}",
    "@wellness/lensLog": JSON.stringify([
      { date: "2026-09-21", doneSteps: [], removedAt: 1 },
      { date: "2026-09-22", doneSteps: ["pm-hands"] },
    ]),
    "@wellness/timelineLog": JSON.stringify([{ date: "2026-09-22", doneIds: ["x", "y", "z"], skippedIds: ["w"] }]),
  };

  const lines = buildWeeklyTableCsv(snapshot, "2026-09-24").split("\n");

  it("has a header and seven days from Monday", () => {
    expect(lines).toHaveLength(8);
    expect(lines[1].startsWith("2026-09-21,lunedì")).toBe(true);
    expect(lines[7].startsWith("2026-09-27,domenica")).toBe(true);
  });

  it("fills a tracked day and quotes fields with commas", () => {
    expect(lines[1]).toBe('2026-09-21,lunedì,+4,7.5,8,4,1/2,sì,0,0,2,"ok, bene"');
  });

  it("shows untracked days with zero counts and lens not removed", () => {
    expect(lines[2]).toBe("2026-09-22,martedì,,,,0,0/2,no,3,1,0,");
  });

  it("leaves lens column empty when the lens module was never set up", () => {
    const { ["@wellness/lens"]: _omit, ...withoutLens } = snapshot;
    expect(buildWeeklyTableCsv(withoutLens, "2026-09-21").split("\n")[1].split(",")[7]).toBe("");
  });

  it("survives corrupted values", () => {
    expect(() => buildWeeklyTableCsv({ "@wellness/entries": "{not json" }, "2026-09-21")).not.toThrow();
  });
});
