import { loadFixture } from "../__fixtures__/load";
import { parseDiet, parseDietItem } from "../dietParser";
import { PdfAnalysis } from "../types";

function textAnalysis(lines: string[]): PdfAnalysis {
  return {
    numPages: 1,
    pages: [
      {
        width: 700, height: 1000, cell: 2, cols: 0, rows: 0, grid: "", palette: [],
        texts: lines.map((str, i) => ({ str, x: 50, y: 50 + i * 20, w: 200, h: 12 })),
      },
    ],
  };
}

describe("parseDiet", () => {
  it("reads meals, times and quantities from a real PDF", () => {
    const result = parseDiet(loadFixture("diet"))!;
    expect(result.meals.map((m) => `${m.time} ${m.name} (${m.items.length})`)).toEqual([
      "07:15 Colazione (4)",
      "10:30 Spuntino (2)",
      "13:45 Pranzo (4)",
      "17:00 Pre-workout (2)",
      "20:45 Cena (4)",
    ]);
    expect(result.meals[0].items[0]).toEqual({ text: "80 g fiocchi d'avena", quantity: 80, unit: "g", food: "fiocchi d'avena" });
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it("accepts leading times, 'ore' and foods on the header line, guessing missing times", () => {
    const result = parseDiet(
      textAnalysis(["13:00 Pranzo", "• 100 g riso", "Cena ore 20.30: 150 g salmone, verdure", "Merenda", "1 mela"])
    )!;
    expect(result.meals.map((m) => `${m.time} ${m.name}: ${m.items.map((i) => i.food).join("|")}`)).toEqual([
      "13:00 Pranzo: riso",
      "16:30 Merenda: mela",
      "20:30 Cena: salmone|verdure",
    ]);
    expect(result.notes.length).toBe(1);
  });

  it("returns null for a routine", () => {
    expect(parseDiet(loadFixture("list"))).toBeNull();
  });
});

describe("parseDietItem", () => {
  it.each([
    ["2 fette pane integrale", { quantity: 2, unit: "fette", food: "pane integrale" }],
    ["250 ml di latte", { quantity: 250, unit: "ml", food: "latte" }],
    ["1,5 kg patate", { quantity: 1.5, unit: "kg", food: "patate" }],
    ["insalata mista a volontà", { food: "insalata mista a volontà" }],
  ])("parses %s", (raw, expected) => {
    expect(parseDietItem(raw)).toMatchObject(expected);
  });
});
