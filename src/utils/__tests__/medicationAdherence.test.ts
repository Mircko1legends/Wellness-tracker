import { Medication, MedicationLogEntry } from "../../types";
import { computeMedicationAdherence } from "../medicationAdherence";
import { addDays, toDateKey } from "../date";

const today = new Date("2026-01-10T12:00:00");

function medication(overrides: Partial<Medication> = {}): Medication {
  return { id: "m1", name: "Vitamina D", hour: 8, minute: 0, enabled: true, ...overrides };
}

describe("computeMedicationAdherence", () => {
  it("returns a null rate when there are no enabled medications", () => {
    expect(computeMedicationAdherence([], [], 7, today)).toEqual({
      takenCount: 0,
      expectedCount: 0,
      rate: null,
    });
  });

  it("ignores disabled medications entirely", () => {
    const meds = [medication({ enabled: false })];
    expect(computeMedicationAdherence(meds, [], 7, today).rate).toBeNull();
  });

  it("computes a perfect adherence rate when every expected dose was logged", () => {
    const meds = [medication()];
    const logs: MedicationLogEntry[] = [0, 1, 2, 3, 4, 5, 6].map((i) => ({
      date: toDateKey(addDays(today, -i)),
      medicationId: "m1",
    }));
    const result = computeMedicationAdherence(meds, logs, 7, today);
    expect(result).toEqual({ takenCount: 7, expectedCount: 7, rate: 1 });
  });

  it("computes a partial adherence rate when some doses were missed", () => {
    const meds = [medication()];
    const logs: MedicationLogEntry[] = [0, 1, 2].map((i) => ({
      date: toDateKey(addDays(today, -i)),
      medicationId: "m1",
    }));
    const result = computeMedicationAdherence(meds, logs, 7, today);
    expect(result).toEqual({ takenCount: 3, expectedCount: 7, rate: 3 / 7 });
  });

  it("scales expected doses with the number of enabled medications", () => {
    const meds = [medication({ id: "m1" }), medication({ id: "m2", enabled: false }), medication({ id: "m3" })];
    const logs: MedicationLogEntry[] = [
      { date: toDateKey(today), medicationId: "m1" },
      { date: toDateKey(today), medicationId: "m3" },
    ];
    const result = computeMedicationAdherence(meds, logs, 1, today);
    expect(result).toEqual({ takenCount: 2, expectedCount: 2, rate: 1 });
  });

  it("does not count logs outside the requested window", () => {
    const meds = [medication()];
    const logs: MedicationLogEntry[] = [{ date: toDateKey(addDays(today, -10)), medicationId: "m1" }];
    const result = computeMedicationAdherence(meds, logs, 7, today);
    expect(result).toEqual({ takenCount: 0, expectedCount: 7, rate: 0 });
  });
});
