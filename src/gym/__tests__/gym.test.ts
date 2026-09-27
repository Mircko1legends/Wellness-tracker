import { formatRest, youtubeId, GymSession, lastSessionWith, PROGRAMS, programFromTitles, sessionVolume, suggestNext, upsertSession, formatSets } from "../gym";

const squat = PROGRAMS.LA[0]; // 4 × 5–8, +5 kg (PDF)

describe("gym log", () => {
  it("reads the programme from the timeline titles", () => {
    expect(programFromTitles(["Colazione", "Pesi 75′ · Upper A", "MMA"])).toEqual({ program: "UA", beforeMma: true });
    expect(programFromTitles(["Pesi 80′ · Lower B"])).toEqual({ program: "LB", beforeMma: false });
    expect(programFromTitles(["MMA"])).toBeNull();
  });

  it("starts from the default weight the first time", () => {
    const s = suggestNext(squat, undefined);
    expect(s.kg).toBe(30);
    expect(s.reps).toEqual([5, 5, 5, 5]);
  });

  it("adds a rep at the same weight until the top of the range", () => {
    const s = suggestNext(squat, [{ kg: 40, reps: 6 }, { kg: 40, reps: 5 }, { kg: 40, reps: 8 }, { kg: 40, reps: 7 }]);
    expect(s.kg).toBe(40);
    expect(s.reps).toEqual([7, 6, 8, 8]);
  });

  it("adds weight once every set hits the top", () => {
    const s = suggestNext(squat, [{ kg: 40, reps: 8 }, { kg: 40, reps: 8 }, { kg: 40, reps: 8 }, { kg: 40, reps: 9 }]);
    expect(s.kg).toBe(45);
    expect(s.reps).toEqual([5, 5, 5, 5]);
  });

  it("finds the previous session and replaces same-day saves", () => {
    const a: GymSession = { date: "2026-10-05", program: "LA", exercises: { squat: [{ kg: 40, reps: 8 }] }, savedAt: 1 };
    const b: GymSession = { ...a, date: "2026-10-09", exercises: { squat: [{ kg: 40, reps: 9 }] } };
    let log = upsertSession(upsertSession([], a), b);
    log = upsertSession(log, { ...b, exercises: { squat: [{ kg: 40, reps: 10 }] } });
    expect(log).toHaveLength(2);
    expect(lastSessionWith(log, "squat", "2026-10-12")?.date).toBe("2026-10-09");
    expect(lastSessionWith(log, "squat", "2026-10-09")?.date).toBe("2026-10-05");
    expect(sessionVolume(log[1])).toBe(400);
    expect(formatSets([{ kg: 12.5, reps: 8 }, { kg: 12.5, reps: 7 }])).toBe("12,5 kg × 8, 7");
  });

  it("formats rest and reads YouTube links", () => {
    expect(formatRest(150)).toBe("2:30");
    expect(youtubeId("https://www.youtube.com/watch?v=abcdefghijk&t=3")).toBe("abcdefghijk");
    expect(youtubeId("https://m.youtube.com/watch?app=m&v=ABCDEFGHIJK")).toBe("ABCDEFGHIJK");
    expect(youtubeId("https://youtu.be/abc_def-123")).toBe("abc_def-123");
    expect(youtubeId("https://m.youtube.com/results?search_query=squat")).toBeNull();
  });
});
