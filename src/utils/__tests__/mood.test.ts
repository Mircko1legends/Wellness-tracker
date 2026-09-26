import { formatMood, isMoodStable, migrateLegacyMood, MOOD_LEVELS, moodBand, moodLevel, needsSupport } from "../mood";

describe("mood scale", () => {
  it("has 5 levels up, 5 down and 1 neutral", () => {
    expect(MOOD_LEVELS).toHaveLength(11);
    expect(MOOD_LEVELS.filter((l) => l.value > 0)).toHaveLength(5);
    expect(MOOD_LEVELS.filter((l) => l.value < 0)).toHaveLength(5);
    expect(moodLevel(0).label).toBe("Neutro");
  });

  it("formats signed values", () => {
    expect(formatMood(3)).toBe("+3");
    expect(formatMood(-2)).toBe("−2");
    expect(formatMood(0)).toBe("0");
    expect(moodBand(-1)).toBe("down");
  });

  it("treats both directions symmetrically for stability", () => {
    expect(isMoodStable(2, 2)).toBe(true);
    expect(isMoodStable(-2, 2)).toBe(true);
    expect(isMoodStable(3, 2)).toBe(false);
    expect(isMoodStable(-3, 2)).toBe(false);
  });

  it("maps the old 1..5 scale around 0", () => {
    expect([1, 2, 3, 4, 5].map(migrateLegacyMood)).toEqual([-4, -2, 0, 2, 4]);
  });

  it("asks for support only at the extremes", () => {
    expect(needsSupport(5)).toBe(true);
    expect(needsSupport(-5)).toBe(true);
    expect(needsSupport(4)).toBe(false);
  });
});
