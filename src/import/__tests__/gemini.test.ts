import { AiReadError, readDietWithAi, readRoutineWithAi, sanitizeRoutine } from "../gemini";

const settings = { geminiApiKey: "KEY", model: "gemini-2.5-flash" };

function fakeFetch(status: number, payload: unknown) {
  const calls: { url: string; init: any }[] = [];
  const impl = async (url: string, init: any) => {
    calls.push({ url, init });
    return { ok: status < 400, status, json: async () => payload };
  };
  return { impl, calls };
}

const wrap = (obj: unknown) => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] });

describe("readRoutineWithAi", () => {
  it("sends the file inline with the key in a header and parses JSON", async () => {
    const { impl, calls } = fakeFetch(
      200,
      wrap({ activities: [{ title: "Studio", start: "15:00", end: "17:00", days: [1, 3], steps: [{ time: "15:00", label: "Prepara la scrivania" }] }] })
    );
    const activities = await readRoutineWithAi("QUJD", "application/pdf", settings, impl);
    expect(activities).toEqual([{ title: "Studio", start: "15:00", end: "17:00", days: [1, 3], steps: [{ time: "15:00", label: "Prepara la scrivania" }] }]);
    expect(calls[0].url).toContain("models/gemini-2.5-flash:generateContent");
    expect(calls[0].url).not.toContain("KEY");
    expect(calls[0].init.headers["x-goog-api-key"]).toBe("KEY");
    expect(JSON.parse(calls[0].init.body).contents[0].parts[0].inline_data).toEqual({ mime_type: "application/pdf", data: "QUJD" });
  });

  it("maps errors to readable messages", async () => {
    await expect(readRoutineWithAi("x", "application/pdf", settings, fakeFetch(429, {}).impl)).rejects.toThrow("Limite gratuito");
    await expect(readRoutineWithAi("x", "application/pdf", { ...settings, geminiApiKey: " " }, fakeFetch(200, {}).impl)).rejects.toBeInstanceOf(AiReadError);
  });

  it("rejects an empty result", async () => {
    await expect(readRoutineWithAi("x", "application/pdf", settings, fakeFetch(200, wrap({ activities: [] })).impl)).rejects.toThrow("non ha trovato");
  });
});

describe("sanitizeRoutine", () => {
  it("drops invalid entries and normalises times, days and colours", () => {
    expect(
      sanitizeRoutine({
        activities: [
          { title: " Sveglia ", start: "6.30", end: "07:00", color: "red", days: [9, 1, 1] },
          { title: "", start: "08:00", end: "09:00" },
          { title: "Rotto", start: "25:00", end: "09:00" },
        ],
      })
    ).toEqual([{ title: "Sveglia", start: "06:30", end: "07:00", days: [1] }]);
  });
});

describe("readDietWithAi", () => {
  it("returns meals with parsed quantities", async () => {
    const meals = await readDietWithAi(
      "x",
      "image/jpeg",
      settings,
      fakeFetch(200, wrap({ meals: [{ name: "Pranzo", time: "13:00", items: ["100 g riso", "pollo"] }] })).impl
    );
    expect(meals[0].items[0]).toMatchObject({ quantity: 100, unit: "g", food: "riso" });
  });
});
