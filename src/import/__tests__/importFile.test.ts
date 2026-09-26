import { loadFixture } from "../__fixtures__/load";
import { decodeUtf8Base64, importFile, textToAnalysis } from "../importFile";
import { parseRoutine } from "../routineParser";

const noAi = { geminiApiKey: "", model: "gemini-2.5-flash" };
const pdf = (name = "routine.pdf") => ({ name, mimeType: "application/pdf", base64: "AAAA" });
const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64");

describe("importFile", () => {
  it("uses the on-device reading when it is confident", async () => {
    const out = await importFile("routine", pdf(), async () => loadFixture("pie"), noAi);
    expect(out.method).toBe("pie");
    expect(out.activities.length).toBeGreaterThan(5);
    expect(out.error).toBeUndefined();
  });

  it("reads plain text files, including CSV-like separators", async () => {
    const text = "07:00;07:30;Colazione\n07:30-08:00 Doccia\n08:00 - 13:00 Scuola\n";
    const out = await importFile("routine", { name: "r.txt", mimeType: "text/plain", base64: b64(text) }, async () => {
      throw new Error("not a pdf");
    }, noAi);
    expect(out.activities.map((a) => a.title)).toEqual(["Colazione", "Doccia", "Scuola"]);
  });

  it("explains how to proceed when nothing can be read and there is no AI key", async () => {
    const out = await importFile("routine", { name: "foto.jpg", mimeType: "image/jpeg", base64: "AAAA" }, async () => loadFixture("list"), noAi);
    expect(out.method).toBe("manual");
    expect(out.error).toContain("Gemini");
  });

  it("reads a diet with the diet parser", async () => {
    const out = await importFile("diet", pdf("dieta.pdf"), async () => loadFixture("diet"), noAi);
    expect(out.meals).toHaveLength(5);
  });

  it("textToAnalysis keeps one line per row", () => {
    expect(parseRoutine(textToAnalysis("06:30 - 07:00 Sveglia\n07:00 - 07:30 Colazione\n07:30 - 08:00 Doccia"))?.activities).toHaveLength(3);
  });
});

describe("decodeUtf8Base64", () => {
  it("decodes accents, emoji and strips a BOM", () => {
    const text = "\uFEFFAttività: caffè ☕ e più 🏋️";
    expect(decodeUtf8Base64(Buffer.from(text, "utf8").toString("base64"))).toBe("Attività: caffè ☕ e più 🏋️");
  });
});
