import { describe, expect, it } from "vitest";

import { CANONICAL_GROUND, extractCircuitNodes } from "@/lib/circuits/editorModel";
import { CIRCUIT_PRESETS, DEFAULT_SIM_CONFIG } from "@/lib/circuits/presets";
import { simulateCircuit } from "@/lib/circuits/simulator";

const isFiniteArray = (series: Float32Array) => {
  for (let index = 0; index < series.length; index += 1) {
    if (!Number.isFinite(series[index])) {
      return false;
    }
  }
  return true;
};

describe("Circuit presets", () => {
  it("are available", () => {
    expect(CIRCUIT_PRESETS.length).toBeGreaterThan(0);
  });

  CIRCUIT_PRESETS.forEach(preset => {
    describe(preset.id, () => {
      it("has consistent connectivity for rendering", () => {
        expect(preset.components.length).toBeGreaterThan(0);
        const nodes = extractCircuitNodes(preset.components);
        expect(nodes.length).toBeGreaterThan(1);
        expect(nodes).toContain(CANONICAL_GROUND);

        preset.components.forEach(component => {
          expect(component.from).toBeTruthy();
          expect(nodes).toContain(component.from);
          if ("to" in component && component.to) {
            expect(nodes).toContain(component.to);
          }
        });
      });

      it("simulates without numerical errors", () => {
        const result = simulateCircuit(preset.components, DEFAULT_SIM_CONFIG);
        const { metrics, time, nodeVoltages, componentCurrents } = result;

        expect(time.length).toBeGreaterThan(0);
        expect(isFiniteArray(time)).toBe(true);

        const stepCount = time.length;
        Object.values(nodeVoltages).forEach(series => {
          expect(series.length).toBe(stepCount);
          expect(isFiniteArray(series)).toBe(true);
        });
        Object.values(componentCurrents).forEach(series => {
          expect(series.length).toBe(stepCount);
          expect(isFiniteArray(series)).toBe(true);
        });

        const expectedActiveComponents = preset.components.filter(component => component.kind !== "ground").length;
        expect(metrics?.componentCount).toBe(expectedActiveComponents);
        expect(metrics?.matrixSize).toBeGreaterThan(0);
      });
    });
  });
});
