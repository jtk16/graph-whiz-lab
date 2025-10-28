import { describe, expect, it } from "vitest";
import { buildDifferentialEquations } from "@/lib/circuits/differentialEquations";
import { CircuitComponent } from "@/lib/circuits/simulator";
import { CANONICAL_GROUND } from "@/lib/circuits/editorModel";

describe("buildDifferentialEquations", () => {
  const baseComponents: CircuitComponent[] = [
    { id: "r1", kind: "resistor", from: "vin", to: "n1", value: 1000 },
    { id: "c1", kind: "capacitor", from: "n1", to: CANONICAL_GROUND, value: 1e-6 },
    { id: "l1", kind: "inductor", from: "n1", to: "n2", value: 2e-3 },
    {
      id: "vs1",
      kind: "voltage-source",
      from: "vin",
      to: CANONICAL_GROUND,
      waveform: "dc",
      value: 5,
    },
    {
      id: "is1",
      kind: "current-source",
      from: "n2",
      to: CANONICAL_GROUND,
      waveform: "ac",
      value: 0,
      amplitude: 0.25,
      frequency: 120,
      phase: Math.PI / 3,
      offset: 0.05,
    },
    {
      id: "wire1",
      kind: "wire",
      from: "n2",
      to: "n3",
    },
    {
      id: "g1",
      kind: "ground",
      from: CANONICAL_GROUND,
    },
  ];

  it("emits equations for passive and source components", () => {
    const equations = buildDifferentialEquations(baseComponents);

    const byId = new Map(equations.map(eq => [eq.id, eq]));

    expect(byId.get("res-r1")?.plain).toBe(
      "I_r1(t) = (V_vin(t) - V_n1(t)) / 1000"
    );
    expect(byId.get("cap-c1")?.latex).toContain("\\frac{d}{dt}");
    expect(byId.get("ind-l1")?.plain).toContain("= 0.002 * d/dt I_l1(t)");
    expect(byId.get("vs-vs1")?.plain).toBe("V_vin(t) - V_gnd(t) = 5");
    expect(byId.get("cs-is1")?.plain).toContain("0.25 * sin(2*pi * 120 * t");
  });

  it("ignores wires and grounds", () => {
    const equations = buildDifferentialEquations([
      { id: "wire1", kind: "wire", from: "a", to: "b" },
      { id: "g1", kind: "ground", from: CANONICAL_GROUND },
    ]);
    expect(equations).toHaveLength(0);
  });

  it("falls back to defaults when AC parameters are omitted", () => {
    const acVoltage: CircuitComponent = {
      id: "src",
      kind: "voltage-source",
      from: "vin",
      to: CANONICAL_GROUND,
      waveform: "ac",
      value: 0,
    };

    const [equation] = buildDifferentialEquations([acVoltage]);

    expect(equation.latex).toContain("\\sin(2\\pi 60 t + 0)");
  });
});
