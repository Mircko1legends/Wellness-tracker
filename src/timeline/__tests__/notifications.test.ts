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
});
