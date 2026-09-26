import { GymSession, lastSessionWith, PROGRAMS, programFromTitles, sessionVolume, suggestNext, upsertSession, formatSets } from "../gym";

const squat = PROGRAMS.A[0]; // 3 × 6–10, +2.5

describe("gym log", () => {
  it("reads the programme from the timeline titles", () => {
    expect(programFromTitles(["Colazione", "Pesi 45′ · Scheda B"])).toBe("B");
    expect(programFromTitles(["Muay Thai 90′"])).toBeNull();
  });

  it("starts from the default weight the first time", () => {
    const s = suggestNext(squat, undefined);
    expect(s.kg).toBe(squat.startKg);
    expect(s.reps).toEqual([6, 6, 6]);
  });

  it("adds a rep at the same weight until the top of the range", () => {
    const s = suggestNext(squat, [{ kg: 40, reps: 8 }, { kg: 40, reps: 7 }, { kg: 40, reps: 10 }]);
    expect(s.kg).toBe(40);
    expect(s.reps).toEqual([9, 8, 10]);
  });

  it("adds weight once every set hits the top", () => {
    const s = suggestNext(squat, [{ kg: 40, reps: 10 }, { kg: 40, reps: 10 }, { kg: 40, reps: 11 }]);
    expect(s.kg).toBe(42.5);
    expect(s.reps).toEqual([6, 6, 6]);
  });

  it("finds the previous session and replaces same-day saves", () => {
    const a: GymSession = { date: "2026-10-05", program: "A", exercises: { squat: [{ kg: 40, reps: 8 }] }, savedAt: 1 };
    const b: GymSession = { ...a, date: "2026-10-09", exercises: { squat: [{ kg: 40, reps: 9 }] } };
    let log = upsertSession(upsertSession([], a), b);
    log = upsertSession(log, { ...b, exercises: { squat: [{ kg: 40, reps: 10 }] } });
    expect(log).toHaveLength(2);
    expect(lastSessionWith(log, "squat", "2026-10-12")?.date).toBe("2026-10-09");
    expect(lastSessionWith(log, "squat", "2026-10-09")?.date).toBe("2026-10-05");
    expect(sessionVolume(log[1])).toBe(400);
    expect(formatSets([{ kg: 12.5, reps: 8 }, { kg: 12.5, reps: 7 }])).toBe("12,5 kg × 8, 7");
  });
});
