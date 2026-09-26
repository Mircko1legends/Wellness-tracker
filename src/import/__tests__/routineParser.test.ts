import { joinContiguous, parseRoutine } from "../routineParser";
import { loadFixture } from "../__fixtures__/load";

// Ground truth used to generate the synthetic PDFs in __tests__/fixtures.
const EXPECTED = [
  "06:30-07:00 Sveglia e idratazione",
  "07:00-07:30 Colazione",
  "07:30-08:00 Skincare e doccia",
  "08:00-13:30 Scuola",
  "14:30-17:00 Studio",
  "17:30-19:00 Palestra",
  "19:30-20:30 Inglese C1",
  "21:00-22:30 MMA",
  "23:00-23:30 Routine serale",
];

function summary(name: string) {
  const result = parseRoutine(loadFixture(name))!;
  return { result, lines: result.activities.map((a) => `${a.start}-${a.end} ${a.title}`) };
}

describe("parseRoutine on real engine output", () => {
  it.each(["list", "table"])("reads a %s of times and activities", (name) => {
    const { result, lines } = summary(name);
    expect(result.method).toBe("text");
    expect(lines).toEqual(EXPECTED);
  });

  it("reads a vertical colour timeline with labels inside the blocks", () => {
    const { result, lines } = summary("timeline");
    expect(result.method).toBe("chart");
    expect(lines).toEqual(EXPECTED);
    expect(result.activities[0].color).toBeDefined();
  });

  it("reads a weekly planner using the colour legend and day columns", () => {
    const { result, lines } = summary("week");
    expect(result.method).toBe("chart");
    expect(lines).toEqual(EXPECTED);
    const byTitle = Object.fromEntries(result.activities.map((a) => [a.title, a.days]));
    expect(byTitle["Scuola"]).toEqual([1, 2, 3, 4, 5]);
    expect(byTitle["MMA"]).toEqual([2, 4]);
    expect(byTitle["Studio"]).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("reads a 24h pie chart calibrated by its hour labels, joining sleep across midnight", () => {
    const { result, lines } = summary("pie");
    expect(result.method).toBe("pie");
    expect(lines).toEqual([...EXPECTED, "23:30-06:30 Sonno"]);
  });

  it("finds no routine in a diet plan", () => {
    expect(parseRoutine(loadFixture("diet"))).toBeNull();
  });
});

describe("joinContiguous", () => {
  it("joins consecutive pieces of the same activity only", () => {
    expect(
      joinContiguous([
        { title: "Sonno", start: "23:30", end: "00:00" },
        { title: "Sonno", start: "00:00", end: "06:30" },
        { title: "Studio", start: "15:00", end: "16:00" },
        { title: "Pausa", start: "16:00", end: "16:15" },
      ])
    ).toEqual([
      { title: "Studio", start: "15:00", end: "16:00" },
      { title: "Pausa", start: "16:00", end: "16:15" },
      { title: "Sonno", start: "23:30", end: "06:30" },
    ]);
  });
});
