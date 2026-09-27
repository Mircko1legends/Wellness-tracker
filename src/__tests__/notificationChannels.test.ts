jest.mock("expo-notifications", () => ({}));
import { soundForActivity } from "../notificationChannels";

describe("sound for each activity", () => {
  it.each([
    ["Colazione", "meal"],
    ["Cucina: teglia pollo e riso", "meal"],
    ["Pesi 75′ · Upper A", "training"],
    ["MMA", "training"],
    ["Studio 90′ · Matematica", "study"],
    ["Bus · inglese", "study"],
    ["Igiene mattina", "hygiene"],
    ["Routine serale", "sleep"],
    ["Sonno", "sleep"],
    ["Vestiti, zaino", "routine"],
  ])("%s → %s", (title, kind) => {
    expect(soundForActivity(title)).toBe(kind);
  });
});
