import {
  DEFAULT_LENS_SETTINGS,
  defaultFriendMessage,
  effectiveFriendMessage,
  formatReminderSchedule,
  lensDayKey,
  markRemoved,
  replacementStatus,
  toggleStep,
  undoRemoved,
} from "../lens";

describe("lensDayKey", () => {
  it("counts late evening as the same day", () => {
    expect(lensDayKey(new Date(2026, 8, 26, 23, 40))).toBe("2026-09-26");
  });
  it("counts just after midnight as the previous evening", () => {
    expect(lensDayKey(new Date(2026, 8, 27, 0, 20))).toBe("2026-09-26");
  });
  it("switches to the new day at noon", () => {
    expect(lensDayKey(new Date(2026, 8, 27, 12, 1))).toBe("2026-09-27");
  });
});

describe("replacementStatus", () => {
  it("counts down a 30-day pair", () => {
    expect(replacementStatus("2026-09-01", 30, "2026-09-26")).toEqual({ dueDate: "2026-10-01", daysLeft: 5, dayNumber: 26 });
  });
  it("reports overdue pairs", () => {
    expect(replacementStatus("2026-09-01", 30, "2026-10-03")?.daysLeft).toBe(-2);
  });
  it("is empty when no start date is set", () => {
    expect(replacementStatus(null, 30, "2026-09-26")).toBeNull();
  });
});

describe("lens log", () => {
  it("toggles checklist steps per day", () => {
    let log = toggleStep([], "2026-09-26", "pm-hands");
    log = toggleStep(log, "2026-09-26", "pm-out");
    log = toggleStep(log, "2026-09-26", "pm-hands");
    expect(log).toEqual([{ date: "2026-09-26", doneSteps: ["pm-out"] }]);
  });
  it("marks and undoes removal without touching steps", () => {
    const removed = markRemoved([{ date: "2026-09-26", doneSteps: ["pm-out"] }], "2026-09-26", 123);
    expect(removed[0].removedAt).toBe(123);
    expect(undoRemoved(removed, "2026-09-26")).toEqual([{ date: "2026-09-26", doneSteps: ["pm-out"] }]);
  });
});

describe("friend message", () => {
  it("says it's automatic and asks to call", () => {
    const msg = defaultFriendMessage("Mirko");
    expect(msg).toContain("Messaggio automatico");
    expect(msg).toContain("Mirko");
    expect(msg).toContain("Chiamalo il prima possibile");
  });
  it("prefers a custom message when set", () => {
    expect(effectiveFriendMessage({ ...DEFAULT_LENS_SETTINGS, friendMessage: "Chiama!" })).toBe("Chiama!");
  });
});

describe("formatReminderSchedule", () => {
  it("lists reminder times before the deadline, earliest first, across midnight", () => {
    expect(formatReminderSchedule({ ...DEFAULT_LENS_SETTINGS, deadlineHour: 0, deadlineMinute: 15, reminderOffsets: [15, 60, 30] }))
      .toEqual(["23:15", "23:45", "00:00"]);
  });
});
