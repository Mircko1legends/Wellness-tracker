import { parsePrescription } from "../prescription";

describe("parsePrescription", () => {
  it("parses a plain rep count", () => {
    expect(parsePrescription("12")).toEqual({
      isTimeBased: false,
      isAmrap: false,
      perSide: false,
      target: 12,
    });
  });

  it("parses a time-based hold", () => {
    expect(parsePrescription("30s")).toEqual({
      isTimeBased: true,
      isAmrap: false,
      perSide: false,
      target: 30,
    });
  });

  it("parses a per-side rep prescription", () => {
    expect(parsePrescription("8 per gamba")).toEqual({
      isTimeBased: false,
      isAmrap: false,
      perSide: true,
      target: 8,
    });
  });

  it("parses a per-side time-based prescription", () => {
    expect(parsePrescription("20s per lato")).toEqual({
      isTimeBased: true,
      isAmrap: false,
      perSide: true,
      target: 20,
    });
  });

  it("parses AMRAP with no fixed target", () => {
    expect(parsePrescription("AMRAP")).toEqual({
      isTimeBased: false,
      isAmrap: true,
      perSide: false,
      target: 0,
    });
  });
});
