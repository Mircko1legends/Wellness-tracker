import { scaleCarbs, scalePlanForWeight, weightSteps } from "../scaling";
import { monthTopic } from "../../data/studyCalendar";

describe("menu scaled to body weight", () => {
  it("counts whole 5 kg steps from 70 kg", () => {
    expect(weightSteps(58.7)).toBe(-2);
    expect(weightSteps(60)).toBe(-2);
    expect(weightSteps(60.1)).toBe(-1);
    expect(weightSteps(72)).toBe(0);
    expect(weightSteps(75)).toBe(1);
  });

  it("changes pasta/rice by 30 g per step, potatoes and bread by their equivalents", () => {
    expect(scaleCarbs("150 g pollo + 120 g riso (peso crudo) + 200 g verdure", -2)).toBe("150 g pollo + 60 g riso (peso crudo) + 200 g verdure");
    expect(scaleCarbs("100 g pasta + 120 g tonno", -2)).toBe("40 g pasta + 120 g tonno");
    expect(scaleCarbs("150 g pollo + 400 g patate + 60 g pane", -2)).toBe("150 g pollo + 160 g patate + 60 g pane");
    expect(scaleCarbs("3 uova + 100 g pane", -2)).toBe("3 uova + 45 g pane");
    expect(scaleCarbs("100 g pasta", 1)).toBe("130 g pasta");
  });

  it("drops the optional snack only when lighter than the reference", () => {
    const plan = {
      routine: [
        {
          id: "a",
          title: "Cena",
          start: "19:30",
          end: "19:45",
          kind: "routine" as const,
          steps: [
            { id: "s1", time: "19:30", label: "100 g pasta + tonno", carbs: true },
            { id: "s2", time: "19:40", label: "250 ml latte", optional: true },
          ],
        },
      ],
      meals: [],
    };
    const light = scalePlanForWeight(plan, 58.7).routine[0].steps;
    expect(light.map((s) => s.label)).toEqual(["40 g pasta + tonno"]);
    expect(scalePlanForWeight(plan, 71).routine[0].steps).toHaveLength(2);
  });
});

describe("study topics by month", () => {
  it("shows the month's chapter", () => {
    expect(monthTopic("matematica", "2026-10-06")).toContain("Algebra");
    expect(monthTopic("fisica", "2027-03-01")).toContain("termodinamica");
    expect(monthTopic("errori", "2026-11-01")).toContain("Funzioni");
  });
});
