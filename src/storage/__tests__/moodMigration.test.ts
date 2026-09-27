jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";
import { WellnessEntry } from "../../types";
import { loadEntries, migrateEntryMood, upsertEntry } from "../storage";

const legacy = { date: "2026-09-01", mood: 5, sleepHours: 8, waterBottles: 8 } as unknown as WellnessEntry;

describe("mood migration", () => {
  beforeEach(() => AsyncStorage.clear());

  it("converts old 1..5 entries once", () => {
    const migrated = migrateEntryMood(legacy);
    expect(migrated.mood).toBe(4);
    expect(migrated.moodScale).toBe(11);
    expect(migrateEntryMood(migrated).mood).toBe(4);
  });

  it("does not re-migrate entries saved with the new scale", async () => {
    await upsertEntry({ date: "2026-09-02", mood: 1, sleepHours: 8, waterBottles: 8 });
    const entries = await loadEntries();
    expect(entries.find((e) => e.date === "2026-09-02")?.mood).toBe(1);
  });
});
