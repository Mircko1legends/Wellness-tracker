import { buildHealthDaily, mergeWeights, minutesByDay, sleepByNight, stepsByDay, weightsFromRecords } from "../healthData";

describe("Health Connect data", () => {
  it("keeps the first weigh-in of each morning, in kg", () => {
    const w = weightsFromRecords([
      { time: "2026-10-04T06:35:00", weight: { value: 58.72, unit: "kilograms" } },
      { time: "2026-10-04T20:00:00", weight: { value: 59.6, unit: "kilograms" } },
      { time: "2026-10-11T06:40:00", weight: { value: 59000, unit: "grams" } },
    ]);
    expect(w).toEqual([{ date: "2026-10-04", kg: 58.7 }, { date: "2026-10-11", kg: 59 }]);
  });

  it("counts sleep on the morning it ends and training/steps per day", () => {
    expect(sleepByNight([{ startTime: "2026-10-04T21:40:00", endTime: "2026-10-05T06:25:00" }])).toEqual({ "2026-10-05": 8.75 });
    expect(minutesByDay([{ startTime: "2026-10-06T19:00:00", endTime: "2026-10-06T20:00:00" }, { startTime: "2026-10-06T17:25:00", endTime: "2026-10-06T18:40:00" }])).toEqual({ "2026-10-06": 135 });
    expect(stepsByDay([{ startTime: "2026-10-06T08:00:00", endTime: "2026-10-06T09:00:00", count: 1200 }, { startTime: "2026-10-06T12:00:00", endTime: "2026-10-06T13:00:00", count: 800 }])).toEqual({ "2026-10-06": 2000 });
  });

  it("merges into one record per day and never overwrites a manual weight", () => {
    const daily = buildHealthDaily({ sleep: { d: 9 }, steps: { d: 5000 }, exercise: {}, bodyFat: { e: 14.2 } });
    expect(daily).toEqual({ d: { sleepHours: 9, steps: 5000 }, e: { bodyFat: 14.2 } });
    expect(mergeWeights([{ date: "a", kg: 60 }], [{ date: "a", kg: 61 }, { date: "b", kg: 61 }])).toEqual([{ date: "a", kg: 60 }, { date: "b", kg: 61 }]);
  });
});
