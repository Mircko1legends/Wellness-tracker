import { planNotifications } from "../notifications";
import { buildRoutine } from "../plan";

jest.mock("expo-notifications", () => ({}));
jest.mock("../../notifications", () => ({ isNotificationsSupported: false, requestNotificationPermission: jest.fn() }));

describe("planNotifications", () => {
  const routine = buildRoutine([
    { title: "Sveglia e idratazione", start: "06:30", end: "07:00" },
    { title: "MMA", start: "21:00", end: "22:30", days: [2, 4] },
  ]);

  it("collapses every-day activities into one entry and keeps weekly ones per day", () => {
    const planned = planNotifications({ routine, meals: [] }, false);
    expect(planned).toHaveLength(2);
    const wake = planned.find((p) => p.title.includes("Sveglia"))!;
    expect(wake.weekdays.size).toBe(7);
    expect(wake.body).toBe("Spegni la sveglia e alzati subito (+3 passi)");
    expect([...planned.find((p) => p.title.includes("MMA"))!.weekdays]).toEqual([2, 4]);
  });

  it("adds one notification per micro-step when asked", () => {
    const planned = planNotifications({ routine, meals: [] }, true);
    expect(planned.length).toBe(2 + 3 + 3);
    expect(planned.some((p) => p.title === "06:40 · Sveglia e idratazione" && p.body === "Bevi un bicchiere d'acqua")).toBe(true);
  });

  it("collapses odd/even-week variants into one weekly notification", () => {
    const base = { start: "18:40", end: "19:25", kind: "routine" as const, days: [1], group: "Pesi 45'" };
    const planned = planNotifications(
      {
        routine: [
          { ...base, id: "a", title: "Pesi 45' · Scheda A", weeks: "odd", steps: [{ id: "a1", time: "18:40", label: "Squat" }] },
          { ...base, id: "b", title: "Pesi 45' · Scheda B", weeks: "even", steps: [{ id: "b1", time: "18:40", label: "Pressa" }] },
        ],
        meals: [],
      },
      true
    );
    expect(planned).toHaveLength(1);
    expect(planned[0].title).toBe("18:40 · Pesi 45'");
    expect(planned[0].activity).toEqual({ time: "18:40", name: "Pesi 45'" });
  });

  it("gives action buttons only to the start of an activity", () => {
    const planned = planNotifications({ routine, meals: [] }, true);
    expect(planned.filter((p) => p.activity).map((p) => p.activity!.name).sort()).toEqual(["MMA", "Sveglia e idratazione"]);
    expect(planned.some((p) => !p.activity)).toBe(true);
  });
});
